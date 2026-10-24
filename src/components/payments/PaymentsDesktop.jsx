import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Wallet, Eye, EyeOff, RefreshCw, AlertTriangle, CalendarClock, CheckCircle2, Receipt, Clock, FileText,
  ArrowUpRight, History, HelpCircle, Lock, ShieldCheck, XCircle, Copy, ChevronRight, BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useCountUp from '../../hooks/useCountUp';

// Desktop layout for the residents Payments page (phones keep the stacked view).

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function Tile({ i, label, value, display, Icon, color, sub, pulse }) {
  const n = useCountUp(value || 0);
  return (
    <div className="dash-tile dash-rise rounded-2xl p-4 border min-w-0"
      style={{ animationDelay: `${80 + i * 60}ms`, background: `linear-gradient(140deg, ${color}17 0%, #FFFFFF 55%)`, borderColor: `${color}2E` }}>
      <span className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full pointer-events-none" style={{ background: `${color}12` }} />
      <div className="relative flex items-center justify-between">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
          <Icon size={15} className="text-white" />
        </span>
        {pulse && (
          <span className="relative flex w-2 h-2">
            <span className="absolute inset-0 rounded-full animate-ping opacity-70" style={{ background: color }} />
            <span className="relative w-2 h-2 rounded-full" style={{ background: color }} />
          </span>
        )}
      </div>
      <div className="relative mt-3 text-[22px] font-semibold leading-none text-slate-900 tabular-nums truncate" style={{ letterSpacing: '-0.03em' }}>
        {display ? display(n) : n}
      </div>
      <div className="relative mt-1 text-[12px] font-medium text-slate-500 truncate">{label}</div>
      {sub && <div className="relative text-[11px] text-slate-400 truncate">{sub}</div>}
    </div>
  );
}

