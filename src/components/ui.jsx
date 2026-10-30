import { STATUS_LABEL } from '../lib/seed'
import { cap } from '../lib/format'

export const SeverityBadge = ({ sev }) => (
  <span className={`badge badge--${sev}`}><span className="dot" />{cap(sev)}</span>
)
export const StatusPill = ({ status }) => <span className={`pill st-${status}`}>{STATUS_LABEL[status]}</span>

const COLORS = ['#2747e8', '#0e9f78', '#b04ad6', '#e0620a', '#0a8bb5', '#c2417a']
export function Avatar({ name, size = 28 }) {
  const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
  const color = COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]
  return <span className="avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.4 }} aria-hidden="true">{initials}</span>
}

export const PageHead = ({ title, sub, children }) => (
  <div className="phead">
    <div>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
    {children && <div className="phead__actions">{children}</div>}
  </div>
)

export const Switch = ({ checked, onChange, label }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />
)
