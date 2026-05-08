import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrderById, updateOrder, addOrderLog, getEmployees } from '../api';
import { OrderStatusBadge, ORDER_STATUSES, formatDate, formatDateTime, formatCurrency } from '../components/helpers';

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [logs, setLogs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view'); // view | edit
  const [editForm, setEditForm] = useState({});
  const [logForm, setLogForm] = useState({ notes: '', status_changed_to: '', logged_by: '' });
  const [saving, setSaving] = useState(false);
  const [addingLog, setAddingLog] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const res = await getOrderById(id);
    setOrder(res.data.data.order);
    setLogs(res.data.data.logs);
    setPayments(res.data.data.payments || []);
    setEditForm(res.data.data.order);
  };

  useEffect(() => {
    Promise.all([load(), getEmployees().then(r => {
      const emp = r.data.data;
      setEmployees(emp);
      if (emp.length > 0) setLogForm(f => ({ ...f, logged_by: emp[0].id }));
    })]).finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await updateOrder(id, editForm);
      await load();
      setMode('view');
    } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    setAddingLog(true);
    try {
      await addOrderLog(id, logForm);
      setLogForm(f => ({ ...f, notes: '', status_changed_to: '' }));
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setAddingLog(false); }
  };

  const setEF = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  if (loading) return <div className="loading">Loading order...</div>;

  const totalAmt          = Number(order.total_amount)   || 0;
  const depositAmt        = Number(order.deposit_amount) || 0;
  const balance           = totalAmt > 0 && depositAmt > 0 ? totalAmt - depositAmt : null;
  const depositPaidTotal  = Number(order.deposit_paid_total  || 0);
  const balancePaidTotal  = Number(order.balance_paid_total  || 0);
  const balanceRemaining  = balance !== null ? Math.max(0, balance - balancePaidTotal) : null;
  const depositInstals    = payments.filter(p => p.payment_type === 'deposit');
  const balanceInstals    = payments.filter(p => p.payment_type === 'balance');

  const isActive = !['Completed', 'Cancelled'].includes(order.status);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb"><Link to="/orders">Orders</Link> / {order.order_code}</div>
          <h1>{order.order_code} — {order.product_interest}</h1>
        </div>
        <div className="header-actions">
          <OrderStatusBadge status={order.status} />
          {isActive && (
            <button className="btn btn-secondary" onClick={() => { setMode(m => m === 'edit' ? 'view' : 'edit'); setError(''); }}>
              {mode === 'edit' ? 'Cancel' : 'Edit'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="detail-grid">
        <div className="detail-left">

          {/* Financial Summary */}
          <div className="card">
            <div className="card-title">Financials</div>
            <div className="finance-grid">
              <div className="finance-card">
                <div className="finance-label">Total Amount</div>
                <div className="finance-value">{formatCurrency(order.total_amount)}</div>
              </div>
              <div className={`finance-card ${order.deposit_paid ? 'paid' : 'unpaid'}`}>
                <div className="finance-label">Deposit</div>
                <div className="finance-value">{formatCurrency(order.deposit_amount)}</div>
                {depositPaidTotal > 0 && !order.deposit_paid && (
                  <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>{formatCurrency(depositPaidTotal)} paid · {formatCurrency(Number(order.deposit_amount) - depositPaidTotal)} left</div>
                )}
                <div className="finance-status" style={{ color: order.deposit_paid ? '#065f46' : '#92400e' }}>
                  {order.deposit_paid ? `✓ Paid${order.deposit_paid_date ? ' ' + formatDate(order.deposit_paid_date) : ''}` : `⏳ ${depositInstals.length} instalment${depositInstals.length !== 1 ? 's' : ''}`}
                </div>
              </div>
              <div className={`finance-card ${order.balance_paid ? 'paid' : balance ? 'unpaid' : ''}`}>
                <div className="finance-label">Balance Due</div>
                <div className="finance-value">{balance ? formatCurrency(balance) : '—'}</div>
                {balancePaidTotal > 0 && !order.balance_paid && (
                  <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 2 }}>{formatCurrency(balancePaidTotal)} paid · <strong>{formatCurrency(balanceRemaining)} remaining</strong></div>
                )}
                {balance && (
                  <div className="finance-status" style={{ color: order.balance_paid ? '#065f46' : '#92400e' }}>
                    {order.balance_paid ? `✓ Paid${order.balance_paid_date ? ' ' + formatDate(order.balance_paid_date) : ''}` : `⏳ ${balanceInstals.length} instalment${balanceInstals.length !== 1 ? 's' : ''}`}
                  </div>
                )}
              </div>
              <div className="finance-card">
                <div className="finance-label">Install Date</div>
                <div className="finance-value" style={{ fontSize: 15 }}>
                  {order.expected_install_date ? formatDate(order.expected_install_date) : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* View / Edit Details */}
          {mode === 'view' ? (
            <div className="card">
              <div className="card-title">Order Details</div>
              <div className="info-row"><span className="info-label">Status</span><OrderStatusBadge status={order.status} /></div>
              <div className="info-row"><span className="info-label">Enquiry</span><Link to={`/enquiries/${order.enquiry_id}`} className="link">{order.enquiry_code}</Link></div>
              <div className="info-row"><span className="info-label">Product</span><span>{order.product_interest}</span></div>
              <div className="info-row"><span className="info-label">Assigned To</span><span>{order.assigned_to_name || '—'}</span></div>
              <div className="info-row"><span className="info-label">Created By</span><span>{order.created_by_name || '—'}</span></div>
              <div className="info-row"><span className="info-label">Created</span><span>{formatDate(order.created_at)}</span></div>
              {order.notes && (
                <div className="description-block">
                  <div className="info-label">Notes</div>
                  <p>{order.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="card">
              <div className="card-title">Edit Order</div>
              <form onSubmit={handleSave}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select className="select" value={editForm.status} onChange={e => setEF('status', e.target.value)}>
                      {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assigned To</label>
                    <select className="select" value={editForm.assigned_to || ''} onChange={e => setEF('assigned_to', e.target.value)}>
                      <option value="">Unassigned</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Total Amount (£)</label>
                    <input className="input" type="number" min="0" step="100" value={editForm.total_amount || ''} onChange={e => setEF('total_amount', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Deposit Amount (£)</label>
                    <input className="input" type="number" min="0" step="100" value={editForm.deposit_amount || ''} onChange={e => setEF('deposit_amount', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Deposit Due Date</label>
                    <input className="input" type="date" value={editForm.deposit_due_date?.slice(0,10) || ''} onChange={e => setEF('deposit_due_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Balance Due Date</label>
                    <input className="input" type="date" value={editForm.balance_due_date?.slice(0,10) || ''} onChange={e => setEF('balance_due_date', e.target.value)} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!editForm.deposit_paid} onChange={e => setEF('deposit_paid', e.target.checked)} />
                      Deposit Paid
                    </label>
                    {editForm.deposit_paid && (
                      <input className="input" type="date" style={{ marginTop: 6 }} value={editForm.deposit_paid_date?.slice(0,10) || ''} onChange={e => setEF('deposit_paid_date', e.target.value)} />
                    )}
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!editForm.balance_paid} onChange={e => setEF('balance_paid', e.target.checked)} />
                      Balance Paid
                    </label>
                    {editForm.balance_paid && (
                      <input className="input" type="date" style={{ marginTop: 6 }} value={editForm.balance_paid_date?.slice(0,10) || ''} onChange={e => setEF('balance_paid_date', e.target.value)} />
                    )}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Expected Install Date</label>
                  <input className="input" type="date" value={editForm.expected_install_date?.slice(0,10) || ''} onChange={e => setEF('expected_install_date', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label>Notes</label>
                  <textarea className="textarea" rows={3} value={editForm.notes || ''} onChange={e => setEF('notes', e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="detail-right">
          {/* Customer */}
          <div className="card">
            <div className="card-title">Customer</div>
            <div className="info-row"><span className="info-label">Name</span><span style={{ fontWeight: 600 }}>{order.customer_name}</span></div>
            <div className="info-row"><span className="info-label">Phone</span><span>{order.customer_phone || '—'}</span></div>
            <div className="info-row"><span className="info-label">Email</span><span>{order.customer_email || '—'}</span></div>
            {order.address_line1 && <div className="info-row"><span className="info-label">Address</span><span>{order.address_line1}</span></div>}
            <div className="info-row"><span className="info-label">City</span><span>{order.city || '—'}</span></div>
            <div className="info-row"><span className="info-label">Postcode</span><span style={{ fontWeight: 700, fontSize: 15 }}>{order.postcode || '—'}</span></div>
          </div>

          {/* Payment Instalments */}
          {payments.length > 0 && (
            <div className="card">
              <div className="card-title">Payment History ({payments.length})</div>
              <table className="table" style={{ fontSize: 12 }}>
                <thead>
                  <tr><th>Date</th><th>Type</th><th>Amount</th><th>By</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td>{formatDate(p.payment_date)}</td>
                      <td><span style={{ background: p.payment_type === 'deposit' ? '#dbeafe' : '#d1fae5', color: p.payment_type === 'deposit' ? '#1d4ed8' : '#065f46', padding: '1px 7px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>{p.payment_type}</span></td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(p.amount)}</td>
                      <td>{p.recorded_by_name || '—'}</td>
                      <td className="text-muted">{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 10, padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, fontSize: 12, display: 'flex', gap: 20 }}>
                <span>Deposit paid: <strong style={{ color: '#10b981' }}>{formatCurrency(depositPaidTotal)}</strong></span>
                <span>Balance paid: <strong style={{ color: '#10b981' }}>{formatCurrency(balancePaidTotal)}</strong></span>
                {balanceRemaining > 0 && <span>Remaining: <strong style={{ color: '#ef4444' }}>{formatCurrency(balanceRemaining)}</strong></span>}
              </div>
            </div>
          )}

          {/* Add Log */}
          <div className="card">
            <div className="card-title">Add Note / Update</div>
            <form onSubmit={handleAddLog}>
              <div className="form-row">
                <div className="form-group">
                  <label>Update Status</label>
                  <select className="select" value={logForm.status_changed_to} onChange={e => setLogForm(f => ({ ...f, status_changed_to: e.target.value }))}>
                    <option value="">No change</option>
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Logged By</label>
                  <select className="select" value={logForm.logged_by} onChange={e => setLogForm(f => ({ ...f, logged_by: e.target.value }))}>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Notes</label>
                <textarea className="textarea" rows={3} value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} placeholder="Progress update, customer communication, payment received..." />
              </div>
              <button type="submit" className="btn btn-primary" disabled={addingLog || (!logForm.notes && !logForm.status_changed_to)}>
                {addingLog ? 'Adding...' : 'Add Note'}
              </button>
            </form>
          </div>

          {/* Log timeline */}
          <div className="card">
            <div className="card-title">History ({logs.length})</div>
            <div className="log-timeline">
              {logs.map(log => (
                <div key={log.id} className="log-entry log-internal">
                  <div className="log-header">
                    <span className="log-channel">{log.status_changed_to ? '🔄 Status Update' : '📝 Note'}</span>
                    {log.status_changed_to && (
                      <span className="log-status-change">→ <OrderStatusBadge status={log.status_changed_to} /></span>
                    )}
                    <span className="log-date">{formatDateTime(log.log_date)}</span>
                  </div>
                  <div className="log-notes">{log.notes}</div>
                  {log.logged_by_name && <div className="log-by">by {log.logged_by_name}</div>}
                </div>
              ))}
              {logs.length === 0 && <div className="empty">No notes yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
