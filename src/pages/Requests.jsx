import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/auth'
import { db } from '../lib/db'
import { Head, Pill, Select, useLoad } from '../components/ui'
import { fmtDate } from '../lib/util'
import { FLOW } from '../lib/lists'

export default function Requests() {
  const { name } = useApp(); const nav = useNavigate()
  const [status, setStatus] = useState(''); const [q, setQ] = useState('')
  const [reqs] = useLoad(() => db.list('am_requests', { order: 'created_at', desc: true }), [])
  const rows = (reqs || []).filter(r => (!status || r.status === status) && (!q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase())))
  return (
    <>
      <Head title="Requests" sub="Every request you are allowed to see, newest first."><Link className="btn primary" to="/requests/new">New request</Link></Head>
      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <input placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />
          <Select value={status} onChange={setStatus} placeholder="All statuses" options={[...FLOW, 'Declined', 'On hold', 'Cancelled']} />
        </div>
        <table>
          <thead><tr><th>Reference</th><th>Item</th><th>For</th><th>Type</th><th>Funding</th><th>Status</th><th>Needed by</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id} className="click" onClick={() => nav(`/requests/${r.id}`)}>
              <td><Link to={`/requests/${r.id}`}>{r.ref}</Link>{r.late_request && <div className="small" style={{ color: '#9B2C22' }}>late request</div>}</td>
              <td>{r.category}{r.laptop_tier ? ` · ${r.laptop_tier}` : ''}</td><td>{r.for_user ? name(r.for_user) : r.for_name}</td>
              <td>{r.request_type}</td><td>{r.funding_source}</td><td><Pill s={r.status} /></td><td>{fmtDate(r.date_needed)}</td>
            </tr>))}
            {rows.length === 0 && <tr><td colSpan="7" className="muted">Nothing found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
