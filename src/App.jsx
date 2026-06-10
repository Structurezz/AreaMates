import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';
import { LoadingScreen } from './components/ui/Spinner';
import { Toaster } from 'react-hot-toast';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Visitors from './pages/Visitors';
import VisitorDetail from './pages/VisitorDetail';
import Marketplace from './pages/Marketplace';
import Chat from './pages/Chat';
import AlertPage from './pages/AlertPage';
import Payments from './pages/Payments';
import Lounge from './pages/Lounge';
import EventBoard from './pages/EventBoard';
import Polls from './pages/Polls';

function RequireResident({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'resident') {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass-card p-8 max-w-sm text-center">
          <p className="text-red-400 font-semibold mb-2">Access Denied</p>
          <p className="text-white/50 text-sm">This portal is for Residents only.</p>
        </div>
      </div>
    );
  }
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={user?.role === 'resident' ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user?.role === 'resident' ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/invite/:estateCode" element={<Register />} />
      <Route path="/dashboard" element={<RequireResident><Dashboard /></RequireResident>} />
      <Route path="/visitors" element={<RequireResident><Visitors /></RequireResident>} />
      <Route path="/visitors/new" element={<RequireResident><Visitors /></RequireResident>} />
      <Route path="/visitors/:id" element={<RequireResident><VisitorDetail /></RequireResident>} />
      <Route path="/marketplace" element={<RequireResident><Marketplace /></RequireResident>} />
      <Route path="/chat" element={<RequireResident><Chat /></RequireResident>} />
      <Route path="/payments" element={<RequireResident><Payments /></RequireResident>} />
      <Route path="/alerts" element={<RequireResident><AlertPage /></RequireResident>} />
      <Route path="/lounge" element={<RequireResident><Lounge /></RequireResident>} />
      <Route path="/events" element={<RequireResident><EventBoard /></RequireResident>} />
      <Route path="/polls" element={<RequireResident><Polls /></RequireResident>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            style: { background: '#1C1C20', color: '#E4E4E7', border: '1px solid #2E2E33', borderRadius: '8px', fontSize: '0.875rem' },
            success: { iconTheme: { primary: '#10B981', secondary: '#1C1C20' } },
          }} />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
