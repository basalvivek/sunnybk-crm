import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCustomers, getCustomerById, createEnquiry, getEmployees } from '../api';
import { PRODUCTS, CHANNELS, PRIORITIES, SOURCES } from '../components/helpers';

export default function NewEnquiry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preloadCustomerId = searchParams.get('customer_id');
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [enquiryForm, setEnquiryForm] = useState({
    assigned_to: '',
    product_interest: 'Bedroom',
    channel: 'Phone',
    description: '',
    priority: 'Normal',
    budget_estimate: '',
    created_by: '',
  });

  const [newCust, setNewCust] = useState({
    first_name: '', last_name: '', email: '', phone: '', whatsapp: '',
    address_line1: '', address_line2: '', city: '', postcode: '', source: 'Phone',
  });

  useEffect(() => {
    getEmployees().then(r => {
      const emp = r.data.data;
      setEmployees(emp);
      if (emp.length > 0) setEnquiryForm(f => ({ ...f, created_by: emp[0].id }));
    });
  }, []);

  // Pre-select customer if navigated from Customer Detail page
  useEffect(() => {
    if (!preloadCustomerId) return;
    getCustomerById(preloadCustomerId)
      .then(r => {
        const c = r.data.data.customer;
        setSelectedCustomer(c);
        setIsNewCustomer(false);
      })
      .catch(() => {});
  }, [preloadCustomerId]);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      getCustomers(customerSearch).then(r => setCustomers(r.data.data));
    } else {
      setCustomers([]);
    }
  }, [customerSearch]);

  const setEF = (key, value) => setEnquiryForm(f => ({ ...f, [key]: value }));
  const setNC = (key, value) => setNewCust(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer && !isNewCustomer) {
      setError('Please select or add a customer.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        ...enquiryForm,
        customer_id: selectedCustomer?.id || null,
        new_customer: isNewCustomer ? newCust : null,
      };
      const res = await createEnquiry(payload);
      navigate(`/enquiries/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create enquiry. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>New Enquiry</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Customer ── */}
        <div className="card">
          <div className="card-title">Customer</div>

          {!selectedCustomer && !isNewCustomer && (
            <div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>Search Existing Customer</label>
                <input
                  className="input"
                  placeholder="Type name, phone, email or postcode..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                />
              </div>
              {customers.length > 0 && (
                <div className="customer-results">
                  {customers.map(c => (
                    <div
                      key={c.id}
                      className="customer-result-item"
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomers([]); }}
                    >
                      <span><strong>{c.first_name} {c.last_name}</strong> — {c.phone}{c.postcode ? ` — ${c.postcode}` : ''}</span>
                      <span className="customer-code">{c.customer_code}</span>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 12 }}
                onClick={() => setIsNewCustomer(true)}
              >
                + Add New Customer
              </button>
            </div>
          )}

          {selectedCustomer && (
            <div className="selected-customer">
              <div>
                <strong>{selectedCustomer.first_name} {selectedCustomer.last_name}</strong> ({selectedCustomer.customer_code})
                <div className="text-muted">{selectedCustomer.phone}{selectedCustomer.email ? ` · ${selectedCustomer.email}` : ''}{selectedCustomer.postcode ? ` · ${selectedCustomer.postcode}` : ''}</div>
              </div>
              <button type="button" className="btn btn-danger-sm" onClick={() => setSelectedCustomer(null)}>Change</button>
            </div>
          )}

          {isNewCustomer && (
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input className="input" required value={newCust.first_name} onChange={e => setNC('first_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input className="input" required value={newCust.last_name} onChange={e => setNC('last_name', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone *</label>
                  <input className="input" required value={newCust.phone} onChange={e => setNC('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>WhatsApp</label>
                  <input className="input" value={newCust.whatsapp} onChange={e => setNC('whatsapp', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input className="input" type="email" value={newCust.email} onChange={e => setNC('email', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Address Line 1</label>
                  <input className="input" value={newCust.address_line1} onChange={e => setNC('address_line1', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Address Line 2</label>
                  <input className="input" value={newCust.address_line2} onChange={e => setNC('address_line2', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input className="input" value={newCust.city} onChange={e => setNC('city', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Postcode</label>
                  <input className="input" value={newCust.postcode} onChange={e => setNC('postcode', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Source</label>
                  <select className="select" value={newCust.source} onChange={e => setNC('source', e.target.value)}>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button type="button" className="btn btn-danger-sm" onClick={() => setIsNewCustomer(false)}>Cancel</button>
            </div>
          )}
        </div>

        {/* ── Enquiry Details ── */}
        <div className="card">
          <div className="card-title">Enquiry Details</div>
          <div className="form-row">
            <div className="form-group">
              <label>Product Interest *</label>
              <select className="select" required value={enquiryForm.product_interest} onChange={e => setEF('product_interest', e.target.value)}>
                {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Channel *</label>
              <select className="select" required value={enquiryForm.channel} onChange={e => setEF('channel', e.target.value)}>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select className="select" value={enquiryForm.priority} onChange={e => setEF('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Assign To</label>
              <select className="select" value={enquiryForm.assigned_to} onChange={e => setEF('assigned_to', e.target.value)}>
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Budget Estimate (£)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="100"
                value={enquiryForm.budget_estimate}
                onChange={e => setEF('budget_estimate', e.target.value)}
                placeholder="e.g. 5000"
              />
            </div>
            <div className="form-group">
              <label>Created By</label>
              <select className="select" value={enquiryForm.created_by} onChange={e => setEF('created_by', e.target.value)}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Description / Notes</label>
            <textarea
              className="textarea"
              rows={4}
              value={enquiryForm.description}
              onChange={e => setEF('description', e.target.value)}
              placeholder="Customer requirements, room dimensions, colour preferences..."
            />
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || (!selectedCustomer && !isNewCustomer)}
          >
            {submitting ? 'Creating...' : 'Create Enquiry'}
          </button>
        </div>
      </form>
    </div>
  );
}
