// Data layer. Uses Supabase when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set;
// otherwise runs a browser-only demo with sample data (nothing leaves the browser).
import { createClient } from '@supabase/supabase-js'
import { demoSeed } from './demoData'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const DEMO = !(url && key)
export const supabase = DEMO ? null : createClient(url, key)

// ---------------------------------------------------------------- Supabase
function applyQuery(q, opts = {}) {
  for (const [k, v] of Object.entries(opts.eq || {})) q = q.eq(k, v)
  for (const [k, v] of Object.entries(opts.in || {})) q = q.in(k, v)
  if (opts.contains) for (const [k, v] of Object.entries(opts.contains)) q = q.contains(k, v)
  if (opts.order) q = q.order(opts.order, { ascending: !opts.desc })
  if (opts.limit) q = q.limit(opts.limit)
  return q
}
function check({ data, error }) {
  if (error) throw new Error(error.message)
  return data
}

const supa = {
  async list(table, opts) { return check(await applyQuery(supabase.from(table).select('*'), opts)) },
  async get(table, id) { return check(await supabase.from(table).select('*').eq('id', id).maybeSingle()) },
  async insert(table, row) { return check(await supabase.from(table).insert(row).select().single()) },
  // insert without reading the rows back (for rows the sender may not see, e.g. notifications to others)
  async insertMany(table, rows) { check(await supabase.from(table).insert(rows)) },
  async update(table, id, patch, key = 'id') { return check(await supabase.from(table).update(patch).eq(key, id).select().single()) },
  async upload(file, folder) {
    const path = `${folder}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`
    check(await supabase.storage.from('am-files').upload(path, file))
    return path
  },
  async fileUrl(path) {
    const { data } = await supabase.storage.from('am-files').createSignedUrl(path, 3600)
    return data?.signedUrl
  },
}

// ---------------------------------------------------------------- Demo
const KEY = 'angels-am-demo-v1'
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s) return s } catch (e) { /* ignore */ }
  const s = demoSeed(); save(s); return s
}
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch (e) { /* storage full: keep in memory */ } }
let store = null
const st = () => (store ||= load())
const uid = () => crypto.randomUUID()
const pad = (n, w) => String(n).padStart(w, '0')

