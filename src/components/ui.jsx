import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import { statusTone, pillStyle, fmtDateTime } from '../lib/util'
import { useApp } from '../lib/auth'

export const Pill = ({ s }) => <span className="pill" style={pillStyle(statusTone(s))}>{s}</span>

export function Head({ title, sub, children }) {
  return <div className="head"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="row">{children}</div></div>
}

export function Field({ label, hint, children }) {
  return <label className="f">{label}{hint && <small>{hint}</small>}{children}</label>
}

export function Select({ value, onChange, options, placeholder, ...rest }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)} {...rest}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

export function PersonSelect({ value, onChange, role, placeholder = 'Choose a person' }) {
  const { people } = useApp()
  const list = people.filter(p => p.active !== false && (!role || p.roles?.includes(role)))
  return <Select value={value} onChange={onChange} placeholder={placeholder} options={list.map(p => [p.id, p.full_name])} />
}

// Loads data with an async function; re-runs when deps change. Returns [data, reload, error].
export function useLoad(fn, deps = []) {
  const [data, setData] = useState(null); const [err, setErr] = useState(null); const [n, setN] = useState(0)
  useEffect(() => { let live = true; fn().then(d => live && setData(d)).catch(e => live && setErr(e.message)); return () => { live = false } }, [...deps, n])
  return [data, () => setN(x => x + 1), err]
}

// Wraps an action: shows errors from the database rules in a friendly box.
export function useAction() {
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(null)
  async function run(fn, ok) {
    setBusy(true); setMsg(null)
    try { await fn(); if (ok) setMsg({ t: 'ok', m: ok }) } catch (e) { setMsg({ t: 'err', m: e.message }) } finally { setBusy(false) }
  }
  const box = msg ? <div className={`note ${msg.t}`}>{msg.m}</div> : null
  return [run, busy, box]
}

export function Files({ subjectType, subjectId, kinds = ['Photo'], canAdd = true, title = 'Photos and documents' }) {
  const [files, reload] = useLoad(() => db.list('am_files', { eq: { subject_type: subjectType, subject_id: subjectId }, order: 'created_at' }), [subjectId])
  const [urls, setUrls] = useState({}); const [kind, setKind] = useState(kinds[0]); const [busy, setBusy] = useState(false)
  useEffect(() => { (async () => { const u = {}; for (const f of files || []) u[f.id] = await db.fileUrl(f.path); setUrls(u) })() }, [files])
  async function add(e) {
    const list = [...e.target.files]; if (!list.length) return
    setBusy(true)
    try { for (const file of list) { const path = await db.upload(file, `${subjectType}/${subjectId}`); await db.insert('am_files', { subject_type: subjectType, subject_id: subjectId, kind, path, file_name: file.name }) } }
    finally { setBusy(false); e.target.value = ''; reload() }
  }
  return (
    <div>
      <h3>{title}</h3>
      <div className="thumbs">
        {(files || []).map(f => (
          <a key={f.id} href={urls[f.id] || undefined} target="_blank" rel="noreferrer" title={`${f.kind} · ${f.file_name}`} className="small" style={{ display: 'flex', flexDirection: 'column', gap: 2, width: 96 }}>
            {urls[f.id] && /^data:image|\.(png|jpe?g|webp|gif)/i.test(urls[f.id] + f.file_name) ? <img src={urls[f.id]} alt={f.kind} /> : <span className="tile" style={{ height: 72, justifyContent: 'center', fontSize: 12 }}>{f.file_name}</span>}
            <span className="muted">{f.kind}</span>
          </a>
        ))}
        {files?.length === 0 && <span className="muted small">None yet.</span>}
      </div>
      {canAdd && (
        <div className="row" style={{ marginTop: 10 }}>
          <Select value={kind} onChange={setKind} options={kinds} />
          <input type="file" multiple accept="image/*,application/pdf" onChange={add} disabled={busy} capture="environment" />
        </div>
      )}
    </div>
  )
}

export function Timeline({ items }) {
  return (
    <ul className="steps">
      {items.map((s, i) => (
        <li key={i}><span className={`dot ${s.state || ''}`} /><div><div style={{ fontWeight: s.state === 'now' ? 700 : 500 }}>{s.name}</div>{s.note && <div className="muted small">{s.note}</div>}</div></li>
      ))}
    </ul>
  )
}

export function Audit({ table, id }) {
  const { name, has } = useApp()
  const [rows] = useLoad(() => has('asset_coordinator', 'hod_ops', 'hof') ? db.list('am_audit', { eq: { table_name: table, record_id: id }, order: 'at', desc: true, limit: 20 }) : Promise.resolve([]), [id])
  if (!rows?.length) return null
  return (
    <details className="card"><summary style={{ cursor: 'pointer', fontWeight: 600 }}>Audit log ({rows.length})</summary>
      <table><tbody>{rows.map(r => <tr key={r.id}><td className="small">{fmtDateTime(r.at)}</td><td className="small">{name(r.user_id)}</td><td className="small">{r.action} {r.new_row?.status ? `· ${r.new_row.status}` : ''}</td></tr>)}</tbody></table>
    </details>
  )
}
