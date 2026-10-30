import { initDb, getDb } from './index.js'
import { isEmpty, seedDemoData, bootstrapEmpty } from './seed.js'

// Opens the database, applies migrations, and fills an empty database with demo or starter data.
export function bootstrapDatabase({ file, seedDemo = true, owner = {} }) {
  const db = initDb(file)
  if (isEmpty(db)) (seedDemo ? seedDemoData(db) : bootstrapEmpty(db, owner))
  return getDb()
}
