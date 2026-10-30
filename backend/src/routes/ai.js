import { Router } from 'express'
import { describeProviders, getProvider } from '../services/ai/index.js'
import { SYSTEM_PROMPT, parseJsonReply } from '../services/ai/prompt.js'
import { redact } from '../services/ai/http.js'
import { asyncHandler, badRequest, notFound } from '../utils/httpError.js'

const router = Router()

function need(id) {
  const p = getProvider(id)
  if (!p) throw notFound(`Unknown provider "${id}"`)
  if (!p.isConfigured()) throw badRequest(`${p.label} is not configured. Add ${p.envKey} to backend/.env and restart the backend.`)
  return p
}

// GET /api/ai/providers -> which providers have a key, the models in use, and the default
router.get('/providers', (req, res) => res.json(describeProviders()))

// POST /api/ai/providers/:id/test -> sends a tiny request to check the key and model name
router.post('/providers/:id/test', asyncHandler(async (req, res) => {
  const p = need(req.params.id)
  const t = Date.now()
  try {
    const text = await p.complete({ system: 'Reply with the JSON object {"ok":true} and nothing else.', user: 'ping', maxTokens: 200 })
    const ok = parseJsonReply(text).ok === true
    res.json({ ok, provider: p.id, model: p.model, ms: Date.now() - t, ...(ok ? {} : { error: 'Connected, but the reply was not the expected JSON.' }) })
  } catch (err) {
    res.json({ ok: false, provider: p.id, model: p.model, ms: Date.now() - t, error: redact(err.message) })
  }
}))

// GET /api/ai/providers/:id/models -> model ids your key can use (copy one into the *_MODEL setting)
router.get('/providers/:id/models', asyncHandler(async (req, res) => {
  const p = need(req.params.id)
  try {
    res.json({ provider: p.id, current: p.model, models: await p.listModels() })
  } catch (err) {
    res.status(502).json({ error: `Could not list ${p.label} models: ${redact(err.message)}` })
  }
}))

export default router
