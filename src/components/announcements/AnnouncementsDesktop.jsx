import { useMemo, useState } from 'react';
import { format, formatDistanceToNow, isThisWeek } from 'date-fns';
import { Megaphone, Pin, Search, AlertTriangle, Zap, Hammer, Info, Eye, Radio, Headphones } from 'lucide-react';
import DJLive from '../DJLive';

const CATS = {
  general:     { label: 'General',     Icon: Info,          color: '#4F46E5' },
  urgent:      { label: 'Urgent',      Icon: AlertTriangle, color: '#DC2626' },
  event:       { label: 'Event',       Icon: Zap,           color: '#D97706' },
  maintenance: { label: 'Maintenance', Icon: Hammer,        color: '#B45309' },
};
const cat = (k) => CATS[k] || CATS.general;

function Author({ a }) {
  const p = a.authorId?.profilePhoto;
  return p
    ? <img src={p} alt="" className="w-6 h-6 rounded-full object-cover ring-2 ring-white shadow-sm" />
    : <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold flex items-center justify-center">{(a.authorId?.name || 'M')[0]}</span>;
}

function NoticeCard({ a, i }) {
  const c = cat(a.category);
  const [open, setOpen] = useState(false);
  const long = (a.body || '').length > 280;
  return (
    <article className="dash-rise relative rounded-2xl bg-white border overflow-hidden transition-all hover:shadow-md"
      style={{ animationDelay: `${80 + i * 40}ms`, borderColor: a.isPinned ? '#FCD34D' : 'rgba(226,232,240,0.7)' }}>
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: c.color }} />
      <div className="pl-6 pr-5 py-4 flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${c.color}14` }}>
          <c.Icon size={16} style={{ color: c.color }} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="font-semibold" style={{ color: c.color }}>{c.label}</span>
            {a.isPinned && <span className="inline-flex items-center gap-1 font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"><Pin size={10} /> Pinned</span>}
            <span className="text-slate-400">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
          </div>
          <h3 className="mt-0.5 text-[15px] font-semibold text-slate-900">{a.title}</h3>
          <p className={`mt-1.5 text-[13px] text-slate-600 leading-relaxed whitespace-pre-wrap break-words ${open ? '' : 'line-clamp-4'}`}>{a.body}</p>
          {long && (
            <button onClick={() => setOpen((o) => !o)} className="mt-1 text-[12px] font-medium text-amber-600 hover:text-amber-700">
              {open ? 'Show less' : 'Read more'}
            </button>
          )}
          <div className="mt-3 flex items-center gap-3 text-[12px] text-slate-400">
            <span className="flex items-center gap-1.5"><Author a={a} /> {a.authorId?.name || 'Estate management'}</span>
            <span>{format(new Date(a.createdAt), 'MMM d, yyyy · HH:mm')}</span>
            {typeof a.readBy?.length === 'number' && <span className="flex items-center gap-1"><Eye size={12} /> {a.readBy.length} read</span>}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AnnouncementsDesktop({ items }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((a) => (filter === 'all' || a.category === filter) && (!term || `${a.title} ${a.body}`.toLowerCase().includes(term)));
  }, [items, filter, q]);
  const pinned = shown.filter((a) => a.isPinned);
  const rest = shown.filter((a) => !a.isPinned);
  const thisWeek = items.filter((a) => isThisWeek(new Date(a.createdAt))).length;
  const urgent = items.filter((a) => a.category === 'urgent').length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-10">
      <div className="dash-rise relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background: 'linear-gradient(120deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)', boxShadow: '0 16px 32px -18px rgba(49,46,129,0.8)' }}>
        <div className="dash-blob absolute -top-20 right-64 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(251,191,36,0.22)' }} />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 border border-white/15 flex-shrink-0">
              <Megaphone size={22} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Announcements</h1>
              <p className="text-[13px] text-indigo-100/75">Notices, events and updates from your estate manager.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {[['All notices', items.length], ['This week', thisWeek], ['Pinned', items.filter((a) => a.isPinned).length], ['Urgent', urgent]].map(([label, n]) => (
              <div key={label} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 min-w-[76px]">
                <div className="text-[16px] font-semibold text-white tabular-nums leading-none">{n}</div>
                <div className="text-[10px] text-indigo-100/65 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DJLive only="announcement" />

      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          <div className="dash-rise flex items-center gap-3" style={{ animationDelay: '60ms' }}>
            <div className="flex p-1 rounded-xl bg-white border border-slate-200">
              {[['all', 'All'], ...Object.entries(CATS).map(([k, v]) => [k, v.label])].map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${filter === k ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs ml-auto">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search announcements"
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-[13px] outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all" />
            </div>
          </div>

          {shown.length === 0 ? (
            <div className="rounded-2xl bg-white border border-dashed border-slate-300 py-14 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center"><Megaphone size={24} className="text-indigo-500" /></div>
              <p className="mt-3 text-[14px] font-semibold text-slate-800">{items.length ? 'Nothing matches' : 'No announcements yet'}</p>
              <p className="mt-1 text-[13px] text-slate-400">{items.length ? 'Try another category or search.' : "When management posts a notice, you'll see it here."}</p>
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-[12px] font-semibold uppercase tracking-wider text-amber-600 flex items-center gap-1.5"><Pin size={12} /> Pinned</h2>
                  {pinned.map((a, i) => <NoticeCard key={a._id} a={a} i={i} />)}
                </section>
              )}
              {rest.length > 0 && (
                <section className="space-y-3">
                  {pinned.length > 0 && <h2 className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 pt-1">Latest</h2>}
                  {rest.map((a, i) => <NoticeCard key={a._id} a={a} i={i + pinned.length} />)}
                </section>
              )}
            </>
          )}
        </div>

        <aside className="sticky top-0 space-y-4">
          <div className="dash-rise relative overflow-hidden rounded-2xl p-5 text-white" style={{ animationDelay: '80ms', background: 'linear-gradient(140deg, #312E81, #6366F1)' }}>
            <div className="dash-blob absolute -top-12 -right-10 w-40 h-40 rounded-full blur-2xl" style={{ background: 'rgba(199,210,254,0.35)' }} />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><Radio size={18} /></div>
              <h3 className="mt-3 text-[15px] font-semibold text-white">Live announcements</h3>
              <p className="mt-1 text-[12px] text-white/80 leading-relaxed">When your manager goes live for something urgent, you'll get a notification and a banner appears above. Tap it to listen in.</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-100"><Headphones size={12} /> Keep notifications on</div>
            </div>
          </div>

          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4" style={{ animationDelay: '140ms' }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">Categories</div>
            <div className="space-y-2">
              {Object.entries(CATS).map(([k, v]) => {
                const n = items.filter((a) => a.category === k).length;
                const pct = items.length ? (n / items.length) * 100 : 0;
                return (
                  <button key={k} onClick={() => setFilter(filter === k ? 'all' : k)} className="w-full text-left group">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 group-hover:text-slate-900"><v.Icon size={12} style={{ color: v.color }} /> {v.label}</span>
                      <span className="text-slate-400 tabular-nums">{n}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="dash-bar-x h-full rounded-full" style={{ width: `${pct}%`, background: v.color }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
