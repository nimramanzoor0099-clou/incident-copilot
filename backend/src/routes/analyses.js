import { Router } from 'express'
import { allowRoles } from '../middleware/auth.js'
import { listAnalyses, getAnalysis, deleteAnalysis } from '../db/repos/analyses.js'
import { notFound } from '../utils/httpError.js'

const router = Router()

// GET /api/analyses?limit=  -> saved Copilot reports, newest first
router.get('/', (req, res) => res.json(listAnalyses(Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20)))))
router.get('/:id', (req, res) => {
  const a = getAnalysis(req.params.id)
  if (!a) throw notFound('Analysis not found')
  res.json(a)
})
router.delete('/:id', allowRoles('Owner', 'Admin', 'Responder'), (req, res) => {
  if (!deleteAnalysis(req.params.id)) throw notFound('Analysis not found')
  res.status(204).end()
})

export default router
