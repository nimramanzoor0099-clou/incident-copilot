// Usage: node src/db/cli.js <status | reset | backup [file]>
import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config/index.js'
import { bootstrapDatabase } from './bootstrap.js'
import { closeDb } from './index.js'

const [cmd, arg] = process.argv.slice(2)
const file = config.dbPath
const rm = () => ['', '-wal', '-shm'].forEach((s) => fs.rmSync(file + s, { force: true }))

const TABLES = ['organizations', 'members', 'services', 'integrations', 'audit_log', 'incidents', 'incident_logs', 'incident_stack_traces',
  'incident_stack_frames', 'incident_events', 'analyses', 'analysis_evidence', 'analysis_causes', 'analysis_fixes', 'analysis_prevention']

if (cmd === 'reset') {
  rm()
  console.log(`Deleted ${file}`)
}
if (cmd === 'reset' || cmd === 'status') {
  const db = bootstrapDatabase({ file, seedDemo: config.seedDemoData, owner: config.owner })
  console.log(`Database: ${file}`)
  console.log('Migrations:', db.prepare('SELECT version FROM schema_migrations ORDER BY version').all().map((r) => r.version).join(', '))
  console.table(Object.fromEntries(TABLES.map((t) => [t, { rows: db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n }])))
} else if (cmd === 'backup') {
  const db = bootstrapDatabase({ file, seedDemo: config.seedDemoData, owner: config.owner })
  const out = path.resolve(arg || `${file}.${new Date().toISOString().slice(0, 10)}.bak`)
  if (fs.existsSync(out)) { console.error(`Refusing to overwrite ${out}`); process.exit(1) }
  db.exec(`VACUUM INTO '${out.replace(/'/g, "''")}'`)
  console.log(`Backup written to ${out}`)
} else if (cmd !== 'reset') {
  console.log('Usage: node src/db/cli.js <status | reset | backup [file]>')
}
closeDb()
