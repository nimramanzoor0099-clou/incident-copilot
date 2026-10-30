import { useState } from 'react'
import { useStore } from '../store'
import { ROLES, ROLE_INFO } from '../lib/seed'
import { fmtDate } from '../lib/format'
import { PageHead, Avatar, Switch } from '../components/ui'
import { PlusIcon, SearchIcon } from '../components/Icons'

const TABS = [['org', 'Organization'], ['members', 'Members'], ['integrations', 'Integrations'], ['audit', 'Audit log']]

function OrgTab() {
  const { org, saveOrg } = useStore()
  const [f, setF] = useState(org)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const tog = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const dirty = JSON.stringify(f) !== JSON.stringify(org)
  return (
    <div className="setform">
      <label className="field"><span className="field__label">Organization name</span><input value={f.name} onChange={set('name')} /></label>
      <div className="grid-2">
        <label className="field"><span className="field__label">Workspace URL</span><input value={f.slug} onChange={set('slug')} /></label>
        <label className="field"><span className="field__label">Time zone</span>
          <select value={f.timezone} onChange={set('timezone')}>{['UTC', 'Asia/Karachi', 'Europe/London', 'America/New_York', 'America/Los_Angeles'].map((z) => <option key={z}>{z}</option>)}</select>
        </label>
        <label className="field"><span className="field__label">Default severity</span>
          <select value={f.defaultSeverity} onChange={set('defaultSeverity')}>{['critical', 'high', 'medium', 'low'].map((z) => <option key={z}>{z}</option>)}</select>
        </label>
        <label className="field"><span className="field__label">Log retention</span>
          <select value={f.retention} onChange={set('retention')}>{['30', '90', '180', '365'].map((z) => <option key={z} value={z}>{z} days</option>)}</select>
        </label>
      </div>
      {[['autoPage', 'Page on-call automatically', 'Page the on-call engineer when a critical incident opens.'], ['digest', 'Weekly incident digest', 'Email a summary of incidents every Monday.'], ['requireMfa', 'Require two-factor sign-in', 'All members must use two-factor authentication.']].map(([k, t, d]) => (
        <div key={k} className="switchrow"><div><strong>{t}</strong><p className="muted">{d}</p></div><Switch checked={f[k]} onChange={tog(k)} label={t} /></div>
      ))}
      <div><button type="button" className="btn btn--primary" disabled={!dirty || !f.name.trim()} onClick={() => saveOrg(f)}>Save changes</button></div>
    </div>
  )
}

function MembersTab() {
  const { members, invite, setRole, removeMember, notify } = useStore()
  const [email, setEmail] = useState('')
  const [role, setRoleSel] = useState('Responder')
  const send = (e) => {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return notify('Enter a valid email address')
    if (members.some((m) => m.email === email)) return notify('That person is already a member')
    invite(email, role); setEmail('')
  }
  return (
    <>
      <form className="invite" onSubmit={send}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" aria-label="Email to invite" />
        <select value={role} onChange={(e) => setRoleSel(e.target.value)} aria-label="Role">{ROLES.filter((r) => r !== 'Owner').map((r) => <option key={r}>{r}</option>)}</select>
        <button type="submit" className="btn btn--primary"><PlusIcon /> Send invite</button>
      </form>
      <div className="tablewrap">
        <table className="tbl">
          <thead><tr><th>Member</th><th>Role</th><th>Status</th><th /></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td><span className="assignee"><Avatar name={m.name} size={32} /><span><strong>{m.name}</strong><span className="sub">{m.email}</span></span></span></td>
                <td>
                  {m.role === 'Owner' ? <span className="muted">Owner</span> : (
                    <select className="inline-select plain" value={m.role} onChange={(e) => setRole(m.id, e.target.value)} aria-label={`Role of ${m.name}`} title={ROLE_INFO[m.role]}>{ROLES.filter((r) => r !== 'Owner').map((r) => <option key={r}>{r}</option>)}</select>
                  )}
                </td>
                <td><span className={`pill ${m.status === 'active' ? 'st-resolved' : 'st-mitigated'}`}>{m.status === 'active' ? 'Active' : 'Invited'}</span></td>
                <td>{m.role !== 'Owner' && <button type="button" className="link link--danger" onClick={() => removeMember(m.id)}>Remove</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="roles">{ROLES.map((r) => <li key={r}><strong>{r}</strong><span className="muted">{ROLE_INFO[r]}</span></li>)}</ul>
    </>
  )
}

function IntegrationsTab() {
  const { integrations, toggleIntegration, notify } = useStore()
  return (
    <div className="igrid">
      {integrations.map((i) => (
        <div key={i.id} className="card integ">
          <div className="integ__top">
            <span className="integ__logo" style={{ background: i.color }}>{i.name[0]}</span>
            <span className={`pill ${i.connected ? 'st-resolved' : 'st-neutral'}`}>{i.connected ? 'Connected' : 'Not connected'}</span>
          </div>
          <div><strong>{i.name}</strong><p className="muted">{i.desc}</p></div>
          <button type="button" className={`btn ${i.connected ? 'btn--ghost' : 'btn--primary'}`} onClick={() => { toggleIntegration(i.id); notify(i.connected ? `${i.name} disconnected` : `${i.name} connected`) }}>
            {i.connected ? 'Disconnect' : 'Connect'}
          </button>
        </div>
      ))}
    </div>
  )
}

function AuditTab() {
  const { audit } = useStore()
  const [q, setQ] = useState('')
  const rows = audit.filter((a) => `${a.actor} ${a.action} ${a.target}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <div className="toolbar"><label className="searchbox"><SearchIcon width={16} height={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the audit log" aria-label="Search the audit log" /></label></div>
      <div className="tablewrap">
        <table className="tbl">
          <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th></tr></thead>
          <tbody>{rows.map((a) => <tr key={a.id}><td className="muted">{fmtDate(a.t)}</td><td><span className="assignee"><Avatar name={a.actor} size={24} />{a.actor}</span></td><td>{a.action}</td><td className="id">{a.target}</td></tr>)}</tbody>
        </table>
        {!rows.length && <div className="noresults"><h3>No matching entries</h3></div>}
      </div>
    </>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState('org')
  const View = { org: OrgTab, members: MembersTab, integrations: IntegrationsTab, audit: AuditTab }[tab]
  return (
    <div className="page">
      <PageHead title="Workspace settings" sub="Manage your team, connected tools and organization preferences." />
      <section className="card setcard">
        <div className="tabs" role="tablist" aria-label="Settings sections">
          {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={`tab ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>{label}</button>)}
        </div>
        <div className={tab === 'org' || tab === 'integrations' ? 'setbody' : ''}><View /></div>
      </section>
    </div>
  )
}
