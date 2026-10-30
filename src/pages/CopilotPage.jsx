import { useCallback, useEffect, useRef, useState } from 'react'
import IncidentForm from '../components/IncidentForm'
import AnalysisLoader from '../components/AnalysisLoader'
import AnalysisReport from '../components/AnalysisReport'
import EmptyState from '../components/EmptyState'
import History from '../components/History'
import { AlertIcon } from '../components/Icons'
import { analyzeIncident } from '../lib/analyze'
import { useStore } from '../store'
import { go } from '../router'

const HISTORY_KEY = 'incident-copilot:history'
const INITIAL_FORM = { log: '', service: '', environment: 'Production', stack: 'Node.js', provider: 'auto' }

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
  } catch {
    return []
  }
}

export default function CopilotPage() {
  const { createIncident } = useStore()
  const [form, setForm] = useState(INITIAL_FORM)
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const [stage, setStage] = useState(0)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState(loadHistory)
  const runId = useRef(0)
  const resultRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    } catch {
      /* storage unavailable: history stays in memory */
    }
  }, [history])

  const run = useCallback(async (input) => {
    const id = ++runId.current
    setStatus('loading')
    setStage(0)
    setError('')
    if (window.innerWidth < 1000) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    try {
      const result = await analyzeIncident(input, (s) => {
        if (id === runId.current) setStage(s)
      })
      if (id !== runId.current) return
      setReport(result)
      setStatus('done')
      setHistory((h) => [{ id: result.id, input, report: result, at: Date.now() }, ...h].slice(0, 10))
    } catch (e) {
      if (id !== runId.current) return
      setError(e.message || 'Something went wrong while analyzing. Try again.')
      setStatus('error')
    }
  }, [])

  const handleSubmit = () => {
    if (form.log.trim()) run(form)
  }

  const handleSelect = (item) => {
    runId.current++
    setForm(item.input)
    setReport(item.report)
    setStatus('done')
    if (window.innerWidth < 1000) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="page">
        <div className="intro">
          <h1>Find out what broke, why, and how to fix it.</h1>
          <p>Paste an error from production and get a ranked diagnosis with the steps to resolve it.</p>
        </div>

        <div className="workspace">
          <aside className="sidebar">
            <IncidentForm form={form} setForm={setForm} onSubmit={handleSubmit} loading={status === 'loading'} />
            <History
              items={history}
              activeId={report?.id}
              onSelect={handleSelect}
              onClear={() => setHistory([])}
            />
          </aside>

          <div className="results" ref={resultRef}>
            {status === 'idle' && <EmptyState />}
            {status === 'loading' && <AnalysisLoader stage={stage} />}
            {status === 'error' && (
              <section className="card errorbox" role="alert">
                <AlertIcon width={22} height={22} />
                <div>
                  <h2>Analysis could not finish</h2>
                  <p>{error}</p>
                  <button type="button" className="btn btn--primary" onClick={handleSubmit}>Try again</button>
                </div>
              </section>
            )}
            {status === 'done' && report && <AnalysisReport key={report.id} report={report} onCreateIncident={async () => { const newId = await createIncident({ title: report.title, service: report.context.service, severity: report.severity, env: report.context.environment, log: form.log }); if (newId) go(`/incidents/${newId}`) }} />}
          </div>
        </div>

        <footer className="footer">
          Suggestions are generated from the text you provide. Review every command before running it in production.
        </footer>
    </div>
  )
}
