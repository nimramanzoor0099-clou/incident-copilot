// Thin fetch wrapper for the Incident Copilot backend.
// In development, Vite proxies /api to the backend (see vite.config.js), so no CORS setup is needed.
export const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '')
export const getToken = () => sessionStorage.getItem('incident_copilot_token') || ''
export const setToken = (token) => {
  if (token) sessionStorage.setItem('incident_copilot_token', token)
  else sessionStorage.removeItem('incident_copilot_token')
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const UNREACHABLE = 'Cannot reach the backend. Start it with: cd backend && npm run dev'

export async function api(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, UNREACHABLE)
  }
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) {
      setToken('')
      window.dispatchEvent(new Event('incident-copilot:auth-expired'))
    }
    // The dev proxy answers 5xx with no JSON body when the backend is down.
    if (!data && res.status >= 500) throw new ApiError(0, UNREACHABLE)
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`)
  }
  return data
}
