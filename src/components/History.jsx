import { timeAgo } from '../lib/report'
import { ClockIcon, TrashIcon } from './Icons'

export default function History({ items, activeId, onSelect, onClear }) {
  if (!items.length) return null
  return (
    <section className="card history" aria-labelledby="history-title">
      <div className="history__head">
        <h3 id="history-title"><ClockIcon width={16} height={16} /> Recent incidents</h3>
        <button type="button" className="link" onClick={onClear}><TrashIcon width={14} height={14} /> Clear</button>
      </div>
      <ul>
        {items.map((it) => (
          <li key={it.id}>
            <button type="button" className={`history__item ${it.id === activeId ? 'is-active' : ''}`} onClick={() => onSelect(it)}>
              <span className={`dot dot--${it.report.severity}`} />
              <span className="history__text">
                <span className="history__title">{it.report.title}</span>
                <span className="history__meta">{it.report.context.service} &middot; {timeAgo(it.at)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
