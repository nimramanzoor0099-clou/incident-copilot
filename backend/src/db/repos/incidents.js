import { getDb, tx } from '../index.js'
import { getOrgId } from '../../context.js'
import { buildLogs, STATUS_LABEL } from '../../data/seed.js'
import { badRequest, notFound } from '../../utils/httpError.js'
import { addAudit } from './audit.js'
import { ensureService } from './services.js'
import { getMember, memberExtId, parseMemberId, getOwnerName } from './members.js'

export const incidentExtId = (id) => `INC-${id}`
export const parseIncidentId = (s) => {
  const m = /^INC-(\d+)$/.exec(String(s))
  return m ? Number(m[1]) : null
}

const BASE = `SELECT i.*, s.name AS service FROM incidents i JOIN services s ON s.id = i.service_id`
const toSummary = (r) => ({
  id: incidentExtId(r.id), title: r.title, service: r.service, severity: r.severity, status: r.status,
  assigneeId: r.assignee_id ? memberExtId(r.assignee_id) : null, createdAt: r.created_at, resolvedAt: r.resolved_at, env: r.environment,
})
const toEvent = (r) => ({ id: r.id, t: r.occurred_at, text: r.text, actor: r.actor, kind: r.kind })

function group(rows) {
  const m = new Map()
  for (const r of rows) (m.get(r.incident_id) || m.set(r.incident_id, []).get(r.incident_id)).push(r)
  return m
}

// Builds the full incident objects the frontend expects (logs, stack trace, timeline).
function hydrate(base, filter, params) {
  const db = getDb()
  const logs = group(db.prepare(`SELECT l.* FROM incident_logs l JOIN incidents i ON i.id = l.incident_id WHERE ${filter} ORDER BY l.logged_at, l.id`).all(...params))
  const stacks = new Map(db.prepare(`SELECT t.* FROM incident_stack_traces t JOIN incidents i ON i.id = t.incident_id WHERE ${filter}`).all(...params).map((r) => [r.incident_id, r]))
  const frames = group(db.prepare(`SELECT f.* FROM incident_stack_frames f JOIN incidents i ON i.id = f.incident_id WHERE ${filter} ORDER BY f.position`).all(...params))
  const events = group(db.prepare(`SELECT e.* FROM incident_events e JOIN incidents i ON i.id = e.incident_id WHERE ${filter} ORDER BY e.occurred_at, e.id`).all(...params))
  return base.map((r) => ({
    ...toSummary(r),
    logText: r.log_text,
    logs: (logs.get(r.id) || []).map((l) => ({ t: l.logged_at, level: l.level, msg: l.message })),
    stack: {
      error: stacks.get(r.id)?.error_message ?? '',
      frames: (frames.get(r.id) || []).map((f) => ({ fn: f.function_name, file: f.file, line: f.line, col: f.col, app: !!f.is_app_code })),
    },
    timeline: (events.get(r.id) || []).map(toEvent),
  }))
}

export const listFull = () =>
  hydrate(getDb().prepare(`${BASE} WHERE i.org_id = ? ORDER BY i.created_at DESC, i.id DESC`).all(getOrgId()), 'i.org_id = ?', [getOrgId()])

export function getFull(extId) {
  const id = parseIncidentId(extId)
  if (id === null) return null
  const base = getDb().prepare(`${BASE} WHERE i.org_id = ? AND i.id = ?`).all(getOrgId(), id)
  return base.length ? hydrate(base, 'i.id = ?', [id])[0] : null
}

export function getLogText(extId) {
  const id = parseIncidentId(extId)
  return id === null ? null : getDb().prepare('SELECT log_text, environment, id FROM incidents WHERE org_id = ? AND id = ?').get(getOrgId(), id) ?? null
}

const SEV_RANK = "CASE i.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END"

