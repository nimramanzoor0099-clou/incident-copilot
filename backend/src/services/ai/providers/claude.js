import { config } from '../../../config/index.js'
import { requestJson, AiError } from '../http.js'

const c = () => config.ai.claude
const headers = () => ({ 'x-api-key': c().key, 'anthropic-version': '2023-06-01' })

export default {
  id: 'claude',
  label: 'Claude',
  vendor: 'Anthropic',
  envKey: 'ANTHROPIC_API_KEY',
  get model() { return c().model },
  isConfigured: () => !!c().key,

  async complete({ system, user, maxTokens }) {
    const data = await requestJson(`${c().baseUrl}/v1/messages`, {
      headers: headers(),
      body: { model: c().model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] },
    })
    const text = (data?.content || []).map((b) => (b.type === 'text' ? b.text : '')).join('')
    if (!text) throw new AiError(`empty reply (stop reason: ${data?.stop_reason || 'unknown'})`)
    return text
  },

  async listModels() {
    const data = await requestJson(`${c().baseUrl}/v1/models?limit=100`, { method: 'GET', headers: headers() })
    return (data?.data || []).map((m) => m.id)
  },
}
