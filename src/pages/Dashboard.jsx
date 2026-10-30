import { useMemo } from 'react'
import { Link } from '../router'
import { useStore } from '../store'
import { SERVICES, SEVERITIES } from '../lib/seed'
import { cap, fmtDuration } from '../lib/format'
import { timeAgo } from '../lib/report'
import { PageHead } from '../components/ui'
import { TrendChart, Donut, Legend } from '../components/charts'

const DAY = 864e5

export default function Dashboard() {
  const { incidents, org } = useStore()

  const m = useMemo(() => {
    const open = incidents.filter((i) => i.status !== 'resolved')
    const resolved = incidents.filter((i) => i.resolvedAt)
    const mttr = resolved.length ? resolved.reduce((a, i) => a + (i.resolvedAt - i.createdAt), 0) / resolved.length : 0
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const days = Array.from({ length: 14 }, (_, k) => {
      const start = today.getTime() - (13 - k) * DAY
      const inDay = (t) => t >= start && t < start + DAY
      const d = { label: new Date(start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), resolved: incidents.filter((i) => i.resolvedAt && inDay(i.resolvedAt)).length }
      SEVERITIES.forEach((s) => { d[s] = incidents.filter((i) => i.severity === s && inDay(i.createdAt)).length })
      return d
    })
    const services = SERVICES.map((name) => {
      const list = open.filter((i) => i.service === name)
      const worst = SEVERITIES.find((s) => list.some((i) => i.severity === s))
      return { name, count: list.length, health: !list.length ? 'ok' : worst === 'critical' ? 'outage' : 'degraded' }
    }).sort((a, b) => b.count - a.count)
    return {
      open, mttr, days, services,
      sev: SEVERITIES.map((s) => ({ key: s, label: cap(s), value: open.filter((i) => i.severity === s).length })),
      resolvedWeek: resolved.filter((i) => i.resolvedAt > Date.now() - 7 * DAY).length,
      events: incidents.flatMap((i) => i.timeline.map((e) => ({ ...e, inc: i }))).sort((a, b) => b.t - a.t).slice(0, 8),
    }
  }, [incidents])

  const affected = m.services.filter((s) => s.count).length
  const HEALTH = { ok: 'Operational', degraded: 'Degraded', outage: 'Outage' }

  return (
    <div className="page">
      <PageHead title="Overview" sub={`What is broken right now across ${org.name}.`} />

      <div className="kpis">
        <div className="card kpi"><span className="kpi__label">Open incidents</span><span className="kpi__value">{m.open.length}</span><span className="kpi__sub">{m.sev[0].value} critical, {m.sev[1].value} high</span></div>
        <div className="card kpi"><span className="kpi__label">Affected services</span><span className="kpi__value">{affected}<small>/{SERVICES.length}</small></span><span className="kpi__sub">{SERVICES.length - affected} operating normally</span></div>
        <div className="card kpi"><span className="kpi__label">Mean time to resolve</span><span className="kpi__value">{fmtDuration(m.mttr)}</span><span className="kpi__sub">Across resolved incidents</span></div>
        <div className="card kpi"><span className="kpi__label">Resolved this week</span><span className="kpi__value">{m.resolvedWeek}</span><span className="kpi__sub">Last 7 days</span></div>
      </div>

      <div className="dgrid">
        <section className="card">
          <div className="chead"><h3>Incident trend, last 14 days</h3><Legend keys={[['critical'], ['high'], ['medium'], ['low'], ['res', 'Resolved']]} /></div>
          <div className="cbody"><TrendChart days={m.days} /></div>
        </section>
        <section className="card">
          <div className="chead"><h3>Open by severity</h3></div>
          <div className="cbody sevbox">
            <Donut data={m.sev} />
            <ul className="sevlist">
              {m.sev.map((s) => <li key={s.key} className={`c-${s.key}`}><i /><span>{s.label}</span><strong>{s.value}</strong></li>)}
            </ul>
          </div>
        </section>
      </div>

      <div className="dgrid dgrid--even">
        <section className="card">
          <div className="chead"><h3>Service health</h3><Link to="/incidents" className="tlink small">View incidents</Link></div>
          <ul className="cbody svcs">
            {m.services.map((s) => (
              <li key={s.name}>
                <span className="svc__name">{s.name}</span>
                <span className={`health health--${s.health}`}>{HEALTH[s.health]}</span>
                <span className="svc__count">{s.count ? `${s.count} open` : 'No open incidents'}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <div className="chead"><h3>Recent events</h3></div>
          <ul className="cbody feed">
            {m.events.map((e) => (
              <li key={e.id}>
                <span className={`dot dot--${e.inc.severity}`} />
                <div>
                  <Link to={`/incidents/${e.inc.id}`} className="tlink">{e.text}</Link>
                  <span className="feed__meta">{e.inc.id} &middot; {e.inc.service} &middot; {timeAgo(e.t)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
