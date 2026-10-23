import { format, isToday, isTomorrow } from 'date-fns';
import {
  Plus, Search, X, UserCheck, Calendar, LogIn, Clock, Users, Package, Wrench, Heart, MoreHorizontal,
  Copy, XCircle, ChevronLeft, ChevronRight, Share2,
} from 'lucide-react';
import useCountUp from '../../../hooks/useCountUp';
import { VISITOR_STATUS } from '../MobileVisitors';

const PURPOSE = {
  family:     [Users, '#EC4899', '#FDF2F8'],
  friend:     [UserCheck, '#6366F1', '#EEF2FF'],
  delivery:   [Package, '#F59E0B', '#FFFBEB'],
  contractor: [Wrench, '#F97316', '#FFF7ED'],
  medical:    [Heart, '#EF4444', '#FEF2F2'],
};
const purposeOf = (p = '') => PURPOSE[String(p).toLowerCase()] || [MoreHorizontal, '#64748B', '#F1F5F9'];
const dayLabel = (d) => (isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'EEE d MMM'));

const STATUS_TABS = [
  ['', 'All'], ['active', 'Expected'], ['checked-in', 'Inside'], ['checked-out', 'Left'], ['expired', 'Expired'], ['cancelled', 'Cancelled'],
];
const SIZES = [10, 15, 25, 50];

function StatCard({ i, label, value, Icon, color, hint, pulse, active, onClick }) {
  const n = useCountUp(value || 0);
  return (
    <button type="button" onClick={onClick}
      className="dash-tile dash-rise group text-left rounded-2xl p-4 border min-w-0"
      style={{
        animationDelay: `${60 + i * 60}ms`,
        background: `linear-gradient(140deg, ${color}${active ? '26' : '17'} 0%, #FFFFFF 55%)`,
        borderColor: active ? color : `${color}2E`,
        boxShadow: active ? `0 0 0 3px ${color}1F` : undefined,
      }}>
      <span className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125" style={{ background: `${color}12` }} />
      <div className="relative flex items-center justify-between">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
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
      <div className="relative mt-3 text-[24px] font-semibold leading-none text-slate-900 tabular-nums" style={{ letterSpacing: '-0.03em' }}>{n}</div>
      <div className="relative mt-1 text-[12px] font-medium text-slate-500 truncate">{label}</div>
      {hint && <div className="relative mt-0.5 text-[11px] text-slate-400 truncate">{hint}</div>}
    </button>
  );
}

