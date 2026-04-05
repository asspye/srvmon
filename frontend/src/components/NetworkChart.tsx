import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { NetChartPoint } from '../types'

interface Props {
  data: NetChartPoint[]
  rxRate: number
  txRate: number
}

function fmtRate(bps: number): string {
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(1)} MB/s`
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(0)} KB/s`
  return `${bps.toFixed(0)} B/s`
}

export default function NetworkChart({ data, rxRate, txRate }: Props) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">Network I/O</span>
        <span className="chart-card-value">
          ↓ {fmtRate(rxRate)} &nbsp; ↑ {fmtRate(txRate)}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3fb950" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3fb950" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="txGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#bc8cff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#bc8cff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" tick={false} axisLine={false} tickLine={false} />
          <YAxis tickCount={3} tick={{ fontSize: 10, fill: '#8b949e' }} axisLine={false} tickLine={false}
            tickFormatter={v => fmtRate(v)} />
          <Tooltip
            contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: '#8b949e' }}
            formatter={(v: number, name: string) => [fmtRate(v), name === 'rx' ? '↓ RX' : '↑ TX']}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#8b949e' }} />
          <Area type="monotone" dataKey="rx" name="rx" stroke="#3fb950" strokeWidth={1.5}
            fill="url(#rxGrad)" dot={false} isAnimationActive={false} />
          <Area type="monotone" dataKey="tx" name="tx" stroke="#bc8cff" strokeWidth={1.5}
            fill="url(#txGrad)" dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
