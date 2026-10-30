import { SEVERITIES } from '../lib/seed'
import { cap } from '../lib/format'

export function Legend({ keys }) {
  return (
    <div className="legend">
      {keys.map(([k, label]) => <span key={k} className={`c-${k}`}><i />{label || cap(k)}</span>)}
    </div>
  )
}

// days: [{ label, critical, high, medium, low, resolved }]
export function TrendChart({ days }) {
  const W = 640, H = 230, L = 30, B = 26, T = 10
  const pw = W - L - 8, ph = H - B - T
  const max = Math.max(4, ...days.map((d) => SEVERITIES.reduce((a, s) => a + d[s], 0)), ...days.map((d) => d.resolved))
  const top = Math.ceil(max / 4) * 4
  const y = (v) => T + ph - (v / top) * ph
  const slot = pw / days.length
  const bw = slot * 0.58
  const line = days.map((d, i) => `${L + slot * i + slot / 2},${y(d.resolved)}`).join(' ')
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Incidents opened and resolved per day over the last 14 days">
      {[0, 1, 2, 3, 4].map((g) => {
        const v = (top / 4) * g
        return (
          <g key={g}>
            <line x1={L} x2={W - 8} y1={y(v)} y2={y(v)} className="grid-line" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end">{v}</text>
          </g>
        )
      })}
      {days.map((d, i) => {
        let acc = 0
        const x = L + slot * i + (slot - bw) / 2
        return (
          <g key={d.label}>
            {[...SEVERITIES].reverse().map((s) => {
              const h = (d[s] / top) * ph
              acc += h
              return d[s] ? <rect key={s} x={x} y={T + ph - acc} width={bw} height={h} rx="2" className={`b-${s} bar-y`} style={{ animationDelay: `${i * 35}ms` }} /> : null
            })}
            {i % 3 === 0 && <text x={x + bw / 2} y={H - 7} textAnchor="middle">{d.label}</text>}
          </g>
        )
      })}
      <polyline points={line} className="line-res" />
      {days.map((d, i) => <circle key={i} cx={L + slot * i + slot / 2} cy={y(d.resolved)} r="3" className="dot-res" />)}
    </svg>
  )
}

export function Donut({ data }) {
  const total = data.reduce((a, d) => a + d.value, 0)
  const R = 52, C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={`${total} open incidents by severity`}>
        <circle cx="70" cy="70" r={R} className="donut__track" />
        {data.map((d) => {
          const len = total ? (d.value / total) * C : 0
          const el = <circle key={d.key} cx="70" cy="70" r={R} className={`donut__seg s-${d.key}`} strokeDasharray={`${Math.max(0, len - 2)} ${C - Math.max(0, len - 2)}`} strokeDashoffset={-acc} />
          acc += len
          return el
        })}
      </svg>
      <div className="donut__center"><strong>{total}</strong><span>open</span></div>
    </div>
  )
}