export function listSummaries({ q = '', status = 'all', severity = 'all', service = 'all', assignee = 'all', sort = 'newest', page = 1, limit = 8 }) {
  const db = getDb()
  const where = ['i.org_id = ?']
  const params = [getOrgId()]
  const needle = String(q).trim().toLowerCase()
  if (needle) { where.push("instr(lower('INC-' || i.id || ' ' || i.title || ' ' || s.name), ?) > 0"); params.push(needle) }
  if (status !== 'all') { where.push('i.status = ?'); params.push(String(status)) }
  if (severity !== 'all') { where.push('i.severity = ?'); params.push(String(severity)) }
  if (service !== 'all') { where.push('s.name = ?'); params.push(String(service)) }
  if (assignee === 'none') where.push('i.assignee_id IS NULL')
  else if (assignee !== 'all') { where.push('i.assignee_id = ?'); params.push(parseMemberId(assignee) ?? -1) }
  const W = where.join(' AND ')
  const order = sort === 'oldest' ? 'i.created_at ASC, i.id ASC' : sort === 'severity' ? `${SEV_RANK}, i.created_at DESC` : 'i.created_at DESC, i.id DESC'

  const total = db.prepare(`SELECT COUNT(*) AS n FROM incidents i JOIN services s ON s.id = i.service_id WHERE ${W}`).get(...params).n
  const pages = Math.max(1, Math.ceil(total / limit))
  const cur = Math.min(page, pages)
  const rows = db.prepare(`${BASE} WHERE ${W} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...params, limit, (cur - 1) * limit)
  return { data: rows.map(toSummary), total, page: cur, pages, limit }
}

const addEvent = (incidentId, text, kind, actor = getOwnerName(), t = Date.now()) =>
  getDb().prepare('INSERT INTO incident_events (incident_id, occurred_at, text, actor, kind) VALUES (?, ?, ?, ?, ?)').run(incidentId, t, text, actor, kind)

export function createIncident({ title, service, severity, env, log, analysisId }) {
  return tx(() => {
    const db = getDb()
    const now = Date.now()
    const serviceId = ensureService(service)
    const id = (db.prepare('SELECT MAX(id) AS m FROM incidents').get().m || 1000) + 1
    db.prepare(`INSERT INTO incidents (id, org_id, title, service_id, severity, status, environment, assignee_id, log_text, created_at, updated_at, resolved_at)
                VALUES (?, ?, ?, ?, ?, 'open', ?, NULL, ?, ?, ?, NULL)`).run(id, getOrgId(), title, serviceId, severity, env, log, now, now)
    const insLog = db.prepare('INSERT INTO incident_logs (incident_id, logged_at, level, message) VALUES (?, ?, ?, ?)')
    for (const l of buildLogs(log, now - 60000)) insLog.run(id, Math.round(l.t), l.level, l.msg)
    db.prepare('INSERT INTO incident_stack_traces (incident_id, error_message) VALUES (?, ?)').run(id, log.split('\n')[0].slice(0, 500))
    addEvent(id, 'Incident created', 'alert')
    if (analysisId) db.prepare('UPDATE analyses SET incident_id = ? WHERE id = ? AND org_id = ?').run(id, analysisId, getOrgId())
    addAudit('Created incident', incidentExtId(id))
    return getFull(incidentExtId(id))
  })
}

export function updateIncident(extId, { status, assigneeId, severity }) {
  return tx(() => {
    const db = getDb()
    const id = parseIncidentId(extId)
    const cur = id === null ? null : db.prepare('SELECT * FROM incidents WHERE org_id = ? AND id = ?').get(getOrgId(), id)
    if (!cur) throw notFound(`Incident ${extId} not found`)
    const now = Date.now()

    if (status !== undefined && status !== cur.status) {
      db.prepare('UPDATE incidents SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?').run(status, status === 'resolved' ? now : null, now, id)
      addEvent(id, `Status changed to ${STATUS_LABEL[status]}`, 'status')
      addAudit(`Set status to ${STATUS_LABEL[status]}`, extId)
    }
    if (assigneeId !== undefined) {
      const memberId = assigneeId || null
      const person = memberId ? getMember(memberId) : null
      if (memberId && !person) throw badRequest('assigneeId does not match any member')
      if (person && (person.role === 'Viewer' || person.status !== 'active')) throw badRequest('Only active, non-viewer members can be assigned')
      const dbId = person ? parseMemberId(person.id) : null
      if (dbId !== cur.assignee_id) {
        db.prepare('UPDATE incidents SET assignee_id = ?, updated_at = ? WHERE id = ?').run(dbId, now, id)
        const text = person ? `Assigned to ${person.name}` : 'Unassigned'
        addEvent(id, text, 'assign')
        addAudit(text, extId)
      }
    }
    if (severity !== undefined && severity !== cur.severity) {
      db.prepare('UPDATE incidents SET severity = ?, updated_at = ? WHERE id = ?').run(severity, now, id)
    }
    return getFull(extId)
  })
}

export function addNote(extId, text) {
  const id = parseIncidentId(extId)
  const exists = id !== null && getDb().prepare('SELECT 1 FROM incidents WHERE org_id = ? AND id = ?').get(getOrgId(), id)
  if (!exists) throw notFound(`Incident ${extId} not found`)
  const actor = getOwnerName()
  const t = Date.now()
  const res = addEvent(id, text, 'note', actor, t)
  return { id: Number(res.lastInsertRowid), t, text, actor, kind: 'note' }
}
