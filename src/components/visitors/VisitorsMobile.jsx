import { useMemo, useState } from 'react';
import { format, isToday, isTomorrow, isYesterday, formatDistanceToNowStrict } from 'date-fns';
import { Search, X, Plus, ChevronRight, Calendar, LogIn, Clock, UserCheck, Phone, XCircle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import useCountUp from '../../hooks/useCountUp';
import { VISITOR_STATUS, STATUS_CHIPS, purposeIcon, VisitorsPager } from './MobileVisitors';

// Phone layout for the residents' My visitors page. Desktop keeps its own layout.

const dayLabel = (d) => (isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, d MMM'));
const rel = (d) => { try { return formatDistanceToNowStrict(d, { addSuffix: true }); } catch { return ''; } };

function Tile({ i, label, value, Icon, color, hint, active, pulse, onClick }) {
  const n = useCountUp(value || 0);
  return (
    <button type="button" onClick={onClick}
      className="dash-rise relative overflow-hidden text-left rounded-2xl p-3.5 border active:scale-[0.98] transition-transform"
      style={{
        animationDelay: `${60 + i * 50}ms`,
        background: `linear-gradient(140deg, ${color}${active ? '2E' : '1C'} 0%, #FFFFFF 62%)`,
        borderColor: active ? color : `${color}33`,
        boxShadow: active ? `0 0 0 3px ${color}1F` : undefined,
      }}>
      <span className="absolute -bottom-7 -right-7 w-20 h-20 rounded-full pointer-events-none" style={{ background: `${color}14` }} />
      <div className="relative flex items-center justify-between">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
          <Icon size={15} className="text-white" />
        </span>
        {pulse ? (
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: color }} />
            <span className="relative w-2 h-2 rounded-full" style={{ background: color }} />
          </span>
        ) : active ? (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${color}1F`, color }}>Filtered</span>
        ) : null}
      </div>
      <div className="relative mt-2.5 text-[24px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{n}</div>
      <div className="relative mt-1 text-[12px] font-medium text-slate-600 truncate">{label}</div>
      <div className="relative text-[11px] text-slate-400 truncate">{hint}</div>
    </button>
  );
}

function Act({ children, tone = 'plain', color, onClick }) {
  const style = tone === 'solid' ? { background: `linear-gradient(135deg, ${color}, ${color}D9)`, color: '#fff', boxShadow: `0 8px 18px -10px ${color}` }
    : tone === 'danger' ? { background: '#FEF2F2', color: '#B91C1C' }
    : { background: '#F1F5F9', color: '#334155' };
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl text-[13px] font-semibold active:scale-[0.97] transition-transform"
      style={style}>
      {children}
    </button>
  );
}

function VisitorCard({ v, i, onOpen, onShare, onCopy, onCancel, ShareIcon }) {
  const st = VISITOR_STATUS[v.status] || VISITOR_STATUS['checked-out'];
  const [PIcon, pColor, pBg] = purposeIcon(v.purpose);
  const when = new Date(v.expectedDate);
  const inside = v.status === 'checked-in';
  const expected = v.status === 'active';
  const initials = (v.visitorName || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const timeLine = inside && v.checkedInAt ? `Arrived ${rel(new Date(v.checkedInAt))}`
    : v.status === 'checked-out' && v.checkedOutAt ? `Left ${rel(new Date(v.checkedOutAt))}`
    : `${dayLabel(when)}, ${format(when, 'h:mm a')}`;
  const copyCode = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(v.visitorCode).then(() => toast.success('Code copied')).catch(() => {});
  };

  return (
    <article className="dash-rise relative overflow-hidden rounded-[22px] bg-white border"
      style={{ animationDelay: `${120 + i * 45}ms`, borderColor: inside ? 'rgba(99,102,241,0.35)' : '#E2E8F0', boxShadow: inside ? '0 14px 30px -22px rgba(99,102,241,0.8)' : '0 1px 2px rgba(15,23,42,0.04)' }}>
      <button type="button" onClick={() => onOpen(v)} className="w-full text-left p-3.5 active:bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-[14px] font-semibold" style={{ background: st.bg, color: st.text }}>{initials}</div>
            <span className="absolute -bottom-1 -right-1 w-[22px] h-[22px] rounded-full flex items-center justify-center ring-2 ring-white" style={{ background: pColor }}>
              <PIcon size={12} className="text-white" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[15px] text-slate-900 truncate" style={{ letterSpacing: '-0.01em' }}>{v.visitorName}</p>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: st.bg, color: st.text }}>
                <span className={`w-1.5 h-1.5 rounded-full ${inside ? 'animate-pulse' : ''}`} style={{ background: st.dot }} />{st.label}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-slate-500 truncate flex items-center gap-1">
              <span className="font-semibold capitalize px-1.5 py-px rounded-md" style={{ background: pBg, color: pColor }}>{v.purpose}</span>
              <Clock size={11} className="flex-shrink-0 text-slate-400 ml-0.5" /> {timeLine}
            </p>
            {v.visitorPhone && <p className="text-[12px] text-slate-400 truncate">{v.visitorPhone}</p>}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span onClick={copyCode} role="button" tabIndex={0}
            className="inline-flex items-center gap-1.5 font-mono text-[13px] font-semibold tracking-[0.2em] px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700">
            {v.visitorCode} <Copy size={11} className="text-indigo-500" />
          </span>
          {expected && <span className="text-[11px] text-slate-400 truncate">Show this code at the gate</span>}
          <ChevronRight size={16} className="ml-auto text-slate-300 flex-shrink-0" />
        </div>
      </button>
      {(expected || (inside && v.visitorPhone)) && (
        <div className="flex gap-2 px-3.5 pb-3.5">
          {expected && <Act tone="solid" color="#16A34A" onClick={() => onShare(v)}><ShareIcon /> Share pass</Act>}
          {expected && <Act onClick={() => onCopy(v)}><Copy size={14} className="text-indigo-600" /> Copy</Act>}
          {inside && v.visitorPhone && <Act onClick={() => { window.location.href = `tel:${v.visitorPhone}`; }}><Phone size={14} className="text-indigo-600" /> Call guest</Act>}
          {expected && <Act tone="danger" onClick={() => onCancel(v)}><XCircle size={14} /> Cancel</Act>}
        </div>
      )}
    </article>
  );
}

export default function VisitorsMobile({
  visitors, loading, counts, search, onSearch, statusFilter, onPick, onStatus,
  page, pagination, limit, onPage, onOpen, onCreate, onShare, onCopy, onCancel, ShareIcon,
}) {
  const [focus, setFocus] = useState(false);

  const groups = useMemo(() => {
    const out = [];
    for (const v of visitors) {
      const d = new Date(v.expectedDate);
      const key = format(d, 'yyyy-MM-dd');
      let g = out.find((x) => x.key === key);
      if (!g) { g = { key, label: dayLabel(d), items: [] }; out.push(g); }
      g.items.push(v);
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    const rank = (k) => (k === today ? 0 : k > today ? 1 : 2);
    out.sort((a, b) => (rank(a.key) - rank(b.key)) || (rank(a.key) === 2 ? (b.key > a.key ? 1 : -1) : (a.key > b.key ? 1 : -1)));
    out.forEach((g) => g.items.sort((x, y) => new Date(x.expectedDate) - new Date(y.expectedDate)));
    return out;
  }, [visitors]);

  const inside = counts?.['checked-in'] || 0;
  let idx = 0;

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <header className="dash-rise flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-slate-400">Your guests & gate passes</div>
          <h1 className="text-[22px] font-semibold text-slate-900 leading-tight" style={{ letterSpacing: '-0.03em' }}>My visitors</h1>
        </div>
        <button onClick={onCreate}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-white active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 10px 22px -12px rgba(79,70,229,0.95)' }}>
          <Plus size={15} strokeWidth={2.6} /> Invite
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5">
        <Tile i={0} label="Expected" hint="Passes not yet used" value={counts?.active} Icon={Calendar} color="#6366F1" active={statusFilter === 'active'} onClick={() => onPick('active')} />
        <Tile i={1} label="Inside now" hint="Checked in at the gate" value={inside} Icon={LogIn} color="#0EA5E9" pulse={inside > 0} active={statusFilter === 'checked-in'} onClick={() => onPick('checked-in')} />
        <Tile i={2} label="Today" hint="Due in today" value={counts?.today} Icon={Clock} color="#F59E0B" active={statusFilter === 'today'} onClick={() => onPick('today')} />
        <Tile i={3} label="All visitors" hint="Every pass you created" value={counts?.all} Icon={UserCheck} color="#EC4899" active={statusFilter === ''} onClick={() => onStatus('')} />
      </div>

      {/* Search + filters */}
      <div className="sticky -top-4 z-10 -mx-4 px-4 pt-2 pb-2 bg-[#F8FAFC]/90 backdrop-blur space-y-2">
        <div className="relative">
          <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${focus ? 'text-indigo-500' : 'text-slate-400'}`} />
          <input value={search} onChange={(e) => onSearch(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            placeholder="Search name, phone or code"
            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-[14px] outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          {search && <button onClick={() => onSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={16} /></button>}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
          {[...STATUS_CHIPS, ['today', 'Today']].map(([id, label]) => {
            const on = statusFilter === id;
            const n = id === '' ? counts?.all : counts?.[id];
            return (
              <button key={id || 'all'} onClick={() => onStatus(id)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all"
                style={on ? { background: '#0F172A', color: '#fff' } : { background: '#fff', color: '#475569', border: '1px solid #E2E8F0' }}>
                {label}
                {typeof n === 'number' && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] text-center tabular-nums"
                    style={on ? { background: 'rgba(255,255,255,0.18)' } : { background: '#F1F5F9', color: '#64748B' }}>{n}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {loading && !visitors.length ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((k) => <div key={k} className="skeleton h-[124px] rounded-[22px]" />)}</div>
      ) : !visitors.length ? (
        <div className="dash-rise rounded-[22px] bg-white border border-slate-200/70 px-6 py-10 text-center">
          <span className="relative mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-indigo-50">
            <span className="dash-ripple absolute inset-0 rounded-full bg-indigo-100" />
            <UserCheck size={24} className="relative text-indigo-600" />
          </span>
          <div className="mt-4 text-[15px] font-semibold text-slate-900">
            {search ? `No visitors match “${search}”` : statusFilter ? 'No visitors here' : 'No visitors yet'}
          </div>
          <div className="text-[13px] text-slate-500 mt-1">Invite a guest and share their gate code in one tap.</div>
          {!search && !statusFilter && (
            <button onClick={onCreate} className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
              <Plus size={14} /> Invite a visitor
            </button>
          )}
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {groups.map((g) => (
            <section key={g.key}>
              <div className="flex items-center gap-2 mb-2.5 px-1">
                <h2 className="text-[13px] font-semibold text-slate-900">{g.label}</h2>
                <span className="text-[11px] text-slate-400 tabular-nums">{g.items.length} visitor{g.items.length !== 1 ? 's' : ''}</span>
                <span className="flex-1 h-px bg-slate-200/70" />
              </div>
              <div className="space-y-2.5">
                {g.items.map((v) => (
                  <VisitorCard key={v._id} v={v} i={idx++} onOpen={onOpen} onShare={onShare} onCopy={onCopy} onCancel={onCancel} ShareIcon={ShareIcon} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <VisitorsPager page={page} pages={pagination.pages} total={pagination.total} limit={limit} onPage={onPage} accent="#6366F1" />
    </div>
  );
}
