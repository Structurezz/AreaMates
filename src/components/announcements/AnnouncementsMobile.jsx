import { useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Megaphone, Pin, Users, AlertTriangle, Zap, Hammer, ChevronDown, Bell } from 'lucide-react';
import DJLive from '../DJLive';
import useCountUp from '../../hooks/useCountUp';

const CAT = {
  general:     { Icon: Megaphone,     color: '#4F46E5', label: 'General' },
  urgent:      { Icon: AlertTriangle, color: '#DC2626', label: 'Urgent' },
  event:       { Icon: Zap,           color: '#D97706', label: 'Event' },
  maintenance: { Icon: Hammer,        color: '#0EA5E9', label: 'Maintenance' },
};
const DAY = 86_400_000;
const ago = (d) => { try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ''; } };
const isNew = (a) => Date.now() - new Date(a.createdAt) < DAY;

function Count({ label, value, color, delay }) {
  const n = useCountUp(value || 0);
  return (
    <div className="dash-rise rounded-2xl bg-white/[0.07] border border-white/10 px-3 py-2.5" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[20px] font-semibold tabular-nums leading-none" style={{ color }}>{n}</div>
      <div className="text-[11px] text-white/55 mt-1">{label}</div>
    </div>
  );
}

function PinnedCard({ a, i }) {
  const m = CAT[a.category] || CAT.general;
  return (
    <div className="dash-rise snap-start flex-shrink-0 w-[78%] relative overflow-hidden rounded-[22px] p-4 text-white"
      style={{ animationDelay: `${160 + i * 60}ms`, background: `linear-gradient(145deg, ${m.color} 0%, ${m.color}CC 60%, #1E1B4B 140%)`, boxShadow: `0 18px 30px -20px ${m.color}` }}>
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15 blur-2xl pointer-events-none" />
      <div className="relative flex items-center gap-1.5 text-[11px] font-semibold text-white/80"><Pin size={11} /> Pinned · {m.label}</div>
      <div className="relative mt-2 text-[15px] font-semibold leading-snug line-clamp-2" style={{ color: '#fff' }}>{a.title}</div>
      <p className="relative mt-1 text-[12px] text-white/80 line-clamp-2">{a.body}</p>
      <div className="relative mt-3 text-[11px] text-white/65">{ago(a.createdAt)}{a.authorId?.name ? ` · ${a.authorId.name}` : ''}</div>
    </div>
  );
}

