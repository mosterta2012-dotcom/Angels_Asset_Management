import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useApp, notify } from '../lib/auth'
import { db } from '../lib/db'
import { Head, Pill, Field, Select, useLoad, useAction, Files, Audit } from '../components/ui'
import { fmtDate, fmtDateTime, rand } from '../lib/util'
import { INCIDENT_TYPES } from '../lib/lists'

export function ReportProblem() {
  const { me, person, withRole } = useApp(); const nav = useNavigate()
  const [mine] = useLoad(() => db.list('am_assets', { eq: { custodian_id: me.id } }), [])
  const [f, setF] = useState({ asset_id: '', type: 'Damaged', occurred_at: '', place: '', locked_away: 'Yes', description: '', police_case_no: '', police_station: '', info_at_risk: 'No', loan_needed: false })
  const [run, busy, box] = useAction()
  const set = k => e => setF({ ...f, [k]: e?.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e })
  const lostOrStolen = ['Lost', 'Stolen'].includes(f.type)
  const submit = e => { e.preventDefault(); run(async () => {
    if (f.type === 'Stolen' && !f.police_case_no) throw new Error('Report the theft to the police first and add the case number.')
    const i = await db.insert('am_incidents', { ...f, asset_id: f.asset_id || null, occurred_at: new Date(f.occurred_at).toISOString(), reported_by: me.id, status: 'Reported' })
    const asset = (mine || []).find(a => a.id === f.asset_id)
    const what = `${f.type}: ${asset?.asset_no || 'item'} · ${me.full_name}`
    await notify([...withRole('factotum'), ...withRole('asset_coordinator')].map(p => p.id).concat(person(me.id)?.manager_id), `${i.ref} reported`, what + (f.loan_needed ? ' · loan laptop needed' : ''), `/incidents/${i.id}`)
    if (lostOrStolen) await notify(withRole('asset_coordinator').map(p => p.id), `URGENT: ask PCZEN to lock and wipe ${asset?.asset_no || ''}`, `Serial ${asset?.serial_no || '—'}. Open the incident and press Email PCZEN.`, `/incidents/${i.id}`)
    if (f.info_at_risk !== 'No') await notify(withRole('info_officer').map(p => p.id), `${i.ref}: personal information may be at risk`, what, `/incidents/${i.id}`)
    nav(`/incidents/${i.id}`)
  }) }
  return (
    <form onSubmit={submit}>
      <Head title="Report a problem" sub="Report loss, theft or damage within 24 hours. Software or sign-in problems go to the PCZEN portal instead." />
      <div className="cols">
        <div className="card">
          <div className="grid">
            <Field label="Which item"><Select value={f.asset_id} onChange={set('asset_id')} placeholder="Choose" options={(mine || []).map(a => [a.id, `${a.asset_no} · ${a.category}`])} /></Field>
            <Field label="What happened"><Select value={f.type} onChange={set('type')} options={INCIDENT_TYPES} /></Field>
            <Field label="When"><input type="datetime-local" required value={f.occurred_at} onChange={set('occurred_at')} /></Field>
            <Field label="Where"><input value={f.place} onChange={set('place')} placeholder="e.g. in a vehicle at a venue" /></Field>
            <Field label="Was it locked away, out of sight?"><Select value={f.locked_away} onChange={set('locked_away')} options={['Yes', 'No', 'Not applicable']} /></Field>
            {f.type === 'Stolen' && <><Field label="Police case number"><input value={f.police_case_no} onChange={set('police_case_no')} required /></Field><Field label="Police station"><input value={f.police_station} onChange={set('police_station')} /></Field></>}
            <Field label="Was Angels or personal information on it?"><Select value={f.info_at_risk} onChange={set('info_at_risk')} options={['No', 'Yes', 'Not sure']} /></Field>
          </div>
          <Field label="What happened (details)"><textarea value={f.description} onChange={set('description')} /></Field>
          <label className="check"><input type="checkbox" checked={f.loan_needed} onChange={set('loan_needed')} />I need a loan laptop to keep working</label>
          {lostOrStolen && <div className="note err">PCZEN will be asked at once to lock and wipe the device and reset your access.</div>}
          {box}<button className="primary" disabled={busy}>Report now</button>
          <p className="small muted">Add photos on the next screen.</p>
        </div>
        <div className="card small"><h2>Who is told</h2><ul><li>Anton (Factotum)</li><li>Annemarie (Asset Coordinator)</li><li>Your line manager</li><li>PCZEN, for lost or stolen devices</li><li>The Information Officer, if information may be at risk</li></ul></div>
      </div>
    </form>
  )
}

