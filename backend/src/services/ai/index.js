import { badRequest } from '../../utils/httpError.js'
import claude from './providers/claude.js'

const PROVIDERS = { claude }
export const PROVIDER_IDS = Object.keys(PROVIDERS)
export const getProvider = (id) => PROVIDERS[id] || null

// Claude when ANTHROPIC_API_KEY is set, otherwise null (the built-in rule engine answers).
export const defaultProvider = () => (claude.isConfigured() ? claude : null)

// requested: undefined | 'auto' | 'rules' | 'claude'. Returns a provider, or null for the built-in rule engine.
export function resolveProvider(requested) {
  if (!requested || requested === 'auto') return defaultProvider()
  if (requested === 'rules') return null
  const p = PROVIDERS[requested]
  if (!p) throw badRequest('"provider" must be one of: auto, rules, claude')
  if (!p.isConfigured()) throw badRequest(`${p.label} is not configured. Add ${p.envKey} to backend/.env and restart the backend.`)
  return p
}

export function describeProviders() {
  const def = defaultProvider()
  return {
    default: def ? def.id : 'rules',
    providers: PROVIDER_IDS.map((id) => {
      const p = PROVIDERS[id]
      return { id, label: p.label, vendor: p.vendor, model: p.model, configured: p.isConfigured(), envKey: p.envKey }
    }),
  }
}
