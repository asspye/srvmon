import { useState, useEffect, useRef, useCallback } from 'react'
import type { WSMessage, SystemMetrics, AWGData, ChartPoint, NetChartPoint } from '../types'
import MetricCard from '../components/MetricCard'
import CPUChart from '../components/CPUChart'
import NetworkChart from '../components/NetworkChart'
import AWGPanel from '../components/AWGPanel'

const MAX_HISTORY = 60
const WS_RECONNECT_DELAY = 3000

interface Props {
  token: string
  onLogout: () => void
}

function fmtBytes(b: number): string {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(1)} GB`
  if (b >= 1_048_576)     return `${(b / 1_048_576).toFixed(0)} MB`
  if (b >= 1_024)         return `${(b / 1_024).toFixed(0)} KB`
  return `${b} B`
}

function fmtUptime(secs: number): string {
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function timeLabel(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function Dashboard({ token, onLogout }: Props) {
  const [connected, setConnected] = useState(false)
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [awg, setAwg] = useState<AWGData | null>(null)
  const [cpuHistory, setCpuHistory] = useState<ChartPoint[]>([])
  const [netHistory, setNetHistory] = useState<NetChartPoint[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)

  const handleMessage = useCallback((msg: WSMessage) => {
    if (msg.system) {
      setMetrics(msg.system)
      const t = timeLabel()
      setCpuHistory(prev => {
        const next = [...prev, { time: t, value: msg.system.cpu.percent }]
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
      })
      setNetHistory(prev => {
        const next = [...prev, { time: t, rx: msg.system.network.rx_rate, tx: msg.system.network.tx_rate }]
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next
      })
    }
    if (msg.awg) {
      setAwg(msg.awg)
    }
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/api/ws?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (mountedRef.current) setConnected(true)
    }

    ws.onmessage = e => {
      try {
        const msg: WSMessage = JSON.parse(e.data)
        if (mountedRef.current) handleMessage(msg)
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setConnected(false)
      reconnectRef.current = setTimeout(connect, WS_RECONNECT_DELAY)
    }

    ws.onerror = () => ws.close()
  }, [token, handleMessage])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const mainDisk = metrics?.disks?.find(d => d.path === '/') ?? metrics?.disks?.[0]

  return (
    <div className="layout">
      <div className="topbar">
        <div className="topbar-left">
          <div className={`ws-dot ${connected ? '' : 'disconnected'}`} />
          <span className="topbar-logo">srvmon</span>
          {metrics?.hostname && (
            <span className="topbar-hostname">{metrics.hostname}</span>
          )}
        </div>
        <div className="topbar-right">
          <button className="btn-logout" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="content">
        {/* Info row */}
        {metrics && (
          <div className="info-row">
            <div className="info-item">
              <div className="info-item-label">Uptime</div>
              <div className="info-item-value">{fmtUptime(metrics.uptime)}</div>
            </div>
            <div className="info-item">
              <div className="info-item-label">Load avg</div>
              <div className="info-item-value">
                {metrics.load.load1.toFixed(2)} / {metrics.load.load5.toFixed(2)} / {metrics.load.load15.toFixed(2)}
              </div>
            </div>
            <div className="info-item">
              <div className="info-item-label">CPU cores</div>
              <div className="info-item-value">{metrics.cpu.cores}</div>
            </div>
          </div>
        )}

        {/* Metric cards */}
        <div className="section-title">System Resources</div>
        <div className="cards-grid">
          <MetricCard
            label="CPU"
            value={metrics ? `${metrics.cpu.percent.toFixed(1)}%` : '—'}
            sub={metrics ? `${metrics.cpu.cores} cores` : ''}
            percent={metrics?.cpu.percent}
          />
          <MetricCard
            label="Memory"
            value={metrics ? `${metrics.memory.used_percent.toFixed(1)}%` : '—'}
            sub={metrics ? `${fmtBytes(metrics.memory.used)} / ${fmtBytes(metrics.memory.total)}` : ''}
            percent={metrics?.memory.used_percent}
          />
          {metrics?.swap?.total ? (
            <MetricCard
              label="Swap"
              value={`${metrics.swap.used_percent.toFixed(1)}%`}
              sub={`${fmtBytes(metrics.swap.used)} / ${fmtBytes(metrics.swap.total)}`}
              percent={metrics.swap.used_percent}
            />
          ) : null}
          {mainDisk && (
            <MetricCard
              label="Disk /"
              value={`${mainDisk.used_percent.toFixed(1)}%`}
              sub={`${fmtBytes(mainDisk.used)} / ${fmtBytes(mainDisk.total)}`}
              percent={mainDisk.used_percent}
            />
          )}
        </div>

        {/* Charts */}
        <div className="charts-row">
          <CPUChart data={cpuHistory} current={metrics?.cpu.percent ?? 0} />
          <NetworkChart
            data={netHistory}
            rxRate={metrics?.network.rx_rate ?? 0}
            txRate={metrics?.network.tx_rate ?? 0}
          />
        </div>

        {/* Disk details */}
        {metrics?.disks && metrics.disks.length > 0 && (
          <>
            <div className="section-title">Disks</div>
            <div className="disk-list">
              {metrics.disks.map(disk => (
                <div key={disk.path} className="disk-item">
                  <div className="disk-path" title={disk.path}>{disk.path}</div>
                  <div className="disk-bar-wrap">
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${disk.used_percent >= 90 ? 'fill-red' : disk.used_percent >= 70 ? 'fill-yellow' : 'fill-green'}`}
                        style={{ width: `${Math.min(disk.used_percent, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="disk-pct">
                    {disk.used_percent.toFixed(1)}% &nbsp;
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      {fmtBytes(disk.free)} free
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* AmneziaWG */}
        <div className="section-title">AmneziaWG</div>
        <AWGPanel data={awg} />
      </div>
    </div>
  )
}
