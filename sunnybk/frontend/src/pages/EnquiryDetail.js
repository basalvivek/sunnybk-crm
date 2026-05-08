import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getEnquiryById, updateEnquiry, addEnquiryLog, getEmployees, getVisits, createOrder, getOrders } from '../api';
import {
  StatusBadge, PriorityBadge, formatDate, formatDateTime,
  getLogIcon, getLogClass, ALL_STATUSES, PRODUCTS, CHANNELS, PRIORITIES,
  VisitStatusBadge,
} from '../components/helpers';

const LOG_CHANNELS = [...CHANNELS, 'In Person', 'Internal Note'];

export default function EnquiryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState(null);
  const [logs, setLogs] = useState([]);
  const [visits, setVisits] = useState([]);
  const [linkedOrder, setLinkedOrder] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [logForm, setLogForm] = useState({ channel: 'Phone', notes: '', status_changed_to: '', logged_by: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [addingLog, setAddingLog] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({ total_amount: '', deposit_amount: '', expected_install_date: '', notes: '', created_by: '', assigned_to: '' });
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  const load = async () => {
    const [enqRes, visitsRes] = await Promise.all([
      getEnquiryById(id),
      getVisits({ enquiry_id: id }),
    ]);
    const enq = enqRes.data.data.enquiry;
    setEnquiry(enq);
    setLogs(enqRes.data.data.logs);
    setVisits(visitsRes.data.data);
    setEditForm(enq);
    // Pre-fill order modal with enquiry budget
    if (enq.budget_estimate) {
      setOrderForm(f => ({ ...f, total_amount: enq.budget_estimate }));
    }
    // Check for linked order
    try {
      const ordersRes = await getOrders({});
      const linked = ordersRes.data.data.find(o => String(o.enquiry_id) === String(id));
      setLinkedOrder(linked || null);
    } catch { setLinkedOrder(null); }
  };

  useEffect(() => {
    Promise.all([load(), getEmployees().then(r => {
      const emp = r.data.data;
      setEmployees(emp);
      if (emp.length > 0) {
        setLogForm(f => ({ ...f, logged_by: emp[0].id }));
        setOrderForm(f => ({ ...f, created_by: emp[0].id }));
      }
    })]).finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    await updateEnquiry(id, editForm);
    await load();
    setEditing(false);
    setSavingEdit(false);
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    setAddingLog(true);
    await addEnquiryLog(id, logForm);
    setLogForm(f => ({ ...f, notes: '', status_changed_to: '' }));
    await load();
    setAddingLog(false);
  };

  const setEF = (k, v) => setEditForm(f => ({ ...f, [k]: v }));
  const setLF = (k, v) => setLogForm(f => ({ ...f, [k]: v }));

  if (loading) return <div className="loading">Loading enquiry...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb"><Link to="/enquiries">Enquiries</Link> / {enquiry.enquiry_code}</div>
          <h1>{enquiry.enquiry_code} — {enquiry.product_interest}</h1>
        </div>
        <div className="header-actions">
          <StatusBadge status={enquiry.status} />
          {['Confirmed', 'Converted to Order'].includes(enquiry.status) && !linkedOrder && (
            <button className="btn btn-primary" style={{ background: '#10b981' }} onClick={() => { setShowOrderModal(true); setOrderError(''); }}>
              🛒 Convert to Order
            </button>
          )}
          {linkedOrder && (
            <Link to={`/orders/${linkedOrder.id}`} className="btn btn-secondary">📦 View Order</Link>
          )}
          <Link to={`/visits/schedule?enquiry_id=${id}`} className="btn btn-primary">📅 Schedule Visit</Link>
          <button className="btn btn-secondary" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>

      {/* ── Convert to Order Modal ── */}
      {showOrderModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:28, width:'100%', maxWidth:480, boxShadow:'0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ fontSize:16, fontWeight:700 }}>Convert to Order</h3>
              <button onClick={() => setShowOrderModal(false)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#7a8a9a' }}>×</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setCreatingOrder(true); setOrderError('');
              try {
                const res = await createOrder({ ...orderForm, enquiry_id: id });
                navigate(`/orders/${res.data.data.id}`);
              } catch (err) { setOrderError(err.response?.data?.message || 'Failed to create order'); setCreatingOrder(false); }
            }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Amount (£)</label>
                  <input className="input" type="number" min="0" step="100" value={orderForm.total_amount} onChange={e => setOrderForm(f => ({ ...f, total_amount: e.target.value }))} placeholder="e.g. 8000" />
                </div>
                <div className="form-group">
                  <label>Deposit Amount (£)</label>
                  <input className="input" type="number" min="0" step="100" value={orderForm.deposit_amount} onChange={e => setOrderForm(f => ({ ...f, deposit_amount: e.target.value }))} placeholder="e.g. 4000" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Expected Install Date</label>
                  <input className="input" type="date" value={orderForm.expected_install_date} onChange={e => setOrderForm(f => ({ ...f, expected_install_date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Assign To</label>
                  <select className="select" value={orderForm.assigned_to} onChange={e => setOrderForm(f => ({ ...f, assigned_to: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label>Created By</label>
                <select className="select" value={orderForm.created_by} onChange={e => setOrderForm(f => ({ ...f, created_by: e.target.value }))}>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:16 }}>
                <label>Notes</label>
                <textarea className="textarea" rows={2} value={orderForm.notes} onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special requirements, agreed terms..." />
              </div>
              {orderError && <div className="error-msg">{orderError}</div>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={creatingOrder} style={{ background:'#10b981' }}>
                  {creatingOrder ? 'Creating...' : 'Create Order'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="detail-grid">
        {/* ── Left Column ── */}
        <div className="detail-left">
          <div className="card">
            <div className="card-title">Customer</div>
            <div className="info-row"><span className="info-label">Name</span><span>{enquiry.customer_name}</span></div>
            <div className="info-row"><span className="info-label">Phone</span><span>{enquiry.customer_phone || '—'}</span></div>
            <div className="info-row"><span className="info-label">Email</span><span>{enquiry.customer_email || '—'}</span></div>
            <div className="info-row">
              <span className="info-label">Address</span>
              <span>{[enquiry.address_line1, enquiry.address_line2, enquiry.city, enquiry.postcode].filter(Boolean).join(', ') || '—'}</span>
            </div>
            <div className="info-row"><span className="info-label">Code</span><span className="text-muted">{enquiry.customer_code}</span></div>
          </div>

          {!editing ? (
            <div className="card">
              <div className="card-title">Enquiry Details</div>
              <div className="info-row"><span className="info-label">Product</span><span>{enquiry.product_interest}</span></div>
              <div className="info-row"><span className="info-label">Channel</span><span>{enquiry.channel}</span></div>
              <div className="info-row"><span className="info-label">Priority</span><PriorityBadge priority={enquiry.priority} /></div>
              <div className="info-row"><span className="info-label">Assigned To</span><span>{enquiry.assigned_to_name || '—'}</span></div>
              <div className="info-row">
                <span className="info-label">Budget</span>
                <span>{enquiry.budget_estimate ? `£${Number(enquiry.budget_estimate).toLocaleString()}` : '—'}</span>
              </div>
              <div className="info-row"><span className="info-label">Created By</span><span>{enquiry.created_by_name || '—'}</span></div>
              <div className="info-row"><span className="info-label">Date</span><span>{formatDate(enquiry.created_at)}</span></div>
              {enquiry.description && (
                <div className="description-block">
                  <div className="info-label">Notes</div>
                  <p>{enquiry.description}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="card-title">Edit Enquiry</div>
              <form onSubmit={handleSaveEdit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select className="select" value={editForm.status} onChange={e => setEF('status', e.target.value)}>
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Product Interest</label>
                    <select className="select" value={editForm.product_interest} onChange={e => setEF('product_interest', e.target.value)}>
                      {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Channel</label>
                    <select className="select" value={editForm.channel} onChange={e => setEF('channel', e.target.value)}>
                      {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select className="select" value={editForm.priority} onChange={e => setEF('priority', e.target.value)}>
                      {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assign To</label>
                    <select className="select" value={editForm.assigned_to || ''} onChange={e => setEF('assigned_to', e.target.value)}>
                      <option value="">Unassigned</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Budget Estimate (£)</label>
                  <input className="input" type="number" min="0" value={editForm.budget_estimate || ''} onChange={e => setEF('budget_estimate', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label>Description / Notes</label>
                  <textarea className="textarea" rows={4} value={editForm.description || ''} onChange={e => setEF('description', e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* ── Visits ── */}
          <div className="card">
            <div className="card-header">
              <h2 style={{ fontSize: 15, fontWeight: 600 }}>Visits ({visits.length})</h2>
              <Link to={`/visits/schedule?enquiry_id=${id}`} className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>+ Schedule</Link>
            </div>
            {visits.length === 0 ? (
              <div className="empty" style={{ padding: '16px 0' }}>No visits scheduled yet.</div>
            ) : (
              visits.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f2f5' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7a8a9a' }}>{v.visit_code}</span>
                      <VisitStatusBadge status={v.status} />
                      <span style={{ fontSize: 12, color: '#7a8a9a' }}>{v.visit_type}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {new Date(v.scheduled_date).toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short' })}
                      {v.scheduled_time && ` at ${v.scheduled_time.slice(0,5)}`}
                    </div>
                    <div style={{ fontSize: 12, color: '#7a8a9a' }}>{v.engineer_name || 'Engineer TBC'}</div>
                  </div>
                  <Link to={`/visits/${v.id}`} className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>View</Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right Column: Logs ── */}
        <div className="detail-right">
          <div className="card">
            <div className="card-title">Add Follow-up Log</div>
            <form onSubmit={handleAddLog}>
              <div className="form-row">
                <div className="form-group">
                  <label>Channel</label>
                  <select className="select" value={logForm.channel} onChange={e => setLF('channel', e.target.value)}>
                    {LOG_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Update Status</label>
                  <select className="select" value={logForm.status_changed_to} onChange={e => setLF('status_changed_to', e.target.value)}>
                    <option value="">No change</option>
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Logged By</label>
                <select className="select" value={logForm.logged_by} onChange={e => setLF('logged_by', e.target.value)}>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Notes</label>
                <textarea
                  className="textarea"
                  rows={3}
                  value={logForm.notes}
                  onChange={e => setLF('notes', e.target.value)}
                  placeholder="What happened? Any next steps?"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={addingLog || (!logForm.notes && !logForm.status_changed_to)}>
                {addingLog ? 'Adding...' : 'Add Log'}
              </button>
            </form>
          </div>

          <div className="card">
            <div className="card-title">History ({logs.length})</div>
            <div className="log-timeline">
              {logs.map(log => (
                <div key={log.id} className={`log-entry log-${getLogClass(log.channel)}`}>
                  <div className="log-header">
                    <span className="log-icon">{getLogIcon(log.channel)}</span>
                    <span className="log-channel">{log.channel}</span>
                    {log.status_changed_to && (
                      <span className="log-status-change">→ <StatusBadge status={log.status_changed_to} /></span>
                    )}
                    <span className="log-date">{formatDateTime(log.log_date)}</span>
                  </div>
                  <div className="log-notes">{log.notes}</div>
                  {log.logged_by_name && <div className="log-by">by {log.logged_by_name}</div>}
                </div>
              ))}
              {logs.length === 0 && <div className="empty">No logs yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
