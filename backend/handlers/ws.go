package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"srvmon/collectors"
	"srvmon/middleware"
	"srvmon/models"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// ─── AWG cache ────────────────────────────────────────────────────────────────

var (
	awgMu      sync.RWMutex
	awgCache   *models.AWGData
	awgRefresh = 10 * time.Second
)

func init() {
	go func() {
		for {
			data := collectors.CollectAWG()
			awgMu.Lock()
			awgCache = data
			awgMu.Unlock()
			time.Sleep(awgRefresh)
		}
	}()
}

func getAWGCached() *models.AWGData {
	awgMu.RLock()
	defer awgMu.RUnlock()
	return awgCache
}

// ─── WebSocket handler ────────────────────────────────────────────────────────

// MetricsWSHandler streams system + AWG metrics to the client every 2 seconds.
func MetricsWSHandler(w http.ResponseWriter, r *http.Request) {
	tokenStr := r.URL.Query().Get("token")
	if tokenStr == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return middleware.JWTSecret(), nil
	})
	if err != nil || !token.Valid {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ws] upgrade error: %v", err)
		return
	}
	defer conn.Close()
	log.Printf("[ws] client connected: %s", r.RemoteAddr)

	send := func() bool {
		data, err := json.Marshal(models.WSMessage{
			System: collectors.GetCachedMetrics(),
			AWG:    getAWGCached(),
		})
		if err != nil {
			return true
		}
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			return false
		}
		return true
	}

	// Send immediately, then every 2 seconds from the collector cache.
	send()

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				log.Printf("[ws] read closed: %v", err)
				return
			}
		}
	}()

	for {
		select {
		case <-done:
			log.Printf("[ws] client disconnected: %s", r.RemoteAddr)
			return
		case <-ticker.C:
			if !send() {
				return
			}
		}
	}
}
