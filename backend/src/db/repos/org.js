import { getDb } from '../index.js'
import { getOrgId } from '../../context.js'

const toOrg = (r) => ({
  name: r.name, slug: r.slug, timezone: r.timezone, retention: String(r.retention_days),
  defaultSeverity: r.default_severity, autoPage: !!r.auto_page, digest: !!r.digest, requireMfa: !!r.require_mfa,
})

export const getOrg = () => toOrg(getDb().prepare('SELECT * FROM organizations WHERE id = ?').get(getOrgId()))

export function updateOrg(o) {
  getDb().prepare(`UPDATE organizations SET name = ?, slug = ?, timezone = ?, retention_days = ?, default_severity = ?,
    auto_page = ?, digest = ?, require_mfa = ?, updated_at = ? WHERE id = ?`)
    .run(o.name, o.slug, o.timezone, Number(o.retention), o.defaultSeverity, o.autoPage ? 1 : 0, o.digest ? 1 : 0, o.requireMfa ? 1 : 0, Date.now(), getOrgId())
  return getOrg()
}

export const getRetentionDays = () => getDb().prepare('SELECT retention_days FROM organizations WHERE id = ?').get(getOrgId()).retention_days
