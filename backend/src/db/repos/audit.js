import { getDb, lastId } from '../index.js'
import { getOrgId, getWorkspace } from '../../context.js'
import { getOwnerName } from './members.js'

const toEntry = (r) => ({ id: r.id, t: r.occurred_at, actor: r.actor, action: r.action, target: r.target })

export function addAudit(action, target, actor = getWorkspace()?.name || getOwnerName()) {
  const t = Date.now()
  const res = getDb().prepare('INSERT INTO audit_log (org_id, occurred_at, actor, action, target) VALUES (?, ?, ?, ?, ?)').run(getOrgId(), t, actor, action, target)
  return { id: lastId(res), t, actor, action, target }
}

export const listAudit = (limit = 200) =>
  getDb().prepare('SELECT * FROM audit_log WHERE org_id = ? ORDER BY occurred_at DESC, id DESC LIMIT ?').all(getOrgId(), limit).map(toEntry)
