import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserCheck, Bell, Megaphone, Plus, Pin, ShoppingBag, MessageSquare, Home, ArrowRight, ArrowUpRight,
  Shield, Siren, MapPin, CalendarDays, Wallet, Users, Coffee, Zap, LogIn,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { eventAPI, paymentAPI } from '../../api';
import { VISITOR_STATUS } from '../visitors/MobileVisitors';
import EstateMap from '../EstateMap';
import useCountUp from '../../hooks/useCountUp';
import { CampaignBanner } from '../campaigns/CampaignSlots';

const CATEGORY_COLORS = { general: '#3B82F6', urgent: '#EF4444', event: '#6366F1', maintenance: '#F59E0B' };
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const delay = (i) => ({ animationDelay: `${i * 50}ms` });
const CARD = 'dash-rise rounded-2xl bg-white border border-slate-200/70';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(id); }, []);
  return now;
}

function CardHead({ title, Icon, color = '#6366F1', right }) {
  return (
    <div className="flex items-center justify-between px-5 h-12 border-b border-slate-100">
      <h2 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2" style={{ letterSpacing: '-0.01em' }}>
        {Icon && (
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 4px 10px -4px ${color}` }}>
            <Icon size={13} className="text-white" />
          </span>
        )}
        {title}
      </h2>
      {right}
    </div>
  );
}

function HeadLink({ to, children }) {
  return (
    <Link to={to} className="group text-[12px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
      {children} <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Stat({ i, label, value, display, Icon, color, to, sub, live }) {
  const n = useCountUp(value);
  return (
    <Link to={to} className="dash-tile dash-rise group rounded-2xl p-4 border min-w-0"
      style={{ animationDelay: `${60 + i * 60}ms`, textDecoration: 'none', background: `linear-gradient(140deg, ${color}17 0%, #FFFFFF 55%)`, borderColor: `${color}2E` }}>
      <span className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125" style={{ background: `${color}12` }} />
      <div className="relative flex items-center justify-between">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
          <Icon size={15} className="text-white" />
        </span>
        {live ? (
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: color }} />
            <span className="relative w-2 h-2 rounded-full" style={{ background: color }} />
          </span>
        ) : (
          <ArrowUpRight size={14} className="text-slate-300 transition-all group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </div>
      <div className="relative mt-3 text-[24px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>
        {display ?? n}
      </div>
      <div className="relative mt-1 text-[12px] font-medium text-slate-500 truncate">{label}</div>
      {sub && <div className="relative mt-0.5 text-[11px] text-slate-400 truncate">{sub}</div>}
    </Link>
  );
}

const SHORTCUTS = [
  { to: '/visitors/new', icon: UserCheck,     label: 'Invite guest', color: '#6366F1' },
  { to: '/marketplace',  icon: ShoppingBag,   label: 'Market',       color: '#F59E0B' },
  { to: '/chat',         icon: MessageSquare, label: 'Chat',         color: '#3B82F6' },
  { to: '/lounge',       icon: Coffee,        label: 'Lounge',       color: '#8B5CF6' },
  { to: '/payments',     icon: Wallet,        label: 'Payments',     color: '#10B981' },
  { to: '/neighbours',   icon: Users,         label: 'Neighbours',   color: '#EC4899' },
];

export default function DesktopDashboard({
  myVisitors, announcements, estate, estateName, firstName, unitLabel, activeVisitors, alerting, onSOS,
}) {
  const now = useClock();
  const [events, setEvents] = useState(null);
  const [bills, setBills] = useState(null); // null = unavailable / loading

  useEffect(() => {
    eventAPI.getAll()
      .then(({ data }) => setEvents((data.data || [])
        .filter((e) => new Date(e.date) >= new Date(new Date().toDateString()))
        .sort((a, b) => new Date(a.date) - new Date(b.date))))
      .catch(() => setEvents([]));
    paymentAPI.getMine()
      .then(({ data }) => setBills((data.data || []).filter((p) => p.status === 'pending' || p.status === 'overdue')))
      .catch(() => setBills(null));
  }, []);

  const billsDue = bills?.reduce((s, p) => s + (p.amount || 0), 0) || 0;
  const overdue = bills?.filter((p) => p.status === 'overdue').length || 0;
  const insideNow = myVisitors.filter((v) => v.status === 'checked-in').length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">

      {/* ── Welcome banner ── */}
      <div className="dash-rise relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background: 'linear-gradient(120deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)', boxShadow: '0 16px 32px -18px rgba(49,46,129,0.8)' }}>
        <div className="dash-blob absolute -top-20 right-56 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(129,140,248,0.25)' }} />
        <div className="dash-blob absolute -bottom-24 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(30,27,75,0.6)', animationDelay: '-6s' }} />
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '16px 16px',
            maskImage: 'linear-gradient(90deg, transparent 30%, black 100%)', WebkitMaskImage: 'linear-gradient(90deg, transparent 30%, black 100%)',
          }} />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[12px] text-white/75">
              <span className="inline-flex items-center gap-1.5 font-semibold text-white px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inset-0 rounded-full bg-white animate-ping" />
                  <span className="relative w-1.5 h-1.5 rounded-full bg-white" />
                </span>
                Live
              </span>
              {format(now, 'EEEE, d MMMM · HH:mm')}
            </div>
            <h1 className="mt-2 text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>
              {greeting()}, {firstName} 👋
            </h1>
            <p className="mt-0.5 text-[13px] text-white/75 flex items-center gap-1.5 truncate">
              <MapPin size={13} className="flex-shrink-0" />
              <span className="font-medium text-white">{estateName}</span>
              <span className="text-white/40">·</span>
              {unitLabel
                ? <span className="inline-flex items-center gap-1"><Home size={12} /> {unitLabel}</span>
                : <span className="text-white/60">No unit assigned</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link to="/alerts" className="inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-2 rounded-xl text-white bg-white/10 border border-white/25 hover:bg-white/20 transition-all hover:-translate-y-0.5 backdrop-blur">
              <Bell size={14} /> Alerts
            </Link>
            <Link to="/visitors/new" className="group inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-xl bg-white text-indigo-700 hover:-translate-y-0.5 transition-all"
              style={{ boxShadow: '0 8px 18px -8px rgba(0,0,0,0.35)' }}>
              <UserCheck size={14} /> Invite a visitor
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <button onClick={onSOS} disabled={alerting}
              className="relative inline-flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white bg-red-500 hover:bg-red-600 transition-all hover:-translate-y-0.5 disabled:opacity-70"
              style={{ boxShadow: '0 10px 22px -10px rgba(239,68,68,0.9)' }}>
              <span className="absolute inset-0 rounded-xl border-2 border-red-300 animate-ping opacity-30 pointer-events-none" />
              <Shield size={14} strokeWidth={2.5} /> {alerting ? 'Sending…' : 'SOS'}
            </button>
          </div>
        </div>
      </div>

      <CampaignBanner />

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-4">
        <Stat i={0} label="Active passes" value={activeVisitors.length} Icon={UserCheck} color="#6366F1" to="/visitors"
          sub={insideNow ? `${insideNow} inside the estate now` : 'Expected or checked in'} live={insideNow > 0} />
        <Stat i={1} label="Recent passes" value={myVisitors.length} Icon={LogIn} color="#0EA5E9" to="/visitors" sub="Your latest visitor passes" />
        <Stat i={2} label="Estate notices" value={announcements.length} Icon={Megaphone} color="#F59E0B" to="/announcements"
          sub={announcements.some((a) => a.isPinned) ? 'Includes pinned notices' : 'Latest from management'} />
        {bills !== null ? (
          <Stat i={3} label={bills.length ? 'Bills due' : 'All bills paid'} value={bills.length} display={bills.length ? naira(billsDue) : undefined}
            Icon={Wallet} color={overdue ? '#EF4444' : '#10B981'} to="/payments"
            sub={bills.length ? `${bills.length} bill${bills.length === 1 ? '' : 's'}${overdue ? ` · ${overdue} overdue` : ''}` : 'Nothing outstanding'} live={overdue > 0} />
        ) : (
          <Stat i={3} label="Upcoming events" value={events?.length || 0} Icon={CalendarDays} color="#8B5CF6" to="/events" sub="Happening in your estate" />
        )}
      </div>

      {/* ── Visitors + Emergency ── */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-8">
          <div className={`${CARD} overflow-hidden h-full`} style={delay(6)}>
            <CardHead title="My visitor passes" Icon={UserCheck} color="#6366F1"
              right={<div className="flex items-center gap-3"><HeadLink to="/visitors">View all</HeadLink>
                <Link to="/visitors/new" className="btn-primary !text-[12px] !px-2.5 !py-1.5"><Plus size={12} /> New</Link></div>} />
            {myVisitors.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 mx-auto flex items-center justify-center"><UserCheck size={20} className="text-indigo-500" /></div>
                <p className="text-[13px] font-medium text-slate-700 mt-3">No visitors registered yet</p>
                <Link to="/visitors/new" className="mt-3 btn-primary !text-[12px] !px-3 !py-1.5 inline-flex"><Plus size={13} /> Invite your first visitor</Link>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] text-slate-400 text-left">
                    <th className="px-5 py-2 font-medium">Visitor</th>
                    <th className="px-3 py-2 font-medium">Expected</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-5 py-2 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myVisitors.map((v, i) => {
                    const st = VISITOR_STATUS[v.status] || VISITOR_STATUS['checked-out'];
                    const initials = (v.visitorName || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
                    return (
                      <tr key={v._id} className="dash-rise border-t border-slate-100 hover:bg-slate-50/80 transition-colors" style={{ animationDelay: `${350 + i * 40}ms` }}>
                        <td className="px-5 py-2.5">
                          <Link to={`/visitors/${v._id}`} className="flex items-center gap-2.5 min-w-0" style={{ textDecoration: 'none' }}>
                            <span className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0" style={{ background: st.bg, color: st.text }}>{initials}</span>
                            <span className="min-w-0">
                              <span className="block text-[13px] font-medium text-slate-900 truncate">{v.visitorName}</span>
                              <span className="block text-[11px] text-slate-400 capitalize truncate">{v.purpose}</span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-slate-500 whitespace-nowrap">{v.expectedDate ? format(new Date(v.expectedDate), 'MMM d, h:mm a') : '—'}</td>
                        <td className="px-3 py-2.5"><span className="font-mono text-[12px] font-bold tracking-[0.15em] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">{v.visitorCode}</span></td>
                        <td className="px-5 py-2.5 text-right">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.text }}>
                            <span className={`w-1.5 h-1.5 rounded-full ${v.status === 'checked-in' ? 'animate-pulse' : ''}`} style={{ background: st.dot }} />
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="col-span-4">
          <div className="dash-rise relative overflow-hidden rounded-2xl h-full p-5 flex flex-col text-white"
            style={{ ...delay(7), background: 'linear-gradient(160deg, #450A0A 0%, #991B1B 60%, #EF4444 140%)', boxShadow: '0 20px 40px -24px rgba(153,27,27,0.9)' }}>
            <div className="dash-blob absolute -top-14 -right-14 w-44 h-44 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(252,165,165,0.3)' }} />
            <div className="relative flex items-center justify-between">
              <span className="text-[13px] font-semibold flex items-center gap-2"><Siren size={15} /> Emergency</span>
              <Link to="/alerts" className="text-[11px] font-semibold text-white/80 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                More options <ArrowRight size={11} />
              </Link>
            </div>
            <div className="relative flex-1 flex flex-col items-center justify-center py-5">
              <button onClick={onSOS} disabled={alerting}
                className="relative w-28 h-28 rounded-full flex flex-col items-center justify-center font-bold text-[13px] transition-transform hover:scale-105 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #F87171, #DC2626)', boxShadow: '0 16px 40px -10px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.25)' }}>
                <span className="dash-ripple absolute inset-0 rounded-full border-2 border-red-200" />
                <span className="dash-ripple absolute inset-0 rounded-full border-2 border-red-200" style={{ animationDelay: '1s' }} />
                <Shield size={28} strokeWidth={2.5} />
                <span className="mt-1">{alerting ? 'SENDING' : 'SOS'}</span>
              </button>
              <p className="mt-4 text-[12px] text-red-100/80 text-center max-w-[220px]">One tap alerts security and estate management with your name and unit.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notices + rail ── */}
      <div className="grid grid-cols-12 gap-5 items-start">
        <div className="col-span-8">
          <div className={`${CARD} overflow-hidden`} style={delay(8)}>
            <CardHead title="Estate notices" Icon={Megaphone} color="#F59E0B" right={<HeadLink to="/announcements">All notices</HeadLink>} />
            {announcements.length === 0 ? (
              <div className="py-10 text-center">
                <Megaphone size={22} className="mx-auto text-slate-300" />
                <p className="text-[13px] text-slate-500 mt-2">No announcements yet</p>
              </div>
            ) : (
              <div>
                {announcements.map((a, i) => {
                  const c = CATEGORY_COLORS[a.category] || '#94A3B8';
                  return (
                    <Link key={a._id} to="/announcements"
                      className="dash-rise relative flex items-start gap-3 px-5 py-3.5 border-t border-slate-100 first:border-0 hover:bg-slate-50/80 transition-colors"
                      style={{ animationDelay: `${450 + i * 40}ms`, textDecoration: 'none' }}>
                      <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full" style={{ background: c }} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-[11px]">
                          <span className="font-semibold uppercase tracking-wide" style={{ color: c }}>{a.category}</span>
                          {a.isPinned && <span className="inline-flex items-center gap-0.5 font-semibold text-indigo-600"><Pin size={10} /> Pinned</span>}
                          <span className="text-slate-400">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                        </span>
                        <span className="block mt-0.5 text-[14px] font-semibold text-slate-900 truncate">{a.title}</span>
                        <span className="block mt-0.5 text-[12px] text-slate-500 line-clamp-2">{a.body}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="col-span-4 space-y-5">
          <div className={`${CARD} overflow-hidden`} style={delay(9)}>
            <CardHead title="Upcoming events" Icon={CalendarDays} color="#8B5CF6" right={<HeadLink to="/events">All events</HeadLink>} />
            {events === null ? (
              <div className="p-4 space-y-2">{[0, 1].map((k) => <div key={k} className="skeleton h-10 rounded-lg" />)}</div>
            ) : events.length === 0 ? (
              <p className="px-5 py-4 text-[12px] text-slate-400">Nothing scheduled yet.</p>
            ) : (
              <div className="py-1.5">
                {events.slice(0, 3).map((ev) => {
                  const d = new Date(ev.date);
                  return (
                    <Link key={ev._id} to="/events" className="flex items-center gap-3 px-5 py-2 hover:bg-slate-50/80 transition-colors" style={{ textDecoration: 'none' }}>
                      <span className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
                        <span className="text-[8px] font-semibold uppercase leading-none opacity-90">{format(d, 'MMM')}</span>
                        <span className="text-[15px] font-semibold leading-none mt-0.5">{d.getDate()}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-slate-900 truncate">{ev.title}</span>
                        <span className="block text-[11px] text-slate-400 truncate">{ev.time ? `${ev.time} · ` : ''}{ev.rsvps?.length || 0} going</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className={CARD} style={delay(10)}>
            <CardHead title="Shortcuts" Icon={Zap} color="#6366F1" />
            <div className="grid grid-cols-2 gap-2 p-3">
              {SHORTCUTS.map(({ to, icon: Icon, label, color }) => (
                <Link key={to} to={to}
                  className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md"
                  style={{ textDecoration: 'none', background: `linear-gradient(135deg, ${color}12, #fff 70%)`, borderColor: `${color}26` }}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 group-hover:-rotate-6"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 12px -6px ${color}` }}>
                    <Icon size={14} className="text-white" />
                  </span>
                  <span className="text-[12px] font-medium text-slate-700">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="dash-rise" style={delay(11)}>
            <EstateMap name={estateName} address={estate?.address} location={estate?.location} height={220} variant="card" />
          </div>
        </div>
      </div>
    </div>
  );
}
