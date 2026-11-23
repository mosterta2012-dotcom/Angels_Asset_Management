import { useState } from 'react'
import { useApp } from '../lib/auth'
import { db } from '../lib/db'
import { Head, useLoad } from '../components/ui'
import { workingDays, fmtDate, toCsv, download } from '../lib/util'

// Monthly report and KPI (briefing section 10)
export default function Reports() {
  const { settings } = useApp()
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [d] = useLoad(async () => {
    const [reqs, jobs, incs, books, logs] = await Promise.all(['am_requests', 'am_pczen_jobs', 'am_incidents', 'am_bookings', 'am_log'].map(t => db.list(t)))
    return { reqs, jobs, incs, books, logs }
  }, [])
  if (!d) return <div className="muted">Loading…</div>
  const inMonth = x => x && x.slice(0, 7) === month
  const done = d.reqs.filter(r => r.status === 'Handed over' && inMonth(r.handed_over_at))
  const onTime = done.filter(r => r.handed_over_at.slice(0, 10) <= r.date_needed)
  const ns = done.filter(r => r.request_type === 'New starter'); const nsOn = ns.filter(r => r.handed_over_at.slice(0, 10) <= r.date_needed)
  const kpi = done.length ? Math.round(100 * onTime.length / done.length) : null
  const avg = done.length ? (done.reduce((s, r) => s + workingDays(r.created_at, r.handed_over_at), 0) / done.length).toFixed(1) : '—'
  const turnaround = settings.pczen_turnaround_days ?? 5
  const mJobs = d.jobs.filter(j => inMonth(j.sent_at) || inMonth(j.returned_at))
  const jobDays = mJobs.map(j => workingDays(j.sent_at, j.returned_at || new Date().toISOString()))
  const incomplete = mJobs.filter(j => (j.items || []).some(i => !i.returned) && j.returned_at)
  const mInc = d.incs.filter(i => inMonth(i.created_at))
  const byType = t => mInc.filter(i => i.type === t).length
  const lateLogs = d.logs.filter(l => l.expected_date && inMonth(l.expected_date) && l.completed_at && l.completed_at.slice(0, 10) > l.expected_date)
  const T = ({ v, l, warn }) => <div className="tile" style={{ borderColor: warn ? '#E8B4AE' : undefined }}><b>{v}</b><span>{l}</span></div>
  const exportCsv = () => download(`asset-report-${month}.csv`, toCsv(done, [['Ref', 'ref'], ['Type', 'request_type'], ['Category', 'category'], ['Requested', r => fmtDate(r.created_at)], ['Needed by', 'date_needed'], ['Handed over', r => fmtDate(r.handed_over_at)], ['On time', r => r.handed_over_at.slice(0, 10) <= r.date_needed ? 'Yes' : 'No'], ['Working days', r => workingDays(r.created_at, r.handed_over_at)], ['Late request', r => r.late_request ? 'Yes' : 'No']]))
  return (
    <>
      <Head title="Monthly report and KPI" sub="New-hire equipment and onboarding requests coordinated and processed within agreed timeframes.">
        <input type="month" value={month} onChange={e => setMonth(e.target.value)} /><button onClick={exportCsv}>Export</button><button onClick={() => window.print()}>Print / PDF</button>
      </Head>
      <div className="tiles" style={{ marginBottom: 18 }}>
        <T v={kpi === null ? '—' : `${kpi}%`} l={`KPI: handed over by the date needed (${onTime.length} of ${done.length})`} warn={kpi !== null && kpi < 90} />
        <T v={ns.length ? `${Math.round(100 * nsOn.length / ns.length)}%` : '—'} l={`New starters on time (${nsOn.length} of ${ns.length})`} />
        <T v={avg} l="Average working days, request to handover" />
        <T v={done.filter(r => r.late_request).length} l="Late requests from HR" />
      </div>
      <div className="cols">
        <div className="card">
          <h2>PCZEN turnaround</h2>
          <div className="tiles"><T v={mJobs.length} l="Jobs this month" /><T v={jobDays.length ? (jobDays.reduce((a, b) => a + b, 0) / jobDays.length).toFixed(1) : '—'} l={`Average working days (agreed ${turnaround})`} /><T v={jobDays.filter(x => x > turnaround).length} l="Over the agreed turnaround" warn={jobDays.some(x => x > turnaround)} /><T v={incomplete.length} l="Returned incomplete" warn={incomplete.length > 0} /></div>
          <table style={{ marginTop: 12 }}><thead><tr><th>Ticket</th><th>Sent</th><th>Back</th><th>Days</th><th>Outcome</th></tr></thead><tbody>{mJobs.map((j, i) => <tr key={j.id}><td>{j.ticket}</td><td>{fmtDate(j.sent_at)}</td><td>{fmtDate(j.returned_at)}</td><td>{jobDays[i]}</td><td>{j.outcome || 'With PCZEN'}</td></tr>)}</tbody></table>
        </div>
        <div className="card">
          <h2>Incidents</h2>
          <table><tbody>{['Damaged', 'Not working', 'Lost', 'Stolen'].map(t => <tr key={t}><td>{t}</td><td>{byType(t)}</td></tr>)}<tr><td>Reported late</td><td>{mInc.filter(i => i.late_report).length}</td></tr></tbody></table>
          <h2 style={{ marginTop: 16 }}>Store and deliveries</h2>
          <table><tbody><tr><td>Store bookings</td><td>{d.books.filter(b => inMonth(b.out_date)).length}</td></tr><tr><td>Returned with issues</td><td>{d.books.filter(b => inMonth(b.out_date) && b.status === 'Returned with issues').length}</td></tr><tr><td>Deliveries late</td><td>{lateLogs.length}</td></tr></tbody></table>
        </div>
      </div>
    </>
  )
}
