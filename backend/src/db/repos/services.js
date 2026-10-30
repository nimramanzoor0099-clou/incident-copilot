import { getDb } from '../index.js'
import { getOrgId } from '../../context.js'

export const listServiceNames = () => getDb().prepare('SELECT name FROM services WHERE org_id = ? ORDER BY id').all(getOrgId()).map((r) => r.name)

export function ensureService(name) {
  const db = getDb()
  db.prepare('INSERT INTO services (org_id, name, created_at) VALUES (?, ?, ?) ON CONFLICT (org_id, name) DO NOTHING').run(getOrgId(), name, Date.now())
  return db.prepare('SELECT id FROM services WHERE org_id = ? AND name = ?').get(getOrgId(), name).id
}
