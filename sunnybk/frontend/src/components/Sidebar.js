import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ADMIN_NAV = [
  { section: 'Overview',   items: [{ to: '/', label: 'Dashboard', icon: '⬛' }] },
  { section: 'Enquiries',  items: [{ to: '/enquiries', label: 'All Enquiries', icon: '📋' }, { to: '/enquiries/new', label: 'New Enquiry', icon: '➕' }] },
  { section: 'Visits',     items: [{ to: '/visits', label: 'All Visits', icon: '📅' }, { to: '/schedule', label: 'Daily Schedule', icon: '🗓️' }, { to: '/visits/schedule', label: 'Schedule Visit', icon: '➕' }] },
  { section: 'Orders',     items: [{ to: '/orders', label: 'All Orders', icon: '🛒' }, { to: '/payments', label: 'Pending Payments', icon: '💳' }] },
  { section: 'Reports',    items: [{ to: '/reports', label: 'Reports', icon: '📊' }] },
  { section: 'Customers',  items: [{ to: '/customers', label: 'Customers', icon: '👥' }] },
  { section: 'Team',       items: [{ to: '/employees', label: 'Employees', icon: '🧑‍💼' }] },
];

const EMPLOYEE_NAV = [
  { section: 'Overview',   items: [{ to: '/', label: 'Dashboard', icon: '⬛' }] },
  { section: 'Enquiries',  items: [{ to: '/enquiries', label: 'All Enquiries', icon: '📋' }, { to: '/enquiries/new', label: 'New Enquiry', icon: '➕' }] },
];

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = isAdmin ? ADMIN_NAV : EMPLOYEE_NAV;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h2>Sunny BK</h2>
        <p>CRM System</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(s => (
          <div key={s.section}>
            <div className="nav-section-label">{s.section}</div>
            {s.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User info + logout */}
      {user && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid #263040', marginTop: 'auto' }}>
          <div style={{ fontSize: 13, color: '#c8d0dc', fontWeight: 600, marginBottom: 2 }}>
            {user.first_name} {user.last_name}
          </div>
          <div style={{ fontSize: 11, color: '#4a5a6a', marginBottom: 12 }}>
            {user.role} · {user.employee_code}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '7px 12px', background: 'rgba(255,255,255,0.07)',
              border: '1px solid #263040', borderRadius: 6, color: '#8a9ab0',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
            }}
          >
            🚪 Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
