import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/auth'
import { db } from '../lib/db'
import { Head, Pill, Field, Select, PersonSelect, useLoad, useAction, Files, Audit } from '../components/ui'
import { fmtDate, fmtDateTime, rand, bookValue, ageYears, toCsv, download } from '../lib/util'
import { CATEGORIES, FUNDING, INSURANCE, CONDITIONS, ASSET_STATUS, TIERS } from '../lib/lists'

export default function Register() {
  const { me, backOffice, name, has, settings } = useApp(); const nav = useNavigate()
  const [flt, setFlt] = useState({ category: '', status: '', funding: '', insurance: '', q: '' })
  const [assets, reload] = useLoad(() => db.list('am_assets', { order: 'asset_no' }), [])
  const rows = (assets || []).filter(a => (backOffice || a.custodian_id === me.id) && (!flt.category || a.category === flt.category) && (!flt.status || a.status === flt.status) && (!flt.funding || a.funding_source === flt.funding) && (!flt.insurance || a.insurance_status === flt.insurance) && (!flt.q || JSON.stringify(a).toLowerCase().includes(flt.q.toLowerCase())))
  const years = settings.depreciation_years ?? 3; const dueYears = settings.replacement_due_years ?? 4
  const cols = [['Asset no.', 'asset_no'], ['Category', 'category'], ['Item description', 'description'], ['Tier', 'laptop_tier'], ['Make and model', 'make_model'], ['Serial no.', 'serial_no'], ['Supplier', 'supplier'], ['Invoice no.', 'invoice_no'], ['Purchase date', 'purchase_date'], ['Cost excl. VAT (R)', 'cost_excl_vat'], ['Book value (R)', a => bookValue(a, years)], ['Warranty ends', 'warranty_ends'], ['Funding', 'funding_source'], ['Client project code', 'project_code'], ['Owner', 'owner'], ['Insurance', 'insurance_status'], ['On broker schedule', a => ['Angels insures', 'Angels with client contribution'].includes(a.insurance_status) ? 'Yes' : 'No'], ['With (person / location)', a => a.custodian_id ? name(a.custodian_id) : a.location], ['Status', 'status'], ['Condition', 'condition']]
  const set = k => v => setFlt({ ...flt, [k]: v })
  return (
    <>
      <Head title={backOffice ? 'Asset register' : 'My equipment'} sub={backOffice ? 'QMS-05-REG-02. Every item, who has it, who paid, who owns and who insures it.' : 'The items signed out to you.'}>
        {backOffice && <button onClick={() => download('asset-register.csv', toCsv(rows, cols))}>Export to Excel (CSV)</button>}
        {backOffice && <button onClick={() => download('broker-schedule.csv', toCsv(rows.filter(a => ['Angels insures', 'Angels with client contribution'].includes(a.insurance_status) && !['Donated out', 'Returned to client', 'Disposed'].includes(a.status)), cols))}>Insurance schedule for broker</button>}
        {has('factotum', 'asset_coordinator') && <Link className="btn primary" to="/register/new">Add item</Link>}
      </Head>
      {backOffice && <div className="card row">
        <input placeholder="Search" value={flt.q} onChange={e => set('q')(e.target.value)} />
        <Select value={flt.category} onChange={set('category')} placeholder="All categories" options={CATEGORIES} />
        <Select value={flt.status} onChange={set('status')} placeholder="All statuses" options={ASSET_STATUS} />
        <Select value={flt.funding} onChange={set('funding')} placeholder="All funding" options={FUNDING} />
        <Select value={flt.insurance} onChange={set('insurance')} placeholder="All insurance" options={INSURANCE} />
      </div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Asset no.</th><th>Item</th><th>With</th><th>Funding / owner</th><th>Insurance</th><th>Book value</th><th>Status</th></tr></thead>
          <tbody>{rows.map(a => (
            <tr key={a.id} className="click" onClick={() => nav(`/register/${a.id}`)}>
              <td><Link to={`/register/${a.id}`}>{a.asset_no}</Link>{a.category === 'Laptop' && ageYears(a.purchase_date) > dueYears && <div className="small" style={{ color: '#8A5A00' }}>replacement due</div>}</td>
              <td>{a.category}{a.laptop_tier ? ` · ${a.laptop_tier}` : ''}<div className="small muted">{a.description}</div></td>
              <td>{a.custodian_id ? name(a.custodian_id) : a.location || a.storage_location}</td><td>{a.funding_source} · {a.owner}</td><td>{a.insurance_status}</td><td>{rand(bookValue(a, years))}</td><td><Pill s={a.status} /></td>
            </tr>))}
            {rows.length === 0 && <tr><td colSpan="7" className="muted">No items.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

export function AssetDetail() {
  const { id } = useParams(); const nav = useNavigate()
  const { has, name, settings, backOffice } = useApp()
  const isNew = id === 'new'
  const [a, reload] = useLoad(() => isNew ? Promise.resolve({ category: 'Laptop', status: 'In store', condition: 'Good', funding_source: 'Angels', owner: 'Angels', insurance_status: 'Angels insures', location: 'Angels storage' }) : db.get('am_assets', id), [id])
  const [hist] = useLoad(() => isNew ? Promise.resolve([]) : db.list('am_custody', { eq: { asset_id: id }, order: 'at', desc: true }), [id])
  const [f, setF] = useState(null)
  const [run, busy, box] = useAction()
  if (!a) return <div className="muted">Loading…</div>
  const v = f || a
  const set = k => x => setF({ ...v, [k]: x?.target ? x.target.value : x })
  const edit = has('factotum', 'asset_coordinator') || (has('hof') && !isNew)
  const save = () => run(async () => {
    const { id: _i, created_at, ...row } = v
    if (row.cost_excl_vat === '') row.cost_excl_vat = null
    if (['Laptop', 'Monitor', 'Printer'].includes(row.category) && !row.serial_no) throw new Error('IT items need a serial number (R-12).')
    if (row.funding_source !== 'Angels' && row.insurance_status === 'Angels insures' && !has('hof')) throw new Error('Angels cover for a client-funded item needs Head of Finance approval and a client contribution (R-14).')
    if (isNew) { const n = await db.insert('am_assets', row); await db.insert('am_custody', { asset_id: n.id, event: 'Registered', detail: 'Added to the register' }); nav(`/register/${n.id}`) }
    else { await db.update('am_assets', id, row); setF(null); reload() }
  }, isNew ? null : 'Saved')
  return (
    <>
      <Head title={isNew ? 'Add item to the register' : `${a.asset_no} · ${a.category}`} sub={isNew ? 'The asset number is created when you save.' : `${a.description || ''} ${a.make_model ? '· ' + a.make_model : ''}`}>{!isNew && <Pill s={a.status} />}</Head>
      <div className="cols">
        <div className="card">
          <div className="grid">
            <Field label="Category"><Select value={v.category} onChange={set('category')} options={CATEGORIES} disabled={!isNew} /></Field>
            {['Training box', 'Marketing material'].includes(v.category) && <Field label="Short code" hint="TB, FB, PB, GZ, SK"><input value={v.short_code || ''} onChange={set('short_code')} disabled={!isNew} /></Field>}
            {v.category === 'Laptop' && <Field label="Tier"><Select value={v.laptop_tier} onChange={set('laptop_tier')} placeholder="—" options={TIERS.map(t => t.name)} disabled={!edit} /></Field>}
            <Field label="Description"><input value={v.description || ''} onChange={set('description')} disabled={!edit} /></Field>
            <Field label="Make and model"><input value={v.make_model || ''} onChange={set('make_model')} disabled={!edit} /></Field>
            <Field label="Serial no."><input value={v.serial_no || ''} onChange={set('serial_no')} disabled={!edit} /></Field>
            <Field label="Accessories"><input value={v.accessories || ''} onChange={set('accessories')} disabled={!edit} /></Field>
            <Field label="Supplier"><input value={v.supplier || ''} onChange={set('supplier')} disabled={!edit} /></Field>
            <Field label="Invoice no."><input value={v.invoice_no || ''} onChange={set('invoice_no')} disabled={!edit} /></Field>
            <Field label="Purchase date"><input type="date" value={v.purchase_date || ''} onChange={set('purchase_date')} disabled={!edit} /></Field>
            <Field label="Cost excl. VAT (R)"><input type="number" value={v.cost_excl_vat ?? ''} onChange={set('cost_excl_vat')} disabled={!edit} /></Field>
            <Field label="Warranty ends"><input type="date" value={v.warranty_ends || ''} onChange={set('warranty_ends')} disabled={!edit} /></Field>
            <Field label="Funding"><Select value={v.funding_source} onChange={set('funding_source')} options={FUNDING} disabled={!edit} /></Field>
            <Field label="Client project code"><input value={v.project_code || ''} onChange={set('project_code')} disabled={!edit} /></Field>
            <Field label="Owner"><Select value={v.owner} onChange={set('owner')} options={['Angels', 'Client', 'Beneficiary']} disabled={!edit} /></Field>
            <Field label="Insurance"><Select value={v.insurance_status} onChange={set('insurance_status')} options={INSURANCE} disabled={!edit} /></Field>
            <Field label="With person"><PersonSelect value={v.custodian_id} onChange={set('custodian_id')} placeholder="— (in storage)" /></Field>
            <Field label="Location"><input value={v.location || ''} onChange={set('location')} disabled={!edit} /></Field>
            <Field label="Status"><Select value={v.status} onChange={set('status')} options={ASSET_STATUS} disabled={!edit} /></Field>
            <Field label="Condition"><Select value={v.condition} onChange={set('condition')} options={CONDITIONS} disabled={!edit} /></Field>
            {['Training box', 'Marketing material'].includes(v.category) && <Field label="Client restriction" hint="e.g. Scatec: only for that client"><input value={v.client_restriction || ''} onChange={set('client_restriction')} disabled={!edit} /></Field>}
            {['Training box', 'Marketing material'].includes(v.category) && <Field label="Storage location"><input value={v.storage_location || ''} onChange={set('storage_location')} disabled={!edit} /></Field>}
          </div>
          {box}
          {edit && <div className="row" style={{ marginTop: 12 }}><button className="primary" disabled={busy} onClick={save}>{isNew ? 'Add to register' : 'Save changes'}</button></div>}
        </div>
        {!isNew && <div>
          <div className="card small">
            <h2>Values</h2>
            <dl className="kv"><dt>Book value</dt><dd>{rand(bookValue(a, settings.depreciation_years ?? 3))} <span className="muted">(straight-line, {settings.depreciation_years ?? 3} years)</span></dd>
              <dt>On broker schedule</dt><dd>{['Angels insures', 'Angels with client contribution'].includes(a.insurance_status) ? 'Yes' : 'No'}</dd>
              <dt>Warranty</dt><dd>{a.warranty_ends ? (a.warranty_ends < new Date().toISOString().slice(0, 10) ? 'Expired ' : 'Until ') + fmtDate(a.warranty_ends) : '—'}</dd></dl>
            {Array.isArray(a.box_contents) && a.box_contents.length > 0 && <><h3 style={{ marginTop: 12 }}>Contents</h3><ul>{a.box_contents.map((c, i) => <li key={i}>{c.qty} × {c.item}</li>)}</ul></>}
          </div>
          <div className="card"><Files subjectType="asset" subjectId={a.id} kinds={['Photo front', 'Serial label', 'Accessories', 'Marks', 'Invoice', 'Wipe certificate']} canAdd={backOffice} /></div>
          <div className="card small"><h2>History</h2>{(hist || []).map(h => <div key={h.id} style={{ padding: '5px 0', borderBottom: '1px solid #EEF1F0' }}><strong>{h.event}</strong> · {fmtDateTime(h.at)} · {name(h.by_user)}<div className="muted">{h.detail}</div></div>)}</div>
          <Audit table="am_assets" id={a.id} />
        </div>}
      </div>
    </>
  )
}
