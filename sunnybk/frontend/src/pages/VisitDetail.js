import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getVisitById, updateVisit, rescheduleVisit, completeVisit, cancelVisit, getEmployees } from '../api';
import { VisitStatusBadge, VISIT_TYPES, VISIT_DURATIONS, formatDate } from '../components/helpers';

export default function VisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('view'); // view | edit | reschedule | cancel
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [editForm, setEditForm] = useState({});
  const [reschedForm, setReschedForm] = useState({ scheduled_date: '', scheduled_time: '', engineer_id: '', duration_minutes: 60, reason: '', created_by: '' });
  const [cancelForm, setCancelForm] = useState({ cancellation_reason: '', created_by: '' });
  const [completeForm, setCompleteForm] = useState({ notes: '', created_by: '' });
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const load = async () => {
    const res = await getVisitById(id);
    const v = res.data.data;
    setVisit(v);
    setEditForm({
      engineer_id: v.engineer_id || '',
      scheduled_date: v.scheduled_date?.slice(0, 10) || '',
      scheduled_time: v.scheduled_time?.slice(0, 5) || '',
      duration_minutes: v.duration_minutes,
      visit_type: v.visit_type,
      notes: v.notes || '',
      status: v.status,
    });
    setReschedForm(f => ({ ...f, engineer_id: v.engineer_id || '', duration_minutes: v.duration_minutes }));
  };

  useEffect(() => {
    Promise.all([
      load(),
      getEmployees().then(r => {
        const emp = r.data.data;
        setEmployees(emp);
        if (emp.length > 0) {
          const defaultId = emp[0].id;
          setReschedForm(f => ({ ...f, created_by: defaultId }));
          setCancelForm(f => ({ ...f, created_by: defaultId }));
          setCompleteForm(f => ({ ...f, created_by: defaultId }));
        }
      }),
    ]).finally(() => setLoading(false));
  }, [id]); // eslint-disable-line

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await updateVisit(id, editForm);
      await load();
      setMode('view');
    } catch (err) { setError(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res = await rescheduleVisit(id, reschedForm);
      navigate(`/visits/${res.data.data.id}`);
    } catch (err) { setError(err.response?.data?.message || 'Reschedule failed'); }
    finally { setSaving(false); }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await completeVisit(id, completeForm);
      await load();
      setShowCompleteModal(false);
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await cancelVisit(id, cancelForm);
      await load();
      setMode('view');
    } catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const setEF = (k, v) => setEditForm(f => ({ ...f, [k]: v }));
  const setRF = (k, v) => setReschedForm(f => ({ ...f, [k]: v }));

  if (loading) return <div className="loading">Loading visit...</div>;

  const isActive = !['Completed', 'Cancelled', 'Rescheduled'].includes(visit.status);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="breadcrumb"><Link to="/visits">Visits</Link> / {visit.visit_code}</div>
          <h1>{visit.visit_code} — {visit.visit_type}</h1>
        </div>
        <div className="header-actions">
          <VisitStatusBadge status={visit.status} />
          {isActive && mode === 'view' && (
            <>
              <button className="btn btn-secondary" onClick={() => setMode('edit')}>Edit</button>
              <button className="btn btn-secondary" onClick={() => setMode('reschedule')}>Reschedule</button>
              <button className="btn btn-primary" onClick={() => setShowCompleteModal(true)}>Mark Complete</button>
              <button
                className="btn btn-danger-sm"
                style={{ padding: '8px 14px' }}
                onClick={() => setMode('cancel')}
              >Cancel Visit</button>
            </>
          )}
          {mode !== 'view' && (
            <button className="btn btn-secondary" onClick={() => { setMode('view'); setError(''); }}>Back</button>
          )}
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* ── Complete Modal ── */}
      {showCompleteModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:28, width:440, boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
            <h3 style={{ marginBottom:16 }}>Mark Visit as Complete</h3>
            <form onSubmit={handleComplete}>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label>Completion Notes</label>
                <textarea className="textarea" rows={3} value={completeForm.notes} onChange={e => setCompleteForm(f => ({ ...f, notes: e.target.value }))} placeholder="What was done? Any observations?" />
              </div>
              <div className="form-group" style={{ marginBottom:16 }}>
                <label>Completed By</label>
                <select className="select" value={completeForm.created_by} onChange={e => setCompleteForm(f => ({ ...f, created_by: e.target.value }))}>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Confirm Complete'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCompleteModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-left">

          {/* ── Visit Info ── */}
          {mode === 'view' && (
            <div className="card">
              <div className="card-title">Visit Details</div>
              <div className="info-row"><span className="info-label">Date & Time</span>
                <span style={{ fontWeight: 600 }}>
                  {new Date(visit.scheduled_date).toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })}
                  {visit.scheduled_time && ` at ${visit.scheduled_time.slice(0,5)}`}
                </span>
              </div>
              <div className="info-row"><span className="info-label">Duration</span><span>{visit.duration_minutes} minutes</span></div>
              <div className="info-row"><span className="info-label">Type</span><span>{visit.visit_type}</span></div>
              <div className="info-row"><span className="info-label">Engineer</span><span>{visit.engineer_name || <span className="text-muted">Unassigned</span>}</span></div>
              {visit.engineer_phone && <div className="info-row"><span className="info-label">Eng. Phone</span><span>{visit.engineer_phone}</span></div>}
              <div className="info-row"><span className="info-label">Enquiry</span>
                <Link to={`/enquiries/${visit.enquiry_id}`} className="link">{visit.enquiry_code}</Link>
              </div>
              <div className="info-row"><span className="info-label">Product</span><span>{visit.product_interest}</span></div>
              <div className="info-row"><span className="info-label">Created By</span><span>{visit.created_by_name || '—'}</span></div>
              <div className="info-row"><span className="info-label">Booked On</span><span>{formatDate(visit.created_at)}</span></div>
              {visit.rescheduled_from_code && (
                <div className="info-row"><span className="info-label">Rescheduled From</span><span className="text-muted">{visit.rescheduled_from_code}</span></div>
              )}
              {visit.notes && (
                <div className="description-block">
                  <div className="info-label">Notes</div>
                  <p>{visit.notes}</p>
                </div>
              )}
              {visit.cancellation_reason && (
                <div className="description-block">
                  <div className="info-label" style={{ color: '#dc2626' }}>Cancellation Reason</div>
                  <p>{visit.cancellation_reason}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Edit Form ── */}
          {mode === 'edit' && (
            <div className="card">
              <div className="card-title">Edit Visit</div>
              <form onSubmit={handleEdit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input className="input" type="date" required value={editForm.scheduled_date} onChange={e => setEF('scheduled_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Time</label>
                    <input className="input" type="time" value={editForm.scheduled_time} onChange={e => setEF('scheduled_time', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Duration</label>
                    <select className="select" value={editForm.duration_minutes} onChange={e => setEF('duration_minutes', Number(e.target.value))}>
                      {VISIT_DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Visit Type</label>
                    <select className="select" value={editForm.visit_type} onChange={e => setEF('visit_type', e.target.value)}>
                      {VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Engineer</label>
                    <select className="select" value={editForm.engineer_id} onChange={e => setEF('engineer_id', e.target.value)}>
                      <option value="">Unassigned</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>Notes</label>
                  <textarea className="textarea" rows={3} value={editForm.notes} onChange={e => setEF('notes', e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* ── Reschedule Form ── */}
          {mode === 'reschedule' && (
            <div className="card">
              <div className="card-title">Reschedule Visit</div>
              <p style={{ color: '#7a8a9a', fontSize: 13, marginBottom: 16 }}>
                This will mark the current visit as <strong>Rescheduled</strong> and create a new one.
              </p>
              <form onSubmit={handleReschedule}>
                <div className="form-row">
                  <div className="form-group">
                    <label>New Date *</label>
                    <input className="input" type="date" required value={reschedForm.scheduled_date} onChange={e => setRF('scheduled_date', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>New Time</label>
                    <input className="input" type="time" value={reschedForm.scheduled_time} onChange={e => setRF('scheduled_time', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Duration</label>
                    <select className="select" value={reschedForm.duration_minutes} onChange={e => setRF('duration_minutes', Number(e.target.value))}>
                      {VISIT_DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Engineer</label>
                    <select className="select" value={reschedForm.engineer_id} onChange={e => setRF('engineer_id', e.target.value)}>
                      <option value="">Keep same / Unassigned</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Updated By</label>
                    <select className="select" value={reschedForm.created_by} onChange={e => setRF('created_by', e.target.value)}>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>Reason for Rescheduling</label>
                  <textarea className="textarea" rows={2} value={reschedForm.reason} onChange={e => setRF('reason', e.target.value)} placeholder="Customer requested change, engineer unavailable..." />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving || !reschedForm.scheduled_date}>
                  {saving ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </form>
            </div>
          )}

          {/* ── Cancel Form ── */}
          {mode === 'cancel' && (
            <div className="card">
              <div className="card-title" style={{ color: '#dc2626' }}>Cancel Visit</div>
              <form onSubmit={handleCancel}>
                <div className="form-group" style={{ marginBottom: 12 }}>
                  <label>Reason for Cancellation</label>
                  <textarea className="textarea" rows={3} value={cancelForm.cancellation_reason} onChange={e => setCancelForm(f => ({ ...f, cancellation_reason: e.target.value }))} placeholder="Customer cancelled, no access, etc." />
                </div>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>Cancelled By</label>
                  <select className="select" value={cancelForm.created_by} onChange={e => setCancelForm(f => ({ ...f, created_by: e.target.value }))}>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: '#dc2626' }}>
                  {saving ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* ── Right: Customer & Enquiry ── */}
        <div className="detail-right">
          <div className="card">
            <div className="card-title">Customer & Address</div>
            <div className="info-row"><span className="info-label">Name</span><span style={{ fontWeight: 600 }}>{visit.customer_name}</span></div>
            <div className="info-row"><span className="info-label">Phone</span><span>{visit.customer_phone || '—'}</span></div>
            <div className="info-row"><span className="info-label">Email</span><span>{visit.customer_email || '—'}</span></div>
            {visit.address_line1 && <div className="info-row"><span className="info-label">Address</span><span>{visit.address_line1}</span></div>}
            {visit.address_line2 && <div className="info-row"><span className="info-label"></span><span>{visit.address_line2}</span></div>}
            <div className="info-row"><span className="info-label">City</span><span>{visit.city || '—'}</span></div>
            <div className="info-row"><span className="info-label">Postcode</span><span style={{ fontWeight: 700, fontSize: 15 }}>{visit.postcode || '—'}</span></div>
          </div>

          <div className="card">
            <div className="card-title">Enquiry Info</div>
            <div className="info-row">
              <span className="info-label">Enquiry</span>
              <Link to={`/enquiries/${visit.enquiry_id}`} className="link">{visit.enquiry_code}</Link>
            </div>
            <div className="info-row"><span className="info-label">Product</span><span>{visit.product_interest}</span></div>
            <div className="info-row"><span className="info-label">Enq. Status</span><span>{visit.enquiry_status}</span></div>
            {visit.enquiry_description && (
              <div className="description-block">
                <div className="info-label">Customer Notes</div>
                <p>{visit.enquiry_description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
