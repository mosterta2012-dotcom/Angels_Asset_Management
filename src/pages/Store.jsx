import { useState, Fragment } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useApp, notify } from '../lib/auth'
import { db } from '../lib/db'
import { Head, Pill, Field, Select, useLoad, useAction, Files } from '../components/ui'
import { fmtDate, fmtDateTime, today } from '../lib/util'

const isStore = a => ['Training box', 'Marketing material'].includes(a.category)
const dayIso = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

export function Store() {
  const { has, backOffice, name } = useApp(); const nav = useNavigate()
  const [d] = useLoad(async () => {
    const [assets, bookings] = await Promise.all([db.list('am_assets', { order: 'asset_no' }), db.list('am_bookings', { order: 'out_date' })])
    return { items: assets.filter(isStore), bookings }
  }, [])
  if (!d) return <div className="muted">Loading…</div>
  const days = [...Array(14)].map((_, i) => dayIso(i))
  const active = d.bookings.filter(b => !['Cancelled', 'Returned', 'Returned with issues'].includes(b.status))
  const at = (a, day) => active.find(b => b.asset_ids?.includes(a.id) && b.out_date <= day && day <= b.back_date)
  return (
    <>
      <Head title="Training and marketing store" sub="Booked out for training or marketing only. Department asset contacts ask; Anton books and issues.">
        {(backOffice || has('dept_contact')) && <Link className="btn primary" to="/store/new">{has('factotum') ? 'Book items' : 'Ask Anton to book items'}</Link>}
      </Head>
      <div className="card" style={{ overflowX: 'auto' }}>
        <h2>Availability · next 14 days</h2>
        <div className="cal" style={{ gridTemplateColumns: `220px repeat(14, minmax(46px, 1fr))` }}>
          <div className="h">Item</div>{days.map(x => <div key={x} className="h">{new Date(x).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' })}</div>)}
          {d.items.map(a => (<Fragment key={a.id}>
            <div><strong>{a.asset_no}</strong><div className="muted">{a.description}{a.client_restriction ? ` · ${a.client_restriction} only` : ''}</div></div>
            {days.map(x => { const b = at(a, x); return <div key={a.id + x} className={b ? (b.status === 'Requested' ? 'r' : 'b') : ''} title={b ? `${b.ref} · ${b.programme}` : ''} onClick={() => b && nav(`/store/${b.id}`)} style={{ cursor: b ? 'pointer' : 'default' }}>{b ? b.ref.slice(-3) : ''}</div> })}
          </Fragment>))}
        </div>
        <p className="small muted">Green: booked. Amber: requested, waiting for Anton.</p>
      </div>
      <div className="card"><h2>Bookings</h2><table>
        <thead><tr><th>Booking</th><th>Programme / purpose</th><th>Items</th><th>Out</th><th>Back</th><th>Asked by</th><th>Status</th></tr></thead>
        <tbody>{[...d.bookings].reverse().map(b => <tr key={b.id} className="click" onClick={() => nav(`/store/${b.id}`)}><td><Link to={`/store/${b.id}`}>{b.ref}</Link></td><td>{b.programme} · {b.purpose}</td><td>{b.asset_ids.map(x => d.items.find(a => a.id === x)?.asset_no).join(', ')}</td><td>{fmtDate(b.out_date)}</td><td>{fmtDate(b.back_date)}</td><td>{name(b.asked_by)}</td><td><Pill s={b.status} /></td></tr>)}</tbody>
      </table></div>
      <div className="card"><h2>Items</h2><div className="tiles">{d.items.map(a => <Link key={a.id} className="tile" to={`/register/${a.id}`}><strong>{a.asset_no}</strong><span>{a.description}</span>{Array.isArray(a.box_contents) && a.box_contents.length > 0 && <span>{a.box_contents.map(c => `${c.qty} ${c.item}`).join(' · ')}</span>}<Pill s={a.status} /></Link>)}</div></div>
    </>
  )
}

export function NewBooking() {
  const { me, has, withRole } = useApp(); const nav = useNavigate()
  const [items] = useLoad(() => db.list('am_assets', { order: 'asset_no' }).then(x => x.filter(isStore)), [])
  const [f, setF] = useState({ purpose: 'Training', programme: '', venue_town: '', out_date: '', back_date: '', collector: '', transport: 'Collected from Angels', asset_ids: [] })
  const [run, busy, box] = useAction()
  const set = k => e => setF({ ...f, [k]: e?.target ? e.target.value : e })
  const anton = has('factotum')
  const submit = e => { e.preventDefault(); run(async () => {
    if (!f.asset_ids.length) throw new Error('Choose at least one item.')
    const b = await db.insert('am_bookings', { ...f, asked_by: me.id, booked_by: anton ? me.id : null, status: anton ? 'Confirmed' : 'Requested' })
    if (!anton) await notify(withRole('factotum').map(p => p.id), `${b.ref}: store items requested`, `${f.programme} · ${f.out_date} to ${f.back_date}`, `/store/${b.id}`)
    nav(`/store/${b.id}`)
  }) }
  return (
    <form onSubmit={submit}>
      <Head title={anton ? 'Book store items' : 'Ask Anton to book store items'} sub="FRM-07 part A. Training or marketing use only." />
      <div className="card">
        <div className="grid">
          <Field label="Purpose"><Select value={f.purpose} onChange={set('purpose')} options={['Training', 'Marketing']} /></Field>
          <Field label="Programme or event"><input required value={f.programme} onChange={set('programme')} placeholder="e.g. Seriti Green · market day" /></Field>
          <Field label="Venue and town"><input value={f.venue_town} onChange={set('venue_town')} /></Field>
          <Field label="Date out"><input type="date" required value={f.out_date} onChange={set('out_date')} /></Field>
          <Field label="Date back"><input type="date" required value={f.back_date} onChange={set('back_date')} /></Field>
          <Field label="Who collects"><input value={f.collector} onChange={set('collector')} /></Field>
          <Field label="Transport"><Select value={f.transport} onChange={set('transport')} options={['Collected from Angels', 'Courier to venue']} /></Field>
        </div>
        <h3 style={{ marginTop: 14 }}>Items</h3>
        {(items || []).map(a => <label key={a.id} className="check"><input type="checkbox" checked={f.asset_ids.includes(a.id)} onChange={e => setF({ ...f, asset_ids: e.target.checked ? [...f.asset_ids, a.id] : f.asset_ids.filter(x => x !== a.id) })} />{a.asset_no} · {a.description}{a.client_restriction ? <span className="muted"> · {a.client_restriction} programmes only</span> : ''}</label>)}
        {box}<button className="primary" disabled={busy} style={{ marginTop: 10 }}>{anton ? 'Book' : 'Send to Anton'}</button>
      </div>
    </form>
  )
}

export function BookingDetail() {
  const { id } = useParams(); const ctx = useApp(); const { has, name, me, withRole } = ctx
  const [d, reload] = useLoad(async () => { const b = await db.get('am_bookings', id); const items = await db.list('am_assets'); return { b, items: items.filter(a => b.asset_ids.includes(a.id)) } }, [id])
  const [collector, setCollector] = useState(''); const [ticks, setTicks] = useState({}); const [notes, setNotes] = useState('')
  const [run, busy, box] = useAction()
  if (!d) return <div className="muted">Loading…</div>
  const { b, items } = d
  const anton = has('factotum', 'asset_coordinator')
  const lines = items.flatMap(a => (Array.isArray(a.box_contents) && a.box_contents.length ? a.box_contents.map(c => ({ key: `${a.id}|${c.item}`, label: `${a.asset_no}: ${c.qty} × ${c.item}` })) : [{ key: a.id, label: `${a.asset_no}: ${a.description}` }]))
  const confirm = () => run(async () => { await db.update('am_bookings', id, { status: 'Confirmed', booked_by: me.id }); await notify([b.asked_by], `${b.ref} confirmed`, '', `/store/${id}`); reload() })
  const checkout = () => run(async () => {
    if (!collector) throw new Error('The collector signs by typing their full name.')
    if (!lines.every(l => ticks[l.key])) throw new Error('Tick every item and content line out.')
    await db.update('am_bookings', id, { status: 'Checked out', checkout: { signed_by: collector, at: new Date().toISOString(), notes } })
    for (const a of items) { await db.update('am_assets', a.id, { status: 'Booked out' }); await db.insert('am_custody', { asset_id: a.id, event: 'Booked out', detail: `${b.ref} · ${collector}` }) }
    setTicks({}); reload()
  })
  const checkin = () => run(async () => {
    const missing = lines.filter(l => !ticks[l.key]).map(l => l.label)
    await db.update('am_bookings', id, { status: missing.length ? 'Returned with issues' : 'Returned', checkin: { by: me.id, at: new Date().toISOString(), missing, notes } })
    for (const a of items) { await db.update('am_assets', a.id, { status: 'In store' }); await db.insert('am_custody', { asset_id: a.id, event: 'Checked in', detail: b.ref }) }
    if (missing.length) {
      const inc = await db.insert('am_incidents', { type: 'Damaged', occurred_at: new Date().toISOString(), reported_by: me.id, description: `Store return ${b.ref}: missing or damaged ${missing.join('; ')}. ${notes}`, asset_id: items[0]?.id, booking_id: b.id, status: 'Reported' })
      await notify([...withRole('asset_coordinator').map(p => p.id), b.asked_by], `${b.ref} returned with issues`, `Incident ${inc.ref} opened`, `/incidents/${inc.id}`)
    }
    reload()
  })
  return (
    <>
      <Head title={`${b.ref} · ${b.programme}`} sub={`${b.purpose} · ${b.venue_town || ''} · out ${fmtDate(b.out_date)}, back ${fmtDate(b.back_date)} · asked by ${name(b.asked_by)}`}><Pill s={b.status} /></Head>
      <div className="cols">
        <div className="card">
          <h2>Items</h2><ul>{items.map(a => <li key={a.id}><Link to={`/register/${a.id}`}>{a.asset_no}</Link> · {a.description}</li>)}</ul>
          {b.status === 'Requested' && anton && <>{box}<div className="row"><button className="primary" disabled={busy} onClick={confirm}>Confirm booking</button><button className="danger" disabled={busy} onClick={() => run(async () => { await db.update('am_bookings', id, { status: 'Cancelled' }); reload() })}>Cancel</button></div></>}
          {b.status === 'Confirmed' && anton && <>
            <h3>Check-out (FRM-07 part B)</h3>
            {lines.map(l => <label key={l.key} className="check"><input type="checkbox" checked={!!ticks[l.key]} onChange={e => setTicks({ ...ticks, [l.key]: e.target.checked })} />{l.label}</label>)}
            <Field label="Collector signs (full name)"><input value={collector} onChange={e => setCollector(e.target.value)} /></Field>
            <Field label="Notes (restock needed?)"><input value={notes} onChange={e => setNotes(e.target.value)} /></Field>
            {box}<button className="primary" disabled={busy} onClick={checkout} style={{ marginTop: 8 }}>Check out</button>
          </>}
          {b.status === 'Checked out' && anton && <>
            <h3>Return check (FRM-07 part C)</h3>
            <p className="small muted">Checked out to {b.checkout?.signed_by} · {fmtDateTime(b.checkout?.at)}</p>
            {lines.map(l => <label key={l.key} className="check"><input type="checkbox" checked={!!ticks[l.key]} onChange={e => setTicks({ ...ticks, [l.key]: e.target.checked })} />{l.label} back, in good condition</label>)}
            <Field label="Notes"><input value={notes} onChange={e => setNotes(e.target.value)} /></Field>
            {box}<button className="primary" disabled={busy} onClick={checkin} style={{ marginTop: 8 }}>Check in (anything unticked opens an incident)</button>
          </>}
          {b.checkin?.at && <div className={`note ${b.checkin.missing?.length ? 'err' : 'ok'}`}>Checked in {fmtDateTime(b.checkin.at)}{b.checkin.missing?.length ? ` · missing or damaged: ${b.checkin.missing.join('; ')}` : ''}</div>}
        </div>
        <div className="card"><Files subjectType="booking" subjectId={b.id} kinds={['Photo at check-out', 'Photo on return']} canAdd={anton} /></div>
      </div>
    </>
  )
}
