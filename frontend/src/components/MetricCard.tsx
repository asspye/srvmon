interface Props {
  label: string
  value: string
  sub?: string
  percent?: number
}

function fillClass(pct: number) {
  if (pct >= 90) return 'fill-red'
  if (pct >= 70) return 'fill-yellow'
  return 'fill-green'
}

export default function MetricCard({ label, value, sub, percent }: Props) {
  return (
    <div className="card">
      <div className="card-label">{label}</div>
      <div className="card-value">{value}</div>
      {sub && <div className="card-sub">{sub}</div>}
      {percent !== undefined && (
        <div className="progress-bar">
          <div
            className={`progress-fill ${fillClass(percent)}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
