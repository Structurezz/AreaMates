import { useEffect, useState } from 'react';
import { visitorAPI, announcementAPI, alertAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  UserCheck, Bell, Megaphone, Plus, Pin,
  ShoppingBag, MessageSquare, Home, AlertTriangle,
  ChevronRight, Shield, Clock
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import { visitorStatusBadge } from '../components/ui/Badge';
import { format } from 'date-fns';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = {
  general:     '#3B82F6',
  urgent:      '#EF4444',
  event:       '#6366F1',
  maintenance: '#F59E0B',
};

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [myVisitors, setMyVisitors] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerting, setAlerting] = useState(false);

  useEffect(() => {
    Promise.all([
      visitorAPI.getAll({ limit: 4 }),
      announcementAPI.getAll({ limit: 5 }),
    ]).then(([v, a]) => {
      setMyVisitors(v.data.data);
      setAnnouncements(a.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleAlert = async () => {
    if (!confirm('Send security alert to the gate? Security will be notified immediately.')) return;
    setAlerting(true);
    try {
      await alertAPI.create({ type: 'security', note: 'Resident triggered alert from dashboard' });
      toast.success('Security alerted! Help is on the way.', { duration: 5000 });
    } catch {
      toast.error('Failed to send alert. Try again.');
    } finally {
      setAlerting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;

  const unitLabel = user?.unitId
    ? `Unit ${user.unitId.unitNumber}${user.unitId.block ? ` · Block ${user.unitId.block}` : ''}`
    : null;

  const activeVisitors = myVisitors.filter((v) => v.status === 'active' || v.status === 'checked-in');

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 60%, #4338CA 100%)' }}
      >
        {/* Decorative */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.05)' }} />

        <div className="relative">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                {unitLabel ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.95)' }}>
                    <Home size={10} /> {unitLabel}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.70)' }}>
                    No unit assigned
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1" style={{ letterSpacing: '-0.03em' }}>
                Welcome back, {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>
                {format(new Date(), 'EEEE, MMMM d')}
              </p>
            </div>

            {/* Panic button */}
            <button
              onClick={handleAlert}
              disabled={alerting}
              className="flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl font-bold text-xs transition-all relative overflow-hidden"
              style={{ background: 'rgba(239,68,68,0.90)', color: 'white', border: '2px solid rgba(255,255,255,0.30)', minWidth: 72 }}>
              <div className="absolute inset-0 rounded-2xl border-2 border-red-300 animate-ping opacity-40 pointer-events-none" />
              <Shield size={20} />
              <span>{alerting ? 'ALERTING' : 'ALERT'}</span>
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Active Passes', value: activeVisitors.length },
              { label: 'Total Visitors', value: myVisitors.length },
              { label: 'Notices', value: announcements.length },
            ].map(({ label, value }) => (
              <div key={label}
                className="rounded-xl p-3 sm:p-4 text-center"
                style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.70)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/visitors/new', icon: UserCheck,     label: 'Invite Visitor',  bg: 'rgba(99,102,241,0.08)',  color: '#4F46E5',  border: 'rgba(99,102,241,0.20)' },
          { to: '/marketplace',  icon: ShoppingBag,   label: 'Marketplace',     bg: 'rgba(245,158,11,0.08)',  color: '#D97706',  border: 'rgba(245,158,11,0.20)' },
          { to: '/chat',         icon: MessageSquare, label: 'Community Chat',  bg: 'rgba(59,130,246,0.08)',  color: '#2563EB',  border: 'rgba(59,130,246,0.20)' },
          { to: '/alerts',       icon: Bell,          label: 'Alert Center',    bg: 'rgba(239,68,68,0.08)',   color: '#DC2626',  border: 'rgba(239,68,68,0.20)' },
        ].map(({ to, icon: Icon, label, bg, color, border }) => (
          <Link
            key={to}
            to={to}
            className="glass-card p-4 flex flex-col items-center text-center gap-2.5 transition-all"
            style={{ textDecoration: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.07)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: bg, border: `1px solid ${border}` }}>
              <Icon size={18} style={{ color }} />
            </div>
            <span className="text-xs font-medium leading-tight" style={{ color: '#475569' }}>{label}</span>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* My Visitor Passes */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4"
            style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <h2 className="font-semibold flex items-center gap-2 text-sm" style={{ color: '#0F172A' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.10)' }}>
                <UserCheck size={13} style={{ color: '#4F46E5' }} />
              </div>
              My Visitor Passes
            </h2>
            <Link to="/visitors/new" className="btn-primary text-xs px-3 py-1.5 gap-1">
              <Plus size={12} /> New Pass
            </Link>
          </div>

          {myVisitors.length === 0 ? (
            <div className="p-8 text-center">
              <UserCheck size={32} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
              <p className="text-sm mb-3" style={{ color: '#94A3B8' }}>No visitors registered yet</p>
              <Link to="/visitors/new" className="btn-primary text-sm gap-1.5">
                <Plus size={14} /> Invite Your First Visitor
              </Link>
            </div>
          ) : (
            <div>
              {myVisitors.map((v) => (
                <div key={v._id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: '1px solid rgba(15,23,42,0.05)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)', color: '#4F46E5' }}>
                    {v.visitorName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate" style={{ color: '#0F172A' }}>{v.visitorName}</div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: '#94A3B8' }}>
                      <Clock size={10} />
                      {format(new Date(v.expectedDate), 'MMM d, p')}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
                    <span className="font-mono text-xs" style={{ color: '#6366F1' }}>{v.visitorCode}</span>
                  </div>
                </div>
              ))}
              <div className="px-5 py-3">
                <Link to="/visitors" className="text-xs hover:underline flex items-center gap-1" style={{ color: '#6366F1' }}>
                  View all passes <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Estate Announcements */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4"
            style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
            <h2 className="font-semibold flex items-center gap-2 text-sm" style={{ color: '#0F172A' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.10)' }}>
                <Megaphone size={13} style={{ color: '#D97706' }} />
              </div>
              Estate Notices
            </h2>
          </div>

          {announcements.length === 0 ? (
            <div className="p-8 text-center">
              <Megaphone size={32} className="mx-auto mb-2" style={{ color: '#CBD5E1' }} />
              <p className="text-sm" style={{ color: '#94A3B8' }}>No announcements yet</p>
            </div>
          ) : (
            <div>
              {announcements.map((a) => (
                <div key={a._id}
                  className="px-5 py-4 transition-colors"
                  style={{ borderBottom: '1px solid rgba(15,23,42,0.05)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className="flex items-start gap-2 mb-1.5">
                    {a.isPinned && <Pin size={12} style={{ color: '#6366F1', marginTop: 2, flexShrink: 0 }} />}
                    <div>
                      <div className="font-medium text-sm leading-tight" style={{ color: '#0F172A' }}>{a.title}</div>
                      <div className="text-xs font-medium capitalize mt-0.5" style={{ color: CATEGORY_COLORS[a.category] || '#94A3B8' }}>
                        {a.category}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs line-clamp-2 mb-2" style={{ color: '#64748B' }}>{a.body}</p>
                  <div className="text-xs" style={{ color: '#CBD5E1' }}>
                    {format(new Date(a.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Emergency */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
          style={{ color: '#94A3B8' }}>
          <AlertTriangle size={14} style={{ color: '#EF4444' }} /> Emergency
        </h2>
        <button
          onClick={handleAlert}
          disabled={alerting}
          className="panic-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <div className="pulse-ring" />
          <Bell size={22} />
          {alerting ? 'SENDING ALERT...' : 'ALERT SECURITY NOW'}
        </button>
        <p className="text-center text-xs mt-2" style={{ color: '#CBD5E1' }}>
          Instantly notifies all security personnel with your name and unit number
        </p>
      </div>
    </div>
  );
}
