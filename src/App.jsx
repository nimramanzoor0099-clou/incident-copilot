import { useEffect, useState } from 'react'
import { StoreProvider } from './store'
import { useRoute } from './router'
import Shell from './components/Shell'
import Dashboard from './pages/Dashboard'
import IncidentsPage from './pages/IncidentsPage'
import IncidentPage from './pages/IncidentPage'
import CopilotPage from './pages/CopilotPage'
import SettingsPage from './pages/SettingsPage'
import AuthPage from './pages/AuthPage'
import { api, getToken, setToken } from './lib/api'

function Routes({ path }) {
  if (path.startsWith('/incidents/')) return <IncidentPage key={path} id={decodeURIComponent(path.split('/')[2])} />
  if (path === '/incidents') return <IncidentsPage />
  if (path === '/copilot') return <CopilotPage />
  if (path === '/settings') return <SettingsPage />
  return <Dashboard />
}
export default function App() {
  const path = useRoute()
  const [auth, setAuth] = useState(getToken() ? 'checking' : 'signed-out')
  useEffect(() => {
    const expired = () => setAuth('signed-out')
    window.addEventListener('incident-copilot:auth-expired', expired)
    if (getToken()) api('/auth/me').then(() => setAuth('signed-in')).catch(() => { setToken(''); setAuth('signed-out') })
    return () => window.removeEventListener('incident-copilot:auth-expired', expired)
  }, [])
  if (auth === 'checking') return <div className="boot" style={{minHeight:'100vh',display:'grid',placeItems:'center'}}>Checking secure session…</div>
  if (auth === 'signed-out') return <AuthPage onAuthenticated={() => setAuth('signed-in')} />
  return <StoreProvider><Shell path={path} onLogout={() => { setToken(''); setAuth('signed-out') }}><Routes path={path} /></Shell></StoreProvider>
}
