import { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Menu, X, AlertTriangle, MapPin, Phone, Shield, Info, Zap,
  LayoutDashboard, UserCheck, CreditCard, MessageSquare, Bell,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const SEVERITY_STYLE = {
  critical: { bar: 'bg-red-500',    badge: 'bg-red-50 text-red-600 border-red-200',    icon: Zap,           border: 'border-red-200',    title: 'text-red-600' },
  high:     { bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-600 border-orange-200', icon: AlertTriangle, border: 'border-orange-200', title: 'text-orange-600' },
  medium:   { bar: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-600 border-amber-200',  icon: AlertTriangle, border: 'border-amber-200',  title: 'text-amber-600' },
  low:      { bar: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-600 border-blue-200',    icon: Info,          border: 'border-blue-200',   title: 'text-blue-600' },
};

const BOTTOM_NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Home' },
  { to: '/visitors',    icon: UserCheck,        label: 'Visitors' },
  { to: '/payments',    icon: CreditCard,        label: 'Payments' },
  { to: '/chat',        icon: MessageSquare,    label: 'Chat' },
  { to: '/alerts',      icon: Bell,             label: 'Alerts' },
];

function BroadcastPopup({ alert, onDismiss }) {
  const sev = alert.severity || 'high';
  const style = SEVERITY_STYLE[sev] || SEVERITY_STYLE.high;
  const Icon = style.icon;

  useEffect(() => {
    if (sev === 'critical') return;
    const t = setTimeout(onDismiss, sev === 'high' ? 20000 : 12000);
    return () => clearTimeout(t);
  }, [sev, onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-6 pointer-events-none">
      <div className={`pointer-events-auto w-full max-w-md rounded-2xl bg-white border ${style.border} shadow-2xl shadow-black/10 overflow-hidden animate-slide-down`}>
        <div className={`h-1 w-full ${style.bar}`} />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${style.badge}`}>
                <Icon size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${style.title}`}>{sev} severity</span>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="text-slate-400 text-xs">Estate Broadcast</span>
                </div>
                <p className="text-slate-900 font-bold text-base mt-0.5 leading-tight">
                  {alert.title || alert.type?.replace('_', ' ') || 'Estate Broadcast'}
                </p>
              </div>
            </div>
            <button onClick={onDismiss} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex-shrink-0 mt-0.5">
              <X size={16} />
            </button>
          </div>
          {alert.note && (
            <p className="text-slate-600 text-sm leading-relaxed mb-4 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              {alert.note}
            </p>
          )}
          <div className="space-y-2">
            {alert.location && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                <span>{alert.location}</span>
              </div>
            )}
            {alert.actionRequired && (
              <div className="flex items-start gap-2 text-sm">
                <Shield size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <span className="text-amber-700 font-medium">{alert.actionRequired}</span>
              </div>
            )}
            {alert.contactNumber && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Phone size={13} className="text-slate-400 flex-shrink-0" />
                <span>{alert.contactNumber}</span>
              </div>
            )}
          </div>
          <button onClick={onDismiss} className="mt-4 w-full py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-all">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [broadcast, setBroadcast] = useState(null);
  const { subscribe } = useSocket() || {};

  const handleDismiss = useCallback(() => setBroadcast(null), []);

  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('new_alert', (alert) => {
      if (alert.isEmergencyBroadcast) setBroadcast(alert);
    });
    return unsub;
  }, [subscribe]);

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {broadcast && <BroadcastPopup alert={broadcast} onDismiss={handleDismiss} />}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 bottom-0 z-50 animate-slide-in">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-14 border-b bg-white flex-shrink-0"
          style={{ borderBottomColor: '#E2E8F0' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
            <span className="text-white font-black text-[10px]">AM</span>
          </div>
          <span className="font-bold flex-1 text-base" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
            Area<span style={{ color: '#6366F1' }}>Mates</span>
          </span>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl transition-all"
            style={{ color: '#64748B' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Page content — pb-20 on mobile to clear bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 lg:p-8 lg:pb-8">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom navigation ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t"
        style={{ borderTopColor: '#E2E8F0', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {BOTTOM_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all"
              style={({ isActive }) => ({
                color: isActive ? '#6366F1' : '#94A3B8',
              })}
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} />
                    {isActive && (
                      <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    )}
                  </div>
                  <span className="text-[10px] font-semibold">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#0F172A',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            fontSize: '0.875rem',
            boxShadow: '0 4px 16px rgba(15,23,42,0.10)',
          },
          success: { iconTheme: { primary: '#6366F1', secondary: '#FFFFFF' } },
        }}
      />
    </div>
  );
}
