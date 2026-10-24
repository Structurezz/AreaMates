import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import BottomSheet from '../components/payments/BottomSheet';
import InvoiceModal from '../components/ui/InvoiceModal';
import PaymentsDesktop from '../components/payments/PaymentsDesktop';
import useIsDesktop from '../hooks/useIsDesktop';
import {
  Clock, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Receipt, Eye, EyeOff,
  ShieldCheck, Wrench, FileText, Gift, CreditCard, ArrowUpRight, ChevronRight,
  History, HelpCircle, Wallet, Copy, Lock, CalendarClock, Building2,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

const STATUS = {
  paid:    { label: 'Paid',    pill: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'Due',     pill: 'bg-amber-50 text-amber-700' },
  overdue: { label: 'Overdue', pill: 'bg-red-50 text-red-600' },
  waived:  { label: 'Waived',  pill: 'bg-slate-100 text-slate-500' },
};

const TYPE_META = {
  security_dues: { label: 'Security Dues', icon: ShieldCheck, tint: 'bg-blue-50 text-blue-600' },
  maintenance:   { label: 'Maintenance',   icon: Wrench,      tint: 'bg-amber-50 text-amber-600' },
  levy:          { label: 'Levy',          icon: FileText,    tint: 'bg-purple-50 text-purple-600' },
  contribution:  { label: 'Contribution',  icon: Gift,        tint: 'bg-emerald-50 text-emerald-600' },
  other:         { label: 'Other',         icon: CreditCard,  tint: 'bg-slate-100 text-slate-500' },
};

const METHOD_LABEL = {
  paystack: 'Paystack (card / transfer)',
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  manual: 'Recorded by estate',
};

const HIDE_KEY = 'am_hide_balance';
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const dueDateOf = (p) => p.scheduleId?.dueDate || p.dueDate || p.createdAt;
const dayLabel = (d) => isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, MMM d, yyyy');

function groupByDay(items, getDate) {
  const groups = [];
  items.forEach((item) => {
    const raw = getDate(item);
    const label = raw ? dayLabel(new Date(raw)) : 'Earlier';
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  });
  return groups;
}

function Row({ label, value, sub }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="text-slate-400 shrink-0">{label}</span>
      <div className="text-right min-w-0">
        <div className="font-semibold text-slate-900 break-words">{value}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, primary, badge }) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-2 min-w-0">
      <span className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all group-active:scale-95 ${
        primary
          ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 group-hover:bg-indigo-600'
          : 'bg-white text-slate-700 border border-slate-200 group-hover:border-indigo-300 group-hover:text-indigo-600'
      }`}>
        <Icon size={22} strokeWidth={2.2} />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {badge}
          </span>
        )}
      </span>
      <span className="text-xs font-semibold text-slate-600 text-center leading-tight">{label}</span>
    </button>
  );
}

function StatChip({ icon: Icon, label, value, tone, className = '' }) {
  return (
    <div className={`glass-card px-4 py-3.5 min-w-[150px] snap-start shrink-0 lg:min-w-0 ${className}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone}`}><Icon size={14} /></span>
        <span className="text-xs text-slate-500 truncate">{label}</span>
      </div>
      <div className="text-lg font-bold text-slate-900 truncate">{value}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, tone = 'bg-slate-100 text-slate-400' }) {
  return (
    <div className="glass-card py-14 px-6 text-center">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${tone}`}><Icon size={26} /></div>
      <p className="text-slate-800 font-semibold mb-1">{title}</p>
      {body && <p className="text-slate-400 text-sm max-w-xs mx-auto">{body}</p>}
    </div>
  );
}

