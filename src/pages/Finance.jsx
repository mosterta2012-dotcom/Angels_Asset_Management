import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp, notify } from '../lib/auth'
import { db, DEMO } from '../lib/db'
import { Head, Pill, Field, useLoad, useAction } from '../components/ui'
import { fmtDate, fmtDateTime, rand } from '../lib/util'

// Payment Requests for asset purchases.
// Pre-approval happens in Asset Management. The Bookkeeper and Head of Finance steps stand in for
// Finance Management until Brent links the two modules (briefing section 8).
export default function Finance() {
  const { has } = useApp()
  const [rows, reload] = useLoad(async () => {
    const [prs, reqs] = await Promise.all([db.list('am_payment_requests', { order: 'created_at', desc: true }), db.list('am_requests')])
    return prs.map(p => ({ ...p, request: reqs.find(r => r.id === p.request_id) }))
  }, [])
  const mine = p => (p.status === 'Pre-approval' && has('asset_coordinator', 'hod_ops')) || (p.status === 'With Finance' && has('bookkeeper')) || (p.status === 'Compliance checked' && has('hof', 'ceo', 'treasurer')) || (p.status === 'Approved' && has('bookkeeper', 'hof'))
  return (
    <>
      <Head title="Payment Requests" sub="Asset purchases: pre-approval here, then the compliance check and final check in Finance Management." />
      <div className="card">
        <table>
          <thead><tr><th>PR</th><th>Request</th><th>Supplier</th><th>Amount</th><th>Status</th><th>Your action</th></tr></thead>
          <tbody>{(rows || []).map(p => (
            <tr key={p.id}><td>{p.pr_number}</td><td><Link to={`/requests/${p.request_id}`}>{p.request?.ref}</Link></td><td>{p.supplier}</td><td>{rand(p.amount_incl_vat)}</td><td><Pill s={p.status} /></td><td>{mine(p) ? <Link to={`/requests/${p.request_id}`}><strong>Open</strong></Link> : ''}</td></tr>
          ))}{rows?.length === 0 && <tr><td colSpan="6" className="muted">No Payment Requests yet.</td></tr>}</tbody>
        </table>
      </div>
    </>
  )
}

