import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getEnquiries, getEmployees } from '../api';
import { StatusBadge, PriorityBadge, formatDate, ALL_STATUSES, PRODUCTS } from '../components/helpers';

export default function EnquiriesList() {
  const [enquiries, setEnquiries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', product_interest: '', assigned_to: '' });

  useEffect(() => {
    getEmployees().then(r => setEmployees(r.data.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    getEnquiries(filters)
      .then(r => setEnquiries(r.data.data))
      .finally(() => setLoading(false));
  }, [filters]);

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }));

  return (
    <div className="page">
      <div className="page-header">
        <h1>All Enquiries</h1>
        <Link to="/enquiries/new" className="btn btn-primary">+ New Enquiry</Link>
      </div>

      <div className="card">
        <div className="filters">
          <input
            className="input"
            style={{ flex: 2, minWidth: 200 }}
            placeholder="Search by name, code, phone, email, postcode..."
            value={filters.search}
            onChange={e => setFilter('search', e.target.value)}
          />
          <select className="select" style={{ flex: 1 }} value={filters.status} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All Statuses</option>
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select" style={{ flex: 1 }} value={filters.product_interest} onChange={e => setFilter('product_interest', e.target.value)}>
            <option value="">All Products</option>
            {PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="select" style={{ flex: 1 }} value={filters.assigned_to} onChange={e => setFilter('assigned_to', e.target.value)}>
            <option value="">All Assignees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading enquiries...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Customer</th>
                <th>Postcode</th>
                <th>Product</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Logs</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map(enq => (
                <tr key={enq.id}>
                  <td>
                    <Link to={`/enquiries/${enq.id}`} className="link">{enq.enquiry_code}</Link>
                  </td>
                  <td>
                    <div className="customer-name">{enq.customer_name}</div>
                    <div className="text-muted">{enq.customer_phone}</div>
                  </td>
                  <td>{enq.postcode || '—'}</td>
                  <td>{enq.product_interest}</td>
                  <td><StatusBadge status={enq.status} /></td>
                  <td><PriorityBadge priority={enq.priority} /></td>
                  <td>{enq.assigned_to_name || '—'}</td>
                  <td><span className="log-count">{enq.log_count}</span></td>
                  <td>{formatDate(enq.created_at)}</td>
                </tr>
              ))}
              {enquiries.length === 0 && (
                <tr><td colSpan="9" className="empty">No enquiries found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
