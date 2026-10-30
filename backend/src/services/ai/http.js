import { config } from '../../config/index.js'

export class AiError extends Error {
  constructor(message, { status = 0, retryable = false } = {}) {
    super(message)
    this.status = status
    this.retryable = retryable
  }
}

// Removes anything that looks like an API key from text that may be shown to users or logged.
export function redact(text) {
  let out = String(text ?? '')
  if (config.ai.claude.key) out = out.split(config.ai.claude.key).join('[redacted]')
  return out.replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[redacted]').replace(/\s+/g, ' ').trim().slice(0, 240)
}

const RETRY = new Set([408, 429, 500, 502, 503, 504, 529])
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function apiMessage(data, status) {
  const m = data?.error?.message || data?.error || data?.message || data?.detail
  return `HTTP ${status}${m ? `: ${typeof m === 'string' ? m : JSON.stringify(m)}` : ''}`
}

// JSON request with timeout, one retry on rate-limit/overload, and sanitized errors.
export async function requestJson(url, { method = 'POST', headers = {}, body } = {}) {
  for (let attempt = 0; ; attempt++) {
    let res
    try {
      res = await fetch(url, {
        method,
        headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(config.ai.timeoutMs),
      })
    } catch (err) {
      if (err?.name === 'TimeoutError') throw new AiError(`request timed out after ${Math.round(config.ai.timeoutMs / 1000)}s`, { retryable: true })
      throw new AiError(`network error (${redact(err?.cause?.code || err?.message || 'unknown')})`, { retryable: true })
    }
    const data = await res.json().catch(() => null)
    if (res.ok) return data
    if (attempt === 0 && RETRY.has(res.status)) { await sleep(800); continue }
    throw new AiError(redact(apiMessage(data, res.status)), { status: res.status, retryable: RETRY.has(res.status) })
  }
}
