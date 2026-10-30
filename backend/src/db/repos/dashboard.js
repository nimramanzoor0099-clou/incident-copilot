import { getDb } from '../index.js'
import { getOrgId } from '../../context.js'
import { SEVERITIES } from '../../data/seed.js'
import { incidentExtId } from './incidents.js'

export function getDashboard() {
  const db = getDb()
  const one = (sql, ...p) => db.prepare(sql).get(getOrgId(), ...p)
  const all = (sql, ...p) => db.prepare(sql).all(getOrgId(), ...p)
  const totals = one(`SELECT COUNT(*) AS total,
      SUM(status != 'resolved') AS open, SUM(status = 'resolved') AS resolved,
      SUM(status != 'resolved' AND assignee_id IS NULL) AS unassigned FROM incidents WHERE org_id = ?`)

  const sev = Object.fromEntries(all("SELECT severity, COUNT(*) AS n FROM incidents WHERE org_id = ? AND status != 'resolved' GROUP BY severity").map((r) => [r.severity, r.n]))
  const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, sev[s] || 0]))

  const services = all(`SELECT s.name AS service, COUNT(i.id) AS open, COALESCE(SUM(i.severity = 'critical'), 0) AS crit
      FROM services s LEFT JOIN incidents i ON i.service_id = s.id AND i.status != 'resolved' WHERE s.org_id = ? GROUP BY s.id ORDER BY s.id`)
    .map((r) => ({ service: r.service, openIncidents: r.open, health: r.crit > 0 ? 'down' : r.open > 0 ? 'degraded' : 'healthy' }))

  const DAY = 864e5
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  const first = startOfToday - 13 * DAY
  const created = all('SELECT created_at FROM incidents WHERE org_id = ? AND created_at >= ?', first)
  const trend = Array.from({ length: 14 }, (_, k) => {
    const start = first + k * DAY
    return { date: new Date(start).toISOString().slice(0, 10), count: created.filter((r) => r.created_at >= start && r.created_at < start + DAY).length }
  })

  const mttrMs = Math.round(one('SELECT COALESCE(AVG(resolved_at - created_at), 0) AS v FROM incidents WHERE org_id = ? AND resolved_at IS NOT NULL').v)
  const recent = all(`SELECT e.*, i.title FROM incident_events e JOIN incidents i ON i.id = e.incident_id WHERE i.org_id = ? ORDER BY e.occurred_at DESC, e.id DESC LIMIT 10`)
    .map((e) => ({ id: e.id, t: e.occurred_at, text: e.text, actor: e.actor, kind: e.kind, incidentId: incidentExtId(e.incident_id), incidentTitle: e.title }))

  return { totals: { open: totals.open || 0, total: totals.total, resolved: totals.resolved || 0, unassigned: totals.unassigned || 0 }, bySeverity, services, trend, mttrMs, recent }
}
