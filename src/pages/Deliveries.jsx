import { useState, Fragment } from 'react'
import { useApp } from '../lib/auth'
import { db } from '../lib/db'
import { Head, Pill, Field, Select, useLoad, useAction, Files } from '../components/ui'
import { fmtDate, today, workingDays } from '../lib/util'
import { LOG_TYPES, LOG_STATUS } from '../lib/lists'

export default function Deliveries() {
  const { has } = useApp()
  const [rows, reload] = useLoad(() => db.list('am_log', { order: 'expected_date' }), [])
  const [open, setOpen] = useState(null); const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ type: 'Collection by Angels', company: '', tracking: '', linked_to: '', expected_date: '', handled_by: 'Anton' })
  const [run, busy, box] = useAction()
  const edit = has('factotum', 'asset_coordinator')
  const t = today()
  const live = (rows || []).filter(r => !['Received', 'Collected', 'Delivered', 'Cancelled'].includes(r.status))
  const late = live.filter(r => r.expected_date && r.expected_date < t)
  const add = e => { e.preventDefault(); run(async () => { await db.insert('am_log', { ...f, status: 'Expected' }); setAdding(false); reload() }) }
  const setStatus = (r, status) => run(async () => {
    await db.update('am_log', r.id, { status, completed_at: ['Received', 'Collected', 'Delivered'].includes(status) ? new Date().toISOString() : null })
    reload()
  })
  return (
    <>
      <Head title="Deliveries and collections" sub="Supplier deliveries, ZipPrint jobs, courier collections and dispatches.">{edit && <button className="primary" onClick={() => setAdding(!adding)}>Log a delivery or collection</button>}</Head>
      {adding && <form className="card" onSubmit={add}>
        <div className="grid">
          <Field label="Type"><Select value={f.type} onChange={v => setF({ ...f, type: v })} options={LOG_TYPES} /></Field>
          <Field label="Company"><input required value={f.company} onChange={e => setF({ ...f, company: e.target.value })} placeholder="e.g. ZipPrint" /></Field>
          <Field label="Reference / waybill / job no."><input value={f.tracking} onChange={e => setF({ ...f, tracking: e.target.value })} /></Field>
          <Field label="What it is for"><input value={f.linked_to} onChange={e => setF({ ...f, linked_to: e.target.value })} placeholder="Request, booking or PR Briefing job" /></Field>
          <Field label="Expected date"><input type="date" value={f.expected_date} onChange={e => setF({ ...f, expected_date: e.target.value })} /></Field>
          <Field label="Who receives or collects"><input value={f.handled_by} onChange={e => setF({ ...f, handled_by: e.target.value })} /></Field>
        </div>{box}<button className="primary" disabled={busy} style={{ marginTop: 10 }}>Add to log</button>
      </form>}
      <div className="tiles" style={{ marginBottom: 18 }}>
        <div className="tile"><b>{live.filter(r => r.expected_date === t).length}</b><span>Due today</span></div>
        <div className="tile"><b>{live.filter(r => r.status === 'Ready to collect').length}</b><span>Ready to collect</span></div>
        <div className="tile"><b>{live.filter(r => r.type === 'Dispatch out').length}</b><span>Going out</span></div>
        <div className="tile" style={{ borderColor: late.length ? '#E8B4AE' : undefined }}><b>{late.length}</b><span>Late: needs attention</span></div>
      </div>
      <div className="card"><table>
        <thead><tr><th>Ref</th><th>Type</th><th>Company</th><th>Reference</th><th>For</th><th>Expected</th><th>Who</th><th>Status</th></tr></thead>
        <tbody>{(rows || []).map(r => (<Fragment key={r.id}>
          <tr className="click" onClick={() => setOpen(open === r.id ? null : r.id)}>
            <td>{r.ref}</td><td>{r.type}</td><td>{r.company}</td><td>{r.tracking}</td><td>{r.linked_to}</td>
            <td>{fmtDate(r.expected_date)}{r.expected_date && r.expected_date < t && live.includes(r) && <div className="small" style={{ color: '#9B2C22' }}>{workingDays(r.expected_date, t)} working days late</div>}</td><td>{r.handled_by}</td><td><Pill s={r.status} /></td>
          </tr>
          {open === r.id && <tr><td colSpan="8" style={{ background: '#F7FAF9' }}>
            {edit && <div className="row" style={{ marginBottom: 10 }}>{LOG_STATUS.map(s => <button key={s} disabled={busy || r.status === s} onClick={() => setStatus(r, s)}>{s}</button>)}</div>}
            {box}<Files subjectType="log" subjectId={r.id} kinds={['Delivery note', 'Waybill']} canAdd={edit} title="Proof: delivery note or waybill" />
          </td></tr>}
        </Fragment>))}{rows?.length === 0 && <tr><td colSpan="8" className="muted">Nothing logged.</td></tr>}</tbody>
      </table></div>
    </>
  )
}
