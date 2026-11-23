import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useApp, notify } from '../lib/auth'
import { db } from '../lib/db'
import { Head, Pill, Field, Select, useLoad, useAction, Files } from '../components/ui'
import { fmtDate, fmtDateTime, rand, bookValue } from '../lib/util'
import { DISPOSAL_TYPES, CATEGORIES } from '../lib/lists'

export function Donations() {
  const { name, settings } = useApp(); const nav = useNavigate()
  const [d, reload] = useLoad(async () => ({ ins: await db.list('am_donations_in', { order: 'created_at', desc: true }), outs: await db.list('am_disposals', { order: 'created_at', desc: true }), assets: await db.list('am_assets', { order: 'asset_no' }) }), [])
  const [mode, setMode] = useState(null)
  const [fi, setFi] = useState({ donor: '', contact: '', conditions: '', items: '' })
  const [fo, setFo] = useState({ type: 'Donation', recipient: '', programme: '', reason: '', asset_ids: [] })
  const [run, busy, box] = useAction()
  if (!d) return <div className="muted">Loading…</div>
  const addIn = e => { e.preventDefault(); run(async () => { const x = await db.insert('am_donations_in', { donor: fi.donor, contact: fi.contact, conditions: fi.conditions, items: fi.items.split('\n').filter(Boolean).map(s => ({ description: s.trim(), category: 'Laptop', accepted: null, wiped: false, value: 0, asset_id: null })), status: 'Offered' }); nav(`/donations/in/${x.id}`) }) }
  const addOut = e => { e.preventDefault(); run(async () => { if (!fo.asset_ids.length) throw new Error('Choose the items.'); const x = await db.insert('am_disposals', { ...fo, status: 'Proposed' }); nav(`/donations/out/${x.id}`) }) }
  const available = d.assets.filter(a => !['Donated out', 'Returned to client', 'Disposed'].includes(a.status))
  return (
    <>
      <Head title="Donations and transfers" sub="Donations received (FRM-05) and donations, transfers, returns to clients and disposals out (FRM-06).">
        <button onClick={() => setMode(mode === 'in' ? null : 'in')}>Log a donation received</button>
        <button className="primary" onClick={() => setMode(mode === 'out' ? null : 'out')}>Donate or transfer out</button>
      </Head>
      {mode === 'in' && <form className="card" onSubmit={addIn}><div className="grid">
        <Field label="Donor"><input required value={fi.donor} onChange={e => setFi({ ...fi, donor: e.target.value })} /></Field>
        <Field label="Contact"><input value={fi.contact} onChange={e => setFi({ ...fi, contact: e.target.value })} /></Field>
        <Field label="Donor conditions"><input value={fi.conditions} onChange={e => setFi({ ...fi, conditions: e.target.value })} /></Field>
      </div><Field label="Items offered" hint="One per line"><textarea value={fi.items} onChange={e => setFi({ ...fi, items: e.target.value })} /></Field>{box}<button className="primary" disabled={busy} style={{ marginTop: 8 }}>Log offer</button></form>}
      {mode === 'out' && <form className="card" onSubmit={addOut}><div className="grid">
        <Field label="Type"><Select value={fo.type} onChange={v => setFo({ ...fo, type: v })} options={DISPOSAL_TYPES} /></Field>
        <Field label="Recipient"><input required value={fo.recipient} onChange={e => setFo({ ...fo, recipient: e.target.value })} /></Field>
        <Field label="Linked programme"><input value={fo.programme} onChange={e => setFo({ ...fo, programme: e.target.value })} /></Field>
      </div><Field label="Reason"><textarea value={fo.reason} onChange={e => setFo({ ...fo, reason: e.target.value })} /></Field>
        <h3>Items</h3><div style={{ maxHeight: 220, overflow: 'auto' }}>{available.map(a => <label key={a.id} className="check"><input type="checkbox" checked={fo.asset_ids.includes(a.id)} onChange={e => setFo({ ...fo, asset_ids: e.target.checked ? [...fo.asset_ids, a.id] : fo.asset_ids.filter(x => x !== a.id) })} />{a.asset_no} · {a.category} · {a.funding_source} · book value {rand(bookValue(a, settings.depreciation_years ?? 3))}</label>)}</div>
        {box}<button className="primary" disabled={busy} style={{ marginTop: 8 }}>Propose</button></form>}
      <div className="card"><h2>Out</h2><table><thead><tr><th>Ref</th><th>Type</th><th>Recipient</th><th>Items</th><th>Proposed by</th><th>Status</th></tr></thead>
        <tbody>{d.outs.map(x => <tr key={x.id} className="click" onClick={() => nav(`/donations/out/${x.id}`)}><td><Link to={`/donations/out/${x.id}`}>{x.ref}</Link></td><td>{x.type}</td><td>{x.recipient}</td><td>{x.asset_ids.map(i => d.assets.find(a => a.id === i)?.asset_no).join(', ')}</td><td>{name(x.proposed_by)}</td><td><Pill s={x.status} /></td></tr>)}</tbody></table></div>
      <div className="card"><h2>In</h2><table><thead><tr><th>Ref</th><th>Donor</th><th>Items</th><th>Status</th></tr></thead>
        <tbody>{d.ins.map(x => <tr key={x.id} className="click" onClick={() => nav(`/donations/in/${x.id}`)}><td><Link to={`/donations/in/${x.id}`}>{x.ref}</Link></td><td>{x.donor}</td><td>{x.items.length}</td><td><Pill s={x.status} /></td></tr>)}</tbody></table></div>
    </>
  )
}

