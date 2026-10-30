import { Router } from 'express'
import { allowRoles } from '../middleware/auth.js'
import { SEVERITIES, STATUSES } from '../data/seed.js'
import { listSummaries, getFull, createIncident, updateIncident, addNote, getLogText } from '../db/repos/incidents.js'
import { saveAnalysis } from '../db/repos/analyses.js'
import { analyze } from '../services/analyzer.js'
import { asyncHandler, badRequest, notFound } from '../utils/httpError.js'
import { requireBody, str, oneOf } from '../utils/validate.js'

const PROVIDERS = ['auto', 'rules', 'claude']

const router = Router()
const found = (inc, id) => { if (!inc) throw notFound(`Incident ${id} not found`); return inc }

// GET /api/incidents?q=&status=&severity=&service=&assignee=&sort=newest|oldest|severity&page=&limit=
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 8))
  res.json(listSummaries({ ...req.query, page, limit }))
})

// GET /api/incidents/:id  (full record: logs, stack trace, timeline)
router.get('/:id', (req, res) => res.json(found(getFull(req.params.id), req.params.id)))

// POST /api/incidents
router.post('/', allowRoles('Owner', 'Admin', 'Responder'), (req, res) => {
  const body = requireBody(req)
  const title = str(body, 'title', { required: true, max: 200 })
  const service = str(body, 'service', { required: true, max: 100 })
  const log = str(body, 'log', { required: true, min: 5, max: 20000 })
  const severity = oneOf(body.severity || 'medium', SEVERITIES, 'severity')
  const env = oneOf(body.env || 'Production', ['Production', 'Staging', 'Development'], 'env')
  const analysisId = str(body, 'analysisId', { max: 100 })
  res.status(201).json(createIncident({ title, service, severity, env, log, analysisId }))
})

// PATCH /api/incidents/:id  { status?, assigneeId?, severity? }
router.patch('/:id', allowRoles('Owner', 'Admin', 'Responder'), (req, res) => {
  const body = requireBody(req)
  found(getFull(req.params.id), req.params.id)
  if (body.status === undefined && body.assigneeId === undefined && body.severity === undefined)
    throw badRequest('Provide at least one of: status, assigneeId, severity')
  if (body.status !== undefined) oneOf(body.status, STATUSES, 'status')
  if (body.severity !== undefined) oneOf(body.severity, SEVERITIES, 'severity')
  res.json(updateIncident(req.params.id, body))
})

// POST /api/incidents/:id/notes  { text }
router.post('/:id/notes', allowRoles('Owner', 'Admin', 'Responder'), (req, res) => {
  const text = str(requireBody(req), 'text', { required: true, max: 2000 })
  res.status(201).json(addNote(req.params.id, text))
})

// POST /api/incidents/:id/analyze  -> run the copilot on the incident's own log
router.post('/:id/analyze', allowRoles('Owner', 'Admin', 'Responder'), asyncHandler(async (req, res) => {
  const row = found(getLogText(req.params.id), req.params.id)
  const provider = req.body?.provider === undefined ? 'auto' : oneOf(req.body.provider, PROVIDERS, 'provider')
  const report = await analyze({ log: row.log_text, service: getFull(req.params.id).service, environment: row.environment, stack: String(req.body?.stack || 'Other') }, provider)
  saveAnalysis(report, { log: row.log_text, incidentId: req.params.id })
  res.json(report)
}))

export default router
