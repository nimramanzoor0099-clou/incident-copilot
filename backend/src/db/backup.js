import fs from 'node:fs'
import path from 'node:path'
import { getDb } from './index.js'
import { config } from '../config/index.js'

export function createAutomaticBackup() {
  if (config.dbPath === ':memory:') return null
  fs.mkdirSync(config.backupDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const target = path.join(config.backupDir, `incident-copilot-${stamp}.db`)
  getDb().exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`)
  const cutoff = Date.now() - config.backupRetentionDays * 864e5
  for (const name of fs.readdirSync(config.backupDir)) {
    if (!/^incident-copilot-.+\.db$/.test(name)) continue
    const file = path.join(config.backupDir, name)
    try { if (fs.statSync(file).mtimeMs < cutoff) fs.rmSync(file, { force: true }) } catch { /* ignore files removed during cleanup */ }
  }
  return target
}
