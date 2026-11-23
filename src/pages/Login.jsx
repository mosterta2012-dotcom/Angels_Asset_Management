import { useState, useEffect } from 'react'
import { useApp } from '../lib/auth'
import { DEMO, db } from '../lib/db'

export default function Login() {
  const { signIn } = useApp()
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false); const [err, setErr] = useState('')
  const [people, setPeople] = useState([])
  useEffect(() => { if (DEMO) db.list('profiles', { order: 'full_name' }).then(setPeople) }, [])

  if (DEMO) return (
    <div className="login card">
      <h2>Asset Management · demo</h2>
      <p className="muted">Choose who you want to be. Each person sees the screens and approvals for their role.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {people.map(p => (
          <button key={p.id} onClick={() => signIn(p.id)} style={{ textAlign: 'left' }}>
            {p.full_name} <span className="muted small">· {p.job_title}</span>
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="login card">
      <h2>Asset Management</h2>
      <p className="muted">Angels Resource Centres · sign in with your Angels email address. We will email you a sign-in link.</p>
      {sent ? <div className="note ok">Check your inbox for the sign-in link. You can close this tab.</div> : (
        <form onSubmit={async e => { e.preventDefault(); setErr(''); try { await signIn(email.trim()); setSent(true) } catch (x) { setErr(x.message) } }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="email" required placeholder="name@angels…" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="primary">Email me a sign-in link</button>
          {err && <div className="note err">{err}</div>}
        </form>
      )}
    </div>
  )
}
