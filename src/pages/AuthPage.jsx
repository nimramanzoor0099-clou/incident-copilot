import { useState } from 'react'
import { api, setToken } from '../lib/api'

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', workspaceName: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const result = await api(`/auth/${mode === 'login' ? 'login' : 'register'}`, { method: 'POST', body: form })
      setToken(result.token); onAuthenticated(result.user)
    } catch (err) { setError(err.message || 'Unable to authenticate.') }
    finally { setBusy(false) }
  }
  const field = { width: '100%', boxSizing: 'border-box', padding: '12px 13px', border: '1px solid #dbe3ea', borderRadius: 9, marginTop: 6, font: 'inherit', background: '#fff', color: '#172b3a' }
  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'linear-gradient(135deg,#edf4f6,#e7eef5)'}}>
    <section style={{width:'min(430px,100%)',background:'#fff',padding:32,borderRadius:18,boxShadow:'0 18px 60px #17324d18'}}>
      <div style={{fontSize:13,fontWeight:800,letterSpacing:1,color:'#168c8c'}}>INCIDENT COPILOT</div>
      <h1 style={{margin:'10px 0 6px',fontSize:26,color:'#17324d'}}>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1>
      <p style={{color:'#647482',fontSize:14,marginTop:0}}>{mode === 'login' ? 'Sign in to securely access your incidents and AI copilot.' : 'Create an account to start managing incidents with AI assistance.'}</p>
      <form onSubmit={submit}>
        {mode === 'register' && <><label style={{fontSize:13,fontWeight:600}}>Full name<input required name="name" value={form.name} onChange={change} style={field} minLength={2} maxLength={100} /></label><label style={{display:'block',fontSize:13,fontWeight:600,marginTop:13}}>Workspace name<input name="workspaceName" value={form.workspaceName} onChange={change} style={field} placeholder="My engineering team" maxLength={100}/></label></>}
        <label style={{display:'block',fontSize:13,fontWeight:600,marginTop:13}}>Email address<input required type="email" name="email" value={form.email} onChange={change} style={field} autoComplete="email"/></label>
        <label style={{display:'block',fontSize:13,fontWeight:600,marginTop:13}}>Password<input required type="password" name="password" value={form.password} onChange={change} style={field} minLength={mode === 'register' ? 10 : 1} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>{mode === 'register' && <small style={{color:'#71808c'}}>Use at least 10 characters.</small>}</label>
        {error && <p role="alert" style={{color:'#b42318',fontSize:13,marginBottom:0}}>{error}</p>}
        <button disabled={busy} className="btn btn--primary" style={{width:'100%',marginTop:20,justifyContent:'center'}}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      <p style={{fontSize:13,textAlign:'center',color:'#647482',marginBottom:0,marginTop:20}}>{mode === 'login' ? 'New to Incident Copilot?' : 'Already have an account?'} <button type="button" onClick={()=>{setMode(mode === 'login' ? 'register' : 'login');setError('')}} style={{border:0,background:'none',color:'#168c8c',fontWeight:700,cursor:'pointer'}}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></p>
    </section>
  </main>
}
