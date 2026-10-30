import { useState } from 'react'
import { reportToMarkdown } from '../lib/report'
import { CopyIcon, CheckIcon, SearchIcon, WrenchIcon, ShieldIcon, DownloadIcon, PlusIcon } from './Icons'

const ENGINE = { claude: 'Claude', rules: 'Built-in engine' }
const engineLabel = (r) => {
  const name = ENGINE[r.provider] || (r.engine === 'ai' ? 'AI' : 'Built-in engine')
  return r.model && r.provider !== 'rules' ? `${name} · ${r.model}` : name
}
const SEVERITY = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }
const TABS = [
  { id: 'causes', label: 'Possible causes', Icon: SearchIcon },
  { id: 'fix', label: 'How to fix it', Icon: WrenchIcon },
  { id: 'prevent', label: 'Prevent it', Icon: ShieldIcon },
]

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return [copied, copy]
}

export function CodeBlock({ code }) {
  const [copied, copy] = useCopy()
  return (
    <div className="code">
      <button type="button" className="code__copy" onClick={() => copy(code)} aria-label="Copy command">
        {copied ? <><CheckIcon width={14} height={14} /> Copied</> : <><CopyIcon width={14} height={14} /> Copy</>}
      </button>
      <pre><code>{code}</code></pre>
    </div>
  )
}

function Ring({ value }) {
  const C = 2 * Math.PI * 26
  return (
    <div className="ring" role="img" aria-label={`Confidence ${value} percent`}>
      <svg viewBox="0 0 64 64" width="64" height="64">
        <circle cx="32" cy="32" r="26" className="ring__track" />
        <circle
          cx="32" cy="32" r="26" className="ring__value"
          style={{ '--c': C, '--o': C * (1 - value / 100) }}
          strokeDasharray={C}
        />
      </svg>
      <span className="ring__num">{value}<small>%</small></span>
    </div>
  )
}

export default function AnalysisReport({ report, onCreateIncident }) {
  const [tab, setTab] = useState('causes')
  const [copied, copy] = useCopy()

  const download = () => {
    const blob = new Blob([reportToMarkdown(report)], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <article className="report">
      <section className="card report__top">
        <div className="report__top-main">
          <div className="badges">
            <span className={`badge badge--${report.severity}`}><span className="dot" />{SEVERITY[report.severity]} severity</span>
            <span className="badge badge--plain">{report.category}</span>
            <span className="badge badge--plain" title="Which engine produced this analysis">Analyzed by {engineLabel(report)}</span>
          </div>
          {report.notice && <p className="notice" role="status">{report.notice}</p>}
          <h2>{report.title}</h2>
          <p className="report__summary">{report.summary}</p>
          <dl className="ctx">
            <div><dt>Service</dt><dd>{report.context.service}</dd></div>
            <div><dt>Environment</dt><dd>{report.context.environment}</dd></div>
            <div><dt>Stack</dt><dd>{report.context.stack}</dd></div>
          </dl>
        </div>
        <div className="report__side">
          <Ring value={report.confidence} />
          <span className="report__side-label">Match confidence</span>
        </div>

        {report.evidence?.length > 0 && (
          <div className="evidence">
            <span className="evidence__label">Evidence found in your log</span>
            <pre>{report.evidence.join('\n')}</pre>
          </div>
        )}

        <div className="report__actions">
          {onCreateIncident && <button type="button" className="btn btn--primary" onClick={onCreateIncident}><PlusIcon /> Create incident</button>}
          <button type="button" className="btn btn--ghost" onClick={() => copy(reportToMarkdown(report))}>
            {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy report</>}
          </button>
          <button type="button" className="btn btn--ghost" onClick={download}><DownloadIcon /> Download .md</button>
        </div>
      </section>

      <section className="card report__body">
        <div className="tabs" role="tablist" aria-label="Report sections">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              className={`tab ${tab === id ? 'is-active' : ''}`}
              onClick={() => setTab(id)}
              type="button"
            >
              <Icon width={16} height={16} /> {label}
            </button>
          ))}
        </div>

        {tab === 'causes' && (
          <div role="tabpanel" id="panel-causes" aria-labelledby="tab-causes" className="panel">
            <ul className="causes">
              {[...report.causes].sort((a, b) => b.likelihood - a.likelihood).map((c, i) => (
                <li key={c.title} className="cause">
                  <div className="cause__head">
                    <h4>{c.title}</h4>
                    <span className="cause__pct">{c.likelihood}% likely</span>
                  </div>
                  <div className="meter" aria-hidden="true">
                    <span style={{ width: `${c.likelihood}%`, animationDelay: `${i * 90}ms` }} />
                  </div>
                  <p>{c.detail}</p>
                  <p className="cause__check"><strong>How to check:</strong> {c.check}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'fix' && (
          <div role="tabpanel" id="panel-fix" aria-labelledby="tab-fix" className="panel">
            <ol className="steps">
              {report.fixes.map((f) => (
                <li key={f.title} className="step">
                  <h4>{f.title}</h4>
                  <p>{f.detail}</p>
                  {f.command && <CodeBlock code={f.command} />}
                </li>
              ))}
            </ol>
          </div>
        )}

        {tab === 'prevent' && (
          <div role="tabpanel" id="panel-prevent" aria-labelledby="tab-prevent" className="panel">
            <ul className="prevent">
              {report.prevention.map((p) => (
                <li key={p}><span><CheckIcon width={14} height={14} strokeWidth={2.6} /></span>{p}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </article>
  )
}
