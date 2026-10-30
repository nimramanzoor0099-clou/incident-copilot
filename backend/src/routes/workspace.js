import { Router } from 'express'
import { allowRoles } from '../middleware/auth.js'
import { SEVERITIES, STATUSES, STATUS_LABEL, ROLES, ROLE_INFO } from '../data/seed.js'
import { listFull } from '../db/repos/incidents.js'
import { listMembers } from '../db/repos/members.js'
import { listAudit, addAudit } from '../db/repos/audit.js'
import { listIntegrations, getIntegration, toggleIntegration } from '../db/repos/integrations.js'
import { getOrg, updateOrg } from '../db/repos/org.js'
import { listServiceNames } from '../db/repos/services.js'
import { getDashboard } from '../db/repos/dashboard.js'
import { tx } from '../db/index.js'
import { notFound, badRequest } from '../utils/httpError.js'
import { requireBody, str, oneOf } from '../utils/validate.js'

const router = Router()

// --- full workspace snapshot (what the frontend loads on startup) ---
router.get('/state', (req, res) => {
  res.json({ incidents: listFull(), members: listMembers(), audit: listAudit(200), integrations: listIntegrations(), org: getOrg(), user: req.auth })
})

// --- integrations ---
router.get('/integrations', (req, res) => res.json(listIntegrations()))
router.post('/integrations/:id/toggle', allowRoles('Owner', 'Admin'), (req, res) => {
  const it = getIntegration(req.params.id)
  if (!it) throw notFound('Integration not found')
  res.json(tx(() => {
    addAudit(it.connected ? 'Disconnected integration' : 'Connected integration', it.name)
    return toggleIntegration(it.id)
  }))
})

// --- organization settings ---
router.get('/org', (req, res) => res.json(getOrg()))
router.put('/org', allowRoles('Owner', 'Admin'), (req, res) => {
  const b = requireBody(req)
  const cur = getOrg()
  const next = {
    ...cur,
    name: str(b, 'name', { max: 100 }) ?? cur.name,
    slug: str(b, 'slug', { max: 50 }) ?? cur.slug,
    timezone: str(b, 'timezone', { max: 60 }) ?? cur.timezone,
    retention: b.retention !== undefined ? oneOf(String(b.retention), ['30', '90', '180', '365'], 'retention') : cur.retention,
    defaultSeverity: b.defaultSeverity !== undefined ? oneOf(b.defaultSeverity, SEVERITIES, 'defaultSeverity') : cur.defaultSeverity,
  }
  for (const k of ['autoPage', 'digest', 'requireMfa']) {
    if (b[k] !== undefined) {
      if (typeof b[k] !== 'boolean') throw badRequest(`"${k}" must be a boolean`)
      next[k] = b[k]
    }
  }
  if (!/^[a-z0-9-]+$/.test(next.slug)) throw badRequest('"slug" may only contain lowercase letters, numbers and hyphens')
  res.json(tx(() => { const o = updateOrg(next); addAudit('Updated organization settings', 'General'); return o }))
})

// --- audit log ---
router.get('/audit', (req, res) => res.json(listAudit(Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50)))))

// --- static lookups used by filters and forms ---
router.get('/meta', (req, res) => res.json({ services: listServiceNames(), severities: SEVERITIES, statuses: STATUSES, statusLabels: STATUS_LABEL, roles: ROLES, roleInfo: ROLE_INFO }))

// --- dashboard aggregates ---
router.get('/dashboard', (req, res) => res.json(getDashboard()))

export default router
