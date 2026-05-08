import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVisits, getEmployees } from '../api';
import { VisitStatusBadge, VISIT_STATUSES, formatVisitDateTime } from '../components/helpers';

const DATE_FILTERS = [
  { label: 'Today',     getDates: () => { const d = today(); return { date_from: d, date_to: d }; } },
  { label: 'Tomorrow',  getDates: () => { const d = offsetDay(1); return { date_from: d, date_to: d }; } },
  { label: 'This Week', getDates: () => ({ date_from: today(), date_to: offsetDay(6) }) },
  { label: 'Next Week', getDates: () => ({ date_from: offsetDay(7), date_to: offsetDay(13) }) },
  { label: 'All',       getDates: () => ({}) },
];

function today() { return new Date().toISOString().slice(0, 10); }
function offsetDay(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function VisitsList() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDateFilter, setActiveDateFilter] = useState('This Week');
  const [filters, setFilters] = useState({ ...DATE_FILTERS[2].getDates(), engineer_id: '', status: '' });

  useEffect(() => { getEmployees().then(r => setEmployees(r.data.data)); }, []);

  useEffect(() => {
    setLoading(true);
    getVisits(filters).then(r => setVisits(r.data.data)).finally(() => setLoading(false));
  }, [filters]);

  const applyDateFilter = (df) => {
    setActiveDateFilter(df.label);
    setFilters(f => ({ ...f, ...df.getDates() }));
  };

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Visits</h1>
        <Link to="/visits/schedule" className="btn btn-primary">+ Schedule Visit</Link>
      </div>

      <div className="card">
        {/* Date quick filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {DATE_FILTERS.map(df => (
            <button
              key={df.label}
              className={`btn ${activeDateFilter === df.label ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: 13 }}
              onClick={() => applyDateFilter(df)}
            >
              {df.label}
            </button>
          ))}
        </div>

        {/* Row filters */}
        <div className="filters">
          <input
            className="input"
            type="date"
            style={{ flex: '0 0 auto', width: 160 }}
            value={filters.date_from || ''}
            onChange={e => { setActiveDateFilter(''); setFilter('date_from', e.target.value); }}
          />
          <span style={{ alignSelf: 'center', color: '#7a8a9a', fontSize: 13 }}>to</span>
          <input
            className="input"
            type="date"
            style={{ flex: '0 0 auto', width: 160 }}
            value={filters.date_to || ''}
            onChange={e => { setActiveDateFilter(''); setFilter('date_to', e.target.value); }}
          />
          <select className="select" style={{ flex: 1 }} value={filters.engineer_id} onChange={e => setFilter('engineer_id', e.target.value)}>
            <option value="">All Engineers</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
          <select className="select" style={{ flex: 1 }} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All Statuses</option>
            {VISIT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading visits...</div>
        ) : visits.length === 0 ? (
          <div className="empty">No visits found for this period.</div>
        ) : (
          visits.map(v => (
            <div
              key={v.id}
              className={`visit-card status-${v.status.toLowerCase()}`}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/visits/${v.id}`)}
            >
              <div className="visit-date-block">
                <div className="visit-date-day">{new Date(v.scheduled_date + 'T00:00:00').getDate()}</div>
                <div className="visit-date-mon">{new Date(v.scheduled_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}</div>
                {v.scheduled_time && <div className="visit-date-time">{v.scheduled_time.slice(0,5)}</div>}
              </div>
              <div className="visit-info">
                <div className="visit-info-top">
                  <span className="visit-code">{v.visit_code}</span>
                  <VisitStatusBadge status={v.status} />
                  <span style={{ fontSize: 12, color: '#7a8a9a' }}>{v.visit_type}</span>
                </div>
                <div className="visit-customer">{v.customer_name}</div>
                <div className="visit-address">
                  {[v.address_line1, v.city, v.postcode].filter(Boolean).join(', ') || 'No address on file'}
                  {v.customer_phone && ` · ${v.customer_phone}`}
                </div>
                <div className="visit-meta">
                  <span className="visit-meta-item">🔧 <strong>{v.engineer_name || 'Unassigned'}</strong></span>
                  <span className="visit-meta-item">⏱ <strong>{v.duration_minutes} min</strong></span>
                  <span className="visit-meta-item">📋 <strong>{v.enquiry_code}</strong> — {v.product_interest}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
