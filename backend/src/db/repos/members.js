import { getDb, lastId } from '../index.js'
import { getOrgId } from '../../context.js'

export const memberExtId = (id) => `u${id}`
export const parseMemberId = (s) => {
  const m = /^u(\d+)$/.exec(String(s))
  return m ? Number(m[1]) : null
}
const toMember = (r) => ({ id: memberExtId(r.id), name: r.name, email: r.email, role: r.role, status: r.status })

export const listMembers = () => getDb().prepare('SELECT * FROM members WHERE org_id = ? ORDER BY id').all(getOrgId()).map(toMember)

export function getMember(extId) {
  const id = parseMemberId(extId)
  if (id === null) return null
  const r = getDb().prepare('SELECT * FROM members WHERE org_id = ? AND id = ?').get(getOrgId(), id)
  return r ? toMember(r) : null
}

export const emailTaken = (email) => !!getDb().prepare('SELECT 1 FROM members WHERE org_id = ? AND email = ?').get(getOrgId(), email)

export function inviteMember(email, role) {
  const res = getDb().prepare("INSERT INTO members (org_id, name, email, role, status, created_at) VALUES (?, ?, ?, ?, 'invited', ?)").run(getOrgId(), email, email, role, Date.now())
  return getMember(memberExtId(lastId(res)))
}

export function setMemberRole(extId, role) {
  getDb().prepare('UPDATE members SET role = ? WHERE org_id = ? AND id = ?').run(role, getOrgId(), parseMemberId(extId))
  return getMember(extId)
}

// Incidents assigned to this member become unassigned (ON DELETE SET NULL).
export const deleteMember = (extId) => getDb().prepare('DELETE FROM members WHERE org_id = ? AND id = ?').run(getOrgId(), parseMemberId(extId))

export function getOwnerName() {
  const r = getDb().prepare("SELECT name FROM members WHERE org_id = ? AND role = 'Owner'").get(getOrgId())
  return r ? r.name : 'System'
}
