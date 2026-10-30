import { badRequest } from './httpError.js'

export const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)

export function str(body, key, { required = false, max = 200, min = 0 } = {}) {
  const v = body[key]
  if (v === undefined || v === null || v === '') {
    if (required) throw badRequest(`"${key}" is required`)
    return undefined
  }
  if (typeof v !== 'string') throw badRequest(`"${key}" must be a string`)
  const t = v.trim()
  if (t.length < min) throw badRequest(`"${key}" must be at least ${min} characters`)
  if (t.length > max) throw badRequest(`"${key}" must be at most ${max} characters`)
  return t
}

export function oneOf(value, allowed, key) {
  if (!allowed.includes(value)) throw badRequest(`"${key}" must be one of: ${allowed.join(', ')}`)
  return value
}

export const requireBody = (req) => {
  if (!isObj(req.body)) throw badRequest('JSON body required')
  return req.body
}
