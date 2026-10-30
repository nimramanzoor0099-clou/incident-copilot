import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations')

// Applies every NNN_name.sql file that has not run yet, each inside its own transaction.
export function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at INTEGER NOT NULL) STRICT')
  const done = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version))
  const files = fs.readdirSync(DIR).filter((f) => /^\d+_.+\.sql$/.test(f)).sort()
  const applied = []
  for (const file of files) {
    const version = file.replace(/\.sql$/, '')
    if (done.has(version)) continue
    db.exec('BEGIN')
    try {
      db.exec(fs.readFileSync(path.join(DIR, file), 'utf8'))
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, Date.now())
      db.exec('COMMIT')
      applied.push(version)
    } catch (err) {
      db.exec('ROLLBACK')
      throw new Error(`Migration ${file} failed: ${err.message}`)
    }
  }
  return applied
}
