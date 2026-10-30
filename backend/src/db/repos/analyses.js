import { randomBytes } from 'node:crypto'
import { getDb, tx } from '../index.js'
import { getOrgId } from '../../context.js'
import { parseIncidentId } from './incidents.js'

// Stores a Copilot report (and its child lists) in normalized tables. Returns the stored id.
export function saveAnalysis(report, { log, incidentId = null } = {}) {
  return tx(() => {
    const db = getDb()
    let id = String(report.id)
    if (db.prepare('SELECT 1 FROM analyses WHERE id = ?').get(id)) id = `${id}-${randomBytes(2).toString('hex')}`
    report.id = id
    const ctx = report.context || {}
    const incId = incidentId ? parseIncidentId(incidentId) : null
    db.prepare(`INSERT INTO analyses (id, org_id, incident_id, created_at, engine, provider, model, title, category, severity, confidence, summary, service, environment, stack, log_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, getOrgId(), incId, Math.round(report.createdAt || Date.now()), report.engine === 'ai' ? 'ai' : 'rules', report.provider || (report.engine === 'ai' ? 'claude' : 'rules'), report.model ?? null, report.title, report.category || 'Unclassified',
        report.severity, Math.round(report.confidence), report.summary || '', ctx.service || 'Unnamed service', ctx.environment || 'Production', ctx.stack || 'Other', log || '')
    const ev = db.prepare('INSERT INTO analysis_evidence (analysis_id, position, text) VALUES (?, ?, ?)')
    ;(report.evidence || []).forEach((t, i) => ev.run(id, i, String(t)))
    const ca = db.prepare('INSERT INTO analysis_causes (analysis_id, position, title, likelihood, detail, check_text) VALUES (?, ?, ?, ?, ?, ?)')
    ;(report.causes || []).forEach((c, i) => ca.run(id, i, c.title || '', Math.round(c.likelihood ?? 0), c.detail || '', c.check || ''))
    const fx = db.prepare('INSERT INTO analysis_fixes (analysis_id, position, title, detail, command) VALUES (?, ?, ?, ?, ?)')
    ;(report.fixes || []).forEach((f, i) => fx.run(id, i, f.title || '', f.detail || '', f.command ?? null))
    const pv = db.prepare('INSERT INTO analysis_prevention (analysis_id, position, text) VALUES (?, ?, ?)')
    ;(report.prevention || []).forEach((t, i) => pv.run(id, i, String(t)))
    return id
  })
}

const rebuild = (a) => {
  const db = getDb()
  const q = (sql) => db.prepare(sql).all(a.id)
  return {
    id: a.id, createdAt: a.created_at, engine: a.engine, provider: a.provider, model: a.model, title: a.title, category: a.category, severity: a.severity, confidence: a.confidence, summary: a.summary,
    incidentId: a.incident_id ? `INC-${a.incident_id}` : null,
    evidence: q('SELECT text FROM analysis_evidence WHERE analysis_id = ? ORDER BY position').map((r) => r.text),
    context: { service: a.service, environment: a.environment, stack: a.stack },
    causes: q('SELECT * FROM analysis_causes WHERE analysis_id = ? ORDER BY position').map((r) => ({ title: r.title, likelihood: r.likelihood, detail: r.detail, check: r.check_text })),
    fixes: q('SELECT * FROM analysis_fixes WHERE analysis_id = ? ORDER BY position').map((r) => ({ title: r.title, detail: r.detail, ...(r.command ? { command: r.command } : {}) })),
    prevention: q('SELECT text FROM analysis_prevention WHERE analysis_id = ? ORDER BY position').map((r) => r.text),
  }
}

export const listAnalyses = (limit = 20) =>
  getDb().prepare('SELECT * FROM analyses WHERE org_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?').all(getOrgId(), limit).map(rebuild)

export function getAnalysis(id) {
  const a = getDb().prepare('SELECT * FROM analyses WHERE org_id = ? AND id = ?').get(getOrgId(), id)
  return a ? { ...rebuild(a), log: a.log_text } : null
}

export const deleteAnalysis = (id) => getDb().prepare('DELETE FROM analyses WHERE org_id = ? AND id = ?').run(getOrgId(), id).changes > 0

// Housekeeping: drop saved analyses older than the workspace's retention window.
export const purgeAnalysesOlderThan = (days) =>
  Number(getDb().prepare('DELETE FROM analyses WHERE org_id = ? AND created_at < ?').run(getOrgId(), Date.now() - days * 864e5).changes)


// Startup housekeeping across every workspace (each organization has its own retention policy).
export function purgeAllExpiredAnalyses() {
  const db = getDb()
  const now = Date.now()
  let removed = 0
  for (const org of db.prepare('SELECT id, retention_days FROM organizations').all()) {
    removed += Number(db.prepare('DELETE FROM analyses WHERE org_id = ? AND created_at < ?')
      .run(org.id, now - org.retention_days * 864e5).changes)
  }
  return removed
}