export default function VisitorsDesktop({
  visitors, loading, counts, search, onSearch, statusFilter, onStatus,
  page, pagination, limit, onPage, onLimit, onInvite, onOpen, onShare, onCopy, onCancel,
}) {
  const total = pagination.total || 0;
  const last = Math.max(1, pagination.pages || 1);
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(page * limit, total);
  const nums = [...new Set([1, last, page - 1, page, page + 1].filter((n) => n >= 1 && n <= last))].sort((a, b) => a - b);
  const pageItems = [];
  nums.forEach((n, k) => { if (k > 0 && n - nums[k - 1] > 1) pageItems.push(`gap-${n}`); pageItems.push(n); });

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="dash-rise flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>My visitor passes</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Invite guests and share their gate pass</p>
        </div>
        <button onClick={onInvite}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 10px 22px -10px rgba(79,70,229,0.8)' }}>
          <Plus size={15} /> Invite a visitor
        </button>
      </div>

      {/* Stat cards double as filters */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard i={0} label="Expected"   value={counts?.active ?? 0}         Icon={Calendar}  color="#6366F1" hint="Passes not yet used"
          active={statusFilter === 'active'} onClick={() => onStatus('active')} />
        <StatCard i={1} label="Inside now" value={counts?.['checked-in'] ?? 0} Icon={LogIn}     color="#10B981" hint="Checked in at the gate"
          active={statusFilter === 'checked-in'} onClick={() => onStatus('checked-in')} pulse={(counts?.['checked-in'] || 0) > 0} />
        <StatCard i={2} label="Today"      value={counts?.today ?? 0}          Icon={Clock}     color="#F59E0B" hint="Due in today"
          active={statusFilter === 'today'} onClick={() => onStatus('today')} />
        <StatCard i={3} label="All passes" value={counts?.all ?? 0}            Icon={UserCheck} color="#8B5CF6" hint="Every pass you've issued"
          active={false} onClick={() => statusFilter && onStatus(statusFilter)} />
      </div>

      {/* Search + status pills */}
      <div className="dash-rise flex items-center gap-3 flex-wrap" style={{ animationDelay: '300ms' }}>
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search name, phone, purpose or code…"
            className="w-full rounded-2xl bg-white border border-slate-200 pl-11 pr-10 py-3 text-sm outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          {search && (
            <button onClick={() => onSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>
          )}
        </div>
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-slate-200 overflow-x-auto no-scrollbar">
          {STATUS_TABS.map(([key, label]) => {
            const on = statusFilter === key;
            const n = key === '' ? counts?.all : counts?.[key];
            return (
              <button key={key || 'all'} onClick={() => onStatus(key === '' ? statusFilter : key)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all duration-300 ${on ? 'text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                style={on ? { background: 'linear-gradient(135deg, #6366F1, #4F46E5)' } : undefined}>
                {label}
                {typeof n === 'number' && <span className={`text-[10px] font-bold px-1.5 rounded-md tabular-nums ${on ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{n}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="dash-rise rounded-3xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '360ms' }}>
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }).map((_, k) => (
              <div key={k} className="flex items-center gap-4 px-6 py-4">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2"><div className="skeleton h-3 w-40 rounded" /><div className="skeleton h-2.5 w-24 rounded" /></div>
                <div className="skeleton h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : visitors.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
              <span className="dash-ripple absolute inset-0 rounded-full border-2 border-indigo-200" />
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center"><UserCheck size={28} className="text-indigo-500" /></div>
            </div>
            <p className="font-semibold text-slate-800 mt-2">{search ? `No visitors match “${search}”` : statusFilter ? 'No visitors here' : 'No visitors yet'}</p>
            <p className="text-sm text-slate-400">Passes you create will show up here.</p>
            {!search && !statusFilter && (
              <button onClick={onInvite} className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600">
                <Plus size={14} /> Invite a visitor
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                {['Visitor', 'Purpose', 'Expected', 'Code', 'Status', ''].map((h, k) => (
                  <th key={k} className={`text-[10px] font-bold uppercase tracking-wider px-5 py-3 text-slate-400 ${k === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visitors.map((v, k) => {
                const st = VISITOR_STATUS[v.status] || VISITOR_STATUS['checked-out'];
                const [PIcon, pColor, pBg] = purposeOf(v.purpose);
                const when = new Date(v.expectedDate);
                const initials = (v.visitorName || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <tr key={v._id} onClick={() => onOpen(v)}
                    className="dash-rise group cursor-pointer border-t border-slate-100 first:border-0 transition-colors hover:bg-indigo-50/40"
                    style={{ animationDelay: `${400 + k * 35}ms` }}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                          style={{ background: st.bg, color: st.text }}>{initials}</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-900 truncate">{v.visitorName}</div>
                          <div className="text-xs text-slate-400 truncate">{v.visitorPhone || v.visitorEmail || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold capitalize px-2.5 py-1 rounded-lg max-w-[150px]" style={{ background: pBg, color: pColor }}>
                        <PIcon size={12} className="flex-shrink-0" /><span className="truncate">{v.purpose}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-700">{dayLabel(when)}</div>
                      <div className="text-xs text-slate-400">{format(when, 'h:mm a')}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-[13px] font-bold tracking-[0.18em] px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700">{v.visitorCode}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.text }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${v.status === 'checked-in' ? 'animate-pulse' : ''}`} style={{ background: st.dot }} />
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {v.status === 'active' && (
                          <>
                            <button onClick={() => onShare(v)} title="Share pass on WhatsApp"
                              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-500 hover:text-white transition-all">
                              <Share2 size={13} /> Share
                            </button>
                            <button onClick={() => onCopy(v)} title="Copy code" aria-label="Copy code"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                              <Copy size={15} />
                            </button>
                            <button onClick={() => onCancel(v)} title="Cancel pass" aria-label={`Cancel ${v.visitorName}'s pass`}
                              className="p-1.5 rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all">
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        <ChevronRight size={16} className="text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination footer — always visible once there's anything to page */}
        {!loading && total > 0 && (
          <div className="flex items-center justify-between gap-4 flex-wrap px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-4 text-[13px] text-slate-500">
              <span>Showing <strong className="text-slate-800 tabular-nums">{from}–{to}</strong> of <strong className="text-slate-800 tabular-nums">{total}</strong></span>
              <label className="flex items-center gap-2">
                <span className="text-slate-400">Rows</span>
                <select value={limit} onChange={(e) => onLimit(Number(e.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[13px] font-semibold text-slate-700 outline-none focus:border-slate-400 cursor-pointer">
                  {SIZES.map((sz) => <option key={sz} value={sz}>{sz}</option>)}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-500 hover:border-slate-300 disabled:opacity-40 disabled:pointer-events-none">
                <ChevronLeft size={16} />
              </button>
              {pageItems.map((n) => typeof n === 'string' ? (
                <span key={n} className="w-9 text-center text-slate-300 select-none">…</span>
              ) : (
                <button key={n} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined}
                  className={`min-w-[36px] h-9 px-2 rounded-xl text-[13px] font-bold tabular-nums transition-all ${n === page ? 'text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  style={n === page ? { background: '#6366F1', boxShadow: '0 8px 18px -8px #6366F1' } : undefined}>
                  {n}
                </button>
              ))}
              <button onClick={() => onPage(page + 1)} disabled={page >= last} aria-label="Next page"
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-slate-200 bg-white text-slate-500 hover:border-slate-300 disabled:opacity-40 disabled:pointer-events-none">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
