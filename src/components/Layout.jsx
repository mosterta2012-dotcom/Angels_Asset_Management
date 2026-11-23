import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../lib/auth'
import { db, DEMO, resetDemo } from '../lib/db'
import { useLoad } from './ui'
import { useLocation } from 'react-router-dom'

export default function Layout() {
  const { me, has, backOffice, signOut } = useApp()
  const loc = useLocation()
  const [counts] = useLoad(async () => {
    const [ap, nt, prs] = await Promise.all([
      db.list('am_approvals', { eq: { approver_id: me.id, decision: 'Pending' } }),
      db.list('am_notifications', { eq: { user_id: me.id } }),
      backOffice ? db.list('am_payment_requests', {}) : Promise.resolve([]),
    ])
    const prMine = prs.filter(p => (p.status === 'Pre-approval' && has('asset_coordinator', 'hod_ops')) || (p.status === 'With Finance' && has('bookkeeper')) || (p.status === 'Compliance checked' && has('hof', 'ceo', 'treasurer'))).length
    return { approvals: ap.length + prMine, unread: nt.filter(n => !n.read_at).length }
  }, [me.id, loc.pathname])
  const L = (to, label, n) => <NavLink to={to} end={to === '/'}>{label}{n ? <span className="count">{n}</span> : null}</NavLink>
  return (
    <div className="app">
      <nav className="side noprint">
        <div className="brand">Angels Resource Centres<small>NPO Management System · Asset Management</small></div>
        {L('/', 'Home')}
        {L('/approvals', 'My approvals', counts?.approvals)}
        {L('/notifications', 'Notifications', counts?.unread)}
        {L('/report-problem', 'Report a problem')}
        <div className="sep">Asset Management</div>
        {L('/requests', 'Requests')}
        {(has('bookkeeper', 'hof', 'ceo', 'treasurer', 'asset_coordinator', 'hod_ops')) && L('/finance', 'Payment Requests')}
        {L('/store', 'Training & marketing store')}
        {(backOffice || has('dept_contact')) && L('/deliveries', 'Deliveries')}
        {(backOffice || has('info_officer')) && L('/incidents', 'Incidents')}
        {backOffice && L('/donations', 'Donations')}
        {L('/register', backOffice ? 'Asset register' : 'My equipment')}
        {(backOffice || has('line_manager')) && L('/reports', 'Reports')}
        {has('asset_coordinator', 'hod_ops') && <><div className="sep">Admin</div>{L('/admin', 'People, contacts, settings')}</>}
        <div className="who">
          <div style={{ color: '#fff', fontWeight: 600 }}>{me.full_name}</div>
          <div className="small" style={{ color: '#9FC2B6' }}>{me.job_title || me.email}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button onClick={signOut} style={{ padding: '4px 10px', fontSize: 13 }}>{DEMO ? 'Switch person' : 'Sign out'}</button>
            {DEMO && <button onClick={() => { resetDemo(); location.reload() }} style={{ padding: '4px 10px', fontSize: 13 }}>Reset demo</button>}
          </div>
        </div>
      </nav>
      <main className="main">
        {DEMO && <div className="note warn noprint">Demo mode: sample data stored in this browser only. Connect Supabase (see README) for the live system.</div>}
        <Outlet />
      </main>
    </div>
  )
}
