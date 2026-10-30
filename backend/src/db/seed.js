import { makeSeed, SERVICES } from '../data/seed.js'
import { ORG_ID } from './constants.js'
import { tx } from './index.js'

const r = Math.round

export function isEmpty(db) {
  return db.prepare('SELECT COUNT(*) AS n FROM organizations').get().n === 0
}

// Loads the demo workspace (36 incidents, 7 members, integrations, audit trail).
export function seedDemoData(db) {
  const d = makeSeed()
  const now = Date.now()
  tx(() => {
    const o = d.org
    db.prepare(`INSERT INTO organizations (id, name, slug, timezone, retention_days, default_severity, auto_page, digest, require_mfa, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(ORG_ID, o.name, o.slug, o.timezone, Number(o.retention), o.defaultSeverity, o.autoPage ? 1 : 0, o.digest ? 1 : 0, o.requireMfa ? 1 : 0, now, now)

    const insMember = db.prepare('INSERT INTO members (id, org_id, name, email, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    d.members.forEach((m) => insMember.run(Number(m.id.slice(1)), ORG_ID, m.name, m.email, m.role, m.status, now))

    const insService = db.prepare('INSERT OR IGNORE INTO services (org_id, name, created_at) VALUES (?, ?, ?)')
    ;[...SERVICES, ...d.incidents.map((i) => i.service)].forEach((s) => insService.run(ORG_ID, s, now))
    const serviceId = Object.fromEntries(db.prepare('SELECT id, name FROM services WHERE org_id = ?').all(ORG_ID).map((s) => [s.name, s.id]))

    const insInc = db.prepare(`INSERT INTO incidents (id, org_id, title, service_id, severity, status, environment, assignee_id, log_text, created_at, updated_at, resolved_at)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const insLog = db.prepare('INSERT INTO incident_logs (incident_id, logged_at, level, message) VALUES (?, ?, ?, ?)')
    const insStack = db.prepare('INSERT INTO incident_stack_traces (incident_id, error_message) VALUES (?, ?)')
    const insFrame = db.prepare('INSERT INTO incident_stack_frames (incident_id, position, function_name, file, line, col, is_app_code) VALUES (?, ?, ?, ?, ?, ?, ?)')
    const insEvent = db.prepare('INSERT INTO incident_events (incident_id, occurred_at, text, actor, kind) VALUES (?, ?, ?, ?, ?)')
    for (const i of d.incidents) {
      const id = Number(i.id.slice(4))
      const last = Math.max(...i.timeline.map((e) => e.t), i.createdAt)
      insInc.run(id, ORG_ID, i.title, serviceId[i.service], i.severity, i.status, i.env, i.assigneeId ? Number(i.assigneeId.slice(1)) : null, i.logText, r(i.createdAt), r(last), i.resolvedAt ? r(i.resolvedAt) : null)
      i.logs.forEach((l) => insLog.run(id, r(l.t), l.level, l.msg))
      insStack.run(id, i.stack.error)
      i.stack.frames.forEach((f, k) => insFrame.run(id, k, f.fn, f.file, f.line, f.col, f.app ? 1 : 0))
      i.timeline.forEach((e) => insEvent.run(id, r(e.t), e.text, e.actor, e.kind))
    }

    const insAudit = db.prepare('INSERT INTO audit_log (org_id, occurred_at, actor, action, target) VALUES (?, ?, ?, ?, ?)')
    ;[...d.audit].reverse().forEach((a) => insAudit.run(ORG_ID, r(a.t), a.actor, a.action, a.target))

    const insInt = db.prepare('INSERT INTO integrations (org_id, slug, name, description, color, connected, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    d.integrations.forEach((x) => insInt.run(ORG_ID, x.id, x.name, x.desc, x.color, x.connected ? 1 : 0, now))
  })
}

// Minimal workspace for SEED_DEMO_DATA=false: one organization, one owner, integrations switched off.
export function bootstrapEmpty(db, { orgName = 'My Workspace', ownerName = 'Workspace Owner', ownerEmail = 'owner@example.com' } = {}) {
  const d = makeSeed()
  const now = Date.now()
  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'workspace'
  tx(() => {
    db.prepare('INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(ORG_ID, orgName, slug, now, now)
    db.prepare("INSERT INTO members (org_id, name, email, role, status, created_at) VALUES (?, ?, ?, 'Owner', 'active', ?)").run(ORG_ID, ownerName, ownerEmail, now)
    const insService = db.prepare('INSERT INTO services (org_id, name, created_at) VALUES (?, ?, ?)')
    SERVICES.forEach((s) => insService.run(ORG_ID, s, now))
    const insInt = db.prepare('INSERT INTO integrations (org_id, slug, name, description, color, connected, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?)')
    d.integrations.forEach((x) => insInt.run(ORG_ID, x.id, x.name, x.desc, x.color, now))
  })
}
