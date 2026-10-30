import { Router } from 'express'
import { allowRoles } from '../middleware/auth.js'
import { analyze } from '../services/analyzer.js'
import { saveAnalysis } from '../db/repos/analyses.js'
import { asyncHandler } from '../utils/httpError.js'
import { requireBody, str, oneOf } from '../utils/validate.js'

const router = Router()
const ENVS = ['Production', 'Staging', 'Development']
const PROVIDERS = ['auto', 'rules', 'claude']
const STACKS = ['Node.js', 'Python', 'Java', 'Go', '.NET', 'Kubernetes', 'Other']

// POST /api/analyze  { log, service?, environment?, stack?, provider? }  -> analysis report (also saved to the database)
router.post('/', allowRoles('Owner', 'Admin', 'Responder'), asyncHandler(async (req, res) => {
  const body = requireBody(req)
  const log = str(body, 'log', { required: true, min: 5, max: 20000 })
  const service = str(body, 'service', { max: 100 })
  const environment = str(body, 'environment', { max: 30 }) || 'Production'
  const stack = str(body, 'stack', { max: 30 }) || 'Other'
  if (body.environment) oneOf(environment, ENVS, 'environment')
  if (body.stack) oneOf(stack, STACKS, 'stack')
  const provider = body.provider === undefined ? 'auto' : oneOf(body.provider, PROVIDERS, 'provider')
  const report = await analyze({ log, service, environment, stack }, provider)
  try {
    saveAnalysis(report, { log })
  } catch (err) {
    console.warn('Could not save analysis:', err.message) // never fail the request because history could not be stored
  }
  res.json(report)
}))

export default router
