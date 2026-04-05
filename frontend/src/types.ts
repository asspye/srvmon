export interface CPUInfo {
  percent: number
  per_core: number[]
  cores: number
}

export interface MemoryInfo {
  total: number
  used: number
  free: number
  available: number
  used_percent: number
}

export interface SwapInfo {
  total: number
  used: number
  used_percent: number
}

export interface DiskInfo {
  path: string
  total: number
  used: number
  free: number
  used_percent: number
  fstype: string
}

export interface NetInterface {
  name: string
  rx: number
  tx: number
  rx_rate: number
  tx_rate: number
}

export interface NetworkInfo {
  interfaces: NetInterface[]
  rx_rate: number
  tx_rate: number
}

export interface LoadInfo {
  load1: number
  load5: number
  load15: number
}

export interface SystemMetrics {
  timestamp: number
  hostname: string
  uptime: number
  cpu: CPUInfo
  memory: MemoryInfo
  swap: SwapInfo
  disks: DiskInfo[]
  network: NetworkInfo
  load: LoadInfo
}

export interface AWGPeer {
  public_key: string
  endpoint: string
  allowed_ips: string
  last_handshake: number
  transfer_rx: number
  transfer_tx: number
  connected: boolean
}

export interface AWGIface {
  name: string
  public_key: string
  listen_port: string
  peers: AWGPeer[]
}

export interface AWGData {
  available: boolean
  error?: string
  interfaces: AWGIface[]
  total_peers: number
  active_peers: number
}

export interface WSMessage {
  system: SystemMetrics
  awg: AWGData | null
}

// Chart history point
export interface ChartPoint {
  time: string
  value: number
}

export interface NetChartPoint {
  time: string
  rx: number
  tx: number
}
