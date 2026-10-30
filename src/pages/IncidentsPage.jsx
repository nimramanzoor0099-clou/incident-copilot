import { useMemo, useState } from 'react'
import { Link } from '../router'
import { useStore } from '../store'
import { SERVICES, SEVERITIES, STATUSES, STATUS_LABEL } from '../lib/seed'
import { cap } from '../lib/format'
import { timeAgo } from '../lib/report'
import { PageHead, SeverityBadge, Avatar } from '../components/ui'
import { SearchIcon, ChevronIcon, ArrowLeftIcon } from '../components/Icons'

const PER = 8
const RANK = { critical: 0, high: 1, medium: 2, low: 3 }

export default function IncidentsPage() {
  const { incidents, members, setStatus, assign, member } = useStore()
  const [f, setF] = useState({ q: '', status: 'all', severity: 'all', service: 'all', assignee: 'all', sort: 'newest' })
  const [page, setPage] = useState(1)
  const staff = members.filter((m) => m.role !== 'Viewer' && m.status === 'active')

  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value })); setPage(1) }
  const reset = () => { setF({ q: '', status: 'all', severity: 'all', service: 'all', assignee: 'all', sort: 'newest' }); setPage(1) }
  const dirty = f.q || f.status !== 'all' || f.severity !== 'all' || f.service !== 'all' || f.assignee !== 'all'

  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    const out = incidents.filter((i) =>
      (!q || `${i.id} ${i.title} ${i.service}`.toLowerCase().includes(q)) &&
      (f.status === 'all' || i.status === f.status) &&
      (f.severity === 'all' || i.severity === f.severity) &&
      (f.service === 'all' || i.service === f.service) &&
      (f.assignee === 'all' || (f.assignee === 'none' ? !i.assigneeId : i.assigneeId === f.assignee)))
    if (f.sort === 'newest') out.sort((a, b) => b.createdAt - a.createdAt)
    if (f.sort === 'oldest') out.sort((a, b) => a.createdAt - b.createdAt)
    if (f.sort === 'severity') out.sort((a, b) => RANK[a.severity] - RANK[b.severity] || b.createdAt - a.createdAt)
    return out
  }, [incidents, f])

  const pages = Math.max(1, Math.ceil(rows.length / PER))
  const cur = Math.min(page, pages)
  const slice = rows.slice((cur - 1) * PER, cur * PER)
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - cur) <= 1)

  return (
    <div className="page">
      <PageHead title="Incidents" sub="Search, filter and update every incident in your workspace." />
      <section className="card">
        <div className="toolbar">
          <label className="searchbox">
            <SearchIcon width={16} height={16} />
            <input value={f.q} onChange={set('q')} placeholder="Search by ID, title or service" aria-label="Search incidents" />
          </label>
          <select value={f.status} onChange={set('status')} aria-label="Status"><option value="all">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select>
          <select value={f.severity} onChange={set('severity')} aria-label="Severity"><option value="all">All severities</option>{SEVERITIES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}</select>
          <select value={f.service} onChange={set('service')} aria-label="Service"><option value="all">All services</option>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select>
          <select value={f.assignee} onChange={set('assignee')} aria-label="Assignee"><option value="all">Anyone</option><option value="none">Unassigned</option>{staff.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <select value={f.sort} onChange={set('sort')} aria-label="Sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="severity">Highest severity</option></select>
        </div>

        <div className="tablewrap">
          <table className="tbl">
            <thead><tr><th>ID</th><th>Incident</th><th>Severity</th><th>Status</th><th>Assignee</th><th>Opened</th></tr></thead>
            <tbody>
              {slice.map((i) => (
                <tr key={i.id}>
                  <td className="id">{i.id}</td>
                  <td><Link to={`/incidents/${i.id}`} className="tlink">{i.title}</Link><span className="sub">{i.service} &middot; {i.env}</span></td>
                  <td><SeverityBadge sev={i.severity} /></td>
                  <td>
                    <select className={`inline-select st-${i.status}`} value={i.status} onChange={(e) => setStatus(i.id, e.target.value)} aria-label={`Status of ${i.id}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td>
                    <span className="assignee">
                      {i.assigneeId && <Avatar name={member(i.assigneeId).name} size={24} />}
                      <select className="inline-select plain" value={i.assigneeId || ''} onChange={(e) => assign(i.id, e.target.value || null)} aria-label={`Assignee of ${i.id}`}>
                        <option value="">Unassigned</option>
                        {staff.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </span>
                  </td>
                  <td className="muted">{timeAgo(i.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!slice.length && (
            <div className="noresults">
              <h3>No incidents match these filters</h3>
              <p>Try a different search or clear the filters.</p>
              <button type="button" className="btn btn--ghost" onClick={reset}>Clear filters</button>
            </div>
          )}
        </div>

        <div className="pager">
          <span className="muted">{rows.length ? `Showing ${(cur - 1) * PER + 1}-${Math.min(cur * PER, rows.length)} of ${rows.length}` : '0 results'}{dirty && rows.length ? ' (filtered)' : ''}</span>
          <div className="pager__btns">
            <button type="button" className="pbtn" disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Previous page"><ArrowLeftIcon width={15} height={15} /></button>
            {nums.map((n, k) => (
              <span key={n} className="pager__n">
                {k > 0 && n - nums[k - 1] > 1 && <span className="muted">...</span>}
                <button type="button" className={`pbtn ${n === cur ? 'is-active' : ''}`} onClick={() => setPage(n)} aria-current={n === cur ? 'page' : undefined}>{n}</button>
              </span>
            ))}
            <button type="button" className="pbtn" disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Next page"><ChevronIcon width={15} height={15} /></button>
          </div>
        </div>
      </section>
    </div>
  )
}
