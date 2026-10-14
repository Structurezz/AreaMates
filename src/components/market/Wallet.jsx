import { useEffect, useState } from 'react';
import { Wallet as WalletIcon, ArrowUpRight, Landmark, Lock, ChevronRight, RefreshCw, ShoppingBag, Undo2, Info, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../payments/BottomSheet';
import { marketplaceAPI } from '../../api';
import { timeAgo } from '../lounge/shared';

const money = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

/** Seller wallet card — every resident who sells gets one. */
export function WalletCard({ wallet, loading, onOpen, onWithdraw }) {
  const w = wallet || {};
  return (
    <div className="rounded-3xl p-4 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#1E1B4B 0%,#312E81 50%,#4F46E5 100%)' }}>
      <div className="absolute -top-14 -right-12 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
      <button onClick={onOpen} className="relative w-full text-left">
        <p className="text-[12px] text-indigo-200 flex items-center gap-1.5"><WalletIcon size={13} /> Seller wallet · available</p>
        <p className="text-[30px] font-extrabold tracking-tight leading-tight mt-0.5">{loading && !wallet ? '…' : money(w.available)}</p>
        <div className="flex items-center gap-3 mt-1 text-[12px] text-indigo-200">
          <span className="inline-flex items-center gap-1"><Lock size={11} /> {money(w.escrow)} on hold</span>
          <span>· {money(w.earned)} earned</span>
          <ChevronRight size={14} className="ml-auto" />
        </div>
      </button>
      <div className="relative grid grid-cols-2 gap-2 mt-3.5">
        <button onClick={onWithdraw} disabled={!(w.available >= 100)} className="mk-btn !py-2.5 !text-sm bg-white text-indigo-700 disabled:opacity-50"><ArrowUpRight size={16} /> Withdraw</button>
        <button onClick={onOpen} className="mk-btn !py-2.5 !text-sm bg-white/15 text-white">History</button>
      </div>
    </div>
  );
}

function Row({ a }) {
  const icon = a.kind === 'withdrawal' ? <ArrowUpRight size={16} /> : a.kind === 'refund' ? <Undo2 size={16} /> : a.kind === 'escrow' ? <Lock size={15} /> : <ShoppingBag size={15} />;
  const tone = a.kind === 'withdrawal' ? 'bg-slate-100 text-slate-600' : a.kind === 'refund' ? 'bg-red-50 text-red-500' : a.kind === 'escrow' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600';
  const title = a.kind === 'withdrawal' ? `To ${a.bankName || 'bank'} ••${String(a.accountNumber || '').slice(-4)}` : a.title;
  const sub = a.kind === 'withdrawal'
    ? (a.status === 'failed' ? `Failed — money returned${a.failureReason ? ` · ${a.failureReason}` : ''}` : a.status === 'pending' ? 'Processing' : 'Paid out')
    : a.kind === 'escrow' ? `On hold until ${a.buyer?.split(' ')[0] || 'the buyer'} confirms`
    : a.kind === 'refund' ? 'Refunded to buyer'
    : `Sale · ${money(a.gross)} − ${money(a.commission)} fee`;
  const amt = a.kind === 'withdrawal' ? `−${money(a.amount)}` : a.kind === 'refund' ? money(0) : `+${money(a.amount)}`;
  return (
    <li className="flex items-center gap-3 py-3">
      <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tone}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{title}</p>
        <p className={`text-xs truncate ${a.status === 'failed' ? 'text-red-600' : 'text-slate-500'}`}>{sub} · {timeAgo(a.at)}</p>
      </div>
      <span className={`text-sm font-bold shrink-0 ${a.kind === 'withdrawal' ? 'text-slate-900' : a.kind === 'escrow' ? 'text-amber-600' : a.kind === 'refund' ? 'text-slate-400' : 'text-emerald-600'} ${a.status === 'failed' ? 'line-through opacity-60' : ''}`}>{amt}</span>
    </li>
  );
}

