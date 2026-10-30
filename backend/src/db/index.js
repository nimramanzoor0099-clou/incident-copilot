import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { migrate } from './migrate.js'

let db = null
let depth = 0

export function initDb(file) {
  if (db) return db
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true })
  db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;')
  migrate(db)
  return db
}

export function getDb() {
  if (!db) throw new Error('Database is not initialised. Call initDb() first.')
  return db
}

export function closeDb() {
  if (db) { db.close(); db = null; depth = 0 }
}

// Runs fn inside a transaction (synchronous only). Nested calls join the outer transaction.
export function tx(fn) {
  const d = getDb()
  if (depth > 0) return fn()
  d.exec('BEGIN IMMEDIATE')
  depth++
  try {
    const result = fn()
    d.exec('COMMIT')
    return result
  } catch (err) {
    d.exec('ROLLBACK')
    throw err
  } finally {
    depth--
  }
}

export const lastId = (res) => Number(res.lastInsertRowid)
export const bool = (v) => (v ? 1 : 0)
