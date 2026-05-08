import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEnquiryStats, getEnquiries } from '../api';
import { StatusBadge, PriorityBadge, formatDate } from '../components/helpers';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getEnquiryStats(), getEnquiries({})])
      .then(([statsRes, enqRes]) => {
        setStats(statsRes.data.data);
        setRecent(enqRes.data.data.slice(0, 10));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;

  const statCards = [
    { label: 'Total', value: stats?.total || 0, color: '#1a5c8a' },
    { label: 'New', value: stats?.new_count || 0, color: '#3b82f6' },
    { label: 'In Progress', value: stats?.in_progress || 0, color: '#f59e0b' },
    { label: 'Visit Scheduled', value: stats?.visit_scheduled || 0, color: '#8b5cf6' },
    { label: 'Quote Sent', value: stats?.quote_sent || 0, color: '#06b6d4' },
    { label: 'Confirmed', value: stats?.confirmed || 0, color: '#10b981' },
    { label: 'Today', value: stats?.today || 0, color: '#ef4444' },
    { label: 'This Month', value: stats?.this_month || 0, color: '#0d9488' },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <Link to="/enquiries/new" className="btn btn-primary">+ New Enquiry</Link>
      </div>

      <div className="stats-grid">
        {statCards.map(card => (
          <div className="stat-card" key={card.label} style={{ borderTopColor: card.color }}>
            <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
            <div className="stat-label">{card.label}</div>
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
            <tr>
              <th>Code</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Assigned To</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(enq => (
              <tr key={enq.id}>
                <td>
                  <Link to={`/enquiries/${enq.id}`} className="link">{enq.enquiry_code}</Link>
                </td>
                <td>
                  <div className="customer-name">{enq.customer_name}</div>
                  <div className="text-muted">{enq.customer_phone}</div>
                </td>
                <td>{enq.product_interest}</td>
                <td><StatusBadge status={enq.status} /></td>
                <td><PriorityBadge priority={enq.priority} /></td>
                <td>{enq.assigned_to_name || '—'}</td>
                <td>{formatDate(enq.created_at)}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan="7" className="empty">
                  No enquiries yet. <Link to="/enquiries/new">Create your first one!</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
