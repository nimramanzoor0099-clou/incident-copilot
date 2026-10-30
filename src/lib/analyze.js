import { KNOWLEDGE, FALLBACK } from './knowledge'
import { api, ApiError } from './api'

export const STAGES = [
  { label: 'Reading the error and stack trace', hint: 'Extracting messages, codes and file paths' },
  { label: 'Matching known failure patterns', hint: 'Comparing against common production incidents' },
  { label: 'Ranking the likely causes', hint: 'Scoring each cause by supporting evidence' },
  { label: 'Writing the fix plan', hint: 'Preparing commands and prevention steps' },
]

// The backend is used by default. Set VITE_API_URL only to point analysis at a different endpoint.
const API_URL = (import.meta.env.VITE_API_URL || '').trim()
export const ENGINE_MODE = 'api'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function pickEvidence(log, test) {
  const lines = log.split('\n').map((l) => l.trim()).filter(Boolean)
  const hits = lines.filter((l) => test && new RegExp(test.source, 'i').test(l))
  const chosen = (hits.length ? hits : lines).slice(0, 3)
  return chosen.map((l) => (l.length > 180 ? l.slice(0, 177) + '...' : l))
}

export function analyzeLocally({ log, service, environment, stack }) {
  const entry = KNOWLEDGE.find((k) => k.test.test(log)) || FALLBACK
  const evidence = pickEvidence(log, entry.test)
  const matched = entry.test ? log.split('\n').filter((l) => entry.test.test(l)).length : 0
  const confidence = Math.min(97, entry.confidence + Math.min(8, matched * 3))

  return {
    id: `inc-${Date.now().toString(36)}`,
    createdAt: Date.now(),
    title: entry.title,
    category: entry.category,
    severity: entry.severity,
    confidence,
    summary: entry.summary,
    evidence,
    context: { service: service || 'Unnamed service', environment, stack },
    causes: entry.causes,
    fixes: entry.fixes,
    prevention: entry.prevention,
  }
}

/**
 * Analyze an incident.
 * POSTs { log, service, environment, stack } to the backend (/api/analyze).
 * If the backend cannot be reached, falls back to the built-in sample engine.
 */
export async function analyzeIncident(input, onStage = () => {}) {
  const stageMs = 750
  const animate = (async () => {
    for (let i = 0; i < STAGES.length; i++) {
      onStage(i)
      await wait(stageMs)
    }
  })()

  let report
  try {
    if (API_URL) {
      const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })
      if (!res.ok) throw new ApiError(res.status, `The analysis service returned ${res.status}. Check the endpoint and try again.`)
      report = await res.json()
    } else {
      report = await api('/analyze', { method: 'POST', body: input })
    }
    report.id = report.id || `inc-${Date.now().toString(36)}`
    report.createdAt = report.createdAt || Date.now()
  } catch (e) {
    // Backend not running: keep the app usable with the built-in sample engine.
    if (e instanceof ApiError && e.status === 0 || e instanceof TypeError) report = analyzeLocally(input)
    else throw e
  }

  await animate
  onStage(STAGES.length)
  await wait(250)
  return report
}
