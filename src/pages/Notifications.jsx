import { Link } from 'react-router-dom'
import { useApp } from '../lib/auth'
import { db } from '../lib/db'
import { Head, useLoad } from '../components/ui'
import { fmtDateTime } from '../lib/util'

export default function Notifications() {
  const { me } = useApp()
  const [rows, reload] = useLoad(() => db.list('am_notifications', { eq: { user_id: me.id }, order: 'created_at', desc: true, limit: 100 }), [me.id])
  const markAll = async () => { for (const n of rows.filter(n => !n.read_at)) await db.update('am_notifications', n.id, { read_at: new Date().toISOString() }); reload() }
  return (
    <>
      <Head title="Notifications" sub="Every message sent to you by Asset Management."><button onClick={markAll}>Mark all as read</button></Head>
      <div className="card">
        {(rows || []).map(n => (
          <div key={n.id} style={{ padding: '10px 0', borderBottom: '1px solid #EEF1F0', fontWeight: n.read_at ? 400 : 600 }}>
            {n.link ? <Link to={n.link} onClick={() => !n.read_at && db.update('am_notifications', n.id, { read_at: new Date().toISOString() })}>{n.title}</Link> : n.title}
            {n.body && <div className="small muted" style={{ fontWeight: 400 }}>{n.body}</div>}
            <div className="small muted" style={{ fontWeight: 400 }}>{fmtDateTime(n.created_at)}</div>
          </div>
        ))}
        {rows?.length === 0 && <p className="muted">No notifications yet.</p>}
      </div>
    </>
  )
}
