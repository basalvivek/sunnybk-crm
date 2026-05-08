import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardData, getEnquiryStats, getEnquiries } from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, formatDate, VisitStatusBadge, OrderStatusBadge } from '../components/helpers';

// ── Shared helpers ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color, to }) {
  const inner = (
    <div className="stat-card" style={{ borderTopColor: color, cursor: to ? 'pointer' : 'default' }}>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9aa0b0', marginTop: 4 }}>{sub}</div>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

function SectionCard({ title, action, actionTo, children, empty, emptyLink, emptyLabel }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>{title}</h2>
        {action && <Link to={actionTo} className="btn btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>{action}</Link>}
      </div>
      {children || (
        <div className="empty">
          {emptyLabel || 'Nothing here.'}{' '}
          {emptyLink && <Link to={emptyLink.to}>{emptyLink.label}</Link>}
        </div>
      )}
    </div>
  );
}

const VISIT_COLORS = { Scheduled: '#3b82f6', Confirmed: '#8b5cf6', Completed: '#10b981' };
const INSTALL_COLORS = {
  'Confirmed': '#3b82f6', 'Deposit Paid': '#8b5cf6', 'In Production': '#a855f7',
  'Ready to Install': '#06b6d4', 'Installation Scheduled': '#f97316',
};

function daysUntil(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const diff = Math.round((new Date(y, m - 1, d) - new Date(new Date().toDateString())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return `in ${diff}d`;
}

// ── Admin Dashboard ─────────────────────────────────────────────────────────

function AdminDashboard() {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardData()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!data)   return <div className="loading">Failed to load dashboard.</div>;

  const { enquiry_stats: eq, order_stats: ord, todays_visits, upcoming_installs, overdue_payments, recent_enquiries } = data;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link to="/enquiries/new" className="btn btn-primary">+ New Enquiry</Link>
      </div>

      {/* ── KPI row ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', marginBottom: 20 }}>
        <KpiCard label="Active Enquiries"   value={eq.active}            color="#1a5c8a" to="/enquiries" />
        <KpiCard label="New Today"          value={eq.today}             color="#3b82f6" to="/enquiries" />
        <KpiCard label="This Month"         value={eq.this_month}        color="#06b6d4" to="/enquiries" />
        <KpiCard label="Active Orders"      value={ord.active}           color="#8b5cf6" to="/orders" />
        <KpiCard label="Pipeline Value"     value={`£${Number(ord.pipeline_value).toLocaleString()}`} color="#f59e0b" to="/orders" sub="excl. cancelled" />
        <KpiCard label="Today's Visits"     value={todays_visits.length} color="#10b981" to="/schedule" />
        <KpiCard label="Upcoming Installs"  value={upcoming_installs.length} color="#f97316" to="/calendar" sub="next 14 days" />
        <KpiCard label="Overdue Payments"   value={overdue_payments.length}  color={overdue_payments.length > 0 ? '#ef4444' : '#9aa0b0'} to="/payments" />
      </div>

      {/* ── Order pipeline strip ── */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#5a6a7a', marginRight: 8 }}>Order Pipeline</span>
          {[
            { label: 'Confirmed',            value: ord.confirmed,        color: '#3b82f6' },
            { label: 'Deposit Paid',         value: ord.deposit_paid,     color: '#8b5cf6' },
            { label: 'In Production',        value: ord.in_production,    color: '#a855f7' },
            { label: 'Ready to Install',     value: ord.ready_to_install, color: '#06b6d4' },
            { label: 'Install Scheduled',    value: ord.install_scheduled,color: '#f97316' },
            { label: 'Installed',            value: ord.installed,        color: '#10b981' },
            { label: 'Completed',            value: ord.completed,        color: '#6b7280' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              background: '#f8f9fb', borderRadius: 20, border: `1px solid ${s.color}22`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11, color: '#7a8a9a' }}>{s.label}</span>
            </div>
          ))}
          <Link to="/orders" style={{ marginLeft: 'auto', fontSize: 12, color: '#4a9fd4' }}>View all →</Link>
        </div>
      </div>

      {/* ── Main content grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Today's Schedule */}
        <SectionCard title={`Today's Schedule (${todays_visits.length})`} action="Daily View" actionTo="/schedule"
          emptyLabel="No visits scheduled today." emptyLink={{ to: '/visits/schedule', label: 'Schedule one' }}>
          {todays_visits.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todays_visits.map(v => (
                <Link key={v.id} to={`/visits/${v.id}`}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    background: '#f8f9fb', borderRadius: 8,
                    borderLeft: `3px solid ${VISIT_COLORS[v.status] || '#4a9fd4'}`,
                  }}>
                    <div style={{ minWidth: 42, textAlign: 'center' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a5c8a' }}>
                        {v.scheduled_time ? v.scheduled_time.slice(0, 5) : '—:—'}
                      </div>
                      <div style={{ fontSize: 10, color: '#9aa0b0' }}>{v.duration_minutes}m</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.customer_name}
                      </div>
                      <div style={{ fontSize: 11, color: '#5a6a7a' }}>
                        {v.visit_type}{v.engineer_name ? ` · 🔧 ${v.engineer_name}` : ''}{v.postcode ? ` · ${v.postcode}` : ''}
                      </div>
                    </div>
                    <VisitStatusBadge status={v.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Upcoming Installs */}
        <SectionCard title="Upcoming Installs (14 days)" action="Calendar" actionTo="/calendar"
          emptyLabel="No installs scheduled in the next 14 days.">
          {upcoming_installs.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcoming_installs.map(o => {
                const tag = daysUntil(o.expected_install_date);
                const isUrgent = tag && (tag === 'Today' || tag === 'Tomorrow');
                return (
                  <Link key={o.id} to={`/orders/${o.id}`}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      background: '#fff7ed', borderRadius: 8,
                      borderLeft: `3px solid ${INSTALL_COLORS[o.status] || '#f97316'}`,
                    }}>
                      <div style={{ minWidth: 52, textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isUrgent ? '#ef4444' : '#f97316' }}>{tag}</div>
                        <div style={{ fontSize: 10, color: '#9aa0b0' }}>{formatDate(o.expected_install_date)}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {o.customer_name}
                        </div>
                        <div style={{ fontSize: 11, color: '#5a6a7a' }}>
                          {o.product_interest}{o.postcode ? ` · ${o.postcode}` : ''}
                        </div>
                      </div>
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Overdue Payments */}
        <SectionCard title={`Overdue Payments${overdue_payments.length > 0 ? ` (${overdue_payments.length})` : ''}`}
          action="All Payments" actionTo="/payments"
          emptyLabel="No overdue payments.">
          {overdue_payments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {overdue_payments.map(o => {
                const depositOverdue = !o.deposit_paid && o.deposit_due_date && o.deposit_due_date < new Date().toISOString().slice(0, 10);
                const balanceOverdue = !o.balance_paid  && o.balance_due_date  && o.balance_due_date  < new Date().toISOString().slice(0, 10);
                return (
                  <Link key={o.id} to={`/orders/${o.id}`}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      background: '#fef2f2', borderRadius: 8, borderLeft: '3px solid #ef4444',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#1a2332' }}>{o.customer_name}</div>
                        <div style={{ fontSize: 11, color: '#5a6a7a' }}>{o.order_code}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {depositOverdue && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                            Deposit due {formatDate(o.deposit_due_date)}
                          </div>
                        )}
                        {balanceOverdue && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                            Balance due {formatDate(o.balance_due_date)}
                          </div>
                        )}
                        <div style={{ fontSize: 12, color: '#6a7a8a' }}>
                          Total: £{Number(o.total_amount || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Recent Enquiries */}
        <SectionCard title="Recent Enquiries" action="View All" actionTo="/enquiries"
          emptyLabel="No enquiries yet." emptyLink={{ to: '/enquiries/new', label: 'Create one' }}>
          {recent_enquiries.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent_enquiries.map(enq => (
                <Link key={enq.id} to={`/enquiries/${enq.id}`}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                    background: '#f8f9fb', borderRadius: 8, borderLeft: '3px solid #d8dce5',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#9aa0b0' }}>{enq.enquiry_code}</span>
                        <StatusBadge status={enq.status} />
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a2332', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {enq.customer_name}
                      </div>
                      <div style={{ fontSize: 11, color: '#5a6a7a' }}>
                        {enq.product_interest}{enq.assigned_to_name ? ` · ${enq.assigned_to_name}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <PriorityBadge priority={enq.priority} />
                      <div style={{ fontSize: 11, color: '#9aa0b0', marginTop: 4 }}>{formatDate(enq.created_at)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

      </div>
    </div>
  );
}

// ── Employee Dashboard (simple) ─────────────────────────────────────────────

function EmployeeDashboard() {
  const [stats, setStats]   = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEnquiryStats(), getEnquiries({})])
      .then(([sR, eR]) => { setStats(sR.data.data); setRecent(eR.data.data.slice(0, 10)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const cards = [
    { label: 'Total',         value: stats?.total          || 0, color: '#1a5c8a' },
    { label: 'New',           value: stats?.new_count       || 0, color: '#3b82f6' },
    { label: 'In Progress',   value: stats?.in_progress     || 0, color: '#f59e0b' },
    { label: 'Visit Scheduled', value: stats?.visit_scheduled || 0, color: '#8b5cf6' },
    { label: 'Quote Sent',    value: stats?.quote_sent      || 0, color: '#06b6d4' },
    { label: 'Confirmed',     value: stats?.confirmed       || 0, color: '#10b981' },
    { label: 'Today',         value: stats?.today           || 0, color: '#ef4444' },
    { label: 'This Month',    value: stats?.this_month      || 0, color: '#0d9488' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link to="/enquiries/new" className="btn btn-primary">+ New Enquiry</Link>
      </div>
      <div className="stats-grid">
        {cards.map(c => (
          <div key={c.label} className="stat-card" style={{ borderTopColor: c.color }}>
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="card-header">
          <h2>Recent Enquiries</h2>
          <Link to="/enquiries" className="btn btn-secondary">View All</Link>
        </div>
        <table className="table">
          <thead>
            <tr><th>Code</th><th>Customer</th><th>Product</th><th>Status</th><th>Priority</th><th>Assigned</th><th>Date</th></tr>
          </thead>
          <tbody>
            {recent.map(enq => (
              <tr key={enq.id}>
                <td><Link to={`/enquiries/${enq.id}`} className="link">{enq.enquiry_code}</Link></td>
                <td><div className="customer-name">{enq.customer_name}</div><div className="text-muted">{enq.customer_phone}</div></td>
                <td>{enq.product_interest}</td>
                <td><StatusBadge status={enq.status} /></td>
                <td><PriorityBadge priority={enq.priority} /></td>
                <td>{enq.assigned_to_name || '—'}</td>
                <td>{formatDate(enq.created_at)}</td>
              </tr>
            ))}
            {recent.length === 0 && <tr><td colSpan="7" className="empty">No enquiries yet. <Link to="/enquiries/new">Create one</Link></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
}
