// Sample data for the browser-only demo. Not used when Supabase is connected.
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const day = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10) }
const ts = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString() }

export const P = {
  annemarie: id(1), anton: id(2), abongile: id(3), brent: id(4), jessica: id(5), gerald: id(6),
  lizelle: id(7), jordan: id(8), juliana: id(9), bev: id(10), melissa: id(11), dana: id(12), thandi: id(13), warren: id(14),
}

export function demoSeed() {
  const profiles = [
    [P.annemarie, 'Annemarie Mostert', 'Operations and Programme Systems Coordinator', 'Operations', P.brent, ['staff', 'asset_coordinator', 'dept_contact']],
    [P.anton, 'Anton Schoeman', 'Logistics Factotum', 'Executive', P.melissa, ['staff', 'factotum', 'dept_contact']],
    [P.abongile, 'Abongile Gotyana', 'National Operations Co-ordinator', 'Operations', P.brent, ['staff', 'dept_contact', 'line_manager']],
    [P.brent, 'Brent Proctor', 'Head of Operations and Systems', 'Operations', P.lizelle, ['staff', 'hod_ops', 'line_manager', 'dept_contact']],
    [P.jessica, 'Jessica Tuna', 'Bookkeeper', 'Finance', P.gerald, ['staff', 'bookkeeper', 'dept_contact']],
    [P.gerald, 'Gerald Erasmus', 'Finance HOD', 'Finance', P.lizelle, ['staff', 'hof', 'line_manager', 'dept_contact']],
    [P.lizelle, 'Lizelle Coombs', 'CEO', 'Executive', null, ['staff', 'ceo', 'info_officer']],
    [P.jordan, 'Jordan Smith', 'HR Assistant', 'Human Resources', P.dana, ['staff', 'hr', 'dept_contact']],
    [P.juliana, 'Juliana Semple', 'Marketing HOD', 'Marketing / PR', P.lizelle, ['staff', 'line_manager', 'dept_contact']],
    [P.bev, 'Bev Mallows', 'Graphic & Digital Design', 'Marketing / PR', P.juliana, ['staff', 'dept_contact']],
    [P.melissa, 'Melissa Gilomee', 'PA to CEO', 'Executive', P.lizelle, ['staff', 'dept_contact', 'line_manager']],
    [P.dana, 'Dana Dreyer', 'HOD Human Resources', 'Human Resources', P.lizelle, ['staff', 'line_manager', 'dept_contact']],
    [P.thandi, 'Thandi Nkosi (sample staff)', 'Facilitator', 'Operations', P.abongile, ['staff']],
    [P.warren, 'Warren (sample)', 'Social Performance Practitioner', 'Operations', P.abongile, ['staff']],
  ].map(([pid, full_name, job_title, department, manager_id, roles]) => ({ id: pid, email: full_name.split(' ')[0].toLowerCase() + '@example.org', full_name, job_title, department, manager_id, roles, active: true }))

  const store = [
    ['ARC-TRN-TB-01', 'Training box', 'TB', 'Training box 1', 'Shelf A1', null],
    ['ARC-TRN-TB-02', 'Training box', 'TB', 'Training box 2', 'Shelf A2', null],
    ['ARC-MKT-FB-01', 'Marketing material', 'FB', 'Feather banner, Angels', 'Rack B', null],
    ['ARC-MKT-FB-02', 'Marketing material', 'FB', 'Feather banner, Angels', 'Rack B', null],
    ['ARC-MKT-PB-01', 'Marketing material', 'PB', 'Pull-up banner, Angels', 'Rack B', null],
    ['ARC-MKT-PB-02', 'Marketing material', 'PB', 'Pull-up banner, Scatec E4C', 'Rack B', 'Scatec'],
    ['ARC-MKT-SK-01', 'Marketing material', 'SK', 'Sock flag, Angels', 'Rack C', null],
    ['ARC-MKT-GZ-01', 'Marketing material', 'GZ', 'Gazebo 3 x 3 m, Angels', 'Floor C', null],
  ].map(([asset_no, category, short_code, description, storage_location, client_restriction], i) => ({
    id: id(100 + i), asset_no, category, short_code, description, storage_location, client_restriction,
    funding_source: client_restriction ? 'Scatec E4C' : 'Angels', owner: client_restriction ? 'Client' : 'Angels',
    insurance_status: client_restriction ? 'Client insures' : 'Not insured', status: 'In store', condition: 'Good',
    box_contents: category === 'Training box' ? [{ item: 'Flip chart stand', qty: 1 }, { item: 'Flip chart pads', qty: 2 }, { item: 'Marker set', qty: 1 }, { item: 'Extension cord', qty: 1 }, { item: 'Attendance folder', qty: 1 }, { item: 'Name tags', qty: 30 }] : [],
    created_at: ts(-200),
  }))

  const laptops = [
    { id: id(200), asset_no: 'ARC-LAP-2021-007', category: 'Laptop', laptop_tier: 'Standard', description: '14-inch laptop', make_model: '[Make and model]', serial_no: 'SN-XXXX-0157', purchase_date: '2021-03-10', cost_excl_vat: 13500, warranty_ends: '2024-03-10', funding_source: 'Angels', owner: 'Angels', insurance_status: 'Angels insures', custodian_id: P.thandi, location: 'With staff member', status: 'Issued', condition: 'Fair', created_at: ts(-1700) },
    { id: id(201), asset_no: 'ARC-LAP-2026-003', category: 'Laptop', laptop_tier: 'Standard', description: '14-inch laptop', make_model: '[Make and model]', serial_no: 'SN-XXXX-2201', purchase_date: day(-40), cost_excl_vat: 15800, warranty_ends: day(690), funding_source: 'Angels', owner: 'Angels', insurance_status: 'Angels insures', custodian_id: null, location: 'Angels storage', status: 'In store', condition: 'Good', created_at: ts(-40) },
    { id: id(202), asset_no: 'ARC-LAP-2026-004-E4C', category: 'Laptop', laptop_tier: 'Standard', description: '14-inch laptop', make_model: '[Make and model]', serial_no: 'SN-XXXX-2202', purchase_date: day(-30), cost_excl_vat: 15800, warranty_ends: day(700), funding_source: 'Scatec E4C', project_code: 'E4C', owner: 'Client', insurance_status: 'Client insures', custodian_id: P.warren, location: 'With staff member', status: 'Issued', condition: 'Good', created_at: ts(-30) },
  ]

  const r1 = { id: id(300), ref: 'AST-REQ-2026-001', request_type: 'Replacement', requested_by: P.thandi, for_user: P.thandi, department: 'Operations', line_manager_id: P.abongile, category: 'Laptop', item_description: 'Replacement laptop', laptop_tier: 'Standard', main_use: 'Training delivery', travels_with_user: true, replaces_asset: id(200), replacement_reason: 'Old or slow', business_reason: 'Laptop takes several minutes to open files and the battery lasts under an hour.', date_needed: day(14), funding_source: 'Angels', delivery_route: 'Via Anton, then courier', status: 'Awaiting line manager', created_at: ts(-1) }
  const r2 = { id: id(301), ref: 'AST-REQ-2026-002', request_type: 'New starter', requested_by: P.jordan, for_name: 'New facilitator (starts soon)', for_role: 'Facilitator', department: 'Operations', line_manager_id: P.abongile, category: 'Laptop', item_description: 'Laptop for new starter', laptop_tier: 'Standard', main_use: 'Training delivery', business_reason: 'New facilitator for the Seriti Green programme.', date_needed: day(18), funding_source: 'Angels', delivery_route: 'Via Anton, then courier', status: 'With Finance', tech_outcome: 'Buy new', spec_notes: 'Standard tier, include bag and mouse.', created_at: ts(-6) }
  const approvals = [
    { id: id(400), subject_type: 'request', subject_id: r1.id, step: 'Line manager', approver_id: P.abongile, decision: 'Pending', due_at: ts(1), created_at: ts(-1) },
    { id: id(401), subject_type: 'request', subject_id: r2.id, step: 'Line manager', approver_id: P.abongile, decision: 'Approved', decided_at: ts(-5), decided_by: P.abongile, created_at: ts(-6) },
    { id: id(402), subject_type: 'request', subject_id: r2.id, step: 'Technical check', approver_id: P.anton, decision: 'Approved', decided_at: ts(-4), decided_by: P.anton, created_at: ts(-5) },
  ]
  const prs = [{ id: id(500), request_id: r2.id, pr_number: 'PR-2026-0001', supplier: '[Supplier A] · IT hardware', quotes: 'Q-1102 (chosen) · Q-1103 · Q-1104', amount_incl_vat: 18170, status: 'With Finance', created_by: P.anton, preapproved_by: P.annemarie, preapproved_at: ts(-2), created_at: ts(-3) }]

  const departments = [
    { name: 'Operations', contact_id: P.abongile, backup_id: P.annemarie, notes: 'Programme teams after onboarding' },
    { name: 'Human Resources', contact_id: P.jordan, backup_id: P.dana, notes: 'New-starter requests' },
    { name: 'Marketing / PR', contact_id: P.juliana, backup_id: P.bev, notes: '' },
    { name: 'Finance', contact_id: P.gerald, backup_id: P.jessica, notes: '' },
    { name: 'Reports', contact_id: P.annemarie, backup_id: P.brent, notes: 'Jim Cairns' },
    { name: 'Executive', contact_id: P.melissa, backup_id: P.anton, notes: 'CEO and PA' },
  ]
  const settings = [
    ['ceo_limit', null, 'Rand amount above which the CEO gives the final approval (D-01)'],
    ['pczen_turnaround_days', 5, 'Agreed PCZEN turnaround in working days (D-02, placeholder)'],
    ['new_starter_lead_days', 10, 'Working days before start date for new-starter requests (R-03)'],
    ['approval_days', 2, 'Working days per approval step'],
    ['loan_pool_max', 2, 'Maximum loan laptops (R-29)'],
    ['depreciation_years', 3, 'Straight-line years for IT equipment book value (R-30)'],
    ['replacement_due_years', 4, 'Flag laptops older than this as replacement due (R-31)'],
  ].map(([k, value, note]) => ({ id: k, key: k, value, note }))

  return {
    profiles, am_departments: departments, am_settings: settings,
    am_assets: [...store, ...laptops], am_requests: [r1, r2], am_approvals: approvals, am_payment_requests: prs,
    am_orders: [], am_files: [], am_custody: [], am_pczen_jobs: [], am_prechecks: [], am_handovers: [],
    am_incidents: [], am_bookings: [
      { id: id(600), ref: 'BK-2026-001', asked_by: P.juliana, booked_by: P.anton, purpose: 'Marketing', programme: 'Angels marketing · expo', venue_town: '[Venue], Cape Town', out_date: day(5), back_date: day(6), collector: 'Bev Mallows', transport: 'Collected from Angels', asset_ids: [id(104), id(107)], status: 'Confirmed', checkout: {}, checkin: {}, created_at: ts(-2) },
    ],
    am_log: [
      { id: id(700), ref: 'LOG-0001', type: 'Collection by Angels', company: 'ZipPrint', tracking: '[Job no.]', linked_to: 'Banner reprint · PR Briefing job', expected_date: day(2), handled_by: 'Anton', status: 'Expected', created_at: ts(-1) },
    ],
    am_donations_in: [], am_disposals: [],
    am_notifications: [
      { id: id(800), user_id: P.abongile, title: 'AST-REQ-2026-001 waits for your approval', body: 'Replacement laptop for Thandi Nkosi', link: `/requests/${r1.id}`, created_at: ts(-1) },
      { id: id(801), user_id: P.jessica, title: 'PR-2026-0001 waits for your compliance check', body: 'Laptop for new starter · R 18 170', link: `/finance`, created_at: ts(-2) },
    ],
    am_audit: [], counters: { 'AST-REQ|2026': 2, 'PR|2026': 1, 'BK|2026': 1, 'LOG|0': 1 }, files: {},
  }
}
