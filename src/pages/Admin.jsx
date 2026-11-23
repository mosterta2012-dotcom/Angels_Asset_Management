import { useState } from 'react'
import { useApp } from '../lib/auth'
import { db } from '../lib/db'
import { Head, Field, Select, PersonSelect, useLoad, useAction } from '../components/ui'
import { ROLES } from '../lib/lists'
import { fmtDateTime } from '../lib/util'

export default function Admin() {
  const { people, departments, refresh, has, name } = useApp()
  const [tab, setTab] = useState('people')
  const [run, busy, box] = useAction()
  const [settings, reloadS] = useLoad(() => db.list('am_settings'), [])
  const [audit] = useLoad(() => tab === 'audit' ? db.list('am_audit', { order: 'at', desc: true, limit: 200 }) : Promise.resolve([]), [tab])
  const canEdit = has('asset_coordinator')
  const save = (table, id, patch, key = 'id') => run(async () => { await db.update(table, id, patch, key); await refresh(); reloadS() }, 'Saved')
  return (
    <>
      <Head title="Admin" sub="People and roles, department asset contacts, settings and the audit log.">
        {['people', 'contacts', 'settings', 'audit'].map(t => <button key={t} className={tab === t ? 'primary' : ''} onClick={() => setTab(t)}>{{ people: 'People and roles', contacts: 'Department contacts', settings: 'Settings', audit: 'Audit log' }[t]}</button>)}
      </Head>
      {box}
      {tab === 'people' && <div className="card" style={{ overflowX: 'auto' }}>
        <p className="small muted">People appear here after they sign in for the first time. Tick their roles; access follows the role.</p>
        <table><thead><tr><th>Name</th><th>Department</th><th>Line manager</th><th>Roles</th></tr></thead>
          <tbody>{people.map(p => <tr key={p.id}>
            <td><input defaultValue={p.full_name} disabled={!canEdit} onBlur={e => e.target.value !== p.full_name && save('profiles', p.id, { full_name: e.target.value })} /><div className="small muted">{p.email}</div><input defaultValue={p.job_title || ''} placeholder="Job title" disabled={!canEdit} onBlur={e => e.target.value !== (p.job_title || '') && save('profiles', p.id, { job_title: e.target.value })} /></td>
            <td><Select value={p.department} onChange={v => save('profiles', p.id, { department: v })} placeholder="—" options={departments.map(d => d.name)} disabled={!canEdit} /></td>
            <td><PersonSelect value={p.manager_id} onChange={v => save('profiles', p.id, { manager_id: v || null })} placeholder="—" /></td>
            <td style={{ minWidth: 380 }}>{ROLES.map(([k, l]) => <label key={k} className="check" style={{ display: 'inline-flex', marginRight: 10, padding: 2 }}><input type="checkbox" disabled={!canEdit || busy} checked={p.roles?.includes(k)} onChange={e => save('profiles', p.id, { roles: e.target.checked ? [...(p.roles || []), k] : p.roles.filter(r => r !== k) })} />{l}</label>)}</td>
          </tr>)}</tbody></table>
      </div>}
      {tab === 'contacts' && <div className="card">
        <p className="small muted">One contact and a backup per department. They coordinate with Anton; they do not approve.</p>
        <table><thead><tr><th>Department</th><th>Contact</th><th>Backup</th><th>Notes</th></tr></thead>
          <tbody>{departments.map(d => <tr key={d.name}><td>{d.name}</td>
            <td><PersonSelect value={d.contact_id} onChange={v => save('am_departments', d.name, { contact_id: v || null }, 'name')} placeholder="—" /></td>
            <td><PersonSelect value={d.backup_id} onChange={v => save('am_departments', d.name, { backup_id: v || null }, 'name')} placeholder="—" /></td>
            <td className="small muted">{d.notes}</td></tr>)}</tbody></table>
      </div>}
      {tab === 'settings' && <div className="card">
        <table><thead><tr><th>Setting</th><th>Value</th><th>What it is</th></tr></thead>
          <tbody>{(settings || []).map(s => <tr key={s.key}><td>{s.key}</td><td><input defaultValue={s.value === null ? '' : String(s.value)} disabled={!canEdit} onBlur={e => { const v = e.target.value.trim(); save('am_settings', s.key, { value: v === '' ? null : isNaN(v) ? v : Number(v) }, 'key') }} /></td><td className="small muted">{s.note}</td></tr>)}</tbody></table>
      </div>}
      {tab === 'audit' && <div className="card"><table><thead><tr><th>When</th><th>Who</th><th>Table</th><th>Action</th><th>Change</th></tr></thead>
        <tbody>{(audit || []).map(a => <tr key={a.id}><td className="small">{fmtDateTime(a.at)}</td><td className="small">{name(a.user_id)}</td><td className="small">{a.table_name}</td><td className="small">{a.action}</td><td className="small muted">{a.new_row?.ref || a.new_row?.asset_no || a.new_row?.pr_number || ''} {a.new_row?.status ? '→ ' + a.new_row.status : ''}</td></tr>)}</tbody></table></div>}
    </>
  )
}
