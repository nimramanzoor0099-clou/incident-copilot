import { Router } from 'express'
import { ROLES } from '../data/seed.js'
import { listMembers, getMember, emailTaken, inviteMember, setMemberRole, deleteMember } from '../db/repos/members.js'
import { addAudit } from '../db/repos/audit.js'
import { tx } from '../db/index.js'
import { badRequest, notFound } from '../utils/httpError.js'
import { requireBody, str, oneOf } from '../utils/validate.js'

const router = Router()
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ASSIGNABLE = ROLES.filter((r) => r !== 'Owner')
const find = (id) => getMember(id) || (() => { throw notFound('Member not found') })()

router.get('/', (req, res) => res.json(listMembers()))

// POST /api/members  { email, role }  (invite)
router.post('/', (req, res) => {
  const body = requireBody(req)
  const email = str(body, 'email', { required: true, max: 200 }).toLowerCase()
  if (!EMAIL.test(email)) throw badRequest('"email" is not a valid address')
  const role = oneOf(body.role || 'Responder', ASSIGNABLE, 'role')
  if (emailTaken(email)) throw badRequest('That email is already a member or invited')
  res.status(201).json(tx(() => { const m = inviteMember(email, role); addAudit('Invited member', email); return m }))
})

// PATCH /api/members/:id  { role }
router.patch('/:id', (req, res) => {
  const m = find(req.params.id)
  if (m.role === 'Owner') throw badRequest("The Owner's role cannot be changed")
  const role = oneOf(requireBody(req).role, ASSIGNABLE, 'role')
  if (role === m.role) return res.json(m)
  res.json(tx(() => { const u = setMemberRole(m.id, role); addAudit(`Changed role to ${role}`, m.name); return u }))
})

router.delete('/:id', (req, res) => {
  const m = find(req.params.id)
  if (m.role === 'Owner') throw badRequest('The Owner cannot be removed')
  tx(() => { deleteMember(m.id); addAudit('Removed member', m.name) })
  res.status(204).end()
})

export default router
