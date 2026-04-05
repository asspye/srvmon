import type { AWGData, AWGPeer } from '../types'

interface Props {
  data: AWGData | null
}

function fmtBytes(b: number): string {
  if (b >= 1_073_741_824) return `${(b / 1_073_741_824).toFixed(2)} GiB`
  if (b >= 1_048_576)     return `${(b / 1_048_576).toFixed(1)} MiB`
  if (b >= 1_024)         return `${(b / 1_024).toFixed(0)} KiB`
  return `${b} B`
}

function fmtHandshake(ts: number): string {
  if (ts === 0) return 'Never'
  const diff = Math.floor(Date.now() / 1000) - ts
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function shortKey(key: string): string {
  return key.length > 16 ? `${key.slice(0, 8)}…${key.slice(-8)}` : key
}

function PeerRow({ peer }: { peer: AWGPeer }) {
  return (
    <tr>
      <td>
        <span className={`badge ${peer.connected ? 'badge-green' : 'badge-gray'}`}>
          {peer.connected ? 'Online' : 'Offline'}
        </span>
      </td>
      <td title={peer.public_key}>{shortKey(peer.public_key)}</td>
      <td>{peer.endpoint || '—'}</td>
      <td>{peer.allowed_ips}</td>
      <td>{fmtHandshake(peer.last_handshake)}</td>
      <td>↓ {fmtBytes(peer.transfer_rx)}</td>
      <td>↑ {fmtBytes(peer.transfer_tx)}</td>
    </tr>
  )
}

export default function AWGPanel({ data }: Props) {
  if (!data) {
    return <div className="awg-unavailable">AmneziaWG — loading...</div>
  }

  if (!data.available) {
    return (
      <div className="awg-unavailable">
        AmneziaWG — unavailable
        {data.error && <span style={{ color: 'var(--red)', marginLeft: 8 }}>{data.error}</span>}
      </div>
    )
  }

  return (
    <>
      <div className="awg-header">
        <div className="awg-stat">
          <span className="awg-stat-label">Total peers</span>
          <span className="awg-stat-value">{data.total_peers}</span>
        </div>
        <div className="awg-divider" />
        <div className="awg-stat">
          <span className="awg-stat-label">Active</span>
          <span className="awg-stat-value" style={{ color: 'var(--green)' }}>{data.active_peers}</span>
        </div>
        <div className="awg-divider" />
        <div className="awg-stat">
          <span className="awg-stat-label">Offline</span>
          <span className="awg-stat-value" style={{ color: 'var(--text-muted)' }}>
            {data.total_peers - data.active_peers}
          </span>
        </div>
        {(data.interfaces ?? []).map(iface => (
          <div key={iface.name} style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div className="awg-stat-label">{iface.name}</div>
            <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
              :{iface.listen_port}
            </div>
          </div>
        ))}
      </div>

      {(data.interfaces ?? []).map(iface => (
        iface.peers && iface.peers.length > 0 && (
          <table key={iface.name} className="peers-table" style={{ marginBottom: 12 }}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Public Key</th>
                <th>Endpoint</th>
                <th>Allowed IPs</th>
                <th>Last Handshake</th>
                <th>RX</th>
                <th>TX</th>
              </tr>
            </thead>
            <tbody>
              {iface.peers.map(peer => (
                <PeerRow key={peer.public_key} peer={peer} />
              ))}
            </tbody>
          </table>
        )
      ))}
    </>
  )
}
