import { analyzeWithRules } from './ruleEngine.js'
import { resolveProvider } from './ai/index.js'
import { SYSTEM_PROMPT, buildUserPrompt, parseJsonReply, normalizeReport } from './ai/prompt.js'
import { config } from '../config/index.js'
import { redact } from './ai/http.js'

// Runs the chosen AI provider. If it fails for any reason, the built-in rule engine answers
// instead and the report carries a `notice` explaining why.
export async function analyze(input, requestedProvider) {
  const provider = resolveProvider(requestedProvider) // throws 400 if an explicitly requested provider has no key
  if (!provider) return analyzeWithRules(input)
  try {
    const text = await provider.complete({ system: SYSTEM_PROMPT, user: buildUserPrompt(input), maxTokens: config.ai.maxOutputTokens })
    return normalizeReport(parseJsonReply(text), input, { provider: provider.id, model: provider.model })
  } catch (err) {
    const reason = redact(err.message)
    console.warn(`${provider.label} analysis failed (${reason}); using the built-in engine`)
    return { ...analyzeWithRules(input), notice: `${provider.label} could not be reached (${reason}). Showing the built-in engine result instead.` }
  }
}
