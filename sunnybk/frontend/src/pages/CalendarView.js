import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getCalendarData } from '../api';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const VISIT_COLORS = {
  Scheduled:   '#3b82f6',
  Confirmed:   '#8b5cf6',
  Completed:   '#10b981',
  Cancelled:   '#ef4444',
  Rescheduled: '#f59e0b',
};

const INSTALL_COLORS = {
  'Confirmed':              '#3b82f6',
  'Deposit Paid':           '#8b5cf6',
  'In Production':          '#a855f7',
  'Ready to Install':       '#06b6d4',
  'Installation Scheduled': '#f97316',
  'Installed':              '#10b981',
  'Completed':              '#6b7280',
};

function toISO(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function todayISO() {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export default function CalendarView() {
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth() + 1);
  const [data, setData]       = useState({ visits: [], installs: [] });
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [show, setShow]       = useState('both'); // 'both' | 'visits' | 'installs'

  const load = useCallback(() => {
    setLoading(true);
    getCalendarData(year, month)
      .then(r => setData(r.data.data))
      .catch(() => setData({ visits: [], installs: [] }))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  // Build day map
  const dayMap = {};
  const add = (key, type, item) => {
    if (!key) return;
    if (!dayMap[key]) dayMap[key] = { visits: [], installs: [] };
    dayMap[key][type].push(item);
  };
  if (show !== 'installs') data.visits.forEach(v => add(v.scheduled_date?.slice(0, 10), 'visits', v));
  if (show !== 'visits')   data.installs.forEach(o => add(o.expected_install_date?.slice(0, 10), 'installs', o));

  // Grid: Mon-first offset
  const firstDow    = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
    setSelectedDay(null);
  };
  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear()); setMonth(t.getMonth() + 1); setSelectedDay(null);
  };

  const TODAY      = todayISO();
  const selISO     = selectedDay ? toISO(year, month, selectedDay) : null;
  const selEvents  = selISO ? (dayMap[selISO] || { visits: [], installs: [] }) : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Installation Calendar</h1>
        <div className="header-actions">
          {[['both','All Events'],['visits','🔧 Visits'],['installs','📦 Installs']].map(([v, label]) => (
            <button key={v} className={`btn ${show === v ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setShow(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Month nav */}
      <div className="card" style={{ padding: '12px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={prevMonth}>← Prev</button>
          <button className="btn btn-secondary" onClick={goToday}>Today</button>
          <button className="btn btn-secondary" onClick={nextMonth}>Next →</button>
          <span style={{ fontWeight: 700, fontSize: 17, color: '#1a2332', marginLeft: 4 }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          {!loading && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#7a8a9a' }}>
              {show !== 'installs' && `${data.visits.length} visit${data.visits.length !== 1 ? 's' : ''}`}
              {show === 'both' && ' · '}
              {show !== 'visits' && `${data.installs.length} install${data.installs.length !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedDay ? '1fr 300px' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* Calendar grid */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="cal-header">
            {DAY_NAMES.map(d => <div key={d} className="cal-day-header">{d}</div>)}
          </div>

          {loading ? (
            <div className="loading">Loading calendar...</div>
          ) : (
            <div className="cal-grid">
              {cells.map((day, idx) => {
                if (!day) return <div key={`e${idx}`} className="cal-cell cal-cell-empty" />;

                const iso    = toISO(year, month, day);
                const events = dayMap[iso] || { visits: [], installs: [] };
                const chips  = [
                  ...events.visits.map(v => ({ type: 'visit',   color: VISIT_COLORS[v.status]   || '#3b82f6', label: v.customer_name?.split(' ')[0] || 'Visit' })),
                  ...events.installs.map(o => ({ type: 'install', color: INSTALL_COLORS[o.status] || '#f97316', label: o.customer_name?.split(' ')[0] || 'Install' })),
                ];
                const visible  = chips.slice(0, 3);
                const overflow = chips.length - 3;
                const isToday  = iso === TODAY;
                const isSel    = day === selectedDay;

                return (
                  <div key={day}
                    className={`cal-cell${isSel ? ' cal-cell-selected' : isToday ? ' cal-cell-today' : ''}`}
                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  >
                    <div className={`cal-day-num${isToday ? ' cal-day-num-today' : ''}`}>{day}</div>
                    <div className="cal-chips">
                      {visible.map((c, i) => (
                        <div key={i} className="cal-chip" style={{ background: c.color }}>
                          {c.type === 'visit' ? '🔧' : '📦'} {c.label}
                        </div>
                      ))}
                      {overflow > 0 && <div className="cal-chip-more">+{overflow} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Day detail panel */}
        {selectedDay && selEvents && (
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#1a2332' }}>
                {selectedDay} {MONTH_NAMES[month - 1]} {year}
              </h2>
              <button className="btn btn-secondary" style={{ padding: '3px 9px', fontSize: 12 }}
                onClick={() => setSelectedDay(null)}>✕</button>
            </div>

            {selEvents.visits.length === 0 && selEvents.installs.length === 0 ? (
              <div className="empty" style={{ padding: '16px 0' }}>No events this day</div>
            ) : (
              <>
                {selEvents.visits.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="cal-panel-section">Engineer Visits ({selEvents.visits.length})</div>
                    {selEvents.visits.map(v => (
                      <Link key={v.id} to={`/visits/${v.id}`} style={{ display: 'block', marginBottom: 8 }}>
                        <div className="cal-event-card" style={{ borderLeftColor: VISIT_COLORS[v.status] || '#3b82f6', background: '#eff6ff' }}>
                          <div className="cal-event-top">
                            <span className="cal-event-code">{v.visit_code}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: VISIT_COLORS[v.status] }}>{v.status}</span>
                          </div>
                          <div className="cal-event-name">{v.customer_name}</div>
                          <div className="cal-event-sub">
                            {v.scheduled_time && <span>{v.scheduled_time.slice(0, 5)} · </span>}
                            {v.visit_type}
                            {v.engineer_name && <span> · 🔧 {v.engineer_name}</span>}
                          </div>
                          {v.postcode && <div className="cal-event-postcode">{v.postcode}</div>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {selEvents.installs.length > 0 && (
                  <div>
                    <div className="cal-panel-section">Installations ({selEvents.installs.length})</div>
                    {selEvents.installs.map(o => (
                      <Link key={o.id} to={`/orders/${o.id}`} style={{ display: 'block', marginBottom: 8 }}>
                        <div className="cal-event-card" style={{ borderLeftColor: INSTALL_COLORS[o.status] || '#f97316', background: '#fff7ed' }}>
                          <div className="cal-event-top">
                            <span className="cal-event-code">{o.order_code}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: INSTALL_COLORS[o.status] }}>{o.status}</span>
                          </div>
                          <div className="cal-event-name">{o.customer_name}</div>
                          <div className="cal-event-sub">
                            {o.product_interest}
                            {o.assigned_to_name && <span> · {o.assigned_to_name}</span>}
                          </div>
                          {o.postcode && <div className="cal-event-postcode">{o.postcode}</div>}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="card" style={{ padding: '10px 20px', marginTop: 4 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#5a6a7a' }}>Legend</span>
          {[
            { color: '#3b82f6', label: 'Visit: Scheduled' },
            { color: '#8b5cf6', label: 'Visit: Confirmed' },
            { color: '#10b981', label: 'Visit / Install: Completed' },
            { color: '#f97316', label: 'Installation Scheduled' },
            { color: '#06b6d4', label: 'Ready to Install' },
            { color: '#a855f7', label: 'In Production' },
          ].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
