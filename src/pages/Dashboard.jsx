import { useEffect, useState } from 'react';
import { visitorAPI, announcementAPI, alertAPI, estateAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  UserCheck, Bell, Megaphone, Plus, Pin, ShoppingBag, MessageSquare, Home,
  ChevronRight, Shield, Clock, Siren, X, MapPin, Sparkles,
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import { visitorStatusBadge } from '../components/ui/Badge';
import { format } from 'date-fns';
import Spinner from '../components/ui/Spinner';
import CampaignModal from '../components/ui/CampaignModal';
import EstateMap from '../components/EstateMap';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = {
  general:     '#3B82F6',
  urgent:      '#EF4444',
  event:       '#6366F1',
  maintenance: '#F59E0B',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [myVisitors, setMyVisitors] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [estate, setEstate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerting, setAlerting] = useState(false);
  const [showAlertConfirm, setShowAlertConfirm] = useState(false);

  const estateId = user?.estateId?._id || user?.estateId;

  useEffect(() => {
    const calls = [
      visitorAPI.getAll({ limit: 4 }),
      announcementAPI.getAll({ limit: 4 }),
    ];
    if (estateId) calls.push(estateAPI.getOne(estateId));

    Promise.all(calls).then((results) => {
      const [v, a, e] = results;
      setMyVisitors(v.data.data);
      setAnnouncements(a.data.data);
      if (e) setEstate(e.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [estateId]);

  const handleAlert = async () => {
    setAlerting(true);
    setShowAlertConfirm(false);
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
  const firstName = user?.name?.split(' ')[0] || 'there';
  const estateName = estate?.name || (typeof user?.estateId === 'object' ? user.estateId.name : null) || 'Your Estate';
  const activeVisitors = myVisitors.filter((v) => v.status === 'active' || v.status === 'checked-in');

  return (
    <div className="space-y-4 sm:space-y-5 animate-fade-in">
      <CampaignModal />

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-7"
        style={{
          background:
            'radial-gradient(120% 90% at 100% 0%, #818CF8 0%, transparent 55%),' +
            'radial-gradient(90% 80% at 0% 100%, #4338CA 0%, transparent 60%),' +
            'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
          boxShadow:
            '0 20px 44px -18px rgba(67,56,202,0.55), 0 10px 22px -12px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        {/* Dot mesh */}
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 70%)',
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9) 0%, transparent 70%)',
          }} />
        {/* Glow blobs */}
        <div className="absolute -top-14 -right-10 w-52 h-52 rounded-full pointer-events-none blur-2xl"
          style={{ background: 'rgba(196,181,253,0.35)' }} />
        <div className="absolute -bottom-16 -left-10 w-52 h-52 rounded-full pointer-events-none blur-2xl"
          style={{ background: 'rgba(67,56,202,0.55)' }} />

        <div className="relative">
          {/* Top pill row */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(6px)' }}>
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-indigo-200 animate-ping opacity-75" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
              </span>
              Live
            </span>
            {unitLabel ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full truncate max-w-[60%]"
                style={{ background: 'rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.20)' }}>
                <Home size={10} /> {unitLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.16)' }}>
                No unit assigned
              </span>
            )}
          </div>

          {/* Greeting row + panic */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] sm:text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
                {greeting()},
              </div>
              <h1 className="text-[22px] sm:text-3xl font-bold text-white leading-tight" style={{ letterSpacing: '-0.03em' }}>
                {firstName}
                <Sparkles size={16} className="inline ml-1.5 -mt-1" style={{ color: '#FDE68A' }} />
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {format(new Date(), 'EEE, MMM d')}{estate?.address ? ` · ${estate.address.split(',')[0]}` : ''}
              </p>
            </div>

            {/* Panic — compact circle on mobile, tag on desktop */}
            <button
              onClick={() => setShowAlertConfirm(true)}
              disabled={alerting}
              className="relative flex-shrink-0 flex flex-col items-center justify-center rounded-2xl font-bold text-[10px] sm:text-xs transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.98), rgba(220,38,38,0.98))',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.30)',
                minWidth: 68, minHeight: 68,
                padding: '10px 8px',
                boxShadow: '0 8px 24px rgba(239,68,68,0.45)',
              }}>
              <div className="absolute inset-0 rounded-2xl border-2 border-red-300 animate-ping opacity-30 pointer-events-none" />
              <Shield size={20} strokeWidth={2.5} />
              <span className="mt-0.5">{alerting ? 'SENDING' : 'SOS'}</span>
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { label: 'Active',    value: activeVisitors.length },
              { label: 'Visitors',  value: myVisitors.length },
              { label: 'Notices',   value: announcements.length },
            ].map(({ label, value }) => (
              <div key={label}
                className="rounded-xl px-2 py-2.5 sm:p-3.5 text-center"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  backdropFilter: 'blur(8px)',
                }}>
                <div className="text-xl sm:text-2xl font-bold text-white leading-none">{value}</div>
                <div className="text-[10px] sm:text-xs mt-1 font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions — 2x2 grid on mobile, 4-across on desktop */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {[
          { to: '/visitors/new', icon: UserCheck,     label: 'Invite',       bg: 'rgba(99,102,241,0.10)',  color: '#4F46E5' },
          { to: '/marketplace',  icon: ShoppingBag,   label: 'Market',       bg: 'rgba(245,158,11,0.10)',  color: '#D97706' },
          { to: '/chat',         icon: MessageSquare, label: 'Chat',         bg: 'rgba(59,130,246,0.10)',  color: '#2563EB' },
          { to: '/alerts',       icon: Bell,          label: 'Alerts',       bg: 'rgba(239,68,68,0.10)',   color: '#DC2626' },
        ].map(({ to, icon: Icon, label, bg, color }) => (
          <Link
            key={to}
            to={to}
            className="glass-card px-2 py-3 sm:p-4 flex flex-col items-center text-center gap-2 transition-all active:scale-95"
            style={{ textDecoration: 'none' }}>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center"
              style={{ background: bg }}>
              <Icon size={19} style={{ color }} />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold leading-tight" style={{ color: '#334155' }}>{label}</span>
          </Link>
        ))}
      </div>

      {/* ── Estate Map — prominent on mobile, right rail on desktop ── */}
      <div className="lg:hidden">
        <EstateMap
          name={estateName}
          address={estate?.address}
          location={estate?.location}
          height={220}
          variant="card"
        />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Left column (2/3 on desktop) */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">

          {/* My Visitor Passes */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3"
              style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
              <h2 className="font-semibold flex items-center gap-2 text-sm" style={{ color: '#0F172A' }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(99,102,241,0.10)' }}>
                  <UserCheck size={13} style={{ color: '#4F46E5' }} />
                </div>
                My Visitor Passes
              </h2>
              <Link to="/visitors/new" className="btn-primary text-xs px-3 py-1.5 gap-1">
                <Plus size={12} /> New
              </Link>
            </div>

            {myVisitors.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <UserCheck size={32} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
                <p className="text-sm mb-3" style={{ color: '#94A3B8' }}>No visitors registered yet</p>
                <Link to="/visitors/new" className="btn-primary text-sm gap-1.5 inline-flex">
                  <Plus size={14} /> Invite Your First Visitor
                </Link>
              </div>
            ) : (
              <div>
                {myVisitors.map((v) => (
                  <Link
                    key={v._id}
                    to={`/visitors/${v._id}`}
                    className="flex items-center gap-3 px-4 sm:px-5 py-3 transition-colors active:bg-slate-50"
                    style={{ borderBottom: '1px solid rgba(15,23,42,0.05)', textDecoration: 'none' }}>
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
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
                      <span className="font-mono text-[11px]" style={{ color: '#6366F1' }}>{v.visitorCode}</span>
                    </div>
                  </Link>
                ))}
                <div className="px-4 sm:px-5 py-3">
                  <Link to="/visitors" className="text-xs hover:underline flex items-center gap-1 font-medium" style={{ color: '#6366F1' }}>
                    View all passes <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Estate Announcements */}
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3"
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
              <div className="p-6 sm:p-8 text-center">
                <Megaphone size={32} className="mx-auto mb-2" style={{ color: '#CBD5E1' }} />
                <p className="text-sm" style={{ color: '#94A3B8' }}>No announcements yet</p>
              </div>
            ) : (
              <div>
                {announcements.map((a) => (
                  <div key={a._id}
                    className="px-4 sm:px-5 py-3.5"
                    style={{ borderBottom: '1px solid rgba(15,23,42,0.05)' }}>
                    <div className="flex items-start gap-2 mb-1">
                      {a.isPinned && <Pin size={12} style={{ color: '#6366F1', marginTop: 3, flexShrink: 0 }} />}
                      <div className="min-w-0">
                        <div className="font-medium text-sm leading-tight" style={{ color: '#0F172A' }}>{a.title}</div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: CATEGORY_COLORS[a.category] || '#94A3B8' }}>
                          {a.category}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs line-clamp-2 mb-1.5" style={{ color: '#64748B' }}>{a.body}</p>
                    <div className="text-[10px]" style={{ color: '#CBD5E1' }}>
                      {format(new Date(a.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column (1/3 on desktop only — map shown above on mobile) */}
        <div className="hidden lg:block space-y-5">
          <EstateMap
            name={estateName}
            address={estate?.address}
            location={estate?.location}
            height={280}
            variant="card"
          />

          {/* Emergency — desktop version */}
          <div className="glass-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
              style={{ color: '#64748B' }}>
              <Siren size={14} style={{ color: '#EF4444' }} /> Emergency
            </h2>
            <button
              onClick={() => setShowAlertConfirm(true)}
              disabled={alerting}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl font-bold text-white transition-all active:scale-98"
              style={{
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                padding: '14px',
                fontSize: 14,
                boxShadow: '0 8px 20px rgba(239,68,68,0.30)',
              }}>
              <Bell size={17} />
              {alerting ? 'SENDING…' : 'ALERT SECURITY'}
            </button>
            <p className="text-center text-[11px] mt-2" style={{ color: '#94A3B8' }}>
              Notifies security with your name and unit
            </p>
          </div>
        </div>
      </div>

      {/* Mobile-only slim emergency bar */}
      <div className="lg:hidden glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <Siren size={18} style={{ color: '#DC2626' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm" style={{ color: '#0F172A' }}>Emergency</div>
            <div className="text-[11px]" style={{ color: '#94A3B8' }}>Instantly alerts security</div>
          </div>
          <button
            onClick={() => setShowAlertConfirm(true)}
            disabled={alerting}
            className="text-xs font-bold px-4 py-2.5 rounded-xl text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 4px 12px rgba(239,68,68,0.35)' }}>
            {alerting ? 'SENDING' : 'ALERT'}
          </button>
        </div>
      </div>

      {/* ── Alert Confirm Modal ── */}
      {showAlertConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          background: 'rgba(0,0,0,0.70)',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 360,
            overflow: 'hidden', boxShadow: '0 24px 64px rgba(239,68,68,0.25)',
            border: '2px solid #EF4444',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              padding: '22px 20px 18px', textAlign: 'center', position: 'relative',
            }}>
              <button
                onClick={() => setShowAlertConfirm(false)}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(255,255,255,0.2)', border: 'none',
                  borderRadius: 8, width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}
              ><X size={14} /></button>
              <div style={{
                width: 56, height: 56, borderRadius: 99,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px',
              }}>
                <Siren size={26} color="#fff" />
              </div>
              <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>Send Security Alert?</h2>
            </div>

            <div style={{ padding: '18px 20px 22px' }}>
              <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6, margin: '0 0 18px', textAlign: 'center' }}>
                Security will be notified immediately with your name and unit number.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowAlertConfirm(false)}
                  style={{
                    flex: 1, padding: '12px', background: '#F1F5F9',
                    color: '#64748B', border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >Cancel</button>
                <button
                  onClick={handleAlert}
                  disabled={alerting}
                  style={{
                    flex: 2, padding: '12px', background: '#EF4444',
                    color: '#fff', border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {alerting ? 'Sending...' : 'Yes, Alert Security'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
