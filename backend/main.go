package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"srvmon/handlers"
	"srvmon/middleware"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	// API routes
	api := r.Group("/api")
	{
		api.POST("/auth/login", handlers.Login)

		// WebSocket: auth via ?token= query param
		api.GET("/ws", func(c *gin.Context) {
			handlers.MetricsWSHandler(c.Writer, c.Request)
		})

		// Protected REST routes
		protected := api.Group("")
		protected.Use(middleware.AuthRequired())
		{
			protected.GET("/amnezia", handlers.GetAWGData)
		}
	}

	// Serve React SPA from /app/static
	r.Static("/assets", "/app/static/assets")
	r.StaticFile("/favicon.ico", "/app/static/favicon.ico")
	r.NoRoute(func(c *gin.Context) {
		c.File("/app/static/index.html")
	})

	log.Printf("srvmon listening on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}
