import { Link } from '../router'
import { useStore } from '../store'
import { ENGINE_MODE } from '../lib/analyze'
import { Avatar } from './ui'
import { GridIcon, ListIcon, BoltIcon, GearIcon } from './Icons'

const NAV = [
  { to: '/', label: 'Overview', Icon: GridIcon, match: (p) => p === '/' },
  { to: '/incidents', label: 'Incidents', Icon: ListIcon, match: (p) => p.startsWith('/incidents'), count: true },
  { to: '/copilot', label: 'Copilot', Icon: BoltIcon, match: (p) => p === '/copilot' },
  { to: '/settings', label: 'Settings', Icon: GearIcon, match: (p) => p === '/settings' },
]

export default function Shell({ path, children, onLogout }) {
  const { incidents, members, org, toast, user } = useStore()
  const open = incidents.filter((i) => i.status !== 'resolved').length
  const me = members.find((m) => m.id === user?.memberId) || members[0]
  return (
    <div className="shell">
      <aside className="side">
        <Link to="/" className="brand" aria-label="Incident Copilot overview">
          <span className="brand__mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="22" height="22"><path d="M3 17h6l3-8 5 15 3-7h9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span className="brand__name">Incident Copilot</span>
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV.filter((item) => item.to !== '/settings' || ['Owner', 'Admin'].includes(user?.role)).map(({ to, label, Icon, match, count }) => (
            <Link key={to} to={to} title={label} className={match(path) ? 'is-active' : ''} aria-current={match(path) ? 'page' : undefined}>
              <Icon /> <span>{label}</span>
              {count && open > 0 && <em className="nav__count">{open}</em>}
            </Link>
          ))}
        </nav>
        <div className="side__foot">
          <Avatar name={me.name} size={34} />
          <div><strong>{me.name}</strong><span>{org.name} · {user?.role || me.role}</span></div><button type="button" className="btn btn--ghost" onClick={onLogout} title="Sign out" style={{marginLeft:'auto',fontSize:12}}>Sign out</button>
        </div>
      </aside>
      <div className="content">
        <div className="strip">
          <div className="engine" title={ENGINE_MODE === 'api' ? 'Connected to the Incident Copilot backend' : 'Running on the built-in sample engine. No data leaves your browser.'}>
            <span className={`engine__dot engine__dot--${ENGINE_MODE}`} />
            {ENGINE_MODE === 'api' ? 'Backend connected' : 'Sample engine'}
          </div>
        </div>
        {children}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  )
}
