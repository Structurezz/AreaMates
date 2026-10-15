import { useMemo } from 'react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { Search, X, Plus, ChevronRight, Users, Package, Wrench, Heart, UserCheck, MoreHorizontal, Clock } from 'lucide-react';

// Phone layout for the Visitors pages (residents + estate manager share it;
// each app passes its own colours and card actions). Desktop keeps the table.

export const VISITOR_STATUS = {
  active:        { label: 'Expected',   dot: '#6366F1', bg: '#EEF2FF', text: '#4338CA' },
  'checked-in':  { label: 'Inside now', dot: '#10B981', bg: '#ECFDF5', text: '#047857' },
  'checked-out': { label: 'Left',       dot: '#94A3B8', bg: '#F1F5F9', text: '#475569' },
  expired:       { label: 'Expired',    dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309' },
  blacklisted:   { label: 'Blocked',    dot: '#EF4444', bg: '#FEF2F2', text: '#B91C1C' },
  cancelled:     { label: 'Cancelled',  dot: '#CBD5E1', bg: '#F1F5F9', text: '#64748B' },
};

export const STATUS_CHIPS = [
  ['', 'All'], ['active', 'Expected'], ['checked-in', 'Inside'], ['checked-out', 'Left'], ['expired', 'Expired'], ['cancelled', 'Cancelled'], ['blacklisted', 'Blocked'],
];

const PURPOSE_ICON = {
  family:     [Users, '#EC4899', '#FDF2F8'],
  friend:     [UserCheck, '#6366F1', '#EEF2FF'],
  delivery:   [Package, '#F59E0B', '#FFFBEB'],
  contractor: [Wrench, '#F97316', '#FFF7ED'],
  medical:    [Heart, '#EF4444', '#FEF2F2'],
};
const purposeIcon = (p = '') => PURPOSE_ICON[String(p).toLowerCase()] || [MoreHorizontal, '#64748B', '#F1F5F9'];

const dayLabel = (d) => (isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, d MMM'));

/** Gradient header with tappable counts and the main action. */
export function VisitorsHero({ title, subtitle, counts, gradient, onPick, cta, onCta, statusFilter }) {
  const tiles = [
    ['active', 'Expected', counts?.active],
    ['checked-in', 'Inside now', counts?.['checked-in']],
    ['today', 'Today', counts?.today],
  ];
  return (
    <div className="-mx-4 -mt-4 px-4 pt-5 pb-5 text-white relative overflow-hidden" style={{ background: gradient }}>
      <div className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
      <div className="relative">
        <h1 className="text-[22px] font-extrabold tracking-tight">{title}</h1>
        <p className="text-[13px] text-white/75 mt-0.5">{subtitle}</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {tiles.map(([key, label, n]) => {
            const on = statusFilter === key;
            return (
              <button key={key} onClick={() => onPick(key === 'today' ? 'today' : key)}
                className={`text-left rounded-2xl px-3 py-2.5 transition-colors active:scale-[0.98] ${on ? 'bg-white text-slate-900' : 'bg-white/12 hover:bg-white/20'}`}
                style={on ? undefined : { background: 'rgba(255,255,255,0.12)' }}>
                <p className="text-[22px] font-extrabold leading-none">{counts ? (n ?? 0) : '–'}</p>
                <p className={`text-[11px] mt-1 font-medium ${on ? 'text-slate-500' : 'text-white/75'}`}>{label}</p>
              </button>
            );
          })}
        </div>
        <button onClick={onCta} className="mt-3 w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-slate-900 font-bold py-3.5 shadow-sm active:scale-[0.99] transition-transform">
          <Plus size={18} strokeWidth={2.6} /> {cta}
        </button>
      </div>
    </div>
  );
}

/** Sticky search + status chips (with counts). */
export function VisitorsFilters({ search, onSearch, statusFilter, onStatus, counts, accent }) {
  return (
    <div className="sticky -top-4 z-10 -mx-4 px-4 pt-3 pb-2 bg-[#F8FAFC]/95 backdrop-blur">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search name, phone or code"
          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-10 py-3 text-[15px] outline-none focus:border-slate-300" />
        {search && <button onClick={() => onSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={16} /></button>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-2.5 -mx-4 px-4">
        {[...STATUS_CHIPS, ['today', 'Today']].map(([id, label]) => {
          const on = statusFilter === id;
          const n = id === '' ? counts?.all : counts?.[id];
          return (
            <button key={id || 'all'} onClick={() => onStatus(id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-colors ${on ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-600'}`}
              style={on ? { background: accent } : undefined}>
              {label}
              {n > 0 && <span className={`text-[11px] ${on ? 'text-white/80' : 'text-slate-400'}`}>{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Visitors grouped by expected day, as tappable cards. */
export function VisitorCards({ visitors, loading, onOpen, renderActions, showHost, accent, emptyText, onEmptyCta, emptyCta }) {
  const groups = useMemo(() => {
    const out = [];
    for (const v of visitors) {
      const d = new Date(v.expectedDate);
      const key = format(d, 'yyyy-MM-dd');
      let g = out.find((x) => x.key === key);
      if (!g) { g = { key, label: dayLabel(d), items: [] }; out.push(g); }
      g.items.push(v);
    }
    // Today first, then upcoming days (soonest first), then past days (latest first).
    const today = format(new Date(), 'yyyy-MM-dd');
    const rank = (k) => (k === today ? [0, 0] : k > today ? [1, k] : [2, k]);
    out.sort((a, b) => {
      const [ra, ka] = rank(a.key); const [rb, kb] = rank(b.key);
      if (ra !== rb) return ra - rb;
      return ra === 2 ? (kb > ka ? 1 : -1) : (ka > kb ? 1 : -1);
    });
    out.forEach((g) => g.items.sort((x, y) => new Date(x.expectedDate) - new Date(y.expectedDate)));
    return out;
  }, [visitors]);

  if (loading && !visitors.length) {
    return (
      <div className="space-y-2.5 mt-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-white border border-slate-200 p-3.5 flex gap-3 animate-pulse">
            <div className="w-11 h-11 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2 py-1"><div className="h-4 w-1/2 bg-slate-200 rounded" /><div className="h-3 w-3/4 bg-slate-100 rounded" /></div>
          </div>
        ))}
      </div>
    );
  }

  if (!visitors.length) {
    return (
      <div className="text-center py-14 px-6">
        <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: `${accent}14` }}><UserCheck size={28} style={{ color: accent }} /></div>
        <p className="font-bold text-slate-900">{emptyText}</p>
        {emptyCta && <button onClick={onEmptyCta} className="mt-4 inline-flex items-center gap-1.5 rounded-full text-white font-semibold text-sm px-5 py-2.5" style={{ background: accent }}><Plus size={16} /> {emptyCta}</button>}
      </div>
    );
  }

  return (
    <div className={`space-y-4 mt-1 transition-opacity ${loading ? 'opacity-60' : ''}`}>
      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">{g.label}</h2>
          <div className="space-y-2.5">
            {g.items.map((v) => {
              const st = VISITOR_STATUS[v.status] || VISITOR_STATUS['checked-out'];
              const [Icon, pColor] = purposeIcon(v.purpose);
              const when = new Date(v.expectedDate);
              const actions = renderActions?.(v);
              const host = showHost && (v.hostResidentId?.name || 'Estate manager');
              const unit = showHost && v.hostUnitId ? `${v.hostUnitId.block ? `${v.hostUnitId.block} · ` : ''}${v.hostUnitId.unitNumber}` : '';
              return (
                <div key={v._id} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
                  <button onClick={() => onOpen(v)} className="w-full flex items-center gap-3 p-3.5 text-left active:bg-slate-50">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: st.bg, color: st.text }}>
                        {(v.visitorName || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-[22px] h-[22px] rounded-full flex items-center justify-center ring-2 ring-white" style={{ background: pColor }}>
                        <Icon size={12} className="text-white" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[15px] text-slate-900 truncate">{v.visitorName}</p>
                      </div>
                      <p className="text-[12px] text-slate-500 truncate flex items-center gap-1">
                        <Clock size={11} className="shrink-0" style={{ color: pColor }} /> {format(when, 'h:mm a')} · <span style={{ color: pColor }} className="font-medium">{v.purpose}</span>
                      </p>
                      {host && <p className="text-[12px] text-slate-400 truncate">For {host}{unit ? ` · ${unit}` : ''}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.text }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />{st.label}
                      </span>
                      <span className="font-mono text-[12px] font-bold tracking-widest" style={{ color: accent }}>{v.visitorCode}</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 shrink-0 -mr-1" />
                  </button>
                  {actions && <div className="flex gap-2 px-3.5 pb-3.5 -mt-0.5">{actions}</div>}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Small action button used on cards. */
export function CardAction({ children, tone = 'plain', accent, ...p }) {
  const style = tone === 'primary' ? { background: accent, color: '#fff' }
    : tone === 'green' ? { background: '#25D366', color: '#fff' }
    : tone === 'danger' ? { background: '#FEF2F2', color: '#B91C1C' }
    : { background: '#F1F5F9', color: '#334155' };
  return (
    <button {...p} onClick={(e) => { e.stopPropagation(); p.onClick?.(e); }}
      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
      style={style}>
      {children}
    </button>
  );
}
