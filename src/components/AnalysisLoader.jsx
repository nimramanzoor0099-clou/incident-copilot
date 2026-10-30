import { STAGES } from '../lib/analyze'
import { CheckIcon } from './Icons'

export default function AnalysisLoader({ stage }) {
  const progress = Math.min(100, Math.round((stage / STAGES.length) * 100))
  return (
    <section className="card loader" role="status" aria-live="polite" aria-label="Analyzing incident">
      <div className="loader__head">
        <div>
          <h2>Analyzing your incident</h2>
          <p>This takes a few seconds.</p>
        </div>
        <span className="loader__pct">{progress}%</span>
      </div>

      <div className="pulse" aria-hidden="true">
        <svg viewBox="0 0 400 64" preserveAspectRatio="none">
          <path className="pulse__track" d="M0 32H70L82 32L92 8L106 56L116 32H190L202 32L212 16L224 46L232 32H400" />
          <path className="pulse__beam" d="M0 32H70L82 32L92 8L106 56L116 32H190L202 32L212 16L224 46L232 32H400" />
        </svg>
      </div>

      <div className="bar" aria-hidden="true"><span style={{ width: `${Math.max(6, progress)}%` }} /></div>

      <ol className="stages">
        {STAGES.map((s, i) => {
          const state = i < stage ? 'done' : i === stage ? 'active' : 'idle'
          return (
            <li key={s.label} className={`stage stage--${state}`}>
              <span className="stage__icon">
                {state === 'done' ? <CheckIcon width={14} height={14} strokeWidth={2.6} /> : state === 'active' ? <span className="spinner" /> : null}
              </span>
              <span>
                <span className="stage__label">{s.label}</span>
                {state === 'active' && <span className="stage__hint">{s.hint}</span>}
              </span>
            </li>
          )
        })}
      </ol>

      <div className="skeleton" aria-hidden="true">
        <span style={{ width: '72%' }} />
        <span style={{ width: '94%' }} />
        <span style={{ width: '58%' }} />
      </div>
    </section>
  )
}
