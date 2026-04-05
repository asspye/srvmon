import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ChartPoint } from '../types'

interface Props {
  data: ChartPoint[]
  current: number
}

export default function CPUChart({ data, current }: Props) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">CPU Usage</span>
        <span className="chart-card-value">{current.toFixed(1)}%</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#58a6ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="time" tick={false} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tickCount={3} tick={{ fontSize: 10, fill: '#8b949e' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 6, fontSize: 12 }}
            labelStyle={{ color: '#8b949e' }}
            formatter={(v: number) => [`${v.toFixed(1)}%`, 'CPU']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#58a6ff"
            strokeWidth={1.5}
            fill="url(#cpuGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
