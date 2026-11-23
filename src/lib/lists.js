// Lists used across the app (QMS-05-REG-02 "Lists" tab). Change here and redeploy.
export const CATEGORIES = ['Laptop', 'Monitor', 'Printer', 'Accessory', 'Training box', 'Marketing material']
export const IT_CATEGORIES = ['Laptop', 'Monitor', 'Printer', 'Accessory']
export const REQUEST_TYPES = ['New starter', 'Replacement', 'Additional item', 'Loan']
export const TIERS = [
  { name: 'Management', note: 'CEO, HODs and HOF. Spec and price band set by Anton.' },
  { name: 'Standard', note: 'Office and programme staff. Spec and price band set by Anton.' },
  { name: 'Design / Media', note: 'Design and media roles. Spec and price band set by Anton.' },
]
export const MAIN_USES = ['Office work', 'Training delivery', 'Field work', 'Design and media', 'Finance and reporting']
export const REPLACEMENT_REASONS = ['Old or slow', 'Damaged', 'Lost', 'Stolen', 'Other']
export const FUNDING = ['Angels', 'Scatec E4C', 'Scatec Y4C', 'Noblesfontein (NWF) E4C', 'Seriti Green', 'Donated']
export const INSURANCE = ['Angels insures', 'Client insures', 'Angels with client contribution', 'Not insured']
export const CONDITIONS = ['New', 'Good', 'Fair', 'Damaged', 'Written off']
export const ASSET_STATUS = ['In store', 'Issued', 'Booked out', 'On loan', 'In repair', 'With PCZEN', 'Returned', 'Donated out', 'Returned to client', 'Disposed']
export const DELIVERY_ROUTES = ['Via Anton, then courier', 'Direct to staff member (needs approval)', 'Client site']
export const LOG_TYPES = ['Delivery in', 'Collection by Angels', 'Dispatch out', 'Courier collection']
export const LOG_STATUS = ['Expected', 'Ready to collect', 'Booked', 'Received', 'Collected', 'Delivered', 'Late', 'Cancelled']
export const INCIDENT_TYPES = ['Damaged', 'Not working', 'Lost', 'Stolen']
export const DISPOSAL_TYPES = ['Donation', 'Transfer to beneficiary', 'Return to client', 'Sale to staff', 'E-waste']
export const OLD_LAPTOP = ['Return to stock', 'Repair and reuse as a loan laptop', 'Donation', 'Write off (disposal report)']
export const ROLES = [
  ['staff', 'Staff'], ['hr', 'HR'], ['line_manager', 'Line manager'], ['budget_holder', 'Budget holder'],
  ['factotum', 'Factotum (Anton)'], ['dept_contact', 'Department asset contact'], ['asset_coordinator', 'Asset Coordinator'],
  ['hod_ops', 'Head of Operations and Systems'], ['bookkeeper', 'Bookkeeper'], ['hof', 'Head of Finance'],
  ['ceo', 'CEO'], ['treasurer', 'Board Treasurer'], ['info_officer', 'Information Officer'],
]
export const CONDITIONS_OF_USE = [
  'I will use it for Angels work.',
  'I will keep it safe and never leave it visible in a vehicle.',
  'I will not lend it to anyone or install software PCZEN or Operations has not approved.',
  'I will report loss, theft or damage within 24 hours.',
  'I will protect personal information on it (POPIA).',
  'I will return it with all accessories on request, at the end of a loan, or on my last working day.',
]
export const PRECHECK = [
  ['updates_ok', 'Windows updates done'],
  ['software_ok', 'Office and required software installed'],
  ['settings_ok', 'Company settings applied'],
  ['files_ok', 'Files moved from the old device'],
  ['accessories_ok', 'All accessories present'],
]
// Request statuses in order (KPI path)
export const FLOW = ['Awaiting line manager', 'Awaiting budget holder', 'Tech check', 'Quotes', 'Pre-approval', 'With Finance', 'Ready to order', 'Ordered', 'Received', 'With PCZEN', 'Pre-handover check', 'Couriered', 'Handed over']