function YearChart({ history, year, shown }) {
  const months = useMemo(() => {
    const m = Array(12).fill(0);
    history.forEach((p) => {
      if (p.status !== 'paid' || !p.paidAt) return;
      const d = new Date(p.paidAt);
      if (d.getFullYear() === year) m[d.getMonth()] += p.amount;
    });
    return m;
  }, [history, year]);
  const max = Math.max(1, ...months);
  const now = new Date().getMonth();
  const [hover, setHover] = useState(null);
  return (
    <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4" style={{ animationDelay: '200ms' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-500"><BarChart3 size={12} className="text-white" /></span>
          Paid in {year}
        </h3>
        <span className="text-[12px] text-slate-400">{hover !== null ? `${format(new Date(year, hover, 1), 'MMMM')} · ${shown(months[hover])}` : 'By month'}</span>
      </div>
      <div className="mt-4 h-28 flex items-end gap-1.5">
        {months.map((v, i) => (
          <button key={i} type="button" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            className="flex-1 h-full flex flex-col items-center justify-end gap-1 group">
            <span className="w-full rounded-t-md dash-bar transition-colors"
              style={{ height: `${v ? Math.max(6, (v / max) * 100) : 3}%`, animationDelay: `${i * 40}ms`, background: i === now ? 'linear-gradient(180deg,#818CF8,#4F46E5)' : hover === i ? '#A5B4FC' : v ? '#C7D2FE' : '#F1F5F9' }} />
            <span className={`text-[10px] ${i === now ? 'font-semibold text-indigo-600' : 'text-slate-400'}`}>{MONTHS[i]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PaymentsDesktop({
  loading, outstanding, history, overdue, overdueTotal, totalDue, paidThisYear, paidCount, nextBill, thisYear,
  hideBalance, toggleHide, shown, naira, onRefresh, tab, setTab, onPay, onInvoice, onDetail, onHelp,
  TYPE_META, STATUS, METHOD_LABEL, dueDateOf,
}) {
  const months = useMemo(() => {
    const groups = [];
    history.forEach((p) => {
      const d = new Date(p.paidAt || p.updatedAt || p.createdAt);
      const label = format(d, 'MMMM yyyy');
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(p); else groups.push({ label, items: [p] });
    });
    return groups;
  }, [history]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="dash-rise flex items-end justify-between gap-4">
        <div>
          <div className="text-[12px] font-medium text-slate-400">Dues, levies & receipts</div>
          <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.025em' }}>Payments</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onHelp} className="btn-outline !text-[13px] !px-3 !py-2 gap-1.5"><HelpCircle size={14} /> How it works</button>
          <button onClick={onRefresh} className="btn-outline !text-[13px] !px-3 !py-2 gap-1.5"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh</button>
          <button onClick={() => (nextBill ? onPay(nextBill) : toast.success("You're all caught up — nothing to pay"))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', boxShadow: '0 10px 20px -12px rgba(79,70,229,0.9)' }}>
            <ArrowUpRight size={14} /> Pay next bill
          </button>
        </div>
      </div>

      {/* Balance + stats */}
      <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(0,2fr)] gap-4">
        <div className="dash-rise relative overflow-hidden rounded-2xl p-5 text-white"
          style={{ animationDelay: '40ms', background: 'linear-gradient(150deg,#1E1B4B 0%,#312E81 50%,#4F46E5 115%)', boxShadow: '0 18px 36px -20px rgba(30,27,75,0.95)' }}>
          <div className="dash-blob absolute -top-20 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(129,140,248,0.45)' }} />
          <Wallet size={140} className="absolute -right-6 -bottom-8 text-white/[0.05] pointer-events-none" />
          <div className="relative flex items-center gap-2 text-[12px] text-indigo-100/85">
            <Wallet size={14} /> Amount due
            <button onClick={toggleHide} aria-label={hideBalance ? 'Show amounts' : 'Hide amounts'} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
              {hideBalance ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="relative mt-1 text-[34px] font-semibold tracking-tight leading-none tabular-nums">
            {loading && !outstanding.length && !history.length ? <span className="inline-block w-40 h-9 rounded-lg bg-white/15 animate-pulse" /> : shown(totalDue)}
          </div>
          <div className="relative mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-indigo-50/75">
            <span>{outstanding.length} {outstanding.length === 1 ? 'bill' : 'bills'} to pay</span>
            {overdue.length > 0 && <span className="text-red-200 font-semibold">{overdue.length} overdue · {shown(overdueTotal)}</span>}
          </div>
          {nextBill ? (
            <button onClick={() => onPay(nextBill)}
              className="relative mt-4 w-full flex items-center gap-3 rounded-2xl bg-white/10 hover:bg-white/15 px-3.5 py-3 text-left transition-colors">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${nextBill.status === 'overdue' ? 'bg-red-400/30' : 'bg-white/15'}`}>
                {nextBill.status === 'overdue' ? <AlertTriangle size={16} /> : <CalendarClock size={16} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold truncate">{nextBill.scheduleId?.title || 'Payment due'}</span>
                <span className="block text-[11px] text-indigo-50/70 truncate">
                  {nextBill.status === 'overdue' ? 'Overdue' : 'Due'} {format(new Date(dueDateOf(nextBill)), 'MMM d')} · {shown(nextBill.amount)}
                </span>
              </span>
              <span className="shrink-0 text-[12px] font-semibold bg-white text-indigo-700 px-3 py-1.5 rounded-full">Pay</span>
            </button>
          ) : !loading && (
            <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-white/10 px-3.5 py-3">
              <CheckCircle2 size={17} className="text-emerald-300" /><span className="text-[13px] font-semibold">You're all caught up</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Tile i={0} label={`Paid in ${thisYear}`} value={paidThisYear} display={(n) => shown(n)} Icon={CheckCircle2} color="#10B981" sub="Bills you've settled this year" />
          <Tile i={1} label="Payments made" value={paidCount} Icon={Receipt} color="#6366F1" sub="Each one has a receipt" />
          <Tile i={2} label="Bills to pay" value={outstanding.length} Icon={Clock} color="#F59E0B" sub={outstanding.length ? `${shown(totalDue)} in total` : 'Nothing due'} />
          <Tile i={3} label="Overdue" value={overdue.length} Icon={AlertTriangle} color={overdue.length ? '#EF4444' : '#94A3B8'} pulse={overdue.length > 0}
            sub={overdue.length ? `${shown(overdueTotal)} past due` : 'All on time'} />
        </div>
      </div>

      {/* Bills / history + side rail */}
      <div className="grid grid-cols-12 gap-5 items-start">
        <section className="col-span-8 dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between px-4 h-14 border-b border-slate-100">
            <div className="flex p-1 rounded-xl bg-slate-100">
              {[['bills', 'My bills', FileText], ['history', 'History', History]].map(([id, label, I]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <I size={13} /> {label}
                  {id === 'bills' && outstanding.length > 0 && (
                    <span className={`text-[10px] font-semibold px-1.5 rounded-full ${overdue.length ? 'bg-red-500 text-white' : 'bg-indigo-100 text-indigo-700'}`}>{outstanding.length}</span>
                  )}
                </button>
              ))}
            </div>
            <span className="text-[12px] text-slate-400">
              {tab === 'bills' ? 'Overdue first, then by due date' : `${history.length} past payment${history.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {loading ? (
            <div className="p-4 space-y-2.5">{[0, 1, 2, 3].map((k) => <div key={k} className="skeleton h-14 rounded-xl" />)}</div>
          ) : tab === 'bills' ? (
            outstanding.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 mx-auto flex items-center justify-center"><CheckCircle2 size={26} className="text-emerald-500" /></div>
                <p className="mt-3 text-[15px] font-semibold text-slate-900">You're all caught up!</p>
                <p className="text-[13px] text-slate-400 mt-1">New dues from your estate will show up here.</p>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-[minmax(0,2.2fr)_140px_110px_120px_200px] gap-4 px-5 py-2.5 bg-slate-50/80 text-[11px] font-medium text-slate-400 border-b border-slate-100">
                  <span>Bill</span><span>Due</span><span>Status</span><span className="text-right">Amount</span><span />
                </div>
                {outstanding.map((p, i) => {
                  const meta = TYPE_META[p.scheduleId?.type] || TYPE_META.other;
                  const Icon = meta.icon;
                  const late = p.status === 'overdue';
                  return (
                    <div key={p._id} className="dash-rise dash-row grid grid-cols-[minmax(0,2.2fr)_140px_110px_120px_200px] gap-4 items-center px-5 py-3 border-t border-slate-100 first:border-0"
                      style={{ animationDelay: `${200 + i * 40}ms`, background: late ? 'rgba(254,226,226,0.25)' : undefined }}>
                      <span className="flex items-center gap-3 min-w-0">
                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.tint}`}><Icon size={17} /></span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-slate-900 truncate">{p.scheduleId?.title || 'Payment due'}</span>
                          <span className="block text-[12px] text-slate-400 truncate">{meta.label}{p.scheduleId?.frequency ? ` · ${String(p.scheduleId.frequency).replace(/_/g, ' ')}` : ''}</span>
                        </span>
                      </span>
                      <span className={`text-[13px] ${late ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>{format(new Date(dueDateOf(p)), 'MMM d, yyyy')}</span>
                      <span><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS[p.status]?.pill}`}>{STATUS[p.status]?.label}</span></span>
                      <span className={`text-right text-[14px] font-semibold tabular-nums ${late ? 'text-red-600' : 'text-slate-900'}`}>{naira(p.amount)}</span>
                      <span className="flex items-center justify-end gap-1.5">
                        <button onClick={() => onInvoice(p._id)} className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">
                          <Receipt size={12} /> Invoice
                        </button>
                        <button onClick={() => onPay(p)}
                          className={`inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white transition-colors ${late ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                          <Lock size={11} /> Pay
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )
          ) : history.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 mx-auto flex items-center justify-center"><History size={24} className="text-slate-400" /></div>
              <p className="mt-3 text-[15px] font-semibold text-slate-900">No payment history yet</p>
              <p className="text-[13px] text-slate-400 mt-1">Bills you pay will show up here with a receipt.</p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[110px_minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_110px_90px] gap-4 px-5 py-2.5 bg-slate-50/80 text-[11px] font-medium text-slate-400 border-b border-slate-100">
                <span>Date</span><span>Bill</span><span>Method</span><span>Reference</span><span className="text-right">Amount</span><span />
              </div>
              {months.map((g) => (
                <div key={g.label}>
                  <div className="px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-white border-t border-slate-100">{g.label}</div>
                  {g.items.map((p) => {
                    const waived = p.status === 'waived';
                    return (
                      <button key={p._id} onClick={() => onDetail(p)}
                        className="dash-row w-full grid grid-cols-[110px_minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_110px_90px] gap-4 items-center px-5 py-2.5 text-left border-t border-slate-50">
                        <span className="text-[12px] text-slate-500">{p.paidAt ? format(new Date(p.paidAt), 'MMM d, HH:mm') : '—'}</span>
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${waived ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-600'}`}>
                            {waived ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                          </span>
                          <span className="text-[13px] font-semibold text-slate-900 truncate">{p.scheduleId?.title || 'Payment'}</span>
                        </span>
                        <span className="text-[12px] text-slate-500 truncate">{waived ? 'Waived by estate' : (METHOD_LABEL[p.method] || p.method || '—')}</span>
                        <span className="min-w-0">
                          {p.paystackReference ? (
                            <span role="button" tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(p.paystackReference); toast.success('Reference copied'); }}
                              className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 hover:text-indigo-600 max-w-full">
                              <span className="truncate">{p.paystackReference}</span> <Copy size={11} className="shrink-0" />
                            </span>
                          ) : <span className="text-[12px] text-slate-300">—</span>}
                        </span>
                        <span className={`text-right text-[13px] font-semibold tabular-nums ${waived ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{naira(p.amount)}</span>
                        <span className="flex items-center justify-end gap-1 text-[12px] font-medium text-indigo-600">
                          {p.status === 'paid' ? <>Receipt <ChevronRight size={13} /></> : <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS[p.status]?.pill}`}>{STATUS[p.status]?.label}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="col-span-4 space-y-4">
          <YearChart history={history} year={thisYear} shown={shown} />

          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4" style={{ animationDelay: '240ms' }}>
            <h3 className="text-[14px] font-semibold text-slate-900">How payments work</h3>
            <ol className="mt-3 relative space-y-3">
              <span className="absolute left-[15px] top-4 bottom-4 w-px bg-slate-200" />
              {[
                [FileText, 'Your estate creates a bill', 'Dues and levies appear under My bills with their due date.'],
                [Lock, 'Pay securely with Paystack', 'Card, bank transfer or USSD — on Paystack’s secure page.'],
                [Receipt, 'Get your receipt', 'Confirmed payments move to History with a receipt.'],
              ].map(([I, t, d]) => (
                <li key={t} className="relative flex gap-3">
                  <span className="relative z-10 w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 ring-4 ring-white"><I size={14} /></span>
                  <span className="pt-0.5">
                    <span className="block text-[13px] font-semibold text-slate-900">{t}</span>
                    <span className="block text-[12px] text-slate-500 leading-snug">{d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="dash-rise rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 flex gap-3" style={{ animationDelay: '280ms' }}>
            <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[12px] text-emerald-900/80 leading-relaxed">
              Your card details never touch AreaMates. Paid but it still shows as due? Give it a minute and refresh, or send your Paystack reference to your estate manager.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
