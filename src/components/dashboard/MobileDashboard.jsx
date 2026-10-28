import { Link } from 'react-router-dom';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  UserPlus, ShoppingBag, MessageSquare, Music, CreditCard, Phone, Scale, Bell,
  LogIn, LogOut, CalendarClock, Megaphone, Siren, Home, ArrowUpRight, ShieldCheck,
} from 'lucide-react';
import EstateMap from '../EstateMap';
import useCountUp from '../../hooks/useCountUp';
import { CampaignBanner } from '../campaigns/CampaignSlots';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const ago = (d) => {
  try {
    return formatDistanceToNowStrict(new Date(d), { addSuffix: true })
      .replace(' minutes', 'm').replace(' minute', 'm').replace(' hours', 'h').replace(' hour', 'h').replace(' seconds', 's');
  } catch { return ''; }
};

/* Animated ring: how many of your passes are live (expected or inside) */
function GuestRing({ live, total }) {
  const n = useCountUp(live);
  const R = 34, C = 2 * Math.PI * R;
  const pct = total ? Math.min(1, live / total) : 0;
  return (
    <div className="relative w-[92px] h-[92px] flex-shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="7" />
        <circle cx="40" cy="40" r={R} fill="none" stroke="url(#guests)" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={C} className="dash-ring" style={{ '--len': C, '--to': C * (1 - Math.max(pct, 0.02)), strokeDashoffset: C * (1 - Math.max(pct, 0.02)) }} />
        <defs>
          <linearGradient id="guests" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#C7D2FE" /><stop offset="100%" stopColor="#818CF8" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[22px] font-semibold leading-none tabular-nums text-white">{n}</span>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-indigo-200/80 mt-1">live passes</span>
      </div>
    </div>
  );
}

function Metric({ label, value, delay }) {
  const n = useCountUp(value || 0);
  return (
    <div className="dash-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[19px] font-semibold leading-none tabular-nums text-white" style={{ letterSpacing: '-0.02em' }}>{n}</div>
      <div className="text-[11px] text-white/55 mt-1">{label}</div>
    </div>
  );
}

const ACTIONS = [
  { to: '/visitors/new', label: 'Invite',     Icon: UserPlus,      color: '#6366F1' },
  { to: '/marketplace',  label: 'Market',     Icon: ShoppingBag,   color: '#F59E0B' },
  { to: '/chat',         label: 'Chat',       Icon: MessageSquare, color: '#3B82F6' },
  { to: '/lounge',       label: 'Lounge',     Icon: Music,         color: '#EC4899' },
  { to: '/payments',     label: 'Payments',   Icon: CreditCard,    color: '#10B981' },
  { to: '/neighbours',   label: 'Neighbours', Icon: Phone,         color: '#0EA5E9' },
  { to: '/courtroom',    label: 'Court',      Icon: Scale,         color: '#B45309' },
  { to: '/alerts',       label: 'Alerts',     Icon: Bell,          color: '#DC2626' },
];

const VISIT = {
  'checked-in':  { Icon: LogIn,         color: '#10B981', verb: 'arrived' },
  'checked-out': { Icon: LogOut,        color: '#94A3B8', verb: 'left' },
  active:        { Icon: CalendarClock, color: '#6366F1', verb: 'is expected' },
};

