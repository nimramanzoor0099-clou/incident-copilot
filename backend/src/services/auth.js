import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { config } from '../config/index.js'
const scrypt = promisify(scryptCb)
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64)
  return `scrypt$${salt}$${Buffer.from(key).toString('hex')}`
}
export async function verifyPassword(password, stored) {
  if (typeof password !== 'string') return false
  const [scheme, salt, hex] = String(stored || '').split('$')
  if (scheme !== 'scrypt' || !salt || !hex) return false
  const key = Buffer.from(await scrypt(password, salt, 64))
  const expected = Buffer.from(hex, 'hex')
  return key.length === expected.length && timingSafeEqual(key, expected)
}
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url')
export function signToken(payload) {
  const now = Math.floor(Date.now()/1000)
  const head = b64({ alg: 'HS256', typ: 'JWT' })
  const body = b64({ ...payload, iat: now, exp: now + config.tokenTtlSeconds })
  const input = `${head}.${body}`
  const sig = createHmac('sha256', config.jwtSecret).update(input).digest('base64url')
  return `${input}.${sig}`
}
export function verifyToken(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3) return null
  const input = `${parts[0]}.${parts[1]}`
  const sig = createHmac('sha256', config.jwtSecret).update(input).digest()
  let supplied
  try { supplied = Buffer.from(parts[2], 'base64url') } catch { return null }
  if (sig.length !== supplied.length || !timingSafeEqual(sig, supplied)) return null
  try { const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString()); return p.exp > Math.floor(Date.now()/1000) ? p : null } catch { return null }
}
