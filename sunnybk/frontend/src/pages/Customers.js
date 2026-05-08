import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getCustomers, createCustomer } from '../api';
import { formatDate, SOURCES } from '../components/helpers';

const EMPTY_FORM = {
  first_name: '', last_name: '', phone: '', email: '',
  whatsapp: '', address_line1: '', address_line2: '',
  city: '', postcode: '', source: 'Phone', notes: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const load = useCallback(() => {
    setLoading(true);
    getCustomers(search)
      .then(r => setCustomers(r.data.data))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openModal = () => { setForm(EMPTY_FORM); setError(''); setShowModal(true); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.phone) { setError('First name, last name and phone are required'); return; }
    setSaving(true); setError('');
    try {
      await createCustomer(form);
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Customers</h1>
        <div className="header-actions">
          <span className="text-muted">{customers.length} record{customers.length !== 1 ? 's' : ''}</span>
          <button className="btn btn-primary" onClick={openModal}>+ Add Customer</button>
        </div>
      </div>

      <div className="card">
        <div className="filters">
          <input
            className="input"
            style={{ maxWidth: 380 }}
            placeholder="Search by name, phone, email, postcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading">Loading customers...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th><th>Name</th><th>Phone</th><th>Email</th>
                <th>Postcode</th><th>City</th><th>Source</th><th>Since</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} style={{ cursor: 'pointer' }}
                  onClick={() => window.location.href = `/customers/${c.id}`}>
                  <td className="text-muted">{c.customer_code}</td>
                  <td>
                    <Link to={`/customers/${c.id}`} className="link customer-name"
                      onClick={e => e.stopPropagation()}>
                      {c.first_name} {c.last_name}
                    </Link>
                  </td>
                  <td>{c.phone}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.postcode || '—'}</td>
                  <td>{c.city || '—'}</td>
                  <td>{c.source}</td>
                  <td>{formatDate(c.created_at)}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan="8" className="empty">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add Customer Modal ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Add New Customer</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7a8a9a' }}>×</button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input className="input" required value={form.first_name} onChange={e => set('first_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input className="input" required value={form.last_name} onChange={e => set('last_name', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone *</label>
                  <input className="input" required value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>WhatsApp</label>
                  <input className="input" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Source</label>
                  <select className="select" value={form.source} onChange={e => set('source', e.target.value)}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Address Line 1</label>
                  <input className="input" value={form.address_line1} onChange={e => set('address_line1', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input className="input" value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Postcode</label>
                  <input className="input" value={form.postcode} onChange={e => set('postcode', e.target.value)} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Notes</label>
                <textarea className="textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Customer'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