function NoticeCard({ a, i }) {
  const m = CAT[a.category] || CAT.general;
  const [open, setOpen] = useState(false);
  const long = (a.body || '').length > 160;
  const fresh = isNew(a);
  const urgent = a.category === 'urgent';
  return (
    <article className="dash-rise relative overflow-hidden rounded-[22px] bg-white border"
      style={{ animationDelay: `${200 + i * 50}ms`, borderColor: urgent ? '#FECACA' : '#E2E8F0', boxShadow: urgent ? '0 14px 30px -22px rgba(220,38,38,0.6)' : '0 1px 2px rgba(15,23,42,0.04)' }}>
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: m.color }} />
      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          <span className="relative w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}14` }}>
            {urgent && <span className="dash-ripple absolute inset-0 rounded-2xl" style={{ background: `${m.color}30` }} />}
            <m.Icon size={17} className="relative" style={{ color: m.color }} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: m.color }}>{m.label}</span>
              {fresh && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-600 text-white">New</span>}
              <span className="ml-auto text-[11px] text-slate-400 flex-shrink-0">{ago(a.createdAt)}</span>
            </div>
            <h3 className="mt-1 text-[15px] font-semibold text-slate-900 leading-snug" style={{ letterSpacing: '-0.01em' }}>{a.title}</h3>
          </div>
        </div>
        {a.imageUrl && <img src={a.imageUrl} alt="" className="mt-3 w-full max-h-52 object-cover rounded-2xl" loading="lazy" />}
        {a.body && (
          <p className={`mt-2.5 text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap ${open || !long ? '' : 'line-clamp-3'}`}>{a.body}</p>
        )}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
          {a.authorId?.name && (
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0">{a.authorId.name[0]?.toUpperCase()}</span>
              <span className="truncate">{a.authorId.name}</span>
            </span>
          )}
          {typeof a.readBy?.length === 'number' && <span className="flex items-center gap-1 flex-shrink-0"><Users size={11} /> {a.readBy.length} read</span>}
          {long && (
            <button onClick={() => setOpen(o => !o)} className="ml-auto flex items-center gap-0.5 font-semibold text-indigo-600 flex-shrink-0">
              {open ? 'Show less' : 'Read more'} <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AnnouncementsMobile({ items, loading }) {
  const [cat, setCat] = useState('');
  const pinned = items.filter(a => a.isPinned);
  const thisWeek = items.filter(a => Date.now() - new Date(a.createdAt) < 7 * DAY).length;
  const urgentCount = items.filter(a => a.category === 'urgent').length;
  const latest = items[0];
  const shown = items.filter(a => !a.isPinned && (!cat || (a.category || 'general') === cat));
  const FILTERS = [
    ['', 'All', items.filter(a => !a.isPinned).length],
    ...Object.entries(CAT).map(([k, v]) => [k, v.label, items.filter(a => !a.isPinned && (a.category || 'general') === k).length]),
  ].filter(([k, , n]) => !k || n > 0);

  return (
    <div className="space-y-5 pb-2">
      <header className="dash-rise">
        <div className="text-[12px] font-medium text-slate-400">From your estate manager</div>
        <h1 className="text-[22px] font-semibold text-slate-900 leading-tight" style={{ letterSpacing: '-0.03em' }}>Announcements</h1>
      </header>

      {/* Notice board */}
      <section className="dash-rise relative overflow-hidden rounded-[26px] p-5 text-white"
        style={{ animationDelay: '60ms', background: 'linear-gradient(150deg, #1E1B4B 0%, #312E81 50%, #4F46E5 115%)', boxShadow: '0 24px 44px -24px rgba(30,27,75,0.95)' }}>
        <div className="dash-blob absolute -top-20 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(129,140,248,0.45)' }} />
        <Megaphone size={150} className="absolute -right-6 -bottom-8 text-white/[0.06] -rotate-12 pointer-events-none" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/15">
            <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-indigo-200 animate-ping" /><span className="relative w-1.5 h-1.5 rounded-full bg-indigo-200" /></span>
            {thisWeek ? `${thisWeek} new this week` : 'Notice board'}
          </span>
          {latest ? (
            <div className="mt-3">
              <div className="text-[11px] text-white/55">Latest · {ago(latest.createdAt)}</div>
              <div className="mt-0.5 text-[16px] font-semibold leading-snug line-clamp-2 dash-grad-text" style={{ background: 'linear-gradient(90deg, #E0E7FF, #ffffff, #C7D2FE, #E0E7FF)', backgroundSize: '300% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>{latest.title}</div>
            </div>
          ) : (
            <div className="mt-3 text-[16px] font-semibold">Nothing posted yet</div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Count label="Notices" value={items.length} color="#fff" delay={120} />
            <Count label="Pinned" value={pinned.length} color="#C7D2FE" delay={170} />
            <Count label="Urgent" value={urgentCount} color={urgentCount ? '#FECACA' : '#fff'} delay={220} />
          </div>
        </div>
      </section>

      {/* Live announcement banner (when a manager is on air) */}
      <DJLive only="announcement" />

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map(k => <div key={k} className="skeleton h-[130px] rounded-[22px]" />)}</div>
      ) : items.length === 0 ? (
        <div className="dash-rise rounded-[22px] bg-white border border-slate-200/70 px-6 py-10 text-center">
          <span className="relative mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-indigo-50">
            <span className="dash-ripple absolute inset-0 rounded-full bg-indigo-100" />
            <Bell size={24} className="relative text-indigo-600" />
          </span>
          <div className="mt-4 text-[15px] font-semibold text-slate-900">No announcements yet</div>
          <div className="text-[13px] text-slate-500 mt-1">When management posts a notice, you'll see it here.</div>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <section>
              <h2 className="text-[15px] font-semibold text-slate-900 mb-2.5 flex items-center gap-1.5" style={{ letterSpacing: '-0.02em' }}><Pin size={14} className="text-indigo-600" /> Pinned</h2>
              <div className="-mx-4 px-4 flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1">
                {pinned.map((a, i) => <PinnedCard key={a._id} a={a} i={i} />)}
              </div>
            </section>
          )}

          {FILTERS.length > 1 && (
            <div className="sticky -top-4 z-10 -mx-4 px-4 py-2 bg-[#F8FAFC]/90 backdrop-blur">
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {FILTERS.map(([key, label, n]) => {
                  const on = cat === key;
                  return (
                    <button key={key || 'all'} onClick={() => setCat(key)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap flex-shrink-0 transition-all"
                      style={on ? { background: '#1E1B4B', color: '#fff' } : { background: '#fff', color: '#475569', border: '1px solid #E2E8F0' }}>
                      {label}
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] text-center tabular-nums"
                        style={on ? { background: 'rgba(255,255,255,0.18)' } : { background: '#F1F5F9', color: '#64748B' }}>{n}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {shown.length === 0
              ? <div className="rounded-[22px] bg-white border border-slate-200/70 p-5 text-center text-[13px] text-slate-400">No {CAT[cat]?.label.toLowerCase()} notices.</div>
              : shown.map((a, i) => <NoticeCard key={a._id} a={a} i={i} />)}
          </div>
        </>
      )}
    </div>
  );
}
