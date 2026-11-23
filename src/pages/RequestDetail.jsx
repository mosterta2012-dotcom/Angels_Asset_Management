import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApp, notify } from '../lib/auth'
import { db, DEMO } from '../lib/db'
import { Head, Pill, Field, Select, PersonSelect, useLoad, useAction, Files, Timeline, Audit } from '../components/ui'
import { fmtDate, fmtDateTime, rand, addWorkingDays, workingDays, today, sha256 } from '../lib/util'
import { TIERS, OLD_LAPTOP, PRECHECK, CONDITIONS_OF_USE, FLOW } from '../lib/lists'
import { PaymentPanel } from './Finance'

export default function RequestDetail() {
  const { id } = useParams()
  const ctx = useApp(); const { name, person } = ctx
  const [data, reload, err] = useLoad(async () => {
    const r = await db.get('am_requests', id)
    if (!r) return null
    const [approvals, prs, orders, assets, jobs, checks, handovers] = await Promise.all([
      db.list('am_approvals', { eq: { subject_id: id }, order: 'created_at' }),
      db.list('am_payment_requests', { eq: { request_id: id }, order: 'created_at' }),
      db.list('am_orders', { eq: { request_id: id } }),
      db.list('am_assets', { eq: { request_id: id } }),
      db.list('am_pczen_jobs', { eq: { request_id: id }, order: 'created_at' }),
      db.list('am_prechecks', { eq: { request_id: id }, order: 'checked_at' }),
      db.list('am_handovers', { eq: { request_id: id }, order: 'created_at' }),
    ])
    const replaced = r.replaces_asset ? await db.get('am_assets', r.replaces_asset) : null
    return { r, approvals, pr: prs.at(-1), orders, assets, jobs, job: jobs.at(-1), checks, handover: handovers.at(-1), replaced }
  }, [id])
  if (err) return <div className="note err">{err}</div>
  if (!data) return <div className="muted">Loading…</div>
  if (!data.r) return <div className="card">Request not found, or you do not have access to it.</div>
  const { r } = data
  const forName = r.for_user ? name(r.for_user) : r.for_name
  const idx = FLOW.indexOf(r.status)
  const steps = FLOW.filter(s => s !== 'Awaiting budget holder' || r.budget_holder_id).map(s => ({ name: s, state: r.status === 'Handed over' || FLOW.indexOf(s) < idx ? 'done' : s === r.status ? 'now' : '' }))

  return (
    <>
      <Head title={`${r.ref} · ${r.category}${r.laptop_tier ? ' · ' + r.laptop_tier : ''}`} sub={`${r.request_type} for ${forName} · needed by ${fmtDate(r.date_needed)} · ${r.funding_source}${r.project_code ? ' · ' + r.project_code : ''}`}>
        <Pill s={r.status} />{r.late_request && <Pill s="Late request" />}
      </Head>
      <div className="cols">
        <div>
          <Step {...data} ctx={ctx} reload={reload} />
          {data.pr && <PaymentPanel pr={data.pr} request={r} reload={reload} />}
          <div className="card">
            <h2>Request details</h2>
            <dl className="kv">
              <dt>Requested by</dt><dd>{name(r.requested_by)} · {fmtDateTime(r.created_at)}</dd>
              <dt>For</dt><dd>{forName}{r.for_role ? ` · ${r.for_role}` : ''} · {r.department}</dd>
              <dt>Line manager</dt><dd>{name(r.line_manager_id)}</dd>
              <dt>Item</dt><dd>{r.item_description || r.category}</dd>
              {r.main_use && <><dt>Main use</dt><dd>{r.main_use}{r.travels_with_user ? ' · travels with user' : ''}</dd></>}
              {data.replaced && <><dt>Replaces</dt><dd><Link to={`/register/${data.replaced.id}`}>{data.replaced.asset_no}</Link> · {r.replacement_reason}</dd></>}
              <dt>Reason</dt><dd>{r.business_reason}</dd>
              {r.funding_source !== 'Angels' && <><dt>Client funding</dt><dd>{r.funding_source} · {r.project_code} · {r.budget_line} · owner after project: {r.owner_after_project}</dd></>}
              <dt>Delivery</dt><dd>{r.delivery_route}</dd>
              {r.tech_outcome && <><dt>Technical check</dt><dd>{r.tech_outcome}{r.old_laptop_destination ? ` · old laptop: ${r.old_laptop_destination}` : ''}{r.spec_notes ? ` · ${r.spec_notes}` : ''}</dd></>}
              {data.orders[0] && <><dt>Order</dt><dd>{data.orders[0].po_number} · expected {fmtDate(data.orders[0].expected_delivery)} · to {data.orders[0].deliver_to}</dd></>}
              {data.assets.length > 0 && <><dt>Asset(s)</dt><dd>{data.assets.map(a => <Link key={a.id} to={`/register/${a.id}`} style={{ marginRight: 8 }}>{a.asset_no}</Link>)}</dd></>}
              {data.handover && <><dt>Handover form</dt><dd><Link to={`/handover/${data.handover.id}`}>{data.handover.ref}</Link> · {data.handover.status}</dd></>}
            </dl>
          </div>
          <div className="card"><Files subjectType="request" subjectId={r.id} kinds={['Quote', 'Invoice', 'Delivery note', 'Photo front', 'Serial label', 'Accessories', 'Marks', 'Other']} canAdd={ctx.backOffice} /></div>
        </div>
        <div>
          <div className="card"><h2>Progress</h2><Timeline items={steps} /></div>
          <div className="card">
            <h2>Approvals</h2>
            {data.approvals.map(a => <div key={a.id} className="small" style={{ padding: '6px 0', borderBottom: '1px solid #EEF1F0' }}><strong>{a.step}</strong> · {name(a.approver_id)}<br /><Pill s={a.decision} /> {a.decided_at ? fmtDateTime(a.decided_at) : a.due_at ? `due ${fmtDate(a.due_at)}` : ''}{a.reason ? <div className="muted">“{a.reason}”</div> : null}</div>)}
            {data.pr && <div className="small" style={{ padding: '6px 0' }}><strong>Payment Request</strong> · {data.pr.pr_number} <Pill s={data.pr.status} /></div>}
          </div>
          {data.job && <div className="card small"><h2>PCZEN</h2>Ticket {data.job.ticket || '—'} · sent {fmtDate(data.job.sent_at)}{data.job.returned_at ? ` · back ${fmtDate(data.job.returned_at)}` : ''}<br />{workingDays(data.job.sent_at, data.job.returned_at || today())} working days (agreed {ctx.settings.pczen_turnaround_days ?? '[X]'})</div>}
          <Audit table="am_requests" id={r.id} />
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------- the current step
function Step(props) {
  const { r, ctx } = props
  const { me, has } = ctx
  const pendingFor = step => props.approvals.find(a => a.step === step && a.decision !== 'Approved' && a.decision !== 'Declined')
  if (r.status === 'Awaiting line manager') { const a = pendingFor('Line manager'); if (a && (a.approver_id === me.id)) return <Decide {...props} a={a} title="Your step: approve the need" /> }
  if (r.status === 'Awaiting budget holder') { const a = pendingFor('Budget holder'); if (a && a.approver_id === me.id) return <Decide {...props} a={a} title="Your step: confirm the budget line" /> }
  if (r.status === 'Tech check' && has('factotum')) return <TechCheck {...props} />
  if (r.status === 'Quotes' && has('factotum', 'asset_coordinator')) return <Quotes {...props} />
  if (r.status === 'Ready to order' && has('factotum', 'asset_coordinator')) return <Order {...props} />
  if (r.status === 'Ordered' && has('factotum', 'asset_coordinator')) return <Receive {...props} />
  if (r.status === 'Received' && has('factotum')) return <ToPczen {...props} />
  if (r.status === 'With PCZEN' && has('factotum')) return <PczenReturn {...props} />
  if (r.status === 'Pre-handover check' && has('factotum')) return <PreCheck {...props} />
  if (r.status === 'Couriered' && props.handover) return <Sign {...props} />
  const msg = {
    'Awaiting line manager': 'Waiting for the line manager to approve the need.', 'Awaiting budget holder': 'Waiting for the programme budget holder.',
    'Tech check': 'Anton is doing the technical check: repair, stock or buy.', 'Quotes': 'Anton is getting quotes and creating the Payment Request.',
    'Pre-approval': 'Waiting for pre-approval and the budget check by Annemarie and Brent.', 'With Finance': 'With Finance Management: Jessica’s compliance check, then Gerald’s final check.',
    'Ready to order': 'Finance has approved. Anton places the order.', 'Ordered': 'Ordered. Anton receives and registers it.', 'Received': 'Received and registered. Next: PCZEN preparation.',
    'With PCZEN': 'PCZEN is preparing the device.', 'Pre-handover check': 'Anton is doing his check before handover.', 'Handed over': 'Handed over and signed. Request closed.',
    'Declined': 'This request was declined. See the reason under Approvals.', 'Cancelled': 'Cancelled.',
  }[r.status]
  return <div className="note info">{msg}</div>
}

async function nextApproval(r, step, approver, ctx) {
  await db.insert('am_approvals', { subject_type: 'request', subject_id: r.id, step, approver_id: approver || null, decision: 'Pending', due_at: addWorkingDays(new Date(), ctx.settings.approval_days ?? 2) })
}

function Decide({ r, a, title, ctx, reload }) {
  const [reason, setReason] = useState(''); const [run, busy, box] = useAction()
  const { withRole } = ctx
  const decide = decision => run(async () => {
    if (decision !== 'Approved' && !reason.trim()) throw new Error('Give a reason. The requester sees it.')
    if (r.requested_by === ctx.me.id) throw new Error('Nobody approves their own request. Ask your own manager to approve it.')
    await db.update('am_approvals', a.id, { decision, reason: reason || null, ...(DEMO ? { decided_at: new Date().toISOString(), decided_by: ctx.me.id } : {}) })
    if (decision === 'Declined') { await db.update('am_requests', r.id, { status: 'Declined' }); await notify([r.requested_by, r.for_user], `${r.ref} declined`, reason, `/requests/${r.id}`) }
    if (decision === 'On hold') await notify([r.requested_by], `${r.ref} on hold`, reason, `/requests/${r.id}`)
    if (decision === 'Approved') {
      if (a.step === 'Line manager' && r.budget_holder_id) {
        await db.update('am_requests', r.id, { status: 'Awaiting budget holder' }); await nextApproval(r, 'Budget holder', r.budget_holder_id, ctx)
        await notify([r.budget_holder_id], `${r.ref} needs your budget line confirmation`, '', `/requests/${r.id}`)
      } else {
        const anton = withRole('factotum')[0]?.id
        await db.update('am_requests', r.id, { status: 'Tech check' }); await nextApproval(r, 'Technical check', anton, ctx)
        await notify([anton], `${r.ref} ready for your technical check`, '', `/requests/${r.id}`)
      }
      await notify([r.requested_by], `${r.ref}: ${a.step.toLowerCase()} approved`, '', `/requests/${r.id}`)
    }
    reload()
  })
  return (
    <div className="card" style={{ borderColor: '#1F7A65' }}>
      <h2>{title}</h2>
      <Field label="Reason" hint="Required to decline or put on hold"><textarea value={reason} onChange={e => setReason(e.target.value)} /></Field>
      {box}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="primary" disabled={busy} onClick={() => decide('Approved')}>Approve</button>
        <button disabled={busy} onClick={() => decide('On hold')}>Put on hold</button>
        <button className="danger" disabled={busy} onClick={() => decide('Declined')}>Decline with reason</button>
      </div>
    </div>
  )
}

function TechCheck({ r, approvals, ctx, reload }) {
  const [f, setF] = useState({ tech_outcome: 'Buy new', laptop_tier: r.laptop_tier || '', old_laptop_destination: '', spec_notes: '', stock_asset: '' })
  const [stock] = useLoad(() => db.list('am_assets', { eq: { category: r.category, status: 'In store' } }), [])
  const [run, busy, box] = useAction()
  const save = () => run(async () => {
    const a = approvals.find(x => x.step === 'Technical check' && !x.decided_at)
    if (a) await db.update('am_approvals', a.id, { decision: 'Approved', ...(DEMO ? { decided_at: new Date().toISOString(), decided_by: ctx.me.id } : {}) })
    const patch = { tech_outcome: f.tech_outcome, laptop_tier: f.laptop_tier || r.laptop_tier, old_laptop_destination: f.old_laptop_destination || null, spec_notes: f.spec_notes }
    if (f.tech_outcome === 'Buy new') { await db.update('am_requests', r.id, { ...patch, status: 'Quotes' }) }
    else {
      const assetId = f.tech_outcome === 'Issue from stock' ? f.stock_asset : r.replaces_asset
      if (!assetId) throw new Error(f.tech_outcome === 'Issue from stock' ? 'Choose the item from stock.' : 'Repair needs the item being replaced.')
      await db.update('am_assets', assetId, { request_id: r.id, status: 'In store' })
      await db.update('am_requests', r.id, { ...patch, status: 'Received' })
    }
    await notify([r.requested_by], `${r.ref}: technical check done (${f.tech_outcome})`, '', `/requests/${r.id}`)
    reload()
  })
  return (
    <div className="card" style={{ borderColor: '#1F7A65' }}>
      <h2>Your step: technical check</h2>
      <div className="row" style={{ marginBottom: 12 }}>{['Repair', 'Issue from stock', 'Buy new'].map(o => <label key={o} className="check"><input type="radio" checked={f.tech_outcome === o} onChange={() => setF({ ...f, tech_outcome: o })} />{o}</label>)}</div>
      <div className="grid">
        {r.category === 'Laptop' && <Field label="Confirm tier"><Select value={f.laptop_tier} onChange={v => setF({ ...f, laptop_tier: v })} options={TIERS.map(t => t.name)} /></Field>}
        {r.replaces_asset && <Field label="Old laptop goes to"><Select value={f.old_laptop_destination} onChange={v => setF({ ...f, old_laptop_destination: v })} placeholder="Choose" options={OLD_LAPTOP} /></Field>}
        {f.tech_outcome === 'Issue from stock' && <Field label="Item from stock"><Select value={f.stock_asset} onChange={v => setF({ ...f, stock_asset: v })} placeholder="Choose" options={(stock || []).map(a => [a.id, `${a.asset_no} · ${a.laptop_tier || a.description || ''}`])} /></Field>}
      </div>
      <Field label="Spec notes (for your quotes)"><textarea value={f.spec_notes} onChange={e => setF({ ...f, spec_notes: e.target.value })} /></Field>
      {box}
      <div className="row" style={{ marginTop: 10 }}><button className="primary" disabled={busy} onClick={save}>{f.tech_outcome === 'Buy new' ? 'Save and get quotes' : 'Save and go to PCZEN preparation'}</button></div>
      <p className="small muted">Repair or stock skips quotes, pre-approval, Finance and ordering (R-07).</p>
    </div>
  )
}

function Quotes({ r, ctx, reload }) {
  const [f, setF] = useState({ supplier: '', quotes: '', amount_incl_vat: '', project_code: r.project_code || '', budget_line: r.budget_line || '' })
  const [run, busy, box] = useAction()
  const go = () => run(async () => {
    if (!f.supplier || !f.amount_incl_vat || !f.quotes) throw new Error('Supplier, quotes and amount are needed (FIN-03).')
    const pr = await db.insert('am_payment_requests', { request_id: r.id, supplier: f.supplier, quotes: f.quotes, amount_incl_vat: Number(f.amount_incl_vat), project_code: f.project_code || null, budget_line: f.budget_line || null, status: 'Pre-approval', created_by: ctx.me.id })
    await db.update('am_requests', r.id, { status: 'Pre-approval' })
    await notify([...ctx.withRole('asset_coordinator'), ...ctx.withRole('hod_ops')].map(p => p.id), `${pr.pr_number} waits for pre-approval`, `${r.ref} · ${f.supplier} · ${rand(f.amount_incl_vat)}`, `/requests/${r.id}`)
    reload()
  })
  return (
    <div className="card" style={{ borderColor: '#1F7A65' }}>
      <h2>Your step: quotes and Payment Request</h2>
      <p className="small muted">Get the quotes FIN-03 requires and attach them under Photos and documents (kind: Quote). Annemarie and Brent then pre-approve before it goes to Finance.</p>
      <div className="grid">
        <Field label="Supplier (from the chosen quote)"><input value={f.supplier} onChange={e => setF({ ...f, supplier: e.target.value })} /></Field>
        <Field label="Quotes" hint="e.g. Q-1102 (chosen) · Q-1103 · Q-1104"><input value={f.quotes} onChange={e => setF({ ...f, quotes: e.target.value })} /></Field>
        <Field label="Amount incl. VAT (R)"><input type="number" step="0.01" value={f.amount_incl_vat} onChange={e => setF({ ...f, amount_incl_vat: e.target.value })} /></Field>
        <Field label="Project code"><input value={f.project_code} onChange={e => setF({ ...f, project_code: e.target.value })} /></Field>
        <Field label="Budget line"><input value={f.budget_line} onChange={e => setF({ ...f, budget_line: e.target.value })} /></Field>
      </div>
      {box}
      <div className="row" style={{ marginTop: 10 }}><button className="primary" disabled={busy} onClick={go}>Create Payment Request and send for pre-approval</button></div>
    </div>
  )
}

function Order({ r, pr, ctx, reload }) {
  const [f, setF] = useState({ po_number: '', expected_delivery: '', deliver_to: 'Anton' })
  const [run, busy, box] = useAction()
  const go = () => run(async () => {
    if (!f.po_number) throw new Error('Type the order or PO number.')
    await db.insert('am_orders', { request_id: r.id, payment_request_id: pr?.id, po_number: f.po_number, expected_delivery: f.expected_delivery || null, deliver_to: f.deliver_to, ordered_by: ctx.me.id })
    await db.insert('am_log', { type: 'Delivery in', company: pr?.supplier || 'Supplier', tracking: f.po_number, linked_to: r.ref, expected_date: f.expected_delivery || null, handled_by: 'Anton', status: 'Expected' })
    await db.update('am_requests', r.id, { status: 'Ordered' })
    await notify([r.requested_by, ...ctx.withRole('asset_coordinator').map(p => p.id)], `${r.ref} ordered`, `Expected ${f.expected_delivery || 'date to follow'}`, `/requests/${r.id}`)
    reload()
  })
  return (
    <div className="card" style={{ borderColor: '#1F7A65' }}>
      <h2>Your step: place the order</h2>
      <div className="note ok">Finance has approved {pr?.pr_number}. The order section is unlocked.</div>
      <div className="grid">
        <Field label="Order / PO number"><input value={f.po_number} onChange={e => setF({ ...f, po_number: e.target.value })} /></Field>
        <Field label="Expected delivery"><input type="date" value={f.expected_delivery} onChange={e => setF({ ...f, expected_delivery: e.target.value })} /></Field>
        <Field label="Deliver to"><Select value={f.deliver_to} onChange={v => setF({ ...f, deliver_to: v })} options={['Anton', 'Staff member (approved)', 'Client site']} /></Field>
      </div>
      {box}
      <div className="row" style={{ marginTop: 10 }}><button className="primary" disabled={busy} onClick={go}>Save order (adds it to the deliveries log)</button></div>
    </div>
  )
}

function Receive({ r, ctx, reload, pr }) {
  const [f, setF] = useState({ make_model: '', serial_no: '', warranty_ends: '', accessories: 'Charger', invoice_no: '', cost_excl_vat: pr ? Math.round(pr.amount_incl_vat / 1.15) : '' })
  const [run, busy, box] = useAction()
  const go = () => run(async () => {
    if (!f.serial_no) throw new Error('The serial number is needed before an item can be issued (R-12).')
    const photos = await db.list('am_files', { eq: { subject_type: 'request', subject_id: r.id } })
    if (photos.filter(p => /Photo|Serial|Accessories|Marks/.test(p.kind)).length < 2) throw new Error('Add at least 2 photos, including the serial label, under Photos and documents (R-12).')
    const a = await db.insert('am_assets', {
      category: r.category, laptop_tier: r.laptop_tier, description: r.item_description, make_model: f.make_model, serial_no: f.serial_no, accessories: f.accessories,
      supplier: pr?.supplier, invoice_no: f.invoice_no, purchase_date: today(), cost_excl_vat: f.cost_excl_vat ? Number(f.cost_excl_vat) : null, warranty_ends: f.warranty_ends || null,
      funding_source: r.funding_source, project_code: r.project_code, owner: r.funding_source === 'Angels' ? 'Angels' : (r.owner_after_project === 'Angels' ? 'Angels' : 'Client'),
      insurance_status: r.funding_source === 'Angels' ? 'Angels insures' : 'Client insures', status: 'In store', condition: 'New', location: 'Angels storage', request_id: r.id, qr_label_printed: true,
    })
    await db.insert('am_custody', { asset_id: a.id, event: 'Registered', detail: `${r.ref} · invoice ${f.invoice_no}` })
    const logs = await db.list('am_log', { eq: { linked_to: r.ref } })
    for (const l of logs) await db.update('am_log', l.id, { status: 'Received', completed_at: new Date().toISOString() })
    await db.update('am_requests', r.id, { status: 'Received' })
    await notify([r.requested_by, ...ctx.withRole('asset_coordinator').map(p => p.id)], `${r.ref} arrived at Anton`, `Registered as ${a.asset_no}. Next: PCZEN preparation.`, `/requests/${r.id}`)
    reload()
  })
  return (
    <div className="card" style={{ borderColor: '#1F7A65' }}>
      <h2>Your step: receive and register</h2>
      <p className="small muted">Check the box against the order and sign the delivery note. Upload the delivery note, invoice and 2 to 4 photos (front, serial label, accessories, marks) below, then fill in the details. The asset number is created for you; stick on the QR label.</p>
      <div style={{ marginBottom: 14 }}><Files subjectType="request" subjectId={r.id} kinds={['Photo front', 'Serial label', 'Accessories', 'Marks', 'Delivery note', 'Invoice']} title="Photos and documents on receipt" /></div>
      <div className="grid">
        <Field label="Make and model"><input value={f.make_model} onChange={e => setF({ ...f, make_model: e.target.value })} /></Field>
        <Field label="Serial number"><input value={f.serial_no} onChange={e => setF({ ...f, serial_no: e.target.value })} /></Field>
        <Field label="Warranty ends"><input type="date" value={f.warranty_ends} onChange={e => setF({ ...f, warranty_ends: e.target.value })} /></Field>
        <Field label="Accessories"><input value={f.accessories} onChange={e => setF({ ...f, accessories: e.target.value })} /></Field>
        <Field label="Invoice number"><input value={f.invoice_no} onChange={e => setF({ ...f, invoice_no: e.target.value })} /></Field>
        <Field label="Cost excl. VAT (R)"><input type="number" value={f.cost_excl_vat} onChange={e => setF({ ...f, cost_excl_vat: e.target.value })} /></Field>
      </div>
      {box}
      <div className="row" style={{ marginTop: 10 }}><button className="primary" disabled={busy} onClick={go}>Register the item</button></div>
    </div>
  )
}

function ToPczen({ r, assets, ctx, reload }) {
  const [f, setF] = useState({ ticket: '', items: 'Laptop, Charger, Bag, Mouse', asset_id: assets[0]?.id || '' })
  const [run, busy, box] = useAction()
  const go = () => run(async () => {
    if (!f.ticket) throw new Error('Log it on the PCZEN portal first and type the ticket number.')
    await db.insert('am_pczen_jobs', { request_id: r.id, asset_id: f.asset_id || null, purpose: 'Setup', ticket: f.ticket, sent_at: today(), items: f.items.split(',').map(s => ({ item: s.trim(), returned: false })).filter(x => x.item) })
    if (f.asset_id) { await db.update('am_assets', f.asset_id, { status: 'With PCZEN', location: 'PCZEN' }); await db.insert('am_custody', { asset_id: f.asset_id, event: 'Sent to PCZEN', detail: `Ticket ${f.ticket}` }) }
    await db.update('am_requests', r.id, { status: 'With PCZEN' })
    await notify(ctx.withRole('asset_coordinator').map(p => p.id), `${r.ref} sent to PCZEN`, `Ticket ${f.ticket}. Agreed turnaround ${ctx.settings.pczen_turnaround_days ?? '[X]'} working days.`, `/requests/${r.id}`)
    reload()
  })
  return (
    <div className="card" style={{ borderColor: '#1F7A65' }}>
      <h2>Your step: send to PCZEN (FRM-08 part A)</h2>
      <div className="grid">
        <Field label="Asset"><Select value={f.asset_id} onChange={v => setF({ ...f, asset_id: v })} options={assets.map(a => [a.id, a.asset_no])} /></Field>
        <Field label="PCZEN ticket number"><input value={f.ticket} onChange={e => setF({ ...f, ticket: e.target.value })} /></Field>
        <Field label="Every item you send" hint="Comma separated"><input value={f.items} onChange={e => setF({ ...f, items: e.target.value })} /></Field>
      </div>
      {box}
      <div className="row" style={{ marginTop: 10 }}><button className="primary" disabled={busy} onClick={go}>Record hand-off to PCZEN</button></div>
    </div>
  )
}

function PczenReturn({ r, job, ctx, reload }) {
  const [items, setItems] = useState(job?.items || [])
  const [run, busy, box] = useAction()
  const days = workingDays(job?.sent_at, today())
  const go = () => run(async () => {
    const missing = items.filter(i => !i.returned).map(i => i.item)
    await db.update('am_pczen_jobs', job.id, { items, returned_at: today(), outcome: missing.length ? `Incomplete: ${missing.join(', ')}` : 'Complete' })
    if (missing.length) {
      await notify([...ctx.withRole('asset_coordinator'), ...ctx.withRole('hod_ops')].map(p => p.id), `PCZEN returned ${r.ref} incomplete`, `Missing: ${missing.join(', ')} · ticket ${job.ticket}. Handover blocked until resolved.`, `/requests/${r.id}`)
      throw new Error(`Logged against PCZEN: ${missing.join(', ')} missing. Query sent; handover stays blocked. Tick the items when they arrive and save again.`)
    }
    if (job.asset_id) { await db.update('am_assets', job.asset_id, { status: 'In store', location: 'Angels storage' }); await db.insert('am_custody', { asset_id: job.asset_id, event: 'Back from PCZEN', detail: `Ticket ${job.ticket}` }) }
    await db.update('am_requests', r.id, { status: 'Pre-handover check' })
    reload()
  })
  return (
    <div className="card" style={{ borderColor: '#1F7A65' }}>
      <h2>Your step: check the return from PCZEN</h2>
      <p className="small">Ticket {job?.ticket} · sent {fmtDate(job?.sent_at)} · <strong>{days} working days</strong> with PCZEN (agreed {ctx.settings.pczen_turnaround_days ?? '[X]'})</p>
      {items.map((it, i) => <label key={i} className="check"><input type="checkbox" checked={!!it.returned} onChange={e => setItems(items.map((x, j) => j === i ? { ...x, returned: e.target.checked } : x))} />{it.item} came back</label>)}
      {box}
      <div className="row" style={{ marginTop: 10 }}><button className="primary" disabled={busy} onClick={go}>Save return check</button></div>
    </div>
  )
}

function PreCheck({ r, assets, ctx, reload }) {
  const [c, setC] = useState({}); const [f, setF] = useState({ courier: '', waybill: '', remote_session_at: '', staff_id: r.for_user || '' })
  const [run, busy, box] = useAction()
  const all = PRECHECK.every(([k]) => c[k])
  const back = () => run(async () => {
    await db.insert('am_prechecks', { request_id: r.id, ...Object.fromEntries(PRECHECK.map(([k]) => [k, !!c[k]])), result: 'Back to PCZEN', checked_by: ctx.me.id, checked_at: new Date().toISOString() })
    await db.insert('am_pczen_jobs', { request_id: r.id, asset_id: assets[0]?.id, purpose: 'Setup', ticket: 'Same ticket', sent_at: today(), items: [{ item: 'Laptop', returned: false }] })
    await db.update('am_requests', r.id, { status: 'With PCZEN' }); reload()
  })
  const pass = () => run(async () => {
    if (!all) throw new Error('Every line must pass before the courier can be booked (R-18).')
    if (!f.waybill) throw new Error('Book the courier and type the waybill number.')
    if (!f.staff_id) throw new Error('Choose who signs for it (the staff member’s account).')
    await db.insert('am_prechecks', { request_id: r.id, ...Object.fromEntries(PRECHECK.map(([k]) => [k, true])), result: 'Pass', checked_by: ctx.me.id, checked_at: new Date().toISOString() })
    const h = await db.insert('am_handovers', { request_id: r.id, staff_id: f.staff_id, asset_ids: assets.map(a => a.id), courier: f.courier, waybill: f.waybill, remote_session_at: f.remote_session_at || null, status: 'Couriered' })
    for (const a of assets) await db.insert('am_custody', { asset_id: a.id, event: 'Couriered', detail: `${f.courier} ${f.waybill}` })
    await db.insert('am_log', { type: 'Dispatch out', company: f.courier || 'Courier', tracking: f.waybill, linked_to: r.ref, expected_date: today(), handled_by: 'Anton', status: 'Booked' })
    await db.update('am_requests', r.id, { status: 'Couriered', for_user: f.staff_id })
    await notify([f.staff_id], `Your equipment is on its way (${r.ref})`, `${f.courier} waybill ${f.waybill}. Remote sign-in with PCZEN: ${f.remote_session_at ? fmtDateTime(f.remote_session_at) : 'to be booked'}. Have your phone with Authenticator ready.`, `/requests/${r.id}`)
    reload()
  })
  return (
    <div className="card" style={{ borderColor: '#1F7A65' }}>
      <h2>Your step: check before handover (FRM-08 part B)</h2>
      {PRECHECK.map(([k, label]) => <label key={k} className="check"><input type="checkbox" checked={!!c[k]} onChange={e => setC({ ...c, [k]: e.target.checked })} />{label}</label>)}
      <h3 style={{ marginTop: 14 }}>Courier and remote handover</h3>
      <div className="grid">
        <Field label="Signs for it"><PersonSelect value={f.staff_id} onChange={v => setF({ ...f, staff_id: v })} /></Field>
        <Field label="Courier"><input value={f.courier} onChange={e => setF({ ...f, courier: e.target.value })} /></Field>
        <Field label="Waybill / tracking"><input value={f.waybill} onChange={e => setF({ ...f, waybill: e.target.value })} /></Field>
        <Field label="Remote sign-in with PCZEN (15 min)"><input type="datetime-local" value={f.remote_session_at} onChange={e => setF({ ...f, remote_session_at: e.target.value })} /></Field>
      </div>
      {box}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="primary" disabled={busy || !all} onClick={pass}>All passed: courier it</button>
        <button className="danger" disabled={busy} onClick={back}>A line failed: back to PCZEN</button>
      </div>
    </div>
  )
}

function Sign({ r, handover: h, assets, ctx, reload }) {
  const { me, has } = ctx
  const [c, setC] = useState({ signin_ok: false, apps_ok: false, conds: CONDITIONS_OF_USE.map(() => false) })
  const [run, busy, box] = useAction()
  const staffSign = () => run(async () => {
    const photos = await db.list('am_files', { eq: { subject_type: 'handover', subject_id: h.id } })
    if (!photos.length) throw new Error('Add at least one photo of what you received.')
    if (!c.signin_ok || !c.apps_ok || !c.conds.every(Boolean)) throw new Error('Tick every condition and confirm the remote sign-in first.')
    const form_hash = await sha256(JSON.stringify({ ref: h.ref, staff: me.id, assets: h.asset_ids, at: new Date().toISOString() }))
    await db.update('am_handovers', h.id, { signin_ok: true, apps_ok: true, conditions_accepted: true, delivered_at: new Date().toISOString(), staff_signed_at: new Date().toISOString(), form_hash, ...(DEMO ? { status: 'Staff signed' } : {}) })
    await notify(ctx.withRole('factotum').map(p => p.id), `${h.ref} signed by ${me.full_name}`, 'Please sign as Issued by.', `/requests/${r.id}`)
    reload()
  })
  const antonSign = () => run(async () => {
    await db.update('am_handovers', h.id, { issued_signed_at: new Date().toISOString(), ...(DEMO ? { issued_by: me.id, status: 'Issued' } : {}) })
    await notify(ctx.withRole('asset_coordinator').map(p => p.id), `${h.ref} ready for your signature`, '', `/requests/${r.id}`)
    reload()
  })
  const coordSign = () => run(async () => {
    await db.update('am_handovers', h.id, { coordinator_signed_at: new Date().toISOString(), ...(DEMO ? { coordinator_id: me.id, status: 'Complete' } : {}) })
    for (const a of assets) { await db.update('am_assets', a.id, { custodian_id: h.staff_id, status: r.request_type === 'Loan' ? 'On loan' : 'Issued', location: 'With staff member' }); await db.insert('am_custody', { asset_id: a.id, event: 'Handed over', detail: h.ref }) }
    await db.update('am_requests', r.id, { status: 'Handed over', handed_over_at: new Date().toISOString() })
    if (r.replaces_asset) await db.insert('am_log', { type: 'Courier collection', company: 'Courier', tracking: 'Return label', linked_to: `${r.ref} · old item return`, expected_date: today(), handled_by: 'Anton', status: 'Expected' })
    await notify([h.staff_id, r.line_manager_id, r.requested_by], `${r.ref} handed over`, `${h.ref} is signed and locked.`, `/handover/${h.id}`)
    reload()
  })
  const isStaff = h.staff_id === me.id
  return (
    <div className="card" style={{ borderColor: '#1F7A65' }}>
      <h2>Collect and sign for your equipment</h2>
      <p className="small">{h.ref} · {h.courier} waybill {h.waybill} · remote sign-in {h.remote_session_at ? fmtDateTime(h.remote_session_at) : 'to be booked'} · <Link to={`/handover/${h.id}`}>view form</Link></p>
      <Files subjectType="handover" subjectId={h.id} kinds={['Receipt photo', 'Serial label', 'Accessories']} canAdd={isStaff && !h.staff_signed_at} title="1. Photos of what you received" />
      {isStaff && !h.staff_signed_at && (<>
        <h3 style={{ marginTop: 14 }}>2. Remote sign-in with PCZEN</h3>
        <label className="check"><input type="checkbox" checked={c.signin_ok} onChange={e => setC({ ...c, signin_ok: e.target.checked })} />I signed in on the new laptop and approved the sign-in in Authenticator</label>
        <label className="check"><input type="checkbox" checked={c.apps_ok} onChange={e => setC({ ...c, apps_ok: e.target.checked })} />Outlook, Teams and my files work</label>
        <h3 style={{ marginTop: 14 }}>3. Conditions of use</h3>
        {CONDITIONS_OF_USE.map((t, i) => <label key={i} className="check"><input type="checkbox" checked={c.conds[i]} onChange={e => setC({ ...c, conds: c.conds.map((x, j) => j === i ? e.target.checked : x) })} />{t}</label>)}
        {r.replaces_asset && <div className="note warn">Replacing a laptop: courier the old one and its charger back to Anton with the return label in the box.</div>}
        {box}
        <button className="primary" disabled={busy} onClick={staffSign} style={{ marginTop: 10 }}>Sign with my Angels account</button>
      </>)}
      {h.staff_signed_at && <div className="note ok">Signed by {ctx.name(h.staff_id)} · {fmtDateTime(h.staff_signed_at)}</div>}
      {h.staff_signed_at && !h.issued_signed_at && has('factotum') && <>{box}<button className="primary" disabled={busy} onClick={antonSign}>Sign as Issued by</button></>}
      {h.issued_signed_at && <div className="note ok">Issued by {ctx.name(h.issued_by)} · {fmtDateTime(h.issued_signed_at)}</div>}
      {h.issued_signed_at && !h.coordinator_signed_at && has('asset_coordinator') && <>{box}<button className="primary" disabled={busy} onClick={coordSign}>Sign last and lock the form</button></>}
      {!isStaff && !h.staff_signed_at && <p className="muted small">Waiting for {ctx.name(h.staff_id)} to confirm receipt and sign.</p>}
    </div>
  )
}
