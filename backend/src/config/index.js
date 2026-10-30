import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const env = (k, d = '') => (process.env[k] ?? d).toString().trim()
const list = (v, d) => (v || d).split(',').map((s) => s.trim()).filter(Boolean)
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const dbPath = env('DB_PATH') || path.join('database', 'incident-copilot.db')
export const config = {
  port: Number(env('PORT')) || 4000,
  env: env('NODE_ENV', 'development'),
  corsOrigins: list(env('CORS_ORIGIN'), 'http://localhost:5173'),
  jwtSecret: env('JWT_SECRET', 'development-only-change-this-secret-before-deploying'),
  tokenTtlSeconds: Number(env('JWT_TTL_SECONDS')) || 86400,
  jwtSecret: env('JWT_SECRET', 'development-only-change-this-secret-before-deploying'),
  tokenTtlSeconds: Number(env('JWT_TTL_SECONDS')) || 86400,
  analyzeRateLimit: Number(env('ANALYZE_RATE_LIMIT')) || 30,
  dbPath: dbPath === ':memory:' ? dbPath : path.resolve(backendRoot, dbPath),
  backupDir: path.resolve(backendRoot, env('DB_BACKUP_DIR', 'database/backups')),
  backupRetentionDays: Math.max(1, Number(env('DB_BACKUP_RETENTION_DAYS')) || 7),
  backupIntervalMs: Math.max(1, Number(env('DB_BACKUP_INTERVAL_HOURS')) || 24) * 60 * 60 * 1000,
  seedDemoData: env('SEED_DEMO_DATA', 'true').toLowerCase() !== 'false',
  owner: { orgName: env('ORG_NAME', 'My Workspace'), ownerName: env('OWNER_NAME', 'Workspace Owner'), ownerEmail: env('OWNER_EMAIL', 'owner@example.com') },

  // Claude (Anthropic). The key stays on the server and is never sent to the browser.
  ai: {
    timeoutMs: Number(env('AI_TIMEOUT_MS')) || 60000,
    maxOutputTokens: Number(env('AI_MAX_OUTPUT_TOKENS')) || 8000,
    claude: { key: env('ANTHROPIC_API_KEY'), model: env('ANTHROPIC_MODEL', 'claude-sonnet-5-5'), baseUrl: env('ANTHROPIC_BASE_URL', 'https://api.anthropic.com').replace(/\/$/, '') },
  },
}
