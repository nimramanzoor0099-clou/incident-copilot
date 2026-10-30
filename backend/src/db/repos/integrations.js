import { getDb } from '../index.js'
import { getOrgId } from '../../context.js'

const toIntegration = (r) => ({ id: r.slug, name: r.name, desc: r.description, color: r.color, connected: !!r.connected })

export const listIntegrations = () => getDb().prepare('SELECT * FROM integrations WHERE org_id = ? ORDER BY rowid').all(getOrgId()).map(toIntegration)

export function getIntegration(slug) {
  const r = getDb().prepare('SELECT * FROM integrations WHERE org_id = ? AND slug = ?').get(getOrgId(), slug)
  return r ? toIntegration(r) : null
}

export function toggleIntegration(slug) {
  getDb().prepare('UPDATE integrations SET connected = 1 - connected, updated_at = ? WHERE org_id = ? AND slug = ?').run(Date.now(), getOrgId(), slug)
  return getIntegration(slug)
}
