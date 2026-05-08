export const STATUS_CLASSES = { 'New':'badge-new','In Progress':'badge-progress','Visit Scheduled':'badge-visit','Visit Done':'badge-visitdone','Quote Sent':'badge-quote','Confirmed':'badge-confirmed','Hold':'badge-hold','Cancelled':'badge-cancelled','Converted to Order':'badge-converted' };
export const ALL_STATUSES = Object.keys(STATUS_CLASSES).filter(s => s !== 'Converted to Order');
export const PRODUCTS = ['Bedroom','Kitchen','Fitted Wardrobe','Sliding Wardrobe','Loft Room','Home Office','Study Room','Commercial','Other'];
export const CHANNELS = ['Phone','Email','WhatsApp','Walk-in','Website','Referral'];
export const PRIORITIES = ['Low','Normal','High'];
export const SOURCES = ['Phone','Email','WhatsApp','Walk-in','Website','Referral','Friend/Family'];
export function StatusBadge({ status }) { return <span className={`badge ${STATUS_CLASSES[status] || 'badge-new'}`}>{status}</span>; }
export function PriorityBadge({ priority }) { const c = { Low:'#888',Normal:'#1a5c8a',High:'#c0392b' }; return <span style={{ fontSize:'11px',color:c[priority]||'#888',fontWeight:600 }}>{priority==='High'?'🔴':priority==='Low'?'⚪':'🔵'} {priority}</span>; }
export function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
export function formatDateTime(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
export function getLogIcon(ch) { return {Phone:'📞',Email:'✉️',WhatsApp:'💬','In Person':'🤝','Internal Note':'📝'}[ch]||'📝'; }
export function getLogClass(ch) { return {Phone:'phone',Email:'email',WhatsApp:'whatsapp','In Person':'inperson','Internal Note':'internal'}[ch]||'internal'; }

export const VISIT_STATUSES = ['Scheduled','Confirmed','Completed','Cancelled','Rescheduled'];
export const VISIT_TYPES = ['Survey','Measurement','Installation','Follow-up','Other'];
export const VISIT_DURATIONS = [30,60,90,120,180,240];
export const VISIT_STATUS_CLASSES = { Scheduled:'vbadge-scheduled', Confirmed:'vbadge-confirmed', Completed:'vbadge-completed', Cancelled:'vbadge-cancelled', Rescheduled:'vbadge-rescheduled' };
export function VisitStatusBadge({ status }) { return <span className={`badge ${VISIT_STATUS_CLASSES[status] || 'vbadge-scheduled'}`}>{status}</span>; }
export function formatTime(t) { if (!t) return '—'; return t.slice(0,5); }
export const ORDER_STATUSES = ['Confirmed','Deposit Paid','In Production','Ready to Install','Installation Scheduled','Installed','Completed','Cancelled'];
export const ORDER_STATUS_CLASSES = {
  'Confirmed': 'obadge-confirmed', 'Deposit Paid': 'obadge-deposit',
  'In Production': 'obadge-production', 'Ready to Install': 'obadge-ready',
  'Installation Scheduled': 'obadge-scheduled', 'Installed': 'obadge-installed',
  'Completed': 'obadge-completed', 'Cancelled': 'obadge-cancelled',
};
export function OrderStatusBadge({ status }) { return <span className={`badge ${ORDER_STATUS_CLASSES[status] || 'obadge-confirmed'}`}>{status}</span>; }
export function formatCurrency(v) { if (!v) return '—'; return `£${Number(v).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`; }

export function formatVisitDateTime(date, time) {
  if (!date) return '—';
  const d = new Date(date).toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
  return time ? `${d} at ${time.slice(0,5)}` : d;
}
