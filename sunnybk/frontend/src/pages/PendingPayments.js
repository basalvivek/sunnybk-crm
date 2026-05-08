import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPendingPayments, recordPayment, getEmployees } from '../api';
import { OrderStatusBadge, formatDate, formatCurrency } from '../components/helpers';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date(new Date().toDateString())) / 86400000);
}

function DueBadge({ dateStr, paid }) {
  if (paid) return <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>✓ Fully Paid</span>;
  if (!dateStr) return <span style={{ fontSize: 11, color: '#9aa0b0' }}>No due date set</span>;
  const d = daysUntil(dateStr);
  if (d < 0)  return <span style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', background: '#fee2e2', padding: '2px 7px', borderRadius: 8 }}>⚠ {Math.abs(d)}d overdue</span>;
  if (d === 0) return <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: '#fef3c7', padding: '2px 7px', borderRadius: 8 }}>Due today</span>;
  if (d <= 7)  return <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: '#fef3c7', padding: '2px 7px', borderRadius: 8 }}>Due in {d}d</span>;
  return <span style={{ fontSize: 11, color: '#6a7a8a' }}>Due {formatDate(dateStr)}</span>;
}

function ProgressBar({ paid, total, color = '#10b981' }) {
  if (!total || total <= 0) return null;
  const pct = Math.min(100, Math.round((paid / total) * 100));
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#7a8a9a', marginBottom: 2 }}>
        <span>{formatCurrency(paid)} paid</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 5, background: '#e8eaf0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#ef4444', borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

export default function PendingPayments() {
  const [orders, setOrders]       = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null);
  const [payForm, setPayForm]     = useState({ payment_type: 'balance', amount: '', payment_date: new Date().toISOString().slice(0, 10), notes: '', logged_by: '' });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [tab, setTab]             = useState('all');

  const load = async () => {
    setLoading(true);
    const [pmtRes, empRes] = await Promise.all([getPendingPayments(), getEmployees()]);
    setOrders(pmtRes.data.data);
    const emp = empRes.data.data;
    setEmployees(emp);
    if (emp.length > 0) setPayForm(f => ({ ...f, logged_by: emp[0].id }));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openModal = (order, type) => {
    const balanceDue   = order.total_amount && order.deposit_amount ? Number(order.total_amount) - Number(order.deposit_amount) : 0;
    const alreadyPaid  = type === 'deposit' ? Number(order.deposit_paid_total || 0) : Number(order.balance_paid_total || 0);
    const remaining    = type === 'deposit' ? Number(order.deposit_amount || 0) - alreadyPaid : balanceDue - alreadyPaid;
    const safeRemaining = Math.max(0, remaining);
    setModal({ order, type, remaining: safeRemaining, alreadyPaid, total: type === 'deposit' ? Number(order.deposit_amount || 0) : balanceDue });
    setError('');
    setPayForm(f => ({ ...f, payment_type: type, amount: safeRemaining > 0 ? safeRemaining.toFixed(2) : '', payment_date: new Date().toISOString().slice(0, 10), notes: '' }));
  };

  const handleRecord = async (e) => {
    e.preventDefault();
    if (!payForm.amount || Number(payForm.amount) <= 0) { setError('Please enter a valid amount'); return; }
    setSaving(true); setError('');
    try {
      await recordPayment(modal.order.id, payForm);
      setModal(null);
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to record payment'); }
    finally { setSaving(false); }
  };

  const overdue  = orders.filter(o => o.deposit_overdue || o.balance_overdue);
  const upcoming = orders.filter(o => !o.deposit_overdue && !o.balance_overdue && (o.deposit_due_date || o.balance_due_date));

  const totalPending = orders.reduce((sum, o) => {
    const depositRem = !o.deposit_paid ? Math.max(0, Number(o.deposit_amount || 0) - Number(o.deposit_paid_total || 0)) : 0;
    const balanceDue = Number(o.total_amount || 0) - Number(o.deposit_amount || 0);
    const balanceRem = !o.balance_paid ? Math.max(0, balanceDue - Number(o.balance_paid_total || 0)) : 0;
    return sum + depositRem + balanceRem;
  }, 0);

  const overdueAmt = overdue.reduce((sum, o) => {
    const depositRem = o.deposit_overdue ? Math.max(0, Number(o.deposit_amount || 0) - Number(o.deposit_paid_total || 0)) : 0;
    const balanceDue = Number(o.total_amount || 0) - Number(o.deposit_amount || 0);
    const balanceRem = o.balance_overdue ? Math.max(0, balanceDue - Number(o.balance_paid_total || 0)) : 0;
    return sum + depositRem + balanceRem;
  }, 0);

  const displayed = tab === 'overdue' ? overdue : tab === 'upcoming' ? upcoming : orders;

  return (
    <div className="page">
      <div className="page-header"><h1>Pending Payments</h1></div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card" style={{ borderTopColor: '#1a5c8a' }}>
          <div className="stat-value" style={{ color: '#1a5c8a' }}>{orders.length}</div>
          <div className="stat-label">Orders Pending</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#f59e0b' }}>
          <div className="stat-value" style={{ color: '#f59e0b', fontSize: 18 }}>{formatCurrency(totalPending)}</div>
          <div className="stat-label">Total Outstanding</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#ef4444' }}>
          <div className="stat-value" style={{ color: '#ef4444' }}>{overdue.length}</div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#ef4444' }}>
          <div className="stat-value" style={{ color: '#ef4444', fontSize: 18 }}>{formatCurrency(overdueAmt)}</div>
          <div className="stat-label">Overdue Amount</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e8eaf0', marginBottom: 20 }}>
        {[{ key:'all', label:`All Pending (${orders.length})` }, { key:'overdue', label:`⚠ Overdue (${overdue.length})` }, { key:'upcoming', label:`Upcoming (${upcoming.length})` }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: tab === t.key ? '#1a5c8a' : '#7a8a9a', borderBottom: tab === t.key ? '2px solid #1a5c8a' : '2px solid transparent', marginBottom: -2 }}>{t.label}</button>
        ))}
      </div>

      {loading ? <div className="loading">Loading...</div> : displayed.length === 0 ? (
        <div className="card"><div className="empty">No payments in this category 🎉</div></div>
      ) : displayed.map(o => {
        const balanceDue      = Number(o.total_amount || 0) - Number(o.deposit_amount || 0);
        const depositPaidAmt  = Number(o.deposit_paid_total  || 0);
        const balancePaidAmt  = Number(o.balance_paid_total  || 0);
        const depositRemaining = !o.deposit_paid ? Math.max(0, Number(o.deposit_amount || 0) - depositPaidAmt) : 0;
        const balanceRemaining = !o.balance_paid ? Math.max(0, balanceDue - balancePaidAmt) : 0;
        const isOverdue = o.deposit_overdue || o.balance_overdue;
        return (
          <div key={o.id} className="card" style={{ borderLeft: `4px solid ${isOverdue ? '#ef4444' : '#1a5c8a'}`, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>

              {/* Order info */}
              <div style={{ minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Link to={`/orders/${o.id}`} className="link" style={{ fontWeight: 700, fontSize: 14 }}>{o.order_code}</Link>
                  <OrderStatusBadge status={o.status} />
                  {isOverdue && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, background: '#fee2e2', padding: '1px 6px', borderRadius: 6 }}>OVERDUE</span>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{o.customer_name}</div>
                <div className="text-muted">{o.customer_phone}</div>
                <div className="text-muted" style={{ marginTop: 2 }}>{o.product_interest}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#5a6a7a' }}>
                  Total: <strong>{formatCurrency(o.total_amount)}</strong>
                </div>
              </div>

              {/* Deposit block */}
              {o.deposit_amount && (
                <div style={{ flex: 1, minWidth: 180, background: '#f8f9fb', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Deposit</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(o.deposit_amount)}</div>
                  <ProgressBar paid={depositPaidAmt} total={Number(o.deposit_amount)} />
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <DueBadge dateStr={o.deposit_due_date} paid={o.deposit_paid} />
                    {!o.deposit_paid && (
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px', borderColor: o.deposit_overdue ? '#fca5a5' : undefined, color: o.deposit_overdue ? '#dc2626' : undefined }}
                        onClick={() => openModal(o, 'deposit')}>
                        💰 Pay {depositPaidAmt > 0 ? `(£${(Number(o.deposit_amount) - depositPaidAmt).toLocaleString()} left)` : ''}
                      </button>
                    )}
                  </div>
                  {depositPaidAmt > 0 && !o.deposit_paid && (
                    <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                      {Number(o.balance_installments || 0) > 0 ? `${o.balance_installments} instalment(s) recorded` : ''} · {formatCurrency(depositPaidAmt)} paid
                    </div>
                  )}
                </div>
              )}

              {/* Balance block */}
              {balanceDue > 0 && (
                <div style={{ flex: 1, minWidth: 180, background: '#f8f9fb', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#7a8a9a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Balance</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{formatCurrency(balanceDue)}</div>
                  <ProgressBar paid={balancePaidAmt} total={balanceDue} />
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <DueBadge dateStr={o.balance_due_date} paid={o.balance_paid} />
                    {!o.balance_paid && (
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 10px', borderColor: o.balance_overdue ? '#fca5a5' : undefined, color: o.balance_overdue ? '#dc2626' : undefined }}
                        onClick={() => openModal(o, 'balance')}>
                        💰 Pay {balancePaidAmt > 0 ? `(£${balanceRemaining.toLocaleString()} left)` : ''}
                      </button>
                    )}
                  </div>
                  {balancePaidAmt > 0 && !o.balance_paid && (
                    <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                      {Number(o.balance_installments || 0)} instalment(s) · {formatCurrency(balancePaidAmt)} paid · <strong>{formatCurrency(balanceRemaining)} remaining</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Record Payment Modal ── */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Record {modal.type === 'deposit' ? 'Deposit' : 'Balance'} Payment</h3>
                <div style={{ fontSize: 12, color: '#7a8a9a', marginTop: 2 }}>{modal.order.order_code} · {modal.order.customer_name}</div>
              </div>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7a8a9a' }}>×</button>
            </div>

            {/* Payment summary */}
            <div style={{ background: '#f8f9fb', borderRadius: 8, padding: '12px 14px', marginBottom: 18, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#9aa0b0', marginBottom: 2 }}>TOTAL DUE</div>
                <div style={{ fontWeight: 700, color: '#1a2332' }}>{formatCurrency(modal.total)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#9aa0b0', marginBottom: 2 }}>ALREADY PAID</div>
                <div style={{ fontWeight: 700, color: '#10b981' }}>{formatCurrency(modal.alreadyPaid)}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#9aa0b0', marginBottom: 2 }}>REMAINING</div>
                <div style={{ fontWeight: 700, color: '#ef4444' }}>{formatCurrency(modal.remaining)}</div>
              </div>
            </div>

            <ProgressBar paid={modal.alreadyPaid} total={modal.total} />

            <form onSubmit={handleRecord} style={{ marginTop: 16 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount Paying Now (£) *</label>
                  <input className="input" type="number" min="0.01" step="0.01" required value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
                  {Number(payForm.amount) < modal.remaining && modal.remaining > 0 && (
                    <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 3 }}>
                      Part payment — £{Math.max(0, modal.remaining - Number(payForm.amount || 0)).toLocaleString()} will remain after this
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Payment Date *</label>
                  <input className="input" type="date" required value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label>Notes</label>
                <input className="input" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Bank transfer, cheque no. 12345" />
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Recorded By</label>
                <select className="select" value={payForm.logged_by} onChange={e => setPayForm(f => ({ ...f, logged_by: e.target.value }))}>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              {error && <div className="error-msg">{error}</div>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: '#10b981' }}>
                  {saving ? 'Saving...' : '✓ Confirm Payment'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
