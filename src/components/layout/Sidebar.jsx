import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, UserCheck, ShoppingBag, MessageSquare, Bell, LogOut, CreditCard, Music, Calendar, BarChart2 } from 'lucide-react';

const NAV = [
  {
    section: 'Home',
    links: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/visitors',   icon: UserCheck,        label: 'My Visitors' },
      { to: '/payments',   icon: CreditCard,        label: 'Payments' },
    ],
  },
  {
    section: 'Community',
    links: [
      { to: '/lounge',     icon: Music,             label: 'Resident Lounge' },
      { to: '/events',     icon: Calendar,           label: 'Event Board' },
      { to: '/polls',      icon: BarChart2,          label: 'Polls & Voting' },
      { to: '/marketplace',icon: ShoppingBag,        label: 'Marketplace' },
      { to: '/chat',       icon: MessageSquare,      label: 'Community Chat' },
    ],
  },
  {
    section: 'Safety',
    links: [
      { to: '/alerts',     icon: Bell,              label: 'Alert Security' },
    ],
  },
];

export default function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const estateName = user?.estateId && typeof user.estateId === 'object' ? user.estateId.name : 'AreaMates';

  return (
    <aside className={`flex flex-col h-full bg-white border-r border-[#E2E8F0] ${mobile ? 'w-72' : 'w-64'}`}>
      {/* Brand header */}
      <Link to="/dashboard" className="block p-5 border-b border-[#E2E8F0] transition-opacity hover:opacity-80" style={{ textDecoration: 'none' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}
          >
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
              <path d="M20 4L6 12v16l14 8 14-8V12L20 4z" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none"/>
              <path d="M20 9L9 15.5v13L20 35l11-6.5v-13L20 9z" fill="rgba(255,255,255,0.15)"/>
              <text x="20" y="25" textAnchor="middle" fill="white" fontSize="12" fontWeight="800" fontFamily="system-ui,sans-serif">AM</text>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight" style={{ letterSpacing: '-0.02em' }}>
              <span style={{ color: '#0F172A' }}>Area</span><span style={{ color: '#6366F1' }}>Mates</span>
            </div>
            <div className="text-xs font-medium mt-0.5 truncate" style={{ color: '#94A3B8' }}>{estateName}</div>
          </div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {NAV.map(({ section, links }) => (
          <div key={section}>
            <p className="text-xs font-semibold uppercase tracking-widest px-3 pb-1.5" style={{ color: '#94A3B8' }}>
              {section}
            </p>
            <div className="space-y-0.5">
              {links.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/dashboard'}
                  onClick={onClose}
                  className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
                >
                  <Icon size={16} /><span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-3 p-2 rounded-xl mb-1">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#4F46E5' }}
          >
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{user?.name}</div>
            <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{user?.email}</div>
          </div>
        </div>
        <button
          onClick={async () => { await logout(); navigate('/login'); }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl transition-all text-sm mt-1"
          style={{ color: '#94A3B8' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = '#FEF2F2'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}