export function DonationIn() {
  const { id } = useParams(); const { has } = useApp()
  const [x, reload] = useLoad(() => db.get('am_donations_in', id), [id])
  const [run, busy, box] = useAction()
  if (!x) return <div className="muted">Loading…</div>
  const setItem = (i, patch) => run(async () => { const items = x.items.map((it, j) => j === i ? { ...it, ...patch } : it); await db.update('am_donations_in', id, { items, status: items.every(it => it.accepted !== null) ? 'Items decided' : x.status }); reload() })
  const register = i => run(async () => {
    const it = x.items[i]; if (!it.wiped) throw new Error('PCZEN must wipe and reinstall it first, with a certificate (R-26).')
    const a = await db.insert('am_assets', { category: it.category || 'Laptop', description: it.description, serial_no: it.serial_no || 'To add', funding_source: 'Donated', owner: 'Angels', insurance_status: 'Not insured', status: 'In store', condition: 'Good', donor: x.donor, value_estimate: Number(it.value) || null, location: 'Angels storage' })
    await db.insert('am_custody', { asset_id: a.id, event: 'Registered', detail: `Donation ${x.ref} from ${x.donor}` })
    const items = x.items.map((t, j) => j === i ? { ...t, asset_id: a.id } : t)
    await db.update('am_donations_in', id, { items, status: items.filter(t => t.accepted).every(t => t.asset_id) ? 'Registered' : x.status }); reload()
  })
  return (
    <>
      <Head title={`${x.ref} · ${x.donor}`} sub={`${x.contact || ''} ${x.conditions ? '· conditions: ' + x.conditions : ''}`}><Pill s={x.status} /></Head>
      <div className="cols"><div className="card">
        <table><thead><tr><th>Item</th><th>Category</th><th>Decision</th><th>PCZEN wipe</th><th>Value (R)</th><th>Register</th></tr></thead>
          <tbody>{x.items.map((it, i) => <tr key={i}>
            <td>{it.description}</td>
            <td><Select value={it.category} onChange={v => setItem(i, { category: v })} options={CATEGORIES} /></td>
            <td>{it.accepted === null ? <div className="row"><button onClick={() => setItem(i, { accepted: true })}>Accept</button><button onClick={() => setItem(i, { accepted: false })}>Decline</button></div> : it.accepted ? 'Accepted' : 'Declined (back to donor or e-waste)'}</td>
            <td>{it.accepted && <label className="check"><input type="checkbox" checked={!!it.wiped} onChange={e => setItem(i, { wiped: e.target.checked })} />Wiped, certificate on file</label>}</td>
            <td>{it.accepted && <input type="number" defaultValue={it.value} onBlur={e => setItem(i, { value: e.target.value })} style={{ width: 100 }} />}</td>
            <td>{it.accepted && (it.asset_id ? <Link to={`/register/${it.asset_id}`}>Registered</Link> : <button disabled={busy} onClick={() => register(i)}>Register</button>)}</td>
          </tr>)}</tbody></table>
        {box}
        <div className="grid" style={{ marginTop: 14 }}>
          <Field label="Section 18A receipt (Finance)"><Select value={x.s18a} onChange={v => run(async () => { await db.update('am_donations_in', id, { s18a: v }); reload() })} options={['Not decided', 'Issued', 'Not applicable']} disabled={!has('hof', 'bookkeeper')} /></Field>
          <label className="check"><input type="checkbox" checked={!!x.thank_you_sent} onChange={e => run(async () => { await db.update('am_donations_in', id, { thank_you_sent: e.target.checked, status: e.target.checked ? 'Thanked' : x.status }); reload() })} disabled={!has('asset_coordinator')} />Thank-you letter sent (Asset Coordinator)</label>
        </div>
      </div><div className="card"><Files subjectType="donation_in" subjectId={x.id} kinds={['Photo', 'Wipe certificate', 'Thank-you letter']} /></div></div>
    </>
  )
}

