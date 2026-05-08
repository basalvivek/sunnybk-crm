import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getEnquiries, getEnquiryById, getEmployees, createVisit } from '../api';
import { VISIT_TYPES, VISIT_DURATIONS } from '../components/helpers';

export default function ScheduleVisit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetEnquiryId = searchParams.get('enquiry_id');

  const [employees, setEmployees] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [enquirySearch, setEnquirySearch] = useState('');
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [loadingEnquiry, setLoadingEnquiry] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    engineer_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    visit_type: 'Survey',
    notes: '',
    created_by: '',
  });

  useEffect(() => {
    getEmployees().then(r => {
      const emp = r.data.data;
      setEmployees(emp);
      if (emp.length > 0) setForm(f => ({ ...f, created_by: emp[0].id }));
    });
  }, []);

  // Pre-load enquiry if passed via query param
  useEffect(() => {
    if (!presetEnquiryId) return;
    setLoadingEnquiry(true);
    getEnquiryById(presetEnquiryId)
      .then(r => setSelectedEnquiry(r.data.data.enquiry))
      .finally(() => setLoadingEnquiry(false));
  }, [presetEnquiryId]);

  // Enquiry search
  useEffect(() => {
    if (enquirySearch.length < 2) { setEnquiries([]); return; }
    getEnquiries({ search: enquirySearch }).then(r => setEnquiries(r.data.data.slice(0, 8)));
  }, [enquirySearch]);

  const setF = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry) { setError('Please select an enquiry.'); return; }
    if (!form.scheduled_date) { setError('Please select a date.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await createVisit({ ...form, enquiry_id: selectedEnquiry.id });
      navigate(`/visits/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule visit.');
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Schedule Visit</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Enquiry Selection ── */}
        <div className="card">
          <div className="card-title">Linked Enquiry</div>

          {loadingEnquiry && <div className="loading">Loading enquiry...</div>}

          {!selectedEnquiry && !loadingEnquiry && (
            <div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label>Search Enquiry (by code, customer name, phone...)</label>
                <input
                  className="input"
                  placeholder="Type to search..."
                  value={enquirySearch}
                  onChange={e => setEnquirySearch(e.target.value)}
                />
              </div>
              {enquiries.length > 0 && (
                <div className="customer-results">
                  {enquiries.map(enq => (
                    <div
                      key={enq.id}
                      className="customer-result-item"
                      onClick={() => { setSelectedEnquiry(enq); setEnquirySearch(''); setEnquiries([]); }}
                    >
                      <span>
                        <strong>{enq.enquiry_code}</strong> — {enq.customer_name} · {enq.product_interest}
                      </span>
                      <span className="customer-code">{enq.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedEnquiry && (
            <div className="selected-customer">
              <div>
                <strong>{selectedEnquiry.enquiry_code}</strong> — {selectedEnquiry.customer_name}
                <div className="text-muted">
                  {selectedEnquiry.product_interest} · {selectedEnquiry.customer_phone}
                  {selectedEnquiry.postcode ? ` · ${selectedEnquiry.postcode}` : ''}
                </div>
                <div className="text-muted" style={{ marginTop: 2 }}>
                  Status: {selectedEnquiry.status}
                </div>
              </div>
              {!presetEnquiryId && (
                <button type="button" className="btn btn-danger-sm" onClick={() => setSelectedEnquiry(null)}>Change</button>
              )}
            </div>
          )}
        </div>

        {/* ── Visit Details ── */}
        <div className="card">
          <div className="card-title">Visit Details</div>
          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input className="input" type="date" required value={form.scheduled_date} onChange={e => setF('scheduled_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input className="input" type="time" value={form.scheduled_time} onChange={e => setF('scheduled_time', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Duration</label>
              <select className="select" value={form.duration_minutes} onChange={e => setF('duration_minutes', Number(e.target.value))}>
                {VISIT_DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Visit Type</label>
              <select className="select" value={form.visit_type} onChange={e => setF('visit_type', e.target.value)}>
                {VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Assign Engineer</label>
              <select className="select" value={form.engineer_id} onChange={e => setF('engineer_id', e.target.value)}>
                <option value="">TBC / Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Created By</label>
              <select className="select" value={form.created_by} onChange={e => setF('created_by', e.target.value)}>
                {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea className="textarea" rows={3} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Access instructions, what to bring, special requirements..." />
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting || !selectedEnquiry}>
            {submitting ? 'Scheduling...' : 'Schedule Visit'}
          </button>
          <Link to="/visits" className="btn btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
