import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, getOrderStats, getEmployees } from '../api';
import { OrderStatusBadge, ORDER_STATUSES, formatDate, formatCurrency } from '../components/helpers';

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', assigned_to: '' });

  useEffect(() => { getEmployees().then(r => setEmployees(r.data.data)); }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([getOrders(filters), getOrderStats()])
      .then(([ordRes, statsRes]) => { setOrders(ordRes.data.data); setStats(statsRes.data.data); })
      .finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const statCards = stats ? [
    { label: 'Total Orders',    value: stats.total,           color: '#1a5c8a' },
    { label: 'Confirmed',       value: stats.confirmed,       color: '#3b82f6' },
    { label: 'In Production',   value: stats.in_production,   color: '#8b5cf6' },
    { label: 'Ready to Install',value: stats.ready_to_install,color: '#06b6d4' },
    { label: 'Completed',       value: stats.completed,       color: '#10b981' },
    { label: 'Total Value',     value: `£${Number(stats.total_value).toLocaleString()}`, color: '#f59e0b', large: true },
    { label: 'Completed Value', value: `£${Number(stats.completed_value).toLocaleString()}`, color: '#10b981', large: true },
  ] : [];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Orders</h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          {statCards.map(c => (
            <div key={c.label} className="stat-card" style={{ borderTopColor: c.color }}>
              <div className="stat-value" style={{ color: c.color, fontSize: c.large ? 18 : 28 }}>{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="filters">
          <input className="input" style={{ flex: 2 }} placeholder="Search by name, code, phone, postcode..."
            value={filters.search} onChange={e => setFilter('search', e.target.value)} />
          <select className="select" style={{ flex: 1 }} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select" style={{ flex: 1 }} value={filters.assigned_to} onChange={e => setFilter('assigned_to', e.target.value)}>
            <option value="">All Assignees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
        </div>

        {loading ? <div className="loading">Loading orders...</div> : (
          <table className="table">
            <thead>
              <tr>
                <th>Order</th><th>Customer</th><th>Product</th><th>Status</th>
                <th>Total</th><th>Deposit</th><th>Balance</th><th>Install Date</th><th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const balance = o.total_amount && o.deposit_amount ? o.total_amount - o.deposit_amount : null;
                return (
                  <tr key={o.id}>
                    <td><Link to={`/orders/${o.id}`} className="link">{o.order_code}</Link></td>
                    <td>
                      <div className="customer-name">{o.customer_name}</div>
                      <div className="text-muted">{o.customer_phone}</div>
                    </td>
                    <td>{o.product_interest}</td>
                    <td><OrderStatusBadge status={o.status} /></td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(o.total_amount)}</td>
                    <td>
                      {formatCurrency(o.deposit_amount)}
                      {o.deposit_amount && (
                        <div style={{ fontSize: 11, color: o.deposit_paid ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                          {o.deposit_paid ? '✓ Paid' : '⏳ Pending'}
                        </div>
                      )}
                    </td>
                    <td>
                      {formatCurrency(balance)}
                      {balance && (
                        <div style={{ fontSize: 11, color: o.balance_paid ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                          {o.balance_paid ? '✓ Paid' : '⏳ Pending'}
                        </div>
                      )}
                    </td>
                    <td>{o.expected_install_date ? formatDate(o.expected_install_date) : '—'}</td>
                    <td>{o.assigned_to_name || '—'}</td>
                  </tr>
                );
              })}
              {orders.length === 0 && <tr><td colSpan="9" className="empty">No orders found.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
