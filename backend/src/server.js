import { createApp } from './app.js'
import { config } from './config/index.js'
import { bootstrapDatabase } from './db/bootstrap.js'
import { closeDb } from './db/index.js'
import { purgeAllExpiredAnalyses } from './db/repos/analyses.js'
import { createAutomaticBackup } from './db/backup.js'

if (config.env === 'production' && config.jwtSecret === 'development-only-change-this-secret-before-deploying') {
  throw new Error('Set a strong JWT_SECRET before starting in production.')
}

bootstrapDatabase({ file: config.dbPath, seedDemo: config.seedDemoData, owner: config.owner })
const purged = purgeAllExpiredAnalyses()
console.log(`Database ready: ${config.dbPath}${purged ? ` (removed ${purged} expired analyses)` : ''}`)

try {
  const backup = createAutomaticBackup()
  if (backup) console.log(`Database backup created: ${backup}`)
} catch (err) { console.error('Initial database backup failed:', err.message) }
const backupTimer = config.dbPath === ':memory:' ? null : setInterval(() => {
  try { console.log(`Database backup created: ${createAutomaticBackup()}`) }
  catch (err) { console.error('Scheduled database backup failed:', err.message) }
}, config.backupIntervalMs)
backupTimer?.unref()

const server = createApp().listen(config.port, () => {
  console.log(`Incident Copilot API listening on http://localhost:${config.port}`)
})

const stop = () => server.close(() => { if (backupTimer) clearInterval(backupTimer); closeDb(); process.exit(0) })
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
