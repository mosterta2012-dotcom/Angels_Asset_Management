import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/auth'
import { db } from '../lib/db'
import { Head, Pill, useLoad } from '../components/ui'
import { fmtDate } from '../lib/util'

const TILES = [
  ['Laptop', 'New, replacement or loan'], ['Monitor', 'Screen or monitor'], ['Printer', 'Printer'], ['Accessory', 'Mouse, bag, docking station'],
]

export default function Home() {
  const { me, name, backOffice } = useApp()
  const nav = useNavigate()
  const [reqs] = useLoad(() => db.list('am_requests', { order: 'created_at', desc: true }), [])
  const mine = (reqs || []).filter(r => backOffice ? true : [r.requested_by, r.for_user].includes(me.id))
  const open = mine.filter(r => !['Handed over', 'Declined', 'Cancelled'].includes(r.status))
  return (
    <>
      <Head title="Asset Management" sub="Ask for equipment, follow your request, look after what you hold, and report a problem.">
        <Link className="btn primary" to="/requests/new">New request</Link>
      </Head>
      <div className="card">
        <h2>What do you need?</h2>
        <div className="tiles">
          {TILES.map(([c, s]) => <Link key={c} className="tile" to={`/requests/new?category=${c}`}><strong>{c}</strong><span>{s}</span></Link>)}
          <Link className="tile" to="/store"><strong>Training or marketing item</strong><span>Training boxes, banners, gazebos</span></Link>
          <Link className="tile" to="/report-problem" style={{ borderColor: '#E8B4AE' }}><strong style={{ color: '#9B2C22' }}>Report a problem</strong><span>Damaged, lost or stolen: within 24 hours</span></Link>
        </div>
      </div>
      <div className="tiles" style={{ marginBottom: 18 }}>
        <div className="tile"><b>{open.length}</b><span>Open requests</span></div>
        <div className="tile"><b>{open.filter(r => /Awaiting|Pre-approval|With Finance|Tech/.test(r.status)).length}</b><span>Waiting for approval</span></div>
        <div className="tile"><b>{open.filter(r => r.status === 'Couriered').length}</b><span>Couriered, to sign</span></div>
        <div className="tile"><b>{open.filter(r => r.date_needed && r.date_needed < new Date().toISOString().slice(0, 10)).length}</b><span>Past the date needed</span></div>
      </div>
      <div className="card">
        <h2>{backOffice ? 'All requests' : 'Your requests'}</h2>
        <table>
          <thead><tr><th>Reference</th><th>Item</th><th>For</th><th>Type</th><th>Status</th><th>Needed by</th></tr></thead>
          <tbody>
            {mine.slice(0, 15).map(r => (
              <tr key={r.id} className="click" onClick={() => nav(`/requests/${r.id}`)}>
                <td><Link to={`/requests/${r.id}`}>{r.ref}</Link></td><td>{r.category}{r.laptop_tier ? ` · ${r.laptop_tier}` : ''}</td>
                <td>{r.for_user ? name(r.for_user) : r.for_name || name(r.requested_by)}</td><td>{r.request_type}</td><td><Pill s={r.status} /></td><td>{fmtDate(r.date_needed)}</td>
              </tr>
            ))}
            {mine.length === 0 && <tr><td colSpan="6" className="muted">No requests yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
