import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCustomerById, updateCustomer } from '../api';
import {
  StatusBadge, VisitStatusBadge, OrderStatusBadge,
  formatDate, formatCurrency, SOURCES, CHANNELS,
} from '../components/helpers';

const FIELDS = [
  { key: 'first_name',    label: 'First Name',   required: true },
  { key: 'last_name',     label: 'Last Name',    required: true },
  { key: 'phone',         label: 'Phone',        required: true },
  { key: 'email',         label: 'Email',        type: 'email' },
  { key: 'whatsapp',      label: 'WhatsApp' },
  { key: 'address_line1', label: 'Address Line 1' },
  { key: 'address_line2', label: 'Address Line 2' },
  { key: 'city',          label: 'City' },
  { key: 'postcode',      label: 'Postcode' },
];

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('enquiries');
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({});
  const [saving, setSaving]   = useState(false);
  const [saveErr, setSaveErr] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getCustomerById(id)
      .then(r => { setData(r.data.data); setForm(r.data.data.customer); })
      .catch(() => navigate('/customers'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveErr('');
    try {
      await updateCustomer(id, form);
      setEditing(false);
      load();
    } catch (err) {
      setSaveErr(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading customer...</div>;
  if (!data)   return null;

  const { customer: c, enquiries, visits, orders, stats } = data;

  const TABS = [
    { key: 'enquiries', label: `Enquiries (${enquiries.length})` },
    { key: 'visits',    label: `Visits (${visits.length})` },
    { key: 'orders',    label: `Orders (${orders.length})` },
  ];

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/customers">Customers</Link> / {c.first_name} {c.last_name}
      </div>

      {/* Header */}
      <div className="page-header" style={{ marginTop: 8 }}>
        <div>
          <h1>{c.first_name} {c.last_name}</h1>
          <div style={{ fontSize: 12, color: '#7a8a9a', marginTop: 2 }}>{c.customer_code} · Customer since {formatDate(c.created_at)}</div>
        </div>
        <div className="header-actions">
          <Link to={`/enquiries/new?customer_id=${c.id}`} className="btn btn-primary">+ New Enquiry</Link>
          <button className="btn btn-secondary" onClick={() => { setEditing(true); setForm(c); setSaveErr(''); }}>Edit Details</button>
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Enquiries',   value: stats.enquiry_count,                color: '#1a5c8a' },
          { label: 'Visits',      value: stats.visit_count,                  color: '#8b5cf6' },
          { label: 'Orders',      value: stats.order_count,                  color: '#f59e0b' },
          { label: 'Total Value', value: formatCurrency(stats.total_spend),  color: '#10b981', small: true },
          { label: 'Total Paid',  value: formatCurrency(stats.total_paid),   color: '#06b6d4', small: true },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ borderTopColor: s.color }}>
            <div className="stat-value" style={{ color: s.color, fontSize: s.small ? 18 : 28 }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left — Customer info */}
        <div className="card">
          <div className="card-title">Contact Details</div>
          {[
            { label: 'Phone',    value: c.phone },
            { label: 'WhatsApp', value: c.whatsapp },
            { label: 'Email',    value: c.email },
            { label: 'Source',   value: c.source },
          ].map(r => r.value ? (
            <div key={r.label} className="info-row">
              <span className="info-label">{r.label}</span>
              <span>{r.value}</span>
            </div>
          ) : null)}

          {(c.address_line1 || c.city || c.postcode) && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9aa0b0', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 14, marginBottom: 6 }}>Address</div>
              <div style={{ fontSize: 13, color: '#3a4a5a', lineHeight: 1.7 }}>
                {c.address_line1 && <div>{c.address_line1}</div>}
                {c.address_line2 && <div>{c.address_line2}</div>}
                {c.city && <div>{c.city}</div>}
                {c.postcode && <div style={{ fontWeight: 700 }}>{c.postcode}</div>}
              </div>
            </>
          )}

          {c.notes && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9aa0b0', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 14, marginBottom: 6 }}>Notes</div>
              <div style={{ fontSize: 13, color: '#3a4a5a', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.notes}</div>
            </>
          )}
        </div>

        {/* Right — Tabbed history */}
        <div>
          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e8eaf0', marginBottom: 0 }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                color: tab === t.key ? '#1a5c8a' : '#7a8a9a',
                borderBottom: tab === t.key ? '2px solid #1a5c8a' : '2px solid transparent',
                marginBottom: -2,
              }}>{t.label}</button>
            ))}
          </div>

          <div className="card" style={{ borderTopLeftRadius: 0, marginTop: 0 }}>

            {/* ── Enquiries tab ── */}
            {tab === 'enquiries' && (
              enquiries.length === 0 ? (
                <div className="empty">No enquiries yet. <Link to={`/enquiries/new?customer_id=${c.id}`}>Create one</Link></div>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Code</th><th>Product</th><th>Channel</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Logs</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {enquiries.map(e => (
                      <tr key={e.id}>
                        <td><Link to={`/enquiries/${e.id}`} className="link">{e.enquiry_code}</Link></td>
                        <td>{e.product_interest}</td>
                        <td style={{ fontSize: 12, color: '#5a6a7a' }}>{e.channel}</td>
                        <td><StatusBadge status={e.status} /></td>
                        <td style={{ fontSize: 12, color: '#5a6a7a' }}>{e.priority}</td>
                        <td style={{ fontSize: 12 }}>{e.assigned_to_name || '—'}</td>
                        <td><span className="log-count">{e.log_count}</span></td>
                        <td className="text-muted">{formatDate(e.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* ── Visits tab ── */}
            {tab === 'visits' && (
              visits.length === 0 ? (
                <div className="empty">No visits scheduled for this customer.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Code</th><th>Type</th><th>Date</th><th>Time</th><th>Engineer</th><th>Status</th><th>Enquiry</th></tr>
                  </thead>
                  <tbody>
                    {visits.map(v => (
                      <tr key={v.id}>
                        <td><Link to={`/visits/${v.id}`} className="link">{v.visit_code}</Link></td>
                        <td style={{ fontSize: 12 }}>{v.visit_type}</td>
                        <td>{formatDate(v.scheduled_date)}</td>
                        <td className="text-muted">{v.scheduled_time ? v.scheduled_time.slice(0, 5) : '—'}</td>
                        <td style={{ fontSize: 12 }}>{v.engineer_name || '—'}</td>
                        <td><VisitStatusBadge status={v.status} /></td>
                        <td className="text-muted" style={{ fontSize: 12 }}>{v.enquiry_code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {/* ── Orders tab ── */}
            {tab === 'orders' && (
              orders.length === 0 ? (
                <div className="empty">No orders for this customer.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>Code</th><th>Product</th><th>Status</th><th>Total</th><th>Paid</th><th>Install Date</th><th>Assignee</th></tr>
                  </thead>
                  <tbody>
                    {orders.map(o => {
                      const paid = Number(o.deposit_paid_total || 0) + Number(o.balance_paid_total || 0);
                      const pct  = o.total_amount > 0 ? Math.round((paid / o.total_amount) * 100) : 0;
                      return (
                        <tr key={o.id}>
                          <td><Link to={`/orders/${o.id}`} className="link">{o.order_code}</Link></td>
                          <td style={{ fontSize: 12 }}>{o.product_interest}</td>
                          <td><OrderStatusBadge status={o.status} /></td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(o.total_amount)}</td>
                          <td>
                            <div style={{ fontSize: 12, color: pct === 100 ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{formatCurrency(paid)}</div>
                            {o.total_amount > 0 && (
                              <div style={{ height: 4, background: '#e8eaf0', borderRadius: 3, marginTop: 3, width: 60, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#10b981' : '#f59e0b', borderRadius: 3 }} />
                              </div>
                            )}
                          </td>
                          <td className="text-muted">{o.expected_install_date ? formatDate(o.expected_install_date) : '—'}</td>
                          <td style={{ fontSize: 12 }}>{o.assigned_to_name || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            )}

          </div>
        </div>
      </div>

      {/* ── Edit Modal ── */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Edit Customer Details</h3>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7a8a9a' }}>×</button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-row">
                {['first_name', 'last_name'].map(k => (
                  <div key={k} className="form-group">
                    <label>{FIELDS.find(f => f.key === k)?.label} *</label>
                    <input className="input" required value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="form-row">
                {['phone', 'email'].map(k => (
                  <div key={k} className="form-group">
                    <label>{FIELDS.find(f => f.key === k)?.label}{k === 'phone' ? ' *' : ''}</label>
                    <input className="input" type={k === 'email' ? 'email' : 'text'} required={k === 'phone'} value={form[k] || ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>WhatsApp</label>
                  <input className="input" value={form.whatsapp || ''} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Source</label>
                  <select className="select" value={form.source || 'Phone'} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Address Line 1</label>
                  <input className="input" value={form.address_line1 || ''} onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Address Line 2</label>
                  <input className="input" value={form.address_line2 || ''} onChange={e => setForm(f => ({ ...f, address_line2: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input className="input" value={form.city || ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Postcode</label>
                  <input className="input" value={form.postcode || ''} onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Notes</label>
                <textarea className="textarea" rows={3} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              {saveErr && <div className="error-msg">{saveErr}</div>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