export function WalletSheet({ open, wallet, onClose, onWithdraw, onBank }) {
  const w = wallet || {};
  return (
    <BottomSheet open={open} onClose={onClose} title="Seller wallet" subtitle="Your marketplace earnings">
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Available', w.available, 'text-indigo-700'], ['On hold', w.escrow, 'text-amber-600'], ['Withdrawn', w.withdrawn, 'text-slate-700']].map(([k, v, c]) => (
          <div key={k} className="rounded-2xl bg-slate-50 py-3 px-1"><p className={`text-[15px] font-extrabold ${c}`}>{money(v)}</p><p className="text-[11px] text-slate-500">{k}</p></div>
        ))}
      </div>
      <div className="mt-3 flex gap-2.5 rounded-2xl bg-indigo-50 p-3 text-[12px] text-indigo-900">
        <Info size={15} className="text-indigo-600 shrink-0 mt-0.5" />
        <p>Buyers' payments are held until they confirm delivery (or automatically 48 hours after you mark it delivered). AreaConnect keeps {Math.round((w.commissionRate ?? 0.2) * 100)}% of each sale; the rest is yours to withdraw.</p>
      </div>
      <button onClick={onBank} className="mt-3 w-full flex items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left">
        <span className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"><Landmark size={16} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-900">{w.bank?.recipientCode ? w.bank.accountName : 'Add your bank account'}</span>
          <span className="block text-xs text-slate-500 truncate">{w.bank?.recipientCode ? `${w.bank.name} · ${w.bank.accountNumber}` : 'Where your withdrawals are paid'}</span>
        </span>
        <span className="text-xs font-semibold text-indigo-600">{w.bank?.recipientCode ? 'Change' : 'Add'}</span>
      </button>
      <button onClick={onWithdraw} disabled={!(w.available >= 100)} className="mk-btn w-full mt-3 text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}><ArrowUpRight size={16} /> Withdraw to bank</button>

      <h3 className="text-sm font-bold text-slate-900 mt-5">Activity</h3>
      {(w.activity || []).length === 0
        ? <p className="text-sm text-slate-500 py-6 text-center">No sales yet. When a neighbour buys from you, it shows here.</p>
        : <ul className="divide-y divide-slate-100">{w.activity.map((a) => <Row key={`${a.kind}-${a.id}`} a={a} />)}</ul>}
      {w.completedOrders > 0 && <p className="text-[11px] text-slate-400 mt-2">{w.completedOrders} completed sale{w.completedOrders > 1 ? 's' : ''} · {money(w.grossSales)} sold · {money(w.commissionPaid)} in fees</p>}
    </BottomSheet>
  );
}

export function WithdrawSheet({ open, wallet, onClose, onDone, onBank }) {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  useEffect(() => { if (open) { setAmount(''); setDone(null); } }, [open]);
  const avail = wallet?.available || 0;
  const n = Number(amount || 0);
  const bank = wallet?.bank;

  const go = async () => {
    setBusy(true);
    try { const { data } = await marketplaceAPI.withdraw(n); setDone(data.data); onDone(); }
    catch (e) { toast.error(e.response?.data?.message || 'Withdrawal failed'); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <BottomSheet open={open} onClose={onClose} title="Withdrawal">
        <div className="text-center py-6">
          <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
          <p className="text-2xl font-extrabold text-slate-900 mt-3">{money(n)}</p>
          <p className="text-sm text-slate-600 mt-1">{done.message}</p>
          <p className="text-xs text-slate-400 mt-2">{bank?.name} · {bank?.accountNumber} · Ref {done.reference}</p>
          <button onClick={onClose} className="mk-btn mt-5 bg-slate-900 text-white px-8">Done</button>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Withdraw" subtitle={`Available: ${money(avail)}`}
      footer={bank?.recipientCode
        ? <button onClick={go} disabled={busy || n < 100 || n > avail} className="mk-btn w-full text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>{busy ? <RefreshCw size={16} className="animate-spin" /> : `Withdraw ${n ? money(n) : ''}`}</button>
        : <button onClick={onBank} className="mk-btn w-full bg-slate-900 text-white"><Landmark size={16} /> Add bank account first</button>}>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">₦</span>
        <input autoFocus type="number" inputMode="decimal" min="100" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
          className={`w-full rounded-2xl border bg-slate-50 pl-11 pr-4 py-4 text-3xl font-extrabold text-slate-900 outline-none ${n > avail ? 'border-red-400' : 'border-slate-200 focus:border-indigo-400'}`} />
      </div>
      {n > avail && <p className="text-xs text-red-600 mt-1.5">More than your available balance</p>}
      {n > 0 && n < 100 && <p className="text-xs text-slate-500 mt-1.5">Minimum withdrawal is ₦100</p>}
      <div className="flex gap-2 mt-3">
        {[[0.25, '25%'], [0.5, '50%'], [1, 'All']].map(([f, l]) => (
          <button key={l} onClick={() => setAmount(String(Math.floor(avail * f * 100) / 100))} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">{l}</button>
        ))}
      </div>
      {bank?.recipientCode && (
        <button onClick={onBank} className="mt-4 w-full flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left">
          <Landmark size={16} className="text-slate-500" />
          <span className="flex-1 text-sm"><b className="text-slate-900">{bank.accountName}</b><span className="block text-xs text-slate-500">{bank.name} · {bank.accountNumber}</span></span>
          <span className="text-xs font-semibold text-indigo-600">Change</span>
        </button>
      )}
    </BottomSheet>
  );
}