function nextRef(prefix, width = 3, withYear = true) {
  const s = st(); const y = new Date().getFullYear(); const k = `${prefix}|${withYear ? y : 0}`
  s.counters[k] = (s.counters[k] || 0) + 1
  return withYear ? `${prefix}-${y}-${pad(s.counters[k], width)}` : `${prefix}-${pad(s.counters[k], width)}`
}
function demoRef(table, row) {
  const map = { am_requests: ['ref', 'AST-REQ'], am_handovers: ['ref', 'AST-HO'], am_incidents: ['ref', 'AST-INC'], am_bookings: ['ref', 'BK'], am_donations_in: ['ref', 'DON-IN'], am_payment_requests: ['pr_number', 'PR', 4] }
  if (map[table] && !row[map[table][0]]) row[map[table][0]] = nextRef(map[table][1], map[table][2] || 3)
  if (table === 'am_log' && !row.ref) row.ref = nextRef('LOG', 4, false)
  if (table === 'am_disposals' && !row.ref) row.ref = nextRef(['Donation', 'E-waste'].includes(row.type) ? 'DON-OUT' : 'TRF')
  if (table === 'am_assets' && !row.asset_no) {
    const cat = { Laptop: 'LAP', Monitor: 'MON', Printer: 'PRN' }[row.category] || 'ACC'
    if (row.category === 'Training box') row.asset_no = `ARC-TRN-TB-${pad(st().am_assets.filter(a => a.category === 'Training box').length + 1, 2)}`
    else if (row.category === 'Marketing material') row.asset_no = `ARC-MKT-${row.short_code || 'MK'}-${pad(st().am_assets.filter(a => a.short_code === row.short_code).length + 1, 2)}`
    else row.asset_no = nextRef(`ARC-${cat}`) + (row.funding_source && !['Angels', 'Donated'].includes(row.funding_source) && row.project_code ? `-${row.project_code}` : '')
  }
}
// A few of the database rules, so the demo behaves like the real system
function demoRules(table, row, before) {
  if (table === 'am_orders') {
    const pr = st().am_payment_requests.find(p => p.id === row.payment_request_id)
    if (!pr || !['Approved', 'Paid'].includes(pr.status)) throw new Error('The order unlocks only after Finance approves the Payment Request (R-10)')
  }
  if (table === 'am_handovers' && before?.status === 'Complete') throw new Error('This handover form is locked. Create a new version with a reason.')
  if (table === 'am_bookings' && row.status !== 'Cancelled') {
    for (const b of st().am_bookings) {
      if (b.id === row.id || ['Cancelled', 'Returned', 'Returned with issues'].includes(b.status)) continue
      const overlap = b.out_date <= row.back_date && row.out_date <= b.back_date
      const shared = (b.asset_ids || []).find(a => (row.asset_ids || []).includes(a))
      if (overlap && shared) throw new Error(`Already booked for those dates: ${st().am_assets.find(a => a.id === shared)?.asset_no} (R-21)`)
    }
  }
}
function match(r, opts = {}) {
  for (const [k, v] of Object.entries(opts.eq || {})) if (r[k] !== v) return false
  for (const [k, v] of Object.entries(opts.in || {})) if (!v.includes(r[k])) return false
  if (opts.contains) for (const [k, v] of Object.entries(opts.contains)) if (!v.every(x => (r[k] || []).includes(x))) return false
  return true
}
const demo = {
  async list(table, opts = {}) {
    let rows = (st()[table] || []).filter(r => match(r, opts))
    if (opts.order) rows = [...rows].sort((a, b) => (a[opts.order] > b[opts.order] ? 1 : -1) * (opts.desc ? -1 : 1))
    if (opts.limit) rows = rows.slice(0, opts.limit)
    return structuredClone(rows)
  },
  async get(table, id) { return structuredClone((st()[table] || []).find(r => r.id === id) || null) },
  async insertMany(table, rows) { for (const r of rows) await demo.insert(table, r) },
  async insert(table, row) {
    const s = st(); s[table] ||= []
    const r = { id: uid(), created_at: new Date().toISOString(), ...row }
    for (const k of { am_requests: ['requested_by'], am_custody: ['by_user'], am_files: ['uploaded_by'], am_payment_requests: ['created_by'], am_orders: ['ordered_by'], am_incidents: ['reported_by'], am_bookings: ['asked_by'], am_disposals: ['proposed_by'], am_prechecks: ['checked_by'] }[table] || []) if (!r[k]) r[k] = demoUser
    if (table === 'am_custody' && !r.at) r.at = r.created_at
    demoRef(table, r); demoRules(table, r)
    s[table].push(r); audit(table, r.id, 'INSERT', null, r); save(s); return structuredClone(r)
  },
  async update(table, id, patch, key = 'id') {
    const s = st(); const i = s[table].findIndex(r => r[key] === id)
    const before = s[table][i]; const after = { ...before, ...patch }
    demoRules(table, after, before)
    s[table][i] = after; audit(table, id, 'UPDATE', before, after); save(s); return structuredClone(after)
  },
  async upload(file, folder) {
    const path = `${folder}/${Date.now()}-${file.name}`
    if (file.size < 400000) {
      const data = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(file) })
      st().files[path] = data; save(st())
    }
    return path
  },
  async fileUrl(path) { return st().files[path] || null },
}
function audit(table, id, action, oldRow, newRow) {
  if (table === 'am_notifications') return
  st().am_audit.unshift({ id: uid(), at: new Date().toISOString(), user_id: demoUser, table_name: table, record_id: id, action, old_row: oldRow, new_row: newRow })
  st().am_audit.length = Math.min(st().am_audit.length, 500)
}
let demoUser = null
export function setDemoUser(id) { demoUser = id; localStorage.setItem(KEY + '-user', id || '') }
export function getDemoUser() { return demoUser ?? (demoUser = localStorage.getItem(KEY + '-user') || null) }
export function resetDemo() { localStorage.removeItem(KEY); store = null }

export const db = DEMO ? demo : supa
