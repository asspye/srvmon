package models

// ─── System Metrics ──────────────────────────────────────────────────────────

type SystemMetrics struct {
	Timestamp int64       `json:"timestamp"`
	Hostname  string      `json:"hostname"`
	Uptime    uint64      `json:"uptime"`
	CPU       CPUInfo     `json:"cpu"`
	Memory    MemoryInfo  `json:"memory"`
	Swap      SwapInfo    `json:"swap"`
	Disks     []DiskInfo  `json:"disks"`
	Network   NetworkInfo `json:"network"`
	Load      LoadInfo    `json:"load"`
}

type CPUInfo struct {
	Percent float64   `json:"percent"`
	PerCore []float64 `json:"per_core"`
	Cores   int       `json:"cores"`
}

type MemoryInfo struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	Available   uint64  `json:"available"`
	UsedPercent float64 `json:"used_percent"`
}

type SwapInfo struct {
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	UsedPercent float64 `json:"used_percent"`
}

type DiskInfo struct {
	Path        string  `json:"path"`
	Total       uint64  `json:"total"`
	Used        uint64  `json:"used"`
	Free        uint64  `json:"free"`
	UsedPercent float64 `json:"used_percent"`
	Fstype      string  `json:"fstype"`
}

type NetworkInfo struct {
	Interfaces []NetInterface `json:"interfaces"`
	RxRate     float64        `json:"rx_rate"` // bytes/sec
	TxRate     float64        `json:"tx_rate"` // bytes/sec
}

type NetInterface struct {
	Name   string  `json:"name"`
	Rx     uint64  `json:"rx"`
	Tx     uint64  `json:"tx"`
	RxRate float64 `json:"rx_rate"`
	TxRate float64 `json:"tx_rate"`
}

type LoadInfo struct {
	Load1  float64 `json:"load1"`
	Load5  float64 `json:"load5"`
	Load15 float64 `json:"load15"`
}

// ─── AmneziaWG ───────────────────────────────────────────────────────────────

type AWGData struct {
	Available   bool       `json:"available"`
	Error       string     `json:"error,omitempty"`
	Interfaces  []AWGIface `json:"interfaces"`
	TotalPeers  int        `json:"total_peers"`
	ActivePeers int        `json:"active_peers"`
}

type AWGIface struct {
	Name       string    `json:"name"`
	PublicKey  string    `json:"public_key"`
	ListenPort string    `json:"listen_port"`
	Peers      []AWGPeer `json:"peers"`
}

type AWGPeer struct {
	PublicKey     string `json:"public_key"`
	Endpoint      string `json:"endpoint"`
	AllowedIPs    string `json:"allowed_ips"`
	LastHandshake int64  `json:"last_handshake"` // unix timestamp, 0 = never
	TransferRx    int64  `json:"transfer_rx"`
	TransferTx    int64  `json:"transfer_tx"`
	Connected     bool   `json:"connected"` // handshake within last 3 min
}

// ─── WebSocket message ────────────────────────────────────────────────────────

type WSMessage struct {
	System *SystemMetrics `json:"system"`
	AWG    *AWGData       `json:"awg"`
}