export default function MobileDashboard({ user, myVisitors, announcements, estate, estateName, firstName, unitLabel, activeVisitors, alerting, onSOS }) {
  const live = activeVisitors.length;
  const inside = myVisitors.filter(v => v.status === 'checked-in').length;

  const feed = [
    ...myVisitors.map(v => {
      const m = VISIT[v.status] || VISIT.active;
      return {
        id: `v${v._id}`, at: v.checkedInAt || v.updatedAt || v.expectedDate, to: `/visitors/${v._id}`, Icon: m.Icon, color: m.color,
        title: `${v.visitorName || 'Your guest'} ${m.verb}`, sub: `${v.purpose || 'Visit'}${v.accessCode && v.status === 'active' ? ` · code ${v.accessCode}` : ''}`,
      };
    }),
    ...announcements.map(a => ({
      id: `n${a._id}`, at: a.createdAt, to: '/announcements', Icon: Megaphone, color: a.category === 'urgent' ? '#EF4444' : '#F59E0B',
      title: a.title, sub: a.isPinned ? 'Pinned notice from management' : 'Notice from management', urgent: a.category === 'urgent',
    })),
  ].sort((a, b) => (!!b.urgent - !!a.urgent) || (new Date(b.at) - new Date(a.at))).slice(0, 7);

  return (
    <div className="space-y-6 pb-2">
      {/* Greeting */}
      <header className="dash-rise flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium text-slate-400 flex items-center gap-1.5 truncate">
            {format(new Date(), 'EEEE, d MMMM')}
            {unitLabel && <><span className="text-slate-300">·</span><Home size={11} /> {unitLabel}</>}
          </div>
          <h1 className="text-[22px] font-semibold text-slate-900 leading-tight truncate" style={{ letterSpacing: '-0.03em' }}>
            {greeting()}, {firstName}
          </h1>
        </div>
        <Link to="/settings" className="relative flex-shrink-0">
          <span className="absolute -inset-[3px] rounded-full" style={{ background: 'conic-gradient(from 180deg, #818CF8, #6366F1, #EC4899, #818CF8)' }} />
          {user?.profilePhoto
            ? <img src={user.profilePhoto} alt="" className="relative w-11 h-11 rounded-full object-cover border-2 border-white" />
            : <span className="relative w-11 h-11 rounded-full flex items-center justify-center font-semibold text-[15px] text-indigo-700 bg-indigo-50 border-2 border-white">{firstName[0]?.toUpperCase()}</span>}
        </Link>
      </header>

      {/* Home status */}
      <section className="dash-rise relative overflow-hidden rounded-[26px] p-5 text-white"
        style={{ animationDelay: '60ms', background: 'linear-gradient(150deg, #1E1B4B 0%, #312E81 50%, #4F46E5 115%)', boxShadow: '0 24px 44px -24px rgba(30,27,75,0.95)' }}>
        <div className="dash-blob absolute -top-20 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(129,140,248,0.45)' }} />
        <div className="dash-blob absolute -bottom-24 -left-12 w-52 h-52 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(236,72,153,0.25)', animationDelay: '-7s' }} />
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '22px 22px', maskImage: 'radial-gradient(circle at 80% 20%, #000, transparent 70%)', WebkitMaskImage: 'radial-gradient(circle at 80% 20%, #000, transparent 70%)' }} />

        <div className="relative flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur truncate max-w-[75%]">
            <span className="relative flex w-1.5 h-1.5 flex-shrink-0"><span className="absolute inset-0 rounded-full bg-indigo-200 animate-ping" /><span className="relative w-1.5 h-1.5 rounded-full bg-indigo-200" /></span>
            <span className="truncate">Live · {estateName}</span>
          </span>
          <ShieldCheck size={15} className="text-white/40" />
        </div>

        <div className="relative mt-4 flex items-center gap-4">
          <GuestRing live={live} total={myVisitors.length} />
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold leading-snug" style={{ color: '#E0E7FF' }}>
              {inside ? `${inside} of your guests ${inside === 1 ? 'is' : 'are'} inside` : live ? `${live} guest${live !== 1 ? 's' : ''} on the way` : 'No guests expected'}
            </div>
            <div className="text-[12px] text-white/60 mt-1">Passes stay live until your guest leaves</div>
          </div>
        </div>

        <div className="relative mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-3">
          <Metric label="Live passes" value={live} delay={160} />
          <Metric label="Recent guests" value={myVisitors.length} delay={210} />
          <Metric label="Notices" value={announcements.length} delay={260} />
        </div>

        {/* SOS */}
        <button onClick={onSOS} disabled={alerting}
          className="relative mt-4 w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 bg-red-500/20 border border-red-400/35 text-left active:scale-[0.99] transition-transform">
          <span className="relative w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 8px 18px -8px rgba(239,68,68,0.9)' }}>
            <span className="dash-ripple absolute inset-0 rounded-xl bg-red-500" />
            <Siren size={16} className="relative text-white" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[14px] font-semibold text-white">{alerting ? 'Sending alert…' : 'Emergency SOS'}</span>
            <span className="block text-[11px] text-red-100/75">Alerts security and management with your unit</span>
          </span>
          <span className="text-[11px] font-bold tracking-wider text-white bg-red-500 px-2.5 py-1 rounded-lg">SOS</span>
        </button>
      </section>

      <CampaignBanner />

      {/* Quick actions */}
      <section>
        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {ACTIONS.map(({ to, label, Icon, color }, i) => (
            <Link key={to} to={to} className="dash-rise flex flex-col items-center gap-1.5" style={{ animationDelay: `${300 + i * 45}ms`, textDecoration: 'none' }}>
              <span className="dash-tile w-[58px] h-[58px] rounded-[20px] flex items-center justify-center border transition-transform active:scale-90"
                style={{ background: `linear-gradient(145deg, ${color}1A, ${color}08)`, borderColor: `${color}2E` }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}D9)`, boxShadow: `0 8px 16px -8px ${color}` }}>
                  <Icon size={17} className="text-white" />
                </span>
              </span>
              <span className="text-[11px] font-medium text-slate-600">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Live activity */}
      <section className="dash-rise" style={{ animationDelay: '420ms' }}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Live activity</h2>
            <p className="text-[12px] text-slate-400">Your guests and estate notices</p>
          </div>
          <Link to="/visitors" className="text-[12px] font-semibold text-indigo-600 flex items-center gap-0.5">My passes <ArrowUpRight size={13} /></Link>
        </div>

        {feed.length === 0 ? (
          <Link to="/visitors/new" className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-4" style={{ textDecoration: 'none' }}>
            <span className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><UserPlus size={16} className="text-indigo-600" /></span>
            <span className="text-[13px] text-slate-500">Nothing yet. <span className="font-semibold text-indigo-600">Invite your first guest</span></span>
          </Link>
        ) : (
          <div className="relative rounded-[22px] bg-white border border-slate-200/70 p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <span className="absolute left-[29px] top-6 bottom-6 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
            {feed.map((f, i) => (
              <Link key={f.id} to={f.to} className="dash-rise dash-row relative flex items-center gap-3 px-2.5 py-2.5 rounded-2xl"
                style={{ animationDelay: `${460 + i * 55}ms`, textDecoration: 'none', background: f.urgent ? 'rgba(239,68,68,0.06)' : undefined }}>
                <span className="relative z-10 w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-white" style={{ background: `${f.color}18` }}>
                  {f.urgent && <span className="dash-ripple absolute inset-0 rounded-full" style={{ background: `${f.color}40` }} />}
                  <f.Icon size={15} style={{ color: f.color }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-[13px] font-semibold truncate ${f.urgent ? 'text-red-700' : 'text-slate-900'}`}>{f.title}</span>
                  <span className="block text-[12px] text-slate-500 truncate">{f.sub}</span>
                </span>
                <span className="text-[11px] text-slate-400 flex-shrink-0 tabular-nums">{ago(f.at)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Map */}
      <section className="dash-rise" style={{ animationDelay: '520ms' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[16px] font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Your estate</h2>
          {estate?.address && <span className="text-[12px] text-slate-400 truncate max-w-[60%]">{estate.address}</span>}
        </div>
        <div className="rounded-[22px] overflow-hidden">
          <EstateMap name={estateName} address={estate?.address} location={estate?.location} height={200} variant="card" />
        </div>
      </section>
    </div>
  );
}
