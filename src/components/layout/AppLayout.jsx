import { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  LayoutDashboard, UserCheck, CreditCard, MessageSquare, Bell, Lock,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import NotificationBell from '../ui/NotificationBell';
import PodcastLivePill from '../PodcastLivePill';
import LiveNotificationModal from '../LiveNotificationModal';


const BOTTOM_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/visitors',  icon: UserCheck,       label: 'Visitors', feature: 'visitorManagement' },
  { to: '/payments',  icon: CreditCard,      label: 'Payments', feature: 'paymentSystem' },
  { to: '/chat',      icon: MessageSquare,   label: 'Chat',     feature: 'communityChat' },
  { to: '/alerts',    icon: Bell,            label: 'Alerts',   feature: 'securityPortal' },
];


export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { can } = usePlan();


  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="overlay-backdrop" aria-hidden="true" />
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
          <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1 }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
              <span className="text-white font-black text-[10px]">AM</span>
            </div>
            <span className="font-bold text-base" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
              Area<span style={{ color: '#6366F1' }}>Mates</span>
            </span>
          </Link>
          <NotificationBell />
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

      {/* Floating "AreaConnect FM is LIVE" pill */}
      <PodcastLivePill />

      {/* Live notification modal (DJ / Announcement / Podcast) */}
      <LiveNotificationModal />

      {/* ── Mobile bottom navigation ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t"
        style={{ borderTopColor: '#E2E8F0', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {BOTTOM_NAV.map(({ to, icon: Icon, label, feature }) => {
            const locked = feature ? !can(feature) : false;
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/dashboard'}
                className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all"
                style={({ isActive }) => ({
                  color: isActive ? '#6366F1' : '#94A3B8',
                  opacity: locked ? 0.45 : 1,
                })}
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <Icon size={21} strokeWidth={isActive ? 2.2 : 1.8} />
                      {isActive && !locked && (
                        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      )}
                      {locked && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center"
                          style={{ border: '1px solid #E2E8F0' }}>
                          <Lock size={7} style={{ color: '#94A3B8' }} />
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold">{label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
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