export function Incidents() {
  const { name } = useApp(); const nav = useNavigate()
  const [rows] = useLoad(() => db.list('am_incidents', { order: 'created_at', desc: true }), [])
  return (
    <>
      <Head title="Incidents" sub="Loss, theft and damage (FRM-04)."><Link className="btn primary" to="/report-problem">Report a problem</Link></Head>
      <div className="card"><table>
        <thead><tr><th>Ref</th><th>Type</th><th>Reported by</th><th>When</th><th>Status</th></tr></thead>
        <tbody>{(rows || []).map(i => <tr key={i.id} className="click" onClick={() => nav(`/incidents/${i.id}`)}><td><Link to={`/incidents/${i.id}`}>{i.ref}</Link>{i.late_report && <div className="small" style={{ color: '#9B2C22' }}>reported late</div>}</td><td><Pill s={i.type} /></td><td>{name(i.reported_by)}</td><td>{fmtDate(i.occurred_at)}</td><td><Pill s={i.status} /></td></tr>)}
          {rows?.length === 0 && <tr><td colSpan="5" className="muted">No incidents.</td></tr>}</tbody>
      </table></div>
    </>
  )
}

export function IncidentDetail() {
  const { id } = useParams(); const ctx = useApp(); const { name, has, backOffice, me } = ctx; const nav = useNavigate()
  const [i, reload] = useLoad(() => db.get('am_incidents', id), [id])
  const [asset] = useLoad(() => i?.asset_id ? db.get('am_assets', i.asset_id) : Promise.resolve(null), [i?.asset_id])
  const [f, setF] = useState(null); const [run, busy, box] = useAction()
  if (!i) return <div className="muted">Loading…</div>
  const v = f || i; const set = k => e => setF({ ...v, [k]: e?.target ? e.target.value : e })
  const save = (extra = {}) => run(async () => { await db.update('am_incidents', id, { assessment: v.assessment, pczen_lock_ticket: v.pczen_lock_ticket, insurer_route: v.insurer_route, claim_no: v.claim_no, claim_outcome: v.claim_outcome, payout: v.payout || null, liability_review: v.liability_review, status: v.status, ...extra }); setF(null); reload() }, 'Saved')
  const replacement = () => run(async () => {
    const reporter = ctx.person(i.reported_by)
    const r = await db.insert('am_requests', { request_type: 'Replacement', requested_by: me.id, for_user: i.reported_by, department: reporter?.department, line_manager_id: reporter?.manager_id || me.id, category: asset?.category || 'Laptop', laptop_tier: asset?.laptop_tier, replaces_asset: i.asset_id, replacement_reason: i.type === 'Not working' ? 'Other' : i.type, incident_id: i.id, business_reason: `Replacement after ${i.ref} (${i.type})`, date_needed: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), funding_source: asset?.funding_source === 'Angels' || !asset ? 'Angels' : asset.funding_source, project_code: asset?.project_code || null, budget_line: asset?.funding_source && asset.funding_source !== 'Angels' ? 'Equipment' : null, delivery_route: 'Via Anton, then courier', status: 'Awaiting line manager' })
    await db.insert('am_approvals', { subject_type: 'request', subject_id: r.id, step: 'Line manager', approver_id: r.line_manager_id, decision: 'Pending' })
    await db.update('am_incidents', id, { replacement_request_id: r.id, status: 'Assessed' })
    nav(`/requests/${r.id}`)
  })
  const mail = `mailto:?subject=${encodeURIComponent(`URGENT lock and wipe: ${asset?.asset_no || ''} (${i.ref})`)}&body=${encodeURIComponent(`Please lock and wipe this device and reset access now.\nAsset: ${asset?.asset_no}\nSerial: ${asset?.serial_no}\nUser: ${name(i.reported_by)}\nIncident: ${i.ref} (${i.type})`)}`
  return (
    <>
      <Head title={`${i.ref} · ${i.type}`} sub={`${name(i.reported_by)} · ${fmtDateTime(i.occurred_at)} · ${i.place || ''}`}><Pill s={i.status} />{i.late_report && <Pill s="Reported late" />}</Head>
      <div className="cols">
        <div>
          <div className="card">
            <dl className="kv"><dt>Item</dt><dd>{asset ? <Link to={`/register/${asset.id}`}>{asset.asset_no}</Link> : '—'} {asset?.serial_no ? `· ${asset.serial_no}` : ''}</dd>
              <dt>Locked away</dt><dd>{i.locked_away}</dd><dt>Details</dt><dd>{i.description}</dd>
              {i.police_case_no && <><dt>Police case</dt><dd>{i.police_case_no} · {i.police_station}</dd></>}
              <dt>Information at risk</dt><dd>{i.info_at_risk}</dd><dt>Loan laptop needed</dt><dd>{i.loan_needed ? 'Yes' : 'No'}</dd>
              <dt>Insurance</dt><dd>{asset?.insurance_status || '—'}</dd></dl>
            {['Lost', 'Stolen'].includes(i.type) && backOffice && <div className="note err row">Lost or stolen: PCZEN must lock and wipe the device now. <a className="btn" href={mail}>Email PCZEN</a></div>}
          </div>
          {backOffice && <div className="card">
            <h2>Assessment and claim</h2>
            <div className="grid">
              <Field label="PCZEN lock ticket"><input value={v.pczen_lock_ticket || ''} onChange={set('pczen_lock_ticket')} /></Field>
              <Field label="Assessment"><Select value={v.assessment} onChange={set('assessment')} placeholder="Choose" options={['Repair', 'Replace', 'Write off and replace', 'No action']} /></Field>
              <Field label="Claim goes to"><Select value={v.insurer_route} onChange={set('insurer_route')} placeholder="Choose" options={['Broker (Angels-insured)', 'Client (client-insured)', 'None']} /></Field>
              <Field label="Claim number"><input value={v.claim_no || ''} onChange={set('claim_no')} /></Field>
              <Field label="Claim outcome"><input value={v.claim_outcome || ''} onChange={set('claim_outcome')} /></Field>
              <Field label="Payout (R)"><input type="number" value={v.payout || ''} onChange={set('payout')} /></Field>
              <Field label="Status"><Select value={v.status} onChange={set('status')} options={['Reported', 'Device locked', 'Assessed', 'Claim open', 'Claim closed', 'Write-off approved', 'Closed']} /></Field>
            </div>
            <Field label="Liability review (management)"><textarea value={v.liability_review || ''} onChange={set('liability_review')} /></Field>
            {box}
            <div className="row" style={{ marginTop: 10 }}>
              <button className="primary" disabled={busy} onClick={() => save()}>Save</button>
              {!i.replacement_request_id && i.asset_id && <button disabled={busy} onClick={replacement}>Create linked replacement request</button>}
              {i.replacement_request_id && <Link className="btn" to={`/requests/${i.replacement_request_id}`}>Open replacement request</Link>}
              {has('hof') && !i.write_off_approved_by && v.assessment === 'Write off and replace' && <button disabled={busy} onClick={() => run(async () => { await db.update('am_incidents', id, { write_off_approved_by: me.id, status: 'Write-off approved' }); if (asset) await db.update('am_assets', asset.id, { condition: 'Written off', status: 'Disposed' }); reload() })}>Approve write-off (HOF)</button>}
            </div>
            {i.write_off_approved_by && <div className="note ok">Write-off approved by {name(i.write_off_approved_by)}</div>}
            <h3 style={{ marginTop: 16 }}>Claim pack</h3>
            <ul className="small">
              <li>{i.police_case_no || i.type !== 'Stolen' ? '✓' : '✗'} Police case number (theft)</li><li>{asset?.invoice_no ? '✓' : '✗'} Purchase invoice on the asset record</li>
              <li>✓ Incident report {i.ref}</li><li>{i.pczen_lock_ticket || !['Lost', 'Stolen'].includes(i.type) ? '✓' : '✗'} PCZEN lock confirmation</li><li>See photos and the signed handover form on the asset record</li>
            </ul>
          </div>}
        </div>
        <div><div className="card"><Files subjectType="incident" subjectId={i.id} kinds={['Photo', 'Police report', 'Quote for repair', 'Other']} canAdd={i.reported_by === me.id || backOffice} /></div><Audit table="am_incidents" id={i.id} /></div>
      </div>
    </>
  )
}
