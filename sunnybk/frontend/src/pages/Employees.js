import React, { useEffect, useState, useCallback } from 'react';
import { getEmployees, createEmployee, updateEmployee, getDepartments, createDepartment, updateDepartment } from '../api';

const ROLES = ['Admin', 'Manager', 'Sales', 'Designer', 'Engineer', 'Installation', 'Staff'];

const EMPTY_EMP = { first_name: '', last_name: '', email: '', phone: '', role: 'Staff', department_ids: [] };
const EMPTY_DEPT = { name: '', is_active: true };

export default function Employees() {
  const [tab, setTab] = useState('employees'); // employees | departments
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);

  // Employee modal
  const [empModal, setEmpModal] = useState(null); // null | { mode:'add'|'edit', data }
  const [empForm, setEmpForm] = useState(EMPTY_EMP);
  const [empSaving, setEmpSaving] = useState(false);
  const [empError, setEmpError] = useState('');

  // Department modal
  const [deptModal, setDeptModal] = useState(null);
  const [deptForm, setDeptForm] = useState(EMPTY_DEPT);
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [empRes, deptRes] = await Promise.all([
      getEmployees({ include_inactive: showInactive }),
      getDepartments(),
    ]);
    setEmployees(empRes.data.data);
    setDepartments(deptRes.data.data);
    setLoading(false);
  }, [showInactive]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Employee form helpers ──
  const openAddEmp = () => { setEmpForm(EMPTY_EMP); setEmpError(''); setEmpModal({ mode: 'add' }); };
  const openEditEmp = (emp) => {
    setEmpForm({
      first_name: emp.first_name, last_name: emp.last_name,
      email: emp.email || '', phone: emp.phone || '',
      role: emp.role, is_active: emp.is_active,
      department_ids: emp.departments.map(d => d.id),
    });
    setEmpError('');
    setEmpModal({ mode: 'edit', id: emp.id });
  };

  const handleEmpSubmit = async (e) => {
    e.preventDefault();
    setEmpSaving(true); setEmpError('');
    try {
      if (empModal.mode === 'add') await createEmployee(empForm);
      else await updateEmployee(empModal.id, empForm);
      setEmpModal(null);
      await loadAll();
    } catch (err) { setEmpError(err.response?.data?.message || 'Save failed'); }
    finally { setEmpSaving(false); }
  };

  const toggleDept = (id) => {
    setEmpForm(f => ({
      ...f,
      department_ids: f.department_ids.includes(id)
        ? f.department_ids.filter(d => d !== id)
        : [...f.department_ids, id],
    }));
  };

  // ── Department form helpers ──
  const openAddDept = () => { setDeptForm(EMPTY_DEPT); setDeptError(''); setDeptModal({ mode: 'add' }); };
  const openEditDept = (dept) => {
    setDeptForm({ name: dept.name, is_active: dept.is_active });
    setDeptError('');
    setDeptModal({ mode: 'edit', id: dept.id });
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setDeptSaving(true); setDeptError('');
    try {
      if (deptModal.mode === 'add') await createDepartment(deptForm);
      else await updateDepartment(deptModal.id, deptForm);
      setDeptModal(null);
      await loadAll();
    } catch (err) { setDeptError(err.response?.data?.message || 'Save failed'); }
    finally { setDeptSaving(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>{tab === 'employees' ? 'Employees' : 'Departments'}</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          {tab === 'employees' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6a7a8a', cursor: 'pointer' }}>
                <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
                Show inactive
              </label>
              <button className="btn btn-primary" onClick={openAddEmp}>+ Add Employee</button>
            </>
          )}
          {tab === 'departments' && (
            <button className="btn btn-primary" onClick={openAddDept}>+ Add Department</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e8eaf0' }}>
        {['employees', 'departments'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, color: tab === t ? '#1a5c8a' : '#7a8a9a',
              borderBottom: tab === t ? '2px solid #1a5c8a' : '2px solid transparent',
              marginBottom: -2, textTransform: 'capitalize',
            }}
          >
            {t} ({t === 'employees' ? employees.length : departments.length})
          </button>
        ))}
      </div>

      {loading ? <div className="loading">Loading...</div> : (

        tab === 'employees' ? (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th><th>Name</th><th>Email</th><th>Phone</th>
                  <th>Role</th><th>Departments</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id} style={{ opacity: e.is_active ? 1 : 0.5 }}>
                    <td className="text-muted">{e.employee_code}</td>
                    <td className="customer-name">{e.first_name} {e.last_name}</td>
                    <td>{e.email || '—'}</td>
                    <td>{e.phone || '—'}</td>
                    <td>
                      <span style={{ background: '#f0f2f5', padding: '2px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
                        {e.role}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {e.departments.length > 0
                          ? e.departments.map(d => (
                              <span key={d.id} style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 11, padding: '2px 7px', borderRadius: 8, fontWeight: 600 }}>{d.name}</span>
                            ))
                          : <span className="text-muted">—</span>}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, color: e.is_active ? '#065f46' : '#6b7280', background: e.is_active ? '#d1fae5' : '#f3f4f6', padding: '2px 8px', borderRadius: 8 }}>
                        {e.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEditEmp(e)}>Edit</button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && <tr><td colSpan="8" className="empty">No employees found.</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card">
            <table className="table">
              <thead>
                <tr><th>Department</th><th>Active Staff</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {departments.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td>{d.employee_count}</td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 600, color: d.is_active ? '#065f46' : '#6b7280', background: d.is_active ? '#d1fae5' : '#f3f4f6', padding: '2px 8px', borderRadius: 8 }}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => openEditDept(d)}>Edit</button>
                    </td>
                  </tr>
                ))}
                {departments.length === 0 && <tr><td colSpan="4" className="empty">No departments found.</td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Employee Modal ── */}
      {empModal && (
        <Modal title={empModal.mode === 'add' ? 'Add Employee' : 'Edit Employee'} onClose={() => setEmpModal(null)}>
          <form onSubmit={handleEmpSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input className="input" required value={empForm.first_name} onChange={e => setEmpForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input className="input" required value={empForm.last_name} onChange={e => setEmpForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input className="input" value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input className="input" type="email" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select className="select" value={empForm.role} onChange={e => setEmpForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Departments</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {departments.filter(d => d.is_active).map(d => (
                  <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={empForm.department_ids.includes(d.id)}
                      onChange={() => toggleDept(d.id)}
                    />
                    {d.name}
                  </label>
                ))}
              </div>
            </div>
            {empModal.mode === 'edit' && (
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={empForm.is_active !== false}
                    onChange={e => setEmpForm(f => ({ ...f, is_active: e.target.checked }))}
                  />
                  Active employee
                </label>
              </div>
            )}
            {empError && <div className="error-msg">{empError}</div>}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={empSaving}>
                {empSaving ? 'Saving...' : empModal.mode === 'add' ? 'Add Employee' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEmpModal(null)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Department Modal ── */}
      {deptModal && (
        <Modal title={deptModal.mode === 'add' ? 'Add Department' : 'Edit Department'} onClose={() => setDeptModal(null)}>
          <form onSubmit={handleDeptSubmit}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Department Name *</label>
              <input className="input" required value={deptForm.name} onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            {deptModal.mode === 'edit' && (
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={deptForm.is_active} onChange={e => setDeptForm(f => ({ ...f, is_active: e.target.checked }))} />
                  Active department
                </label>
              </div>
            )}
            {deptError && <div className="error-msg">{deptError}</div>}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={deptSaving}>
                {deptSaving ? 'Saving...' : deptModal.mode === 'add' ? 'Add Department' : 'Save Changes'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setDeptModal(null)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 520, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#7a8a9a', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
