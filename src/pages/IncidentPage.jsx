import { useMemo, useState } from 'react'
import { Link } from '../router'
import { useStore } from '../store'
import { STATUSES, STATUS_LABEL } from '../lib/seed'
import { fmtClock, fmtDate, fmtDuration } from '../lib/format'
import { analyzeLocally, analyzeIncident } from '../lib/analyze'
import { timeAgo } from '../lib/report'
import { SeverityBadge, Avatar } from '../components/ui'
import { CodeBlock } from '../components/AnalysisReport'
import AnalysisLoader from '../components/AnalysisLoader'
import { ArrowLeftIcon, BoltIcon, CopyIcon, CheckIcon } from '../components/Icons'
import { useCopyText } from '../lib/useCopy'

export default function IncidentPage({ id }) {
  const { incidents, members, setStatus, assign, addNote, notify, member } = useStore()
  const inc = incidents.find((i) => i.id === id)
  const [analysis, setAnalysis] = useState(() => inc && analyzeLocally({ log: inc.logText, service: inc.service, environment: inc.env, stack: 'Other' }))
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)
  const [level, setLevel] = useState('ALL')
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')
  const [copied, copy] = useCopyText()
  const staff = members.filter((m) => m.role !== 'Viewer' && m.status === 'active')

  const logs = useMemo(() => (inc ? inc.logs.filter((l) => (level === 'ALL' || l.level === level) && l.msg.toLowerCase().includes(q.toLowerCase())) : []), [inc, level, q])

  if (!inc) {
    return (
      <div className="page">
        <section className="card noresults"><h3>Incident not found</h3><p>It may have been removed or the link is wrong.</p><Link to="/incidents" className="btn btn--ghost">Back to incidents</Link></section>
      </div>
    )
  }

  const rerun = async () => {
    setBusy(true); setStage(0)
    try {
      setAnalysis(await analyzeIncident({ log: inc.logText, service: inc.service, environment: inc.env, stack: 'Other' }, setStage))
      notify('Analysis updated')
    } catch (e) {
      notify(e.message || 'Analysis failed')
    } finally { setBusy(false) }
  }

  const submitNote = (e) => {
    e.preventDefault()
    if (note.trim()) { addNote(inc.id, note.trim()); setNote('') }
  }
  const summary = `${inc.id}: ${inc.title}\nService: ${inc.service} (${inc.env})\nSeverity: ${inc.severity}, Status: ${STATUS_LABEL[inc.status]}\nLikely cause: ${analysis.causes[0]?.title}`
  const end = inc.resolvedAt || Date.now()

  return (
    <div className="page">
      <Link to="/incidents" className="crumb"><ArrowLeftIcon width={16} height={16} /> All incidents</Link>

      <section className="card ihead">
        <div className="ihead__row">
          <div>
            <div className="badges"><span className="id">{inc.id}</span><SeverityBadge sev={inc.severity} /><span className="badge badge--plain">{inc.env}</span></div>
            <h1>{inc.title}</h1>
            <p className="muted">{inc.service} &middot; opened {fmtDate(inc.createdAt)} &middot; {inc.resolvedAt ? `resolved in ${fmtDuration(end - inc.createdAt)}` : `open for ${fmtDuration(end - inc.createdAt)}`}</p>
          </div>
          <div className="controls">
            <label className="field"><span className="field__label">Status</span>
              <select className={`st-${inc.status}`} value={inc.status} onChange={(e) => setStatus(inc.id, e.target.value)}>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
            </label>
            <label className="field"><span className="field__label">Assignee</span>
              <select value={inc.assigneeId || ''} onChange={(e) => assign(inc.id, e.target.value || null)}>
                <option value="">Unassigned</option>{staff.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <button type="button" className="btn btn--ghost" onClick={() => copy(summary)}>{copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy summary</>}</button>
          </div>
        </div>
      </section>

      <div className="inv">
        <div className="inv__main">
          <section className="card cardpad">
            <h3 className="ctitle">Event timeline</h3>
            <ol className="tl">
              {[...inc.timeline].sort((a, b) => b.t - a.t).map((e) => (
                <li key={e.id} className={`tl--${e.kind}`}>
                  <p>{e.text}</p>
                  <span className="muted">{e.actor} &middot; {fmtDate(e.t)} ({timeAgo(e.t)})</span>
                </li>
              ))}
            </ol>
            <form className="noteform" onSubmit={submitNote}>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team" aria-label="Add a note" />
              <button type="submit" className="btn btn--ghost" disabled={!note.trim()}>Add note</button>
            </form>
          </section>

          <section className="card cardpad">
            <div className="ctitle-row">
              <h3 className="ctitle">Logs</h3>
              <div className="logtools">
                {['ALL', 'ERROR', 'WARN', 'INFO'].map((l) => <button key={l} type="button" className={`chip ${level === l ? 'chip--on' : ''}`} onClick={() => setLevel(l)}>{l === 'ALL' ? 'All' : l}</button>)}
                <input className="logsearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter logs" aria-label="Filter logs" />
              </div>
            </div>
            <div className="logbox" tabIndex={0} aria-label="Log lines">
              {logs.map((l, i) => <div key={i} className="logrow"><span className="logt">{fmtClock(l.t)}</span><span className={`lv lv-${l.level}`}>{l.level}</span><span className="logm">{l.msg}</span></div>)}
              {!logs.length && <div className="logrow"><span className="logm muted">No log lines match.</span></div>}
            </div>
          </section>

          <section className="card cardpad">
            <h3 className="ctitle">Stack trace</h3>
            {inc.stack.frames.length ? (
              <div className="stack">
                <div className="stack__err">{inc.stack.error}</div>
                {inc.stack.frames.map((f, i) => (
                  <div key={i} className={`frame ${f.app ? 'frame--app' : 'frame--lib'}`}>
                    <span>at {f.fn}</span><span>{f.file}{f.line ? `:${f.line}:${f.col}` : ''}</span>
                  </div>
                ))}
                <p className="muted stack__note">Highlighted frames are your application code.</p>
              </div>
            ) : <p className="muted">No stack trace was captured for this incident.</p>}
          </section>
        </div>

        <aside className="inv__side">
          {busy ? <AnalysisLoader stage={stage} /> : (
            <>
              <section className="card cardpad">
                <div className="ctitle-row">
                  <h3 className="ctitle">AI hypotheses</h3>
                  <button type="button" className="btn btn--ghost" onClick={rerun}><BoltIcon width={16} height={16} /> Re-run</button>
                </div>
                <p className="aisum">{analysis.summary} <strong>{analysis.confidence}% match.</strong></p>
                <ul className="causes">
                  {[...analysis.causes].sort((a, b) => b.likelihood - a.likelihood).map((c, i) => (
                    <li key={c.title} className="cause">
                      <div className="cause__head"><h4>{c.title}</h4><span className="cause__pct">{c.likelihood}%</span></div>
                      <div className="meter" aria-hidden="true"><span style={{ width: `${c.likelihood}%`, animationDelay: `${i * 90}ms` }} /></div>
                      <p>{c.detail}</p>
                      <p className="cause__check"><strong>How to check:</strong> {c.check}</p>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="card cardpad">
                <h3 className="ctitle">Suggested remediation</h3>
                <ol className="steps">
                  {analysis.fixes.map((f) => (
                    <li key={f.title} className="step"><h4>{f.title}</h4><p>{f.detail}</p>{f.command && <CodeBlock code={f.command} />}</li>
                  ))}
                </ol>
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