export default function Payments() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, estate } = useAuth();
  const estateName = estate?.name || (typeof user?.estateId === 'object' ? user.estateId?.name : null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [tab, setTab] = useState('bills'); // bills | history
  const [hideBalance, setHideBalance] = useState(() => localStorage.getItem(HIDE_KEY) === '1');
  const [payFor, setPayFor] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [invoiceId, setInvoiceId] = useState(null);
  const isDesktop = useIsDesktop();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await paymentAPI.getMine();
      setPayments(data.data || []);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Paystack redirects back here with ?ref=… — confirm the payment.
  useEffect(() => {
    const ref = new URLSearchParams(location.search).get('ref');
    if (!ref) return;
    (async () => {
      setVerifying(true);
      try {
        const { data } = await paymentAPI.verify(ref);
        if (data.success) {
          toast.success('Payment confirmed! Thank you.');
          await load();
          setTab('history');
        } else {
          toast.error('Payment could not be verified.');
        }
      } catch {
        toast.error('Verification failed. Contact the estate manager.');
      } finally {
        setVerifying(false);
        navigate('/payments', { replace: true });
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const toggleHide = () => {
    setHideBalance(h => { localStorage.setItem(HIDE_KEY, h ? '0' : '1'); return !h; });
  };

  // Overdue first, then soonest due date.
  const outstanding = payments
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .sort((a, b) => ((b.status === 'overdue') - (a.status === 'overdue')) || (new Date(dueDateOf(a)) - new Date(dueDateOf(b))));
  const history = payments
    .filter((p) => p.status === 'paid' || p.status === 'waived')
    .sort((a, b) => new Date(b.paidAt || b.updatedAt || 0) - new Date(a.paidAt || a.updatedAt || 0));

  const totalDue = outstanding.reduce((s, p) => s + p.amount, 0);
  const overdue = outstanding.filter((p) => p.status === 'overdue');
  const overdueTotal = overdue.reduce((s, p) => s + p.amount, 0);
  const thisYear = new Date().getFullYear();
  const paidThisYear = history
    .filter((p) => p.status === 'paid' && p.paidAt && new Date(p.paidAt).getFullYear() === thisYear)
    .reduce((s, p) => s + p.amount, 0);
  const paidCount = history.filter((p) => p.status === 'paid').length;
  const nextBill = outstanding[0];

  const shown = (n) => (hideBalance ? '₦ ••••••' : naira(n));

  const handlePay = async (payment) => {
    setPaying(true);
    try {
      const { data } = await paymentAPI.initialize(payment._id);
      if (data.success && data.data.authorizationUrl) {
        window.location.href = data.data.authorizationUrl;
        return; // keep the spinner while the browser leaves for Paystack
      }
      toast.error('Could not start payment. Try again.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initialization failed');
    }
    setPaying(false);
  };

  if (verifying) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="glass-card p-10 text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={28} className="text-indigo-500 animate-spin" />
          </div>
          <p className="font-semibold text-lg text-slate-900">Confirming your payment…</p>
          <p className="text-sm mt-1 text-slate-400">Please wait, don't close this tab.</p>
        </div>
      </div>
    );
  }

  const payMeta = payFor ? (TYPE_META[payFor.scheduleId?.type] || TYPE_META.other) : null;

  // Pay / detail / help sheets + invoice — shared by the phone and desktop layouts
  const sheets = (
    <>
      {/* ── Pay: review before leaving for Paystack ── */}
      <BottomSheet open={!!payFor} onClose={() => !paying && setPayFor(null)} title="Confirm payment" subtitle="Check the details before you pay"
        footer={payFor && (
          <div className="flex gap-3">
            <button onClick={() => setPayFor(null)} disabled={paying} className="btn-outline flex-1 py-3.5">Cancel</button>
            <button onClick={() => handlePay(payFor)} disabled={paying} className="btn-primary flex-[2] py-3.5 gap-2 text-base">
              {paying ? <><RefreshCw size={16} className="animate-spin" /> Opening Paystack…</> : <><Lock size={15} /> Pay {naira(payFor.amount)}</>}
            </button>
          </div>
        )}>
        {payFor && (
          <>
            <div className="text-center py-5">
              <p className="text-xs uppercase tracking-widest font-semibold text-slate-400 mb-1">You're paying</p>
              <div className="text-4xl font-black text-slate-900 tracking-tight">{naira(payFor.amount)}</div>
              {payFor.status === 'overdue' && (
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600">
                  <AlertTriangle size={12} /> Overdue
                </span>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${payMeta.tint}`}><payMeta.icon size={20} /></div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Bill</div>
                  <div className="text-sm font-semibold text-slate-900 truncate">{payFor.scheduleId?.title || 'Payment due'}</div>
                  <div className="text-xs text-slate-400 truncate">{payMeta.label} · Due {format(new Date(dueDateOf(payFor)), 'MMM d, yyyy')}</div>
                </div>
              </div>
              <div className="border-t border-slate-200 flex items-center gap-3 p-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Building2 size={20} /></div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Paid to</div>
                  <div className="text-sm font-semibold text-slate-900 truncate">{estateName || 'Your estate'}</div>
                  <div className="text-xs text-slate-400 truncate">Card, bank transfer or USSD via Paystack</div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
              <ShieldCheck size={14} className="text-emerald-500 shrink-0 mt-0.5" />
              You'll finish on Paystack's secure page and come straight back here. Your card details never touch AreaMates.
            </div>
          </>
        )}
      </BottomSheet>

      {/* ── History item detail ── */}
      <BottomSheet open={!!detail} onClose={() => setDetail(null)} title="Payment details"
        footer={detail && (
          <div className="flex gap-3">
            <button onClick={() => setDetail(null)} className="btn-outline flex-1 py-3">Close</button>
            {detail.status === 'paid' && (
              <button onClick={() => { setInvoiceId(detail._id); setDetail(null); }} className="btn-primary flex-[2] py-3 gap-2">
                <Receipt size={15} /> View receipt
              </button>
            )}
          </div>
        )}>
        {detail && (
          <>
            <div className="text-center py-4">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 ${detail.status === 'paid' ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                {detail.status === 'paid' ? <CheckCircle2 size={34} className="text-emerald-500" /> : <XCircle size={30} className="text-slate-400" />}
              </div>
              <div className="text-4xl font-black text-slate-900 tracking-tight">{naira(detail.amount)}</div>
              <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${STATUS[detail.status]?.pill}`}>{STATUS[detail.status]?.label}</span>
            </div>
            <div className="rounded-2xl bg-slate-50 divide-y divide-slate-100 text-sm">
              <Row label="Bill" value={detail.scheduleId?.title || 'Payment'} sub={TYPE_META[detail.scheduleId?.type]?.label} />
              {detail.status === 'paid' && <Row label="Method" value={METHOD_LABEL[detail.method] || detail.method || '—'} />}
              <Row label="Date" value={detail.paidAt ? format(new Date(detail.paidAt), 'MMM d, yyyy · h:mm a') : '—'} />
              {detail.paystackReference && (
                <Row label="Reference" value={
                  <button onClick={() => { navigator.clipboard?.writeText(detail.paystackReference); toast.success('Reference copied'); }}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-700 hover:text-indigo-600 break-all">
                    {detail.paystackReference} <Copy size={12} className="shrink-0" />
                  </button>
                } />
              )}
            </div>
          </>
        )}
      </BottomSheet>

      {/* ── Help ── */}
      <BottomSheet open={showHelp} onClose={() => setShowHelp(false)} title="How payments work"
        footer={<button onClick={() => setShowHelp(false)} className="btn-primary w-full py-3">Got it</button>}>
        <ol className="space-y-4 text-sm">
          {[
            [FileText, 'Your estate creates a bill', 'Dues, levies and contributions show up under My bills with their due date.'],
            [Lock, 'Pay securely with Paystack', 'Tap Pay, check the details, then pay by card, bank transfer or USSD on Paystack.'],
            [Receipt, 'Get your receipt', 'Once confirmed, the payment moves to History. Tap it any time to view or download the receipt.'],
          ].map(([Icon, title, body]) => (
            <li key={title} className="flex gap-3">
              <span className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Icon size={17} /></span>
              <span><span className="block font-semibold text-slate-900">{title}</span><span className="text-slate-500">{body}</span></span>
            </li>
          ))}
        </ol>
        <div className="mt-5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex gap-2">
          <ChevronRight size={14} className="shrink-0 mt-0.5" />
          Paid but it still shows as due? Give it a minute and tap refresh. If it doesn't update, send your Paystack reference to your estate manager.
        </div>
      </BottomSheet>

      <InvoiceModal paymentId={invoiceId} onClose={() => setInvoiceId(null)} />
    </>
  );

  if (isDesktop) return (
    <>
      <PaymentsDesktop
        loading={loading} outstanding={outstanding} history={history} overdue={overdue} overdueTotal={overdueTotal}
        totalDue={totalDue} paidThisYear={paidThisYear} paidCount={paidCount} nextBill={nextBill} thisYear={thisYear}
        hideBalance={hideBalance} toggleHide={toggleHide} shown={shown} naira={naira} onRefresh={load}
        tab={tab} setTab={setTab} onPay={setPayFor} onInvoice={setInvoiceId} onDetail={setDetail} onHelp={() => setShowHelp(true)}
        TYPE_META={TYPE_META} STATUS={STATUS} METHOD_LABEL={METHOD_LABEL} dueDateOf={dueDateOf}
      />
      {sheets}
    </>
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Desktop: account column left, bills/history right. Phones stack. */}
      <div className="space-y-5 xl:space-y-0 xl:grid xl:grid-cols-[minmax(360px,420px)_1fr] xl:gap-6 xl:items-start">
        <aside className="space-y-5 xl:sticky xl:top-0">
          {/* ── Balance card ── */}
          <div
            className="relative overflow-hidden rounded-3xl p-5 sm:p-7 text-white"
            style={{ background: 'linear-gradient(135deg, #312E81 0%, #4F46E5 55%, #818CF8 100%)', boxShadow: '0 16px 40px rgba(79,70,229,0.28)' }}
          >
            <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-20 right-16 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-2 text-indigo-100/90 text-sm">
                <Wallet size={15} /> Amount due
                <button onClick={toggleHide} aria-label={hideBalance ? 'Show amounts' : 'Hide amounts'}
                  className="ml-1 w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
                  {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  onClick={load}
                  aria-label="Refresh"
                  className="ml-auto -mr-1 w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="mt-1.5 text-[2.5rem] sm:text-5xl font-black tracking-tight leading-none">
                {loading && !payments.length ? <span className="inline-block w-40 h-10 rounded-lg bg-white/15 animate-pulse" /> : shown(totalDue)}
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-indigo-50/80">
                <span>{outstanding.length} {outstanding.length === 1 ? 'bill' : 'bills'} to pay</span>
                {overdue.length > 0 && <span className="text-red-200 font-semibold">{overdue.length} overdue · {shown(overdueTotal)}</span>}
              </div>

              {/* Next bill strip */}
              {nextBill ? (
                <button
                  onClick={() => setPayFor(nextBill)}
                  className="mt-5 w-full flex items-center gap-3 rounded-2xl bg-white/10 hover:bg-white/15 backdrop-blur px-3.5 py-3 text-left transition-colors"
                >
                  <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${nextBill.status === 'overdue' ? 'bg-red-400/30' : 'bg-white/15'}`}>
                    {nextBill.status === 'overdue' ? <AlertTriangle size={17} /> : <CalendarClock size={17} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate">{nextBill.scheduleId?.title || 'Payment due'}</span>
                    <span className="block text-xs text-indigo-50/75 truncate">
                      {nextBill.status === 'overdue' ? 'Overdue' : 'Due'} {format(new Date(dueDateOf(nextBill)), 'MMM d')} · {shown(nextBill.amount)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-bold bg-white text-indigo-700 px-3 py-1.5 rounded-full">Pay</span>
                </button>
              ) : !loading && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/10 px-3.5 py-3">
                  <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><CheckCircle2 size={17} /></span>
                  <span className="text-sm font-semibold">You're all caught up</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Quick actions ── */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4 sm:max-w-lg xl:max-w-none xl:glass-card xl:p-4 xl:gap-2">
            <QuickAction icon={ArrowUpRight} label="Pay now" primary
              onClick={() => nextBill ? setPayFor(nextBill) : toast.success("You're all caught up — nothing to pay")} />
            <QuickAction icon={FileText} label="My bills" badge={outstanding.length} onClick={() => setTab('bills')} />
            <QuickAction icon={History} label="History" onClick={() => setTab('history')} />
            <QuickAction icon={HelpCircle} label="Help" onClick={() => setShowHelp(true)} />
          </div>

          {/* ── Stats ── */}
          <div className="-mx-4 px-4 md:mx-0 md:px-0 flex lg:grid lg:grid-cols-4 xl:grid-cols-2 gap-3 overflow-x-auto lg:overflow-visible no-scrollbar snap-x snap-mandatory">
            <StatChip icon={CheckCircle2}  label={`Paid in ${thisYear}`} value={shown(paidThisYear)} tone="bg-emerald-50 text-emerald-600" />
            <StatChip icon={Receipt}       label="Payments made"        value={paidCount}            tone="bg-indigo-50 text-indigo-600" />
            <StatChip icon={Clock}         label="Bills to pay"         value={outstanding.length}   tone="bg-amber-50 text-amber-600" />
            <StatChip icon={AlertTriangle} label="Overdue"              value={overdue.length}       tone="bg-red-50 text-red-600" />
          </div>
        </aside>

        <section className="space-y-5 min-w-0">
          {/* ── Segmented tabs ── */}
          <div className="flex p-1 rounded-2xl bg-slate-100">
            {[['bills', 'My bills'], ['history', 'History']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                {label}
                {id === 'bills' && outstanding.length > 0 && (
                  <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle ${overdue.length ? 'bg-red-500 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                    {outstanding.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><RefreshCw size={24} className="text-indigo-500 animate-spin" /></div>
          ) : tab === 'bills' ? (
            outstanding.length === 0 ? (
              <EmptyState icon={CheckCircle2} tone="bg-emerald-50 text-emerald-500" title="You're all caught up!"
                body="No bills to pay right now. New dues from your estate will show up here." />
            ) : (
              <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3">
                {outstanding.map((p) => {
                  const meta = TYPE_META[p.scheduleId?.type] || TYPE_META.other;
                  const Icon = meta.icon;
                  const isOverdue = p.status === 'overdue';
                  return (
                    <div key={p._id}
                      className={`glass-card p-4 flex flex-col gap-3 ${isOverdue ? 'border-red-200 bg-red-50/30' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${meta.tint}`}><Icon size={19} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">{p.scheduleId?.title || 'Payment due'}</h3>
                            <span className={`text-base font-bold shrink-0 ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>{naira(p.amount)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-xs text-slate-400 truncate">
                              {meta.label} · Due {format(new Date(dueDateOf(p)), 'MMM d, yyyy')}
                            </span>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS[p.status]?.pill}`}>
                              {STATUS[p.status]?.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setInvoiceId(p._id)}
                          className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200">
                          <Receipt size={13} /> Invoice
                        </button>
                        <button onClick={() => setPayFor(p)}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold py-2.5 rounded-xl text-white ${isOverdue ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                          Pay {naira(p.amount)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : history.length === 0 ? (
            <EmptyState icon={History} title="No payment history yet" body="Bills you pay will show up here with a receipt." />
          ) : (
            <div className="space-y-4">
              {groupByDay(history, (p) => p.paidAt || p.updatedAt).map((group) => (
                <div key={group.label} className="space-y-2">
                  <h3 className="px-1 text-xs font-bold uppercase tracking-widest text-slate-400">{group.label}</h3>
                  <div className="glass-card divide-y divide-slate-100 overflow-hidden">
                    {group.items.map((p) => {
                      const waived = p.status === 'waived';
                      return (
                        <button key={p._id} onClick={() => setDetail(p)}
                          className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors">
                          <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${waived ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-600'}`}>
                            {waived ? <XCircle size={18} /> : <ArrowUpRight size={18} />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-semibold text-slate-900 truncate">{p.scheduleId?.title || 'Payment'}</span>
                            <span className="block text-xs text-slate-400 truncate">
                              {waived ? 'Waived by estate' : (METHOD_LABEL[p.method] || p.method || 'Payment')}
                              {p.paidAt ? ` · ${format(new Date(p.paidAt), 'h:mm a')}` : ''}
                            </span>
                          </span>
                          <span className="text-right shrink-0">
                            <span className={`block text-sm font-bold ${waived ? 'text-slate-400 line-through' : 'text-slate-900'}`}>−{naira(p.amount)}</span>
                            <span className={`inline-block mt-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS[p.status]?.pill}`}>{STATUS[p.status]?.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {sheets}
    </div>
  );
}
