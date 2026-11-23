import { Link } from 'react-router-dom'
import { useApp } from '../lib/auth'
import { db } from '../lib/db'
import { Head, Pill, useLoad } from '../components/ui'
import { fmtDate, rand } from '../lib/util'

export default function Approvals() {
  const { me, has, name } = useApp()
  const [d] = useLoad(async () => {
    const [ap, reqs, prs, hos] = await Promise.all([
      db.list('am_approvals', { eq: { approver_id: me.id } }), db.list('am_requests'), db.list('am_payment_requests'), db.list('am_handovers'),
    ])
    const R = id => reqs.find(r => r.id === id)
    const items = []
    for (const a of ap.filter(a => ['Pending', 'On hold'].includes(a.decision))) { const r = R(a.subject_id); if (r) items.push({ what: a.step, r, due: a.due_at, st: a.decision }) }
    for (const p of prs) {
      const r = R(p.request_id); if (!r) continue
      if (p.status === 'Pre-approval' && has('asset_coordinator', 'hod_ops')) items.push({ what: `Pre-approval · ${p.pr_number} · ${rand(p.amount_incl_vat)}`, r, st: p.status })
      if (p.status === 'With Finance' && has('bookkeeper')) items.push({ what: `Compliance check · ${p.pr_number} · ${rand(p.amount_incl_vat)}`, r, st: p.status })
      if (p.status === 'Compliance checked' && has('hof', 'ceo', 'treasurer')) items.push({ what: `Final check · ${p.pr_number} · ${rand(p.amount_incl_vat)}`, r, st: p.status })
    }
    for (const r of reqs) {
      if (has('factotum') && ['Quotes', 'Ready to order', 'Ordered', 'Received', 'With PCZEN', 'Pre-handover check'].includes(r.status)) items.push({ what: { Quotes: 'Quotes and Payment Request', 'Ready to order': 'Place the order', Ordered: 'Receive and register', Received: 'Send to PCZEN', 'With PCZEN': 'Check the PCZEN return', 'Pre-handover check': 'Pre-handover check and courier' }[r.status], r, due: r.date_needed, st: r.status })
    }
    for (const h of hos) {
      const r = R(h.request_id); if (!r) continue
      if (h.staff_id === me.id && !h.staff_signed_at) items.push({ what: `Confirm receipt and sign ${h.ref}`, r, st: 'Couriered' })
      if (has('factotum') && h.staff_signed_at && !h.issued_signed_at) items.push({ what: `Sign ${h.ref} as Issued by`, r, st: 'Signing' })
      if (has('asset_coordinator') && h.issued_signed_at && !h.coordinator_signed_at) items.push({ what: `Sign ${h.ref} last`, r, st: 'Signing' })
    }
    return items
  }, [me.id])
  return (
    <>
      <Head title="My approvals and tasks" sub="Everything waiting for you, in one list." />
      <div className="card">
        <table>
          <thead><tr><th>What</th><th>Request</th><th>For</th><th>Status</th><th>Due / needed</th></tr></thead>
          <tbody>{(d || []).map((x, i) => (
            <tr key={i}><td><Link to={`/requests/${x.r.id}`}><strong>{x.what}</strong></Link></td><td>{x.r.ref}</td><td>{x.r.for_user ? name(x.r.for_user) : x.r.for_name}</td><td><Pill s={x.st} /></td><td>{fmtDate(x.due || x.r.date_needed)}</td></tr>
          ))}{d?.length === 0 && <tr><td colSpan="5" className="muted">Nothing waiting for you.</td></tr>}</tbody>
        </table>
      </div>
    </>
  )
}
