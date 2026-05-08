import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getVisits } from '../api';
import { VisitStatusBadge } from '../components/helpers';

function toLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayISO() { return toLocalISO(new Date()); }

function offsetDate(isoStr, n) {
  const [y, m, d] = isoStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return toLocalISO(date);
}

function displayDate(isoStr) {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

const STATUS_COLOR = {
  Scheduled: '#4a9fd4', Confirmed: '#8b5cf6', Completed: '#10b981',
  Cancelled: '#ef4444', Rescheduled: '#f59e0b',
};

export default function DailySchedule() {
  const [date, setDate] = useState(todayISO());
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getVisits({ date_from: date, date_to: date })
      .then(r => setVisits(r.data.data))
      .finally(() => setLoading(false));
  }, [date]);

  // Group by engineer, unassigned last
  const groupMap = {};
  visits.forEach(v => {
    const key = v.engineer_name || '__none__';
    if (!groupMap[key]) groupMap[key] = { name: v.engineer_name || null, phone: v.engineer_phone || null, visits: [] };
    groupMap[key].visits.push(v);
  });
  const groups = Object.values(groupMap).sort((a, b) => {
    if (!a.name && b.name) return 1;
    if (a.name && !b.name) return -1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const isToday = date === todayISO();
  const completedCount = visits.filter(v => v.status === 'Completed').length;
  const unassignedCount = visits.filter(v => !v.engineer_name).length;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Daily Schedule</h1>
        <Link to="/visits/schedule" className="btn btn-primary">+ Schedule Visit</Link>
      </div>

      {/* Date nav */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setDate(d => offsetDate(d, -1))}>← Prev</button>
          <input
            className="input"
            type="date"
            style={{ width: 160 }}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={() => setDate(d => offsetDate(d, 1))}>Next →</button>
          {!isToday && (
            <button className="btn btn-primary" style={{ padding: '8px 14px' }} onClick={() => setDate(todayISO())}>Today</button>
          )}
          <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#1a2332', fontSize: 15 }}>
            {isToday ? '📅 Today — ' : ''}{displayDate(date)}
          </span>
        </div>
      </div>

      {/* Summary bar */}
      {!loading && visits.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card" style={{ borderTopColor: '#1a5c8a' }}>
            <div className="stat-value" style={{ color: '#1a5c8a' }}>{visits.length}</div>
            <div className="stat-label">Total Visits</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#10b981' }}>
            <div className="stat-value" style={{ color: '#10b981' }}>{groups.filter(g => g.name).length}</div>
            <div className="stat-label">Engineers Out</div>
          </div>
          <div className="stat-card" style={{ borderTopColor: '#3b82f6' }}>
            <div className="stat-value" style={{ color: '#3b82f6' }}>{completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
          {unassignedCount > 0 && (
            <div className="stat-card" style={{ borderTopColor: '#f59e0b' }}>
              <div className="stat-value" style={{ color: '#f59e0b' }}>{unassignedCount}</div>
              <div className="stat-label">Unassigned</div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading schedule...</div>
      ) : visits.length === 0 ? (
        <div className="card">
          <div className="empty">
            No visits scheduled for this day. <Link to="/visits/schedule">Schedule one</Link>
          </div>
        </div>
      ) : (
        groups.map(group => (
          <div key={group.name || '__none__'} className="card">
            {/* Engineer header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #f0f2f5' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: group.name ? '#1a2332' : '#f59e0b' }}>
                  {group.name ? `🔧 ${group.name}` : '⚠️ Unassigned'}
                </div>
                {group.phone && <div style={{ fontSize: 12, color: '#7a8a9a', marginTop: 2 }}>📞 {group.phone}</div>}
              </div>
              <span style={{ fontSize: 12, background: '#f0f2f5', padding: '3px 10px', borderRadius: 10, color: '#5a6a7a', fontWeight: 600 }}>
                {group.visits.length} visit{group.visits.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Visit rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.visits.map((v, idx) => (
                <div
                  key={v.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 14px',
                    background: '#f8f9fb', borderRadius: 8,
                    borderLeft: `4px solid ${STATUS_COLOR[v.status] || '#4a9fd4'}`,
                    opacity: ['Cancelled', 'Rescheduled'].includes(v.status) ? 0.6 : 1,
                  }}
                >
                  {/* Sequence + time */}
                  <div style={{ minWidth: 52, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: '#9aa0b0', fontWeight: 600, marginBottom: 2 }}>#{idx + 1}</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: '#1a5c8a', lineHeight: 1.2 }}>
                      {v.scheduled_time ? v.scheduled_time.slice(0, 5) : '—:—'}
                    </div>
                    <div style={{ fontSize: 11, color: '#9aa0b0', marginTop: 2 }}>{v.duration_minutes}m</div>
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#9aa0b0' }}>{v.visit_code}</span>
                      <VisitStatusBadge status={v.status} />
                      <span style={{ fontSize: 11, color: '#7a8a9a', background: '#eef0f3', padding: '1px 7px', borderRadius: 8 }}>{v.visit_type}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a2332', marginBottom: 2 }}>{v.customer_name}</div>
                    <div style={{ fontSize: 13, color: '#4a5a6a' }}>
                      {v.address_line1 && <span>{v.address_line1}, </span>}
                      {v.city && <span>{v.city} </span>}
                      {v.postcode && <strong style={{ color: '#1a2332', fontSize: 14 }}>{v.postcode}</strong>}
                    </div>
                    {(!v.address_line1 && !v.city && !v.postcode) && (
                      <div style={{ fontSize: 12, color: '#f59e0b' }}>⚠ No address on file</div>
                    )}
                    <div style={{ display: 'flex', gap: 14, marginTop: 5, flexWrap: 'wrap' }}>
                      {v.customer_phone && <span style={{ fontSize: 12, color: '#5a6a7a' }}>📞 {v.customer_phone}</span>}
                      <span style={{ fontSize: 12, color: '#5a6a7a' }}>📋 {v.enquiry_code} · {v.product_interest}</span>
                    </div>
                  </div>

                  <Link
                    to={`/visits/${v.id}`}
                    className="btn btn-secondary"
                    style={{ fontSize: 12, padding: '5px 12px', flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
