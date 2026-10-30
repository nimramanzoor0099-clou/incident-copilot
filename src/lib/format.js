export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
export const fmtDate = (t) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
export const fmtClock = (t) => new Date(t).toLocaleTimeString(undefined, { hour12: false }) + '.' + String(new Date(t).getMilliseconds()).padStart(3, '0')
export function fmtDuration(ms) {
  const m = Math.round(ms / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ${m % 60}m` : `${Math.floor(h / 24)}d ${h % 24}h`
}
