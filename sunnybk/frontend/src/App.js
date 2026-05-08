import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EnquiriesList from './pages/EnquiriesList';
import NewEnquiry from './pages/NewEnquiry';
import EnquiryDetail from './pages/EnquiryDetail';
import Customers from './pages/Customers';
import Employees from './pages/Employees';
import VisitsList from './pages/VisitsList';
import ScheduleVisit from './pages/ScheduleVisit';
import VisitDetail from './pages/VisitDetail';
import DailySchedule from './pages/DailySchedule';
import OrdersList from './pages/OrdersList';
import OrderDetail from './pages/OrderDetail';
import Reports from './pages/Reports';
import PendingPayments from './pages/PendingPayments';
import './App.css';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading" style={{ marginTop: 80 }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          {/* All authenticated users */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/enquiries" element={<EnquiriesList />} />
          <Route path="/enquiries/new" element={<NewEnquiry />} />
          <Route path="/enquiries/:id" element={<EnquiryDetail />} />

          {/* Admin only */}
          <Route path="/visits" element={<RequireAdmin><VisitsList /></RequireAdmin>} />
          <Route path="/visits/schedule" element={<RequireAdmin><ScheduleVisit /></RequireAdmin>} />
          <Route path="/visits/:id" element={<RequireAdmin><VisitDetail /></RequireAdmin>} />
          <Route path="/schedule" element={<RequireAdmin><DailySchedule /></RequireAdmin>} />
          <Route path="/orders" element={<RequireAdmin><OrdersList /></RequireAdmin>} />
          <Route path="/orders/:id" element={<RequireAdmin><OrderDetail /></RequireAdmin>} />
          <Route path="/reports"  element={<RequireAdmin><Reports /></RequireAdmin>} />
          <Route path="/payments" element={<RequireAdmin><PendingPayments /></RequireAdmin>} />
          <Route path="/customers" element={<RequireAdmin><Customers /></RequireAdmin>} />
          <Route path="/employees" element={<RequireAdmin><Employees /></RequireAdmin>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<RequireAuth><AppLayout /></RequireAuth>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