export function Disposal() {
  const { id } = useParams(); const { has, name, me, settings, withRole } = useApp()
  const [d, reload] = useLoad(async () => { const x = await db.get('am_disposals', id); const assets = (await db.list('am_assets')).filter(a => x.asset_ids.includes(a.id)); return { x, assets } }, [id])
  const [recipientSign, setRecipientSign] = useState('')
  const [run, busy, box] = useAction()
  if (!d) return <div className="muted">Loading…</div>
  const { x, assets } = d
  const client = assets.some(a => a.funding_source && !['Angels', 'Donated'].includes(a.funding_source))
  const upd = patch => run(async () => { await db.update('am_disposals', id, patch); reload() })
  const finish = () => run(async () => {
    if (!x.fit_confirmed || !x.approved_by || !x.wiped || (client && !x.client_consent)) throw new Error('Every check above must be done first.')
    if (!recipientSign) throw new Error('The recipient signs by typing their full name.')
    const status = x.type === 'Return to client' ? 'Returned to client' : x.type === 'E-waste' ? 'Disposed' : 'Donated out'
    for (const a of assets) { await db.update('am_assets', a.id, { status, insurance_status: 'Not insured', custodian_id: null, location: x.recipient }); await db.insert('am_custody', { asset_id: a.id, event: status, detail: `${x.ref} · ${x.recipient}` }) }
    await db.update('am_disposals', id, { certificate_signed_at: new Date().toISOString(), status: 'Closed', reason: (x.reason || '') + ` · Received by ${recipientSign}` })
    await notify([...withRole('hof'), ...withRole('asset_coordinator')].map(p => p.id), `${x.ref} closed`, 'Record the write-off at book value.', `/donations/out/${id}`)
    reload()
  })
  const Row = ({ done, label, children }) => <div className="row" style={{ padding: '8px 0', borderBottom: '1px solid #EEF1F0' }}><span style={{ width: 22 }}>{done ? '✓' : '○'}</span><span style={{ flex: 1 }}>{label}</span>{!done && children}</div>
  const closed = x.status === 'Closed'
  return (
    <>
      <Head title={`${x.ref} · ${x.type}`} sub={`To ${x.recipient}${x.programme ? ' · ' + x.programme : ''} · proposed by ${name(x.proposed_by)}`}><Pill s={x.status} /></Head>
      <div className="cols"><div className="card">
        <h2>Items</h2><ul>{assets.map(a => <li key={a.id}><Link to={`/register/${a.id}`}>{a.asset_no}</Link> · {a.category} · {a.funding_source} · book value {rand(bookValue(a, settings.depreciation_years ?? 3))}</li>)}</ul>
        <h2 style={{ marginTop: 16 }}>Before it leaves Angels</h2>
        <Row done={x.fit_confirmed} label="Anton confirms it is fit to give away and not needed as a loan laptop">{has('factotum') && <button disabled={busy} onClick={() => upd({ fit_confirmed: true })}>Confirm</button>}</Row>
        {client && <Row done={x.client_consent} label="Client’s written consent on file (client-funded)">{has('asset_coordinator') && <button disabled={busy} onClick={() => upd({ client_consent: true })}>Consent on file</button>}</Row>}
        <Row done={!!x.approved_by} label={`Head of Finance approves the write-off${settings.ceo_limit ? ' (CEO above the limit)' : ''}`}>{has('hof', 'ceo') && x.proposed_by !== me.id && <button disabled={busy} onClick={() => upd({ approved_by: me.id, status: 'Approved' })}>Approve</button>}</Row>
        <Row done={x.wiped} label="PCZEN wipe certificate; removed from Angels Microsoft 365 and device management">{has('factotum') && <button disabled={busy} onClick={() => upd({ wiped: true, status: 'Wiped' })}>Wipe done</button>}</Row>
        {!closed && (has('factotum', 'asset_coordinator')) && <div style={{ marginTop: 12 }}><Field label="Recipient signs the certificate (full name)"><input value={recipientSign} onChange={e => setRecipientSign(e.target.value)} /></Field>{box}<button className="primary" disabled={busy} onClick={finish} style={{ marginTop: 8 }}>Sign certificate and close</button></div>}
        {closed && <div className="note ok">Certificate signed {fmtDateTime(x.certificate_signed_at)}. Items are off the insurance schedule and their status is final.</div>}
      </div><div className="card"><Files subjectType="disposal" subjectId={x.id} kinds={['Photo', 'Wipe certificate', 'Client consent', 'E-waste certificate', 'Signed certificate']} /></div></div>
    </>
  )
}
