import { Router } from 'express'
import { getDb, tx } from '../db/index.js'
import { hashPassword, verifyPassword, signToken } from '../services/auth.js'
import { makeSeed, SERVICES } from '../data/seed.js'
import { badRequest, asyncHandler } from '../utils/httpError.js'
const router = Router()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const publicUser = (r) => ({ id: r.id, orgId: r.org_id, memberId: `u${r.member_id}`, name: r.name, email: r.email, role: r.role || 'Owner' })
function issue(res, row) { const user = publicUser(row); res.json({ user, token: signToken({ userId: user.id, orgId: user.orgId, memberId: user.memberId, name: user.name, email: user.email, role: user.role }) }) }
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, workspaceName } = req.body || {}
  const cleanName = String(name || '').trim(), cleanEmail = String(email || '').trim().toLowerCase(), cleanWorkspace = String(workspaceName || `${cleanName}'s Workspace`).trim()
  if (cleanName.length < 2 || cleanName.length > 100) throw badRequest('Name must be between 2 and 100 characters.')
  if (!EMAIL.test(cleanEmail) || cleanEmail.length > 200) throw badRequest('Enter a valid email address.')
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw badRequest('Password must contain at least 10 characters.')
  if (cleanWorkspace.length < 2 || cleanWorkspace.length > 100) throw badRequest('Workspace name must be between 2 and 100 characters.')
  const db = getDb()
  if (db.prepare('SELECT 1 FROM auth_users WHERE email = ?').get(cleanEmail)) throw badRequest('An account with this email already exists.')
  const passwordHash = await hashPassword(password), now = Date.now(), seed = makeSeed()
  const slugBase = cleanWorkspace.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 38) || 'workspace'
  let orgId, userId, memberId
  tx(() => {
    // The first account claims the existing starter/demo workspace so existing sample
    // incidents are preserved. Every later signup receives a completely separate org.
    const hasAccounts = db.prepare('SELECT COUNT(*) AS n FROM auth_users').get().n > 0
    const starter = hasAccounts ? null : db.prepare('SELECT id FROM organizations ORDER BY id LIMIT 1').get()
    if (starter) {
      orgId = Number(starter.id)
      db.prepare('UPDATE organizations SET name = ?, updated_at = ? WHERE id = ?').run(cleanWorkspace, now, orgId)
      const owner = db.prepare("SELECT id FROM members WHERE org_id = ? AND role = 'Owner' LIMIT 1").get(orgId)
      const matching = db.prepare('SELECT id FROM members WHERE org_id = ? AND email = ?').get(orgId, cleanEmail)
      if (owner && matching && Number(owner.id) !== Number(matching.id)) {
        db.prepare("UPDATE members SET role = 'Admin' WHERE id = ? AND org_id = ?").run(owner.id, orgId)
        db.prepare("UPDATE members SET name = ?, role = 'Owner', status = 'active' WHERE id = ? AND org_id = ?").run(cleanName, matching.id, orgId)
        memberId = Number(matching.id)
      } else if (owner) {
        db.prepare("UPDATE members SET name = ?, email = ?, role = 'Owner', status = 'active' WHERE id = ? AND org_id = ?").run(cleanName, cleanEmail, owner.id, orgId)
        memberId = Number(owner.id)
      } else if (matching) {
        db.prepare("UPDATE members SET name = ?, role = 'Owner', status = 'active' WHERE id = ? AND org_id = ?").run(cleanName, matching.id, orgId)
        memberId = Number(matching.id)
      } else {
        memberId = Number(db.prepare("INSERT INTO members (org_id, name, email, role, status, created_at) VALUES (?, ?, ?, 'Owner', 'active', ?)").run(orgId, cleanName, cleanEmail, now).lastInsertRowid)
      }
    } else {
      const slug = `${slugBase}-${Math.random().toString(36).slice(2,8)}`
      orgId = Number(db.prepare('INSERT INTO organizations (name, slug, created_at, updated_at) VALUES (?, ?, ?, ?)').run(cleanWorkspace, slug, now, now).lastInsertRowid)
      memberId = Number(db.prepare("INSERT INTO members (org_id, name, email, role, status, created_at) VALUES (?, ?, ?, 'Owner', 'active', ?)").run(orgId, cleanName, cleanEmail, now).lastInsertRowid)
    }
    userId = Number(db.prepare('INSERT INTO auth_users (org_id, member_id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(orgId, memberId, cleanName, cleanEmail, passwordHash, now).lastInsertRowid)
    const addService = db.prepare('INSERT INTO services (org_id, name, created_at) VALUES (?, ?, ?) ON CONFLICT (org_id, name) DO NOTHING')
    SERVICES.forEach((service) => addService.run(orgId, service, now))
    const addIntegration = db.prepare('INSERT INTO integrations (org_id, slug, name, description, color, connected, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?) ON CONFLICT (org_id, slug) DO NOTHING')
    seed.integrations.forEach((it) => addIntegration.run(orgId, it.id, it.name, it.desc, it.color, now))
  })
  const row = { id: userId, org_id: orgId, member_id: memberId, name: cleanName, email: cleanEmail, role: 'Owner' }
  res.status(201); issue(res, row)
}))
router.post('/login', asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase(), password = req.body?.password
  const row = getDb().prepare(`SELECT u.*, m.role FROM auth_users u JOIN members m ON m.id=u.member_id AND m.org_id=u.org_id WHERE u.email=?`).get(email)
  if (!row || !await verifyPassword(password, row.password_hash)) return res.status(401).json({ error: 'Email or password is incorrect.' })
  getDb().prepare('UPDATE auth_users SET last_login_at=? WHERE id=?').run(Date.now(), row.id)
  issue(res, row)
}))
export default router
