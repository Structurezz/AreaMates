import { useState, useEffect, useCallback } from 'react';
import { Menu, X, AlertTriangle, MapPin, Phone, Shield, Info, Zap } from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const SEVERITY_STYLE = {
  critical: { bar: 'bg-red-500',    badge: 'bg-red-500/20 text-red-400 border-red-500/30',    icon: Zap,           border: 'border-red-500/40',    title: 'text-red-400' },
  high:     { bar: 'bg-orange-500', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: AlertTriangle, border: 'border-orange-500/30', title: 'text-orange-400' },
  medium:   { bar: 'bg-amber-500',  badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',  icon: AlertTriangle, border: 'border-amber-500/20',  title: 'text-amber-400' },
  low:      { bar: 'bg-blue-500',   badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',    icon: Info,          border: 'border-blue-500/20',   title: 'text-blue-400' },
};

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
      <div className={`pointer-events-auto w-full max-w-md rounded-2xl bg-[#17171B] border ${style.border} shadow-2xl shadow-black/60 overflow-hidden animate-slide-down`}>
        {/* severity bar */}
        <div className={`h-1 w-full ${style.bar}`} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${style.badge}`}>
                <Icon size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${style.title}`}>{sev} severity</span>
                  <span className="text-white/20 text-xs">·</span>
                  <span className="text-white/30 text-xs">Estate Broadcast</span>
                </div>
                <p className="text-white font-bold text-base mt-0.5 leading-tight">
                  {alert.title || alert.type?.replace('_', ' ') || 'Estate Broadcast'}
                </p>
              </div>
            </div>
            <button onClick={onDismiss}
              className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 mt-0.5">
              <X size={16} />
            </button>
          </div>

          {/* Message */}
          {alert.note && (
            <p className="text-white/70 text-sm leading-relaxed mb-4 bg-white/5 rounded-xl px-4 py-3">
              {alert.note}
            </p>
          )}

          {/* Meta */}
          <div className="space-y-2">
            {alert.location && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <MapPin size={13} className="text-white/30 flex-shrink-0" />
                <span>{alert.location}</span>
              </div>
            )}
            {alert.actionRequired && (
              <div className="flex items-start gap-2 text-sm">
                <Shield size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="text-amber-300/80 font-medium">{alert.actionRequired}</span>
              </div>
            )}
            {alert.contactNumber && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Phone size={13} className="text-white/30 flex-shrink-0" />
                <span>{alert.contactNumber}</span>
              </div>
            )}
          </div>

          {/* Dismiss */}
          <button onClick={onDismiss}
            className="mt-4 w-full py-2 rounded-xl text-sm font-medium bg-white/8 hover:bg-white/12 text-white/60 hover:text-white transition-all">
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
      if (alert.isEmergencyBroadcast) {
        setBroadcast(alert);
      }
    });
    return unsub;
  }, [subscribe]);

  return (
    <div className="flex h-screen bg-navy overflow-hidden">
      {/* Broadcast popup */}
      {broadcast && <BroadcastPopup alert={broadcast} onDismiss={handleDismiss} />}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
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
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#111115]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all"
          >
            <Menu size={22} />
          </button>
          <span className="font-medium text-white flex-1">Estate Portal</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1C1C20', color: '#E4E4E7', border: '1px solid #2E2E33', borderRadius: '8px', fontSize: '0.875rem' },
          success: { iconTheme: { primary: '#10B981', secondary: '#1C1C20' } },
        }}
      />
    </div>
  );
}
