import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  getReportOverview, getReportEnquiriesTime, getReportEnquiriesSource,
  getReportRevenue, getReportEmployees,
} from '../api';
import { formatCurrency } from '../components/helpers';

// ── Helpers ──────────────────────────────────────────────────────────────────

function thisYear() {
  const y = new Date().getFullYear();
  return { from: `${y}-01-01`, to: `${y + 1}-01-01` };
}

function fmtPeriod(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

function exportCSV(rows, filename) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

const COLORS = ['#1a5c8a', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#84cc16'];

// ── Components ────────────────────────────────────────────────────────────────

function StatBox({ label, value, sub, color = '#1a5c8a' }) {
  return (
    <div className="stat-card" style={{ borderTopColor: color }}>
      <div className="stat-value" style={{ color, fontSize: typeof value === 'string' && value.length > 6 ? 18 : 28 }}>{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9aa0b0', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, onExport }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a2332' }}>{title}</h2>
      {onExport && (
        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={onExport}>
          ⬇ CSV
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  const [dates, setDates] = useState(thisYear());
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const [overview, setOverview]   = useState(null);
  const [timeData, setTimeData]   = useState([]);
  const [sourceData, setSource]   = useState(null);
  const [revenue, setRevenue]     = useState(null);
  const [employees, setEmployees] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = { from: dates.from, to: dates.to };
      const [ov, td, sd, rv, em] = await Promise.all([
        getReportOverview(p),
        getReportEnquiriesTime({ ...p, group: 'month' }),
        getReportEnquiriesSource(p),
        getReportRevenue(p),
        getReportEmployees(p),
      ]);
      setOverview(ov.data.data);
      setTimeData(td.data.data.map(r => ({ ...r, period: fmtPeriod(r.period), total: Number(r.total), converted: Number(r.converted), cancelled: Number(r.cancelled) })));
      setSource(sd.data.data);
      setRevenue({ ...rv.data.data, monthly: rv.data.data.monthly.map(r => ({ ...r, period: fmtPeriod(r.period), pipeline: Number(r.pipeline), completed: Number(r.completed), deposits: Number(r.deposits) })) });
      setEmployees(em.data.data);
    } finally { setLoading(false); }
  }, [dates]);

  useEffect(() => { load(); }, [load]);

  const TABS = ['overview', 'enquiries', 'revenue', 'employees'];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Reports & Analytics</h1>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input className="input" type="date" style={{ width: 150 }} value={dates.from} onChange={e => setDates(d => ({ ...d, from: e.target.value }))} />
          <span style={{ color: '#7a8a9a', fontSize: 13 }}>to</span>
          <input className="input" type="date" style={{ width: 150 }} value={dates.to} onChange={e => setDates(d => ({ ...d, to: e.target.value }))} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #e8eaf0', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, textTransform: 'capitalize',
            color: tab === t ? '#1a5c8a' : '#7a8a9a',
            borderBottom: tab === t ? '2px solid #1a5c8a' : '2px solid transparent',
            marginBottom: -2,
          }}>{t}</button>
        ))}
      </div>

      {loading ? <div className="loading">Loading report data...</div> : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && overview && (
            <>
              <div className="stats-grid" style={{ marginBottom: 20 }}>
                <StatBox label="Total Enquiries"   value={overview.enquiries.total_enquiries}  color="#1a5c8a" />
                <StatBox label="Conversion Rate"   value={`${overview.conversion_rate}%`}      color="#10b981" />
                <StatBox label="Total Orders"      value={overview.orders.total_orders}         color="#8b5cf6" />
                <StatBox label="Pipeline Value"    value={formatCurrency(overview.orders.pipeline_value)}  color="#f59e0b" />
                <StatBox label="Completed Value"   value={formatCurrency(overview.orders.completed_value)} color="#10b981" />
                <StatBox label="Deposits Collected" value={formatCurrency(overview.orders.deposits_collected)} color="#06b6d4" />
                <StatBox label="Total Visits"      value={overview.visits.total_visits}         color="#1a5c8a" />
                <StatBox label="Visits Completed"  value={overview.visits.completed_visits}     color="#10b981" />
              </div>

              {/* Enquiry status breakdown */}
              <div className="card">
                <SectionHeader title="Enquiry Status Breakdown" />
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <ResponsiveContainer width="50%" height={240}>
                    <PieChart>
                      <Pie data={[
                        { name: 'New',           value: Number(overview.enquiries.new_enq) },
                        { name: 'In Progress',   value: Number(overview.enquiries.in_progress) },
                        { name: 'Confirmed',     value: Number(overview.enquiries.confirmed) },
                        { name: 'Converted',     value: Number(overview.enquiries.converted) },
                        { name: 'Cancelled',     value: Number(overview.enquiries.cancelled) },
                      ].filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine>
                        {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, minWidth: 200 }}>
                    {[
                      { label: 'New',          val: overview.enquiries.new_enq,    color: COLORS[0] },
                      { label: 'In Progress',  val: overview.enquiries.in_progress,color: COLORS[1] },
                      { label: 'Confirmed',    val: overview.enquiries.confirmed,  color: COLORS[2] },
                      { label: 'Converted',    val: overview.enquiries.converted,  color: COLORS[3] },
                      { label: 'Cancelled',    val: overview.enquiries.cancelled,  color: COLORS[4] },
                    ].map(s => (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, flex: 1 }}>{s.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#1a2332' }}>{s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── ENQUIRIES ── */}
          {tab === 'enquiries' && (
            <>
              <div className="card">
                <SectionHeader title="Enquiries Over Time" onExport={() => exportCSV(timeData, 'enquiries-over-time.csv')} />
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={timeData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total"     stroke="#1a5c8a" strokeWidth={2} name="Total" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="converted" stroke="#10b981" strokeWidth={2} name="Converted" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} name="Cancelled" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {sourceData && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                  {[
                    { title: 'By Source',  data: sourceData.by_source.map(r => ({ name: r.source || 'Unknown', value: Number(r.total) })) },
                    { title: 'By Product', data: sourceData.by_product.map(r => ({ name: r.name, value: Number(r.total) })) },
                    { title: 'By Channel', data: sourceData.by_channel.map(r => ({ name: r.name, value: Number(r.total) })) },
                  ].map(({ title, data }) => (
                    <div key={title} className="card">
                      <SectionHeader title={title} onExport={() => exportCSV(data, `${title.toLowerCase().replace(/\s/g, '-')}.csv`)} />
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                          <Tooltip />
                          <Bar dataKey="value" name="Enquiries" radius={[0, 4, 4, 0]}>
                            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── REVENUE ── */}
          {tab === 'revenue' && revenue && (
            <>
              <div className="card">
                <SectionHeader title="Monthly Revenue" onExport={() => exportCSV(revenue.monthly, 'monthly-revenue.csv')} />
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenue.monthly} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f5" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `£${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="pipeline"  name="Pipeline"  fill="#1a5c8a" radius={[4,4,0,0]} />
                    <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="deposits"  name="Deposits"  fill="#f59e0b" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {revenue.by_product.length > 0 && (
                <div className="card">
                  <SectionHeader title="Revenue by Product" onExport={() => exportCSV(revenue.by_product, 'revenue-by-product.csv')} />
                  <table className="table">
                    <thead><tr><th>Product</th><th>Orders</th><th>Total Value</th></tr></thead>
                    <tbody>
                      {revenue.by_product.map(r => (
                        <tr key={r.product}>
                          <td style={{ fontWeight: 600 }}>{r.product || '—'}</td>
                          <td>{r.orders}</td>
                          <td style={{ fontWeight: 600, color: '#1a5c8a' }}>{formatCurrency(r.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── EMPLOYEES ── */}
          {tab === 'employees' && (
            <div className="card">
              <SectionHeader title="Employee Performance" onExport={() => exportCSV(employees, 'employee-performance.csv')} />
              <table className="table">
                <thead>
                  <tr>
                    <th>Employee</th><th>Role</th>
                    <th>Enquiries Assigned</th><th>Converted</th>
                    <th>Visits Done</th><th>Orders</th><th>Order Value</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.name}</td>
                      <td><span style={{ background: '#f0f2f5', padding: '2px 8px', borderRadius: 8, fontSize: 12 }}>{e.role}</span></td>
                      <td style={{ textAlign: 'center' }}>{e.enquiries_assigned}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>{e.enquiries_converted}</span>
                        {e.enquiries_assigned > 0 && (
                          <span style={{ fontSize: 11, color: '#9aa0b0', marginLeft: 4 }}>
                            ({Math.round((e.enquiries_converted / e.enquiries_assigned) * 100)}%)
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>{e.visits_done}</td>
                      <td style={{ textAlign: 'center' }}>{e.orders_created}</td>
                      <td style={{ fontWeight: 600, color: '#1a5c8a' }}>{formatCurrency(e.order_value)}</td>
                    </tr>
                  ))}
                  {employees.length === 0 && <tr><td colSpan="7" className="empty">No data for this period.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
