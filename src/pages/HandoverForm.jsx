import { useParams, Link } from 'react-router-dom'
import { useApp } from '../lib/auth'
import { db } from '../lib/db'
import { useLoad, Files } from '../components/ui'
import { fmtDate, fmtDateTime } from '../lib/util'
import { CONDITIONS_OF_USE } from '../lib/lists'

// QMS-05-FRM-02 Equipment Issue and Acknowledgement, rendered from the record. Print to PDF.
export default function HandoverForm() {
  const { id } = useParams(); const { name } = useApp()
  const [d] = useLoad(async () => {
    const h = await db.get('am_handovers', id); if (!h) return null
    const r = await db.get('am_requests', h.request_id)
    const assets = (await db.list('am_assets')).filter(a => h.asset_ids.includes(a.id))
    return { h, r, assets }
  }, [id])
  if (!d) return <div className="muted">Loading…</div>
  const { h, r, assets } = d
  const sig = (label, who, at) => <div style={{ border: '1px solid #C9D3D0', borderRadius: 8, padding: 10 }}><div className="small muted">{label}</div><div style={{ fontWeight: 600 }}>{who ? name(who) : '—'}</div><div className="small">{at ? `Signed electronically ${fmtDateTime(at)}` : 'Not signed yet'}</div></div>
  return (
    <div className="print card">
      <div className="row noprint" style={{ justifyContent: 'space-between', marginBottom: 16 }}><Link to={`/requests/${r.id}`}>← {r.ref}</Link><button className="primary" onClick={() => window.print()}>Print / save as PDF</button></div>
      <div className="small muted">Angels Resource Centres · QMS-05-FRM-02</div>
      <h1 style={{ margin: '4px 0 4px' }}>Equipment Issue and Acknowledgement</h1>
      <p className="small">{h.ref} · request {r.ref} · status <strong>{h.status}</strong>{h.status === 'Complete' && ' · locked'}</p>
      <dl className="kv" style={{ margin: '14px 0' }}><dt>Issued to</dt><dd>{name(h.staff_id)}</dd><dt>Department</dt><dd>{r.department}</dd><dt>Courier</dt><dd>{h.courier} · {h.waybill}</dd><dt>Delivered</dt><dd>{fmtDateTime(h.delivered_at)}</dd><dt>Remote sign-in</dt><dd>{h.signin_ok ? 'Confirmed (Authenticator)' : '—'} · Outlook, Teams and files {h.apps_ok ? 'working' : '—'}</dd></dl>
      <table><thead><tr><th>Asset no.</th><th>Item</th><th>Serial</th><th>Accessories</th><th>Funding / insurance</th></tr></thead>
        <tbody>{assets.map(a => <tr key={a.id}><td>{a.asset_no}</td><td>{a.category} {a.laptop_tier ? '· ' + a.laptop_tier : ''} {a.make_model || ''}</td><td>{a.serial_no}</td><td>{a.accessories}</td><td>{a.funding_source} · {a.insurance_status}</td></tr>)}</tbody></table>
      <h3 style={{ marginTop: 16 }}>Conditions of use</h3>
      <ul className="small">{CONDITIONS_OF_USE.map(c => <li key={c}>{h.conditions_accepted ? '☑' : '☐'} {c}</li>)}</ul>
      <div className="grid" style={{ marginTop: 16 }}>{sig('Received by (staff member)', h.staff_id, h.staff_signed_at)}{sig('Issued by (Factotum)', h.issued_by, h.issued_signed_at)}{sig('Recorded by (Asset Coordinator)', h.coordinator_id, h.coordinator_signed_at)}</div>
      {h.form_hash && <p className="small muted" style={{ wordBreak: 'break-all' }}>Integrity code (SHA-256): {h.form_hash}</p>}
      <div style={{ marginTop: 16 }}><Files subjectType="handover" subjectId={h.id} canAdd={false} title="Photos on receipt" /></div>
      <p className="small muted" style={{ marginTop: 20 }}>Controlled document. Printed copies are uncontrolled. Generated {fmtDate(new Date())}.</p>
    </div>
  )
}
