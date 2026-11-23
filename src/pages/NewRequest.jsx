import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useApp, notify } from '../lib/auth'
import { db, DEMO } from '../lib/db'
import { Head, Field, Select, PersonSelect, useAction, useLoad } from '../components/ui'
import { CATEGORIES, IT_CATEGORIES, REQUEST_TYPES, TIERS, MAIN_USES, REPLACEMENT_REASONS, FUNDING, DELIVERY_ROUTES } from '../lib/lists'
import { addWorkingDays, workingDays } from '../lib/util'

export default function NewRequest() {
  const { me, people, person, withRole, has, settings } = useApp()
  const nav = useNavigate(); const [sp] = useSearchParams()
  const [run, busy, box] = useAction()
  const [f, setF] = useState({
    request_type: 'Replacement', for_user: me.id, for_name: '', for_role: '', category: sp.get('category') || 'Laptop',
    laptop_tier: '', main_use: '', travels_with_user: false, item_description: '', replaces_asset: '', replacement_reason: '', incident_id: '',
    business_reason: '', date_needed: '', funding_source: 'Angels', project_code: '', budget_line: '', client_po_ref: '', owner_after_project: 'Client',
    budget_holder_id: '', delivery_route: DELIVERY_ROUTES[0], delivery_address: '', line_manager_id: me.manager_id || '',
  })
  const set = k => v => setF(x => ({ ...x, [k]: v?.target ? (v.target.type === 'checkbox' ? v.target.checked : v.target.value) : v }))
  const forPerson = person(f.for_user)
  useEffect(() => { if (f.request_type === 'New starter') setF(x => ({ ...x, for_user: '' })); else if (!f.for_user) setF(x => ({ ...x, for_user: me.id })) }, [f.request_type])
  useEffect(() => { if (forPerson?.manager_id) setF(x => ({ ...x, line_manager_id: forPerson.manager_id })) }, [f.for_user])
  const [held] = useLoad(() => f.for_user ? db.list('am_assets', { eq: { custodian_id: f.for_user } }) : Promise.resolve([]), [f.for_user])
  const [incidents] = useLoad(() => db.list('am_incidents', { eq: { reported_by: me.id }, order: 'created_at', desc: true }), [])
  const clientFunded = f.funding_source !== 'Angels'
  const needsIncident = ['Damaged', 'Lost', 'Stolen'].includes(f.replacement_reason)
  const late = f.request_type === 'New starter' && f.date_needed && workingDays(new Date(), f.date_needed) < (settings.new_starter_lead_days ?? 10)
  const suggestedTier = /CEO|HOD|Head|Finance HOD/i.test(forPerson?.job_title || f.for_role) ? 'Management' : /design|media|graphic/i.test(forPerson?.job_title || f.for_role) ? 'Design / Media' : 'Standard'

  async function submit(e) {
    e.preventDefault()
    run(async () => {
      if (needsIncident && !f.incident_id) throw new Error('Report the problem first (Report a problem), then link the incident here (R-02).')
      if (f.request_type === 'New starter' && !f.for_name) throw new Error('Give the new starter’s name.')
      if (!f.line_manager_id) throw new Error('Choose the line manager who approves the need.')
      const row = {
        request_type: f.request_type, requested_by: me.id, for_user: f.for_user || null, for_name: f.for_name || null, for_role: f.for_role || null,
        department: forPerson?.department || me.department, line_manager_id: f.line_manager_id, category: f.category, item_description: f.item_description,
        laptop_tier: f.category === 'Laptop' ? (f.laptop_tier || suggestedTier) : null, main_use: f.main_use || null, travels_with_user: f.travels_with_user,
        replaces_asset: f.replaces_asset || null, replacement_reason: f.replacement_reason || null, incident_id: f.incident_id || null,
        business_reason: f.business_reason, date_needed: f.date_needed, funding_source: f.funding_source,
        project_code: clientFunded ? f.project_code : null, budget_line: clientFunded ? f.budget_line : null, client_po_ref: clientFunded ? f.client_po_ref : null,
        owner_after_project: clientFunded ? f.owner_after_project : null, budget_holder_id: clientFunded ? (f.budget_holder_id || null) : null,
        delivery_route: f.delivery_route, status: 'Awaiting line manager',
      }
      if (DEMO) row.late_request = !!late
      const r = await db.insert('am_requests', row)
      await db.insert('am_approvals', { subject_type: 'request', subject_id: r.id, step: 'Line manager', approver_id: f.line_manager_id, decision: 'Pending', due_at: addWorkingDays(new Date(), settings.approval_days ?? 2) })
      const who = f.for_name || forPerson?.full_name || me.full_name
      await notify([f.line_manager_id], `${r.ref} waits for your approval`, `${f.category} for ${who}`, `/requests/${r.id}`)
      await notify([...withRole('asset_coordinator'), ...withRole('factotum')].map(p => p.id), `${r.ref} logged`, `${f.category}${row.laptop_tier ? ' · ' + row.laptop_tier : ''} for ${who}, needed by ${f.date_needed}${row.late_request || late ? ' (late request)' : ''}`, `/requests/${r.id}`)
      if (late) await notify(withRole('hr').map(p => p.id), `${r.ref} is a late new-starter request`, 'Logged fewer than 10 working days before the start date.', `/requests/${r.id}`)
      nav(`/requests/${r.id}`)
    })
  }

  return (
    <form onSubmit={submit}>
      <Head title="New request" sub="Three short steps. Accounts, email and software are set up by PCZEN: log those on the PCZEN portal." />
      <div className="cols">
        <div>
          <div className="card">
            <h2>1. Who is it for?</h2>
            <div className="grid">
              <Field label="Request type"><Select value={f.request_type} onChange={set('request_type')} options={REQUEST_TYPES} /></Field>
              {f.request_type === 'New starter' ? (<>
                <Field label="New starter’s name"><input value={f.for_name} onChange={set('for_name')} required /></Field>
                <Field label="Role / job title"><input value={f.for_role} onChange={set('for_role')} /></Field>
              </>) : (
                <Field label="For"><PersonSelect value={f.for_user} onChange={set('for_user')} /></Field>
              )}
              <Field label="Line manager" hint="Approves the need"><PersonSelect value={f.line_manager_id} onChange={set('line_manager_id')} /></Field>
            </div>
          </div>
          <div className="card">
            <h2>2. What is needed?</h2>
            <div className="grid">
              <Field label="Category"><Select value={f.category} onChange={set('category')} options={IT_CATEGORIES} /></Field>
              <Field label="Item"><input value={f.item_description} onChange={set('item_description')} placeholder="e.g. 14-inch laptop with bag" /></Field>
            </div>
            {f.request_type === 'Replacement' && (
              <div className="grid" style={{ marginTop: 14 }}>
                <Field label="Item being replaced"><Select value={f.replaces_asset} onChange={set('replaces_asset')} placeholder="Choose" options={(held || []).map(a => [a.id, `${a.asset_no} · ${a.category}`])} /></Field>
                <Field label="Reason"><Select value={f.replacement_reason} onChange={set('replacement_reason')} placeholder="Choose" options={REPLACEMENT_REASONS} /></Field>
                {needsIncident && <Field label="Linked incident report" hint={<>None yet? <Link to="/report-problem">Report a problem</Link> first.</>}><Select value={f.incident_id} onChange={set('incident_id')} placeholder="Choose" options={(incidents || []).map(i => [i.id, `${i.ref} · ${i.type}`])} /></Field>}
              </div>
            )}
            {f.category === 'Laptop' && (<>
              <h3 style={{ marginTop: 18 }}>Laptop tier <span className="muted small">· suggested for this role: {suggestedTier}. Anton confirms it.</span></h3>
              <div className="tiles">
                {TIERS.map(t => (
                  <label key={t.name} className="tile" style={{ cursor: 'pointer', borderColor: (f.laptop_tier || suggestedTier) === t.name ? '#1F7A65' : undefined, borderWidth: (f.laptop_tier || suggestedTier) === t.name ? 2 : 1 }}>
                    <span className="row"><input type="radio" name="tier" checked={(f.laptop_tier || suggestedTier) === t.name} onChange={() => set('laptop_tier')(t.name)} /><strong>{t.name}</strong></span>
                    <span>{t.note}</span>
                  </label>
                ))}
              </div>
              <div className="grid" style={{ marginTop: 14 }}>
                <Field label="Main use"><Select value={f.main_use} onChange={set('main_use')} placeholder="Choose" options={MAIN_USES} /></Field>
                <label className="check"><input type="checkbox" checked={f.travels_with_user} onChange={set('travels_with_user')} />It travels with me to venues or field work</label>
              </div>
            </>)}
          </div>
          <div className="card">
            <h2>3. Why, when and who pays</h2>
            <div className="grid">
              <Field label="Business reason"><textarea value={f.business_reason} onChange={set('business_reason')} required /></Field>
              <Field label="Date needed" hint={f.request_type === 'New starter' ? 'The start date. At least 10 working days ahead.' : ''}><input type="date" value={f.date_needed} onChange={set('date_needed')} required /></Field>
              <Field label="Who pays"><Select value={f.funding_source} onChange={set('funding_source')} options={FUNDING.filter(x => x !== 'Donated')} /></Field>
            </div>
            {late && <div className="note warn">This new-starter request is less than 10 working days before the start date. It will be flagged as a late request; HR and Annemarie are told.</div>}
            {clientFunded && (<>
              <div className="grid" style={{ marginTop: 14 }}>
                <Field label="Project code"><input value={f.project_code} onChange={set('project_code')} required /></Field>
                <Field label="Budget line"><input value={f.budget_line} onChange={set('budget_line')} required /></Field>
                <Field label="Contract / client PO ref."><input value={f.client_po_ref} onChange={set('client_po_ref')} /></Field>
                <Field label="Owner after the project"><Select value={f.owner_after_project} onChange={set('owner_after_project')} options={['Client', 'Angels', 'Beneficiary']} /></Field>
                <Field label="Programme budget holder"><PersonSelect value={f.budget_holder_id} onChange={set('budget_holder_id')} /></Field>
              </div>
              <div className="note info">Client-funded items are insured by the client, not added to Angels’ insurance. Angels cover needs Head of Finance approval and a client contribution.</div>
            </>)}
            <div className="grid" style={{ marginTop: 14 }}>
              <Field label="Delivery"><Select value={f.delivery_route} onChange={set('delivery_route')} options={DELIVERY_ROUTES} /></Field>
              {f.delivery_route !== DELIVERY_ROUTES[0] && <Field label="Delivery address" hint="Used for this courier booking only. Not stored."><input value={f.delivery_address} onChange={set('delivery_address')} /></Field>}
            </div>
          </div>
          {box}
          <div className="row"><button className="primary" disabled={busy}>Submit request</button><Link to="/" className="btn">Cancel</Link></div>
        </div>
        <div className="card">
          <h2>Who approves it</h2>
          <ol className="small" style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Your line manager</li>{clientFunded && <li>Programme budget holder</li>}<li>Anton · technical check (repair, stock or buy)</li>
            <li>Annemarie and Brent · pre-approval and budget</li><li>Finance · Jessica, then Gerald (CEO above the limit)</li>
          </ol>
          <p className="small muted">You get a notification at every step. Annemarie and Anton are kept informed.</p>
        </div>
      </div>
    </form>
  )
}
