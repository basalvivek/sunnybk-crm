import React, { useEffect, useState } from 'react';
import { getCustomers } from '../api';
import { formatDate } from '../components/helpers';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCustomers(search)
      .then(r => setCustomers(r.data.data))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Customers</h1>
        <span className="text-muted">{customers.length} record{customers.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card">
        <div className="filters">
          <input
            className="input"
            style={{ maxWidth: 360 }}
            placeholder="Search by name, phone, email, postcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading">Loading customers...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Postcode</th>
                <th>City</th>
                <th>Source</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td className="text-muted">{c.customer_code}</td>
                  <td className="customer-name">{c.first_name} {c.last_name}</td>
                  <td>{c.phone}</td>
                  <td>{c.email || '—'}</td>
                  <td>{c.postcode || '—'}</td>
                  <td>{c.city || '—'}</td>
                  <td>{c.source}</td>
                  <td>{formatDate(c.created_at)}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan="8" className="empty">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