export function PaymentPanel({ pr, request: r, reload }) {
  const ctx = useApp(); const { me, has, name, withRole, settings } = ctx
  const [reason, setReason] = useState(''); const [checks, setChecks] = useState({})
  const [run, busy, box] = useAction()
  const ceoLimit = settings.ceo_limit
  const aboveLimit = ceoLimit && pr.amount_incl_vat > ceoLimit
  const set = async (patch, msgTo, msg) => { await db.update('am_payment_requests', pr.id, patch); if (msgTo) await notify(msgTo, msg, `${r.ref} · ${pr.supplier} · ${rand(pr.amount_incl_vat)}`, `/requests/${r.id}`) }
  const decline = (backTo) => run(async () => {
    if (!reason.trim()) throw new Error('A decline needs a reason.')
    await set({ status: 'Declined', decline_reason: reason }, [...withRole('factotum').map(p => p.id), r.requested_by], `${pr.pr_number} declined`)
    await db.update('am_requests', r.id, { status: backTo }); reload()
  })
  const preapprove = () => run(async () => {
    if (r.requested_by === me.id && !has('hod_ops')) throw new Error('This is your own request: the Head of Operations and Systems pre-approves alone.')
    await set(DEMO ? { status: 'With Finance', preapproved_by: me.id, preapproved_at: new Date().toISOString() } : { status: 'Pre-approved' }, withRole('bookkeeper').map(p => p.id), `${pr.pr_number} waits for your compliance check`)
    await db.update('am_requests', r.id, { status: 'With Finance' }); reload()
  })
  const comply = () => run(async () => {
    if (!['supplier', 'bank', 'quotes', 'docs'].every(k => checks[k])) throw new Error('Tick every compliance line first.')
    await set({ status: 'Compliance checked', ...(DEMO ? { compliance_by: me.id, compliance_at: new Date().toISOString() } : {}) }, (aboveLimit ? withRole('ceo') : withRole('hof')).map(p => p.id), `${pr.pr_number} waits for your final check`)
    reload()
  })
  const approve = () => run(async () => {
    if (r.requested_by === me.id) throw new Error('Nobody approves their own request (R-06).')
    if (aboveLimit && !has('ceo', 'treasurer')) throw new Error('Above the CEO limit: the CEO (or Board Treasurer) gives the final approval.')
    await set({ status: 'Approved', ...(DEMO ? { final_by: me.id, final_at: new Date().toISOString() } : {}) }, [...withRole('factotum'), ...withRole('asset_coordinator')].map(p => p.id), `${pr.pr_number} approved by Finance: place the order`)
    await db.update('am_requests', r.id, { status: 'Ready to order' }); reload()
  })
  const paid = () => run(async () => { await set({ status: 'Paid', paid_at: new Date().toISOString().slice(0, 10) }, withRole('factotum').map(p => p.id), `${pr.pr_number} paid`); reload() })

  const tile = (where, what, who, st) => <div className="tile"><span>{where}</span><strong>{what}</strong><span>{who}</span>{st && <Pill s={st} />}</div>
  const after = s => ['Pre-approval', 'With Finance', 'Compliance checked', 'Approved', 'Paid'].indexOf(pr.status) > ['Pre-approval', 'With Finance', 'Compliance checked', 'Approved', 'Paid'].indexOf(s)
  return (
    <div className="card">
      <h2>Payment Request {pr.pr_number}</h2>
      <dl className="kv" style={{ marginBottom: 14 }}>
        <dt>Supplier</dt><dd>{pr.supplier}</dd><dt>Quotes</dt><dd>{pr.quotes}</dd><dt>Amount incl. VAT</dt><dd>{rand(pr.amount_incl_vat)}{aboveLimit ? ' · above the CEO limit' : ''}</dd>
        <dt>Charged to</dt><dd>{pr.project_code || r.funding_source}{pr.budget_line ? ' · ' + pr.budget_line : ''}</dd><dt>Created by</dt><dd>{name(pr.created_by)} · {fmtDate(pr.created_at)}</dd>
      </dl>
      <div className="tiles">
        {tile('Asset Management', 'Pre-approval and budget check', pr.preapproved_by ? `${name(pr.preapproved_by)} · ${fmtDate(pr.preapproved_at)}` : 'Annemarie and Brent', pr.preapproved_by ? 'Pre-approved' : pr.status === 'Pre-approval' ? 'Waiting' : null)}
        {tile('Finance Management', 'Compliance check and upload', pr.compliance_by ? `${name(pr.compliance_by)} · ${fmtDate(pr.compliance_at)}` : 'Jessica · supplier, bank details, documents', pr.compliance_by ? 'Checked' : pr.status === 'With Finance' ? 'Waiting' : null)}
        {tile('Finance Management', 'Final check before payment', pr.final_by ? `${name(pr.final_by)} · ${fmtDate(pr.final_at)}` : `Gerald${aboveLimit ? ', then CEO' : ''}`, pr.final_by ? 'Approved' : pr.status === 'Compliance checked' ? 'Waiting' : null)}
        {tile('Finance Management', 'Payment', pr.paid_at ? `Paid ${fmtDate(pr.paid_at)}` : 'When Finance marks it Paid', pr.paid_at ? 'Paid' : after('Compliance checked') ? 'Awaiting payment' : null)}
      </div>
      {pr.status === 'Declined' && <div className="note err">Declined: {pr.decline_reason}</div>}

      {pr.status === 'Pre-approval' && has('asset_coordinator', 'hod_ops') && (
        <div style={{ marginTop: 14 }}>
          <h3>Your step: pre-approval and budget check</h3>
          <Field label="Reason (to decline)"><input value={reason} onChange={e => setReason(e.target.value)} /></Field>
          {box}<div className="row" style={{ marginTop: 8 }}><button className="primary" disabled={busy} onClick={preapprove}>Pre-approve and send to Finance</button><button className="danger" disabled={busy} onClick={() => decline('Quotes')}>Decline</button></div>
        </div>
      )}
      {pr.status === 'With Finance' && has('bookkeeper') && (
        <div style={{ marginTop: 14 }}>
          <h3>Your step: full compliance check</h3>
          {[['supplier', 'Supplier details checked'], ['bank', 'Bank details verified (call-back if changed)'], ['quotes', 'Quotes meet FIN-03'], ['docs', 'Documents complete and uploaded']].map(([k, l]) => <label key={k} className="check"><input type="checkbox" checked={!!checks[k]} onChange={e => setChecks({ ...checks, [k]: e.target.checked })} />{l}</label>)}
          <Field label="Reason (to decline)"><input value={reason} onChange={e => setReason(e.target.value)} /></Field>
          {box}<div className="row" style={{ marginTop: 8 }}><button className="primary" disabled={busy} onClick={comply}>Compliance checked</button><button className="danger" disabled={busy} onClick={() => decline('Quotes')}>Decline</button></div>
        </div>
      )}
      {pr.status === 'Compliance checked' && has('hof', 'ceo', 'treasurer') && (
        <div style={{ marginTop: 14 }}>
          <h3>Your step: final check before payment</h3>
          <Field label="Reason (to decline)"><input value={reason} onChange={e => setReason(e.target.value)} /></Field>
          {box}<div className="row" style={{ marginTop: 8 }}><button className="primary" disabled={busy} onClick={approve}>Approve</button><button className="danger" disabled={busy} onClick={() => decline('Quotes')}>Decline</button></div>
        </div>
      )}
      {pr.status === 'Approved' && has('bookkeeper', 'hof') && <div className="row" style={{ marginTop: 14 }}>{box}<button disabled={busy} onClick={paid}>Mark as Paid</button></div>}
      <p className="small muted" style={{ marginTop: 10 }}>The Finance steps stand in for Finance Management until the two modules are linked. Status changes are checked by the database (roles, order, own-request rule).</p>
    </div>
  )
}
