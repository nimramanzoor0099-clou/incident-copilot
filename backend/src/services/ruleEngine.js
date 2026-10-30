import { KNOWLEDGE, FALLBACK } from '../data/knowledge.js'

function pickEvidence(log, test) {
  const lines = log.split('\n').map((l) => l.trim()).filter(Boolean)
  const hits = lines.filter((l) => test && new RegExp(test.source, 'i').test(l))
  return (hits.length ? hits : lines).slice(0, 3).map((l) => (l.length > 180 ? l.slice(0, 177) + '...' : l))
}

export function analyzeWithRules({ log, service, environment, stack }) {
  const entry = KNOWLEDGE.find((k) => k.test.test(log)) || FALLBACK
  const matched = entry.test ? log.split('\n').filter((l) => entry.test.test(l)).length : 0
  return {
    id: `inc-${Date.now().toString(36)}`,
    createdAt: Date.now(),
    engine: 'rules',
    provider: 'rules',
    model: 'built-in',
    title: entry.title,
    category: entry.category,
    severity: entry.severity,
    confidence: Math.min(97, entry.confidence + Math.min(8, matched * 3)),
    summary: entry.summary,
    evidence: pickEvidence(log, entry.test),
    context: { service: service || 'Unnamed service', environment, stack },
    causes: entry.causes,
    fixes: entry.fixes,
    prevention: entry.prevention,
  }
}
