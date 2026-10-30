import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { STATUS_LABEL } from './lib/seed'
import { api } from './lib/api'

const Ctx = createContext(null)
export const useStore = () => useContext(Ctx)

// Workspace state now lives on the backend. This provider loads a snapshot from GET /api/state,
// sends every change to the API, then refreshes the snapshot so the UI always matches the server.
export function StoreProvider({ children }) {
  const [state, setState] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')
  const timer = useRef()

  const notify = useCallback((msg) => {
    setToast(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2600)
  }, [])

  const load = useCallback(async () => {
    try {
      setState(await api('/state'))
      setLoadError('')
    } catch (e) {
      setLoadError(e.message)
    }
  }, [])

  const sync = useCallback(async () => {
    try { setState(await api('/state')) } catch { /* keep the last good snapshot */ }
  }, [])

  useEffect(() => { load() }, [load])

  if (!state) {
    return (
      <div className="boot" role="status" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        {loadError ? (
          <div>
            <h2>Can't load your workspace</h2>
            <p>{loadError}</p>
            <button type="button" className="btn btn--primary" onClick={load}>Try again</button>
          </div>
        ) : (
          <p>Loading workspace...</p>
        )}
      </div>
    )
  }

  // Run an API call, refresh state afterwards (also reverts any optimistic change on failure).
  const act = async (fn, okMsg) => {
    try {
      const result = await fn()
      await sync()
      if (okMsg) notify(okMsg)
      return result
    } catch (e) {
      notify(e.message || 'Something went wrong')
      await sync()
      return undefined
    }
  }

  const patchLocal = (id, patch) =>
    setState((s) => ({ ...s, incidents: s.incidents.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))

  const api2 = {
    ...state,
    toast,
    notify,
    reload: load,
    member: (id) => state.members.find((m) => m.id === id),
    setStatus: (id, status) => {
      patchLocal(id, { status })
      return act(() => api(`/incidents/${id}`, { method: 'PATCH', body: { status } }), `${id} set to ${STATUS_LABEL[status]}`)
    },
    assign: (id, memberId) => {
      patchLocal(id, { assigneeId: memberId || null })
      return act(() => api(`/incidents/${id}`, { method: 'PATCH', body: { assigneeId: memberId || null } }), memberId ? `${id} assigned` : `${id} unassigned`)
    },
    addNote: (id, text) => act(() => api(`/incidents/${id}/notes`, { method: 'POST', body: { text } })),
    // Async: resolves to the new incident id, or undefined if the request failed.
    createIncident: async ({ title, service, severity, env, log }) => {
      const inc = await act(() => api('/incidents', { method: 'POST', body: { title, service, severity, env, log } }))
      if (inc) notify(`${inc.id} created`)
      return inc?.id
    },
    invite: (email, role) => act(() => api('/members', { method: 'POST', body: { email, role } }), `Invite sent to ${email}`),
    setRole: (id, role) => act(() => api(`/members/${id}`, { method: 'PATCH', body: { role } }), 'Role updated'),
    removeMember: (id) => act(() => api(`/members/${id}`, { method: 'DELETE' }), 'Member removed'),
    toggleIntegration: (id) => act(() => api(`/integrations/${id}/toggle`, { method: 'POST' })),
    saveOrg: (org) => act(() => api('/org', { method: 'PUT', body: org }), 'Settings saved'),
  }
  return <Ctx.Provider value={api2}>{children}</Ctx.Provider>
}
