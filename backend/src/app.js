import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { config } from './config/index.js'
import { requireAuth, allowRoles } from './middleware/auth.js'
import authRoutes from './routes/auth.js'
import { errorHandler, notFoundHandler } from './middleware/errors.js'
import { defaultProvider } from './services/ai/index.js'
import aiRoutes from './routes/ai.js'
import analyzeRoutes from './routes/analyze.js'
import incidentRoutes from './routes/incidents.js'
import memberRoutes from './routes/members.js'
import analysesRoutes from './routes/analyses.js'
import workspaceRoutes from './routes/workspace.js'
import { getDb } from './db/index.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins }))
  app.use(express.json({ limit: '256kb' }))

  if (config.env !== 'test') {
    app.use((req, res, next) => {
      const t = Date.now()
      res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t}ms`))
      next()
    })
  }

  app.get('/health', (req, res) => {
    let database = 'ok'
    try { getDb().prepare('SELECT 1').get() } catch { database = 'error' }
    res.status(database === 'ok' ? 200 : 503).json({ status: database === 'ok' ? 'ok' : 'degraded', uptime: Math.round(process.uptime()), engine: defaultProvider()?.id ?? 'rules', database })
  })

  app.use('/api/auth', rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many sign-in attempts. Please try again shortly.' } }), authRoutes)

  const api = express.Router()
  api.use(requireAuth)
  api.get('/auth/me', (req, res) => res.json({ user: req.auth }))
  api.use('/analyze', allowRoles('Owner', 'Admin', 'Responder'), rateLimit({ windowMs: 60_000, limit: config.analyzeRateLimit, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many analysis requests, slow down.' } }), analyzeRoutes)
  api.use('/ai', allowRoles('Owner', 'Admin'), rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, slow down.' } }), aiRoutes)
  api.use('/incidents', incidentRoutes)
  api.use('/analyses', analysesRoutes)
  api.use('/members', allowRoles('Owner', 'Admin'), memberRoutes)
  api.use('/', workspaceRoutes)
  app.use('/api', api)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
