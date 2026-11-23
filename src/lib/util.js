export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
export const fmtDateTime = d => d ? new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
export const rand = n => (n === null || n === undefined || n === '') ? '—' : 'R ' + Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
export const today = () => new Date().toISOString().slice(0, 10)

// Working days between two dates (weekends skipped; public holidays: add to HOLIDAYS)
export const HOLIDAYS = ['2026-12-16', '2026-12-25', '2026-12-26', '2027-01-01']
export function workingDays(from, to) {
  if (!from || !to) return null
  let n = 0; const d = new Date(from); const end = new Date(to)
  d.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0)
  const sign = d <= end ? 1 : -1
  while ((sign > 0 && d < end) || (sign < 0 && d > end)) {
    d.setDate(d.getDate() + sign)
    const iso = d.toISOString().slice(0, 10)
    if (d.getDay() % 6 !== 0 && !HOLIDAYS.includes(iso)) n += sign
  }
  return n
}
export function addWorkingDays(from, days) {
  const d = new Date(from); let left = days
  while (left > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6 !== 0 && !HOLIDAYS.includes(d.toISOString().slice(0, 10))) left-- }
  return d.toISOString()
}
// R-30 straight-line book value
export function bookValue(asset, years = 3) {
  if (!asset?.cost_excl_vat || !asset?.purchase_date) return asset?.value_estimate ?? null
  const months = (Date.now() - new Date(asset.purchase_date)) / (1000 * 60 * 60 * 24 * 30.44)
  return Math.max(0, Math.round(asset.cost_excl_vat * (1 - months / (years * 12))))
}
export const ageYears = d => d ? (Date.now() - new Date(d)) / (1000 * 60 * 60 * 24 * 365.25) : 0

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export function toCsv(rows, cols) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [cols.map(c => esc(c[0])).join(','), ...rows.map(r => cols.map(c => esc(typeof c[1] === 'function' ? c[1](r) : r[c[1]])).join(','))].join('\n')
}
export function download(name, text, type = 'text/csv') {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click()
}

const PILL = {
  green: ['#E2F3EC', '#17694F'], amber: ['#FDF1DC', '#8A5A00'], red: ['#FBE4E1', '#9B2C22'], blue: ['#E3EEFB', '#12325E'], grey: ['#EEF1F0', '#4F605B'],
}
export function statusTone(s = '') {
  if (/declin|stolen|lost|late|overdue|missing|cancel|written off|back to pczen/i.test(s)) return 'red'
  if (/handed over|complete|approved|paid|returned$|received|collected|delivered|pass|in store|issued|closed|good|new$/i.test(s)) return 'green'
  if (/awaiting|pending|pre-approval|with finance|tech check|quotes|hold|requested|expected|ready|reported|draft/i.test(s)) return 'amber'
  if (/ordered|pczen|couriered|booked|confirmed|signing|checked out|with /i.test(s)) return 'blue'
  return 'grey'
}
export const pillStyle = tone => ({ background: PILL[tone][0], color: PILL[tone][1] })
