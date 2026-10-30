import { verifyToken } from '../services/auth.js'
import { runWithWorkspace } from '../context.js'
import { getDb } from '../db/index.js'

export function requireAuth(req, res, next) {
  const token = (req.get('authorization') || '').match(/^Bearer\s+(.+)$/i)?.[1]
  const claims = verifyToken(token)
  if (!claims || !Number.isInteger(Number(claims.orgId)) || !Number.isInteger(Number(claims.userId)))
    return res.status(401).json({ error: 'Please sign in to continue.' })

  // Re-read the account and role on every request. This makes role changes and account
  // deletion take effect immediately instead of waiting for a JWT to expire.
  const user = getDb().prepare(`
    SELECT u.id AS userId, u.org_id AS orgId, u.member_id AS memberId,
           u.name, u.email, m.role, m.status
    FROM auth_users u
    JOIN members m ON m.id = u.member_id AND m.org_id = u.org_id
    WHERE u.id = ? AND u.org_id = ?
  `).get(Number(claims.userId), Number(claims.orgId))

  if (!user || user.status !== 'active') return res.status(401).json({ error: 'Your account is no longer active. Please sign in again.' })
  req.auth = { ...user, memberId: `u${user.memberId}` }
  runWithWorkspace({ ...req.auth, orgId: Number(user.orgId) }, next)
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.auth || !roles.includes(req.auth.role)) return res.status(403).json({ error: 'You do not have permission to perform this action.' })
  next()
}
