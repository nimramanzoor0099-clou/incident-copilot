import { useEffect, useState } from 'react'
import { SAMPLES } from '../lib/samples'
import { api } from '../lib/api'
import { BoltIcon } from './Icons'

const ENVIRONMENTS = ['Production', 'Staging', 'Development']
const STACKS = ['Node.js', 'Python', 'Java', 'Go', '.NET', 'Kubernetes', 'Other']

export default function IncidentForm({ form, setForm, onSubmit, loading }) {
  // Which AI providers the backend has keys for (never includes the keys themselves).
  const [ai, setAi] = useState(null)
  useEffect(() => {
    let live = true
    api('/ai/providers').then((d) => live && setAi(d)).catch(() => live && setAi(null))
    return () => { live = false }
  }, [])
  const providers = ai?.providers || []
  const best = providers.find((p) => p.id === ai?.default)
  // A saved choice that is no longer configured falls back to Auto instead of failing.
  const valid = form.provider === 'auto' || form.provider === 'rules' || providers.some((p) => p.id === form.provider && p.configured)
  const chosen = valid ? form.provider : 'auto'
  useEffect(() => {
    if (ai && !valid) setForm((f) => ({ ...f, provider: 'auto' }))
  }, [ai, valid, setForm])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const canSubmit = form.log.trim().length > 0 && !loading

  const handleKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canSubmit) onSubmit()
  }

  return (
    <section className="card form" aria-labelledby="form-title">
      <div className="form__head">
        <h2 id="form-title">Describe the incident</h2>
        <p>Paste the error message, stack trace or log lines.</p>
      </div>

      <label className="field">
        <span className="field__label">Error or log output</span>
        <textarea
          className="log"
          value={form.log}
          onChange={set('log')}
          onKeyDown={handleKey}
          placeholder={'Error: connect ECONNREFUSED 10.0.4.17:5432\n    at TCPConnectWrap.afterConnect ...'}
          spellCheck={false}
          rows={9}
          disabled={loading}
        />
        <span className="field__meta">{form.log.length.toLocaleString()} characters</span>
      </label>

      <div className="samples" role="group" aria-label="Load a sample incident">
        <span className="samples__label">Try a sample</span>
        <div className="samples__list">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              type="button"
              className="chip"
              disabled={loading}
              onClick={() => setForm((f) => ({ ...f, log: s.log, service: s.service, stack: s.stack }))}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-3">
        <label className="field">
          <span className="field__label">Service</span>
          <input value={form.service} onChange={set('service')} placeholder="payments-api" disabled={loading} />
        </label>
        <label className="field">
          <span className="field__label">Environment</span>
          <select value={form.environment} onChange={set('environment')} disabled={loading}>
            {ENVIRONMENTS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Stack</span>
          <select value={form.stack} onChange={set('stack')} disabled={loading}>
            {STACKS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field__label">AI engine</span>
        <select value={chosen} onChange={set('provider')} disabled={loading}>
          <option value="auto">{best ? `Auto (${best.label})` : 'Auto (built-in engine)'}</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id} disabled={!p.configured}>
              {p.configured ? `${p.label} · ${p.model}` : `${p.label} (add ${p.envKey} to backend/.env)`}
            </option>
          ))}
          <option value="rules">Built-in engine (no AI)</option>
        </select>
      </label>

      <button type="button" className="btn btn--primary" onClick={onSubmit} disabled={!canSubmit}>
        <BoltIcon />
        {loading ? 'Analyzing...' : 'Analyze incident'}
      </button>
      <p className="hint">Press Ctrl or Cmd + Enter to analyze.{chosen !== 'rules' && best ? ' The log text is sent to the selected AI provider.' : ''}</p>
    </section>
  )
}
