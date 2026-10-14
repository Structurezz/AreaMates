import { useEffect, useState } from 'react';
import { Minus, Plus, ShieldCheck, RefreshCw, Lock, Truck, CheckCircle2, AlertTriangle, MessageCircle, Phone, Undo2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../payments/BottomSheet';
import { marketplaceAPI } from '../../api';
import { imgUrl, timeAgo } from '../lounge/shared';
import { CAT, naira } from './shared';

const MULTI_QTY = ['food', 'services', 'skills'];

// Checkout: quantity, note for the seller, then off to Paystack.
export function BuySheet({ listing, onClose }) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setQty(1); setNote(''); }, [listing?._id]);
  if (!listing) return null;
  const multi = MULTI_QTY.includes(listing.category);
  const total = listing.price * qty;

  const pay = async () => {
    setBusy(true);
    try {
      const { data } = await marketplaceAPI.buy(listing._id, qty, note);
      window.location.href = data.data.authorizationUrl;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Couldn\'t start payment');
      setBusy(false);
    }
  };

  return (
    <BottomSheet open onClose={onClose} title="Checkout" subtitle={`From ${listing.sellerId?.name || 'your neighbour'}`}
      footer={(
        <button onClick={pay} disabled={busy} className="mk-btn w-full text-white disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
          {busy ? <><RefreshCw size={16} className="animate-spin" /> Opening Paystack…</> : <><Lock size={15} /> Pay {naira(total)}</>}
        </button>
      )}>
      <div className="flex gap-3 items-center">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center text-2xl">
          {listing.images?.[0] ? <img src={imgUrl(listing.images[0])} alt="" className="w-full h-full object-cover" /> : CAT[listing.category]?.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{listing.title}</p>
          <p className="text-sm text-slate-500">{naira(listing.price)} each</p>
        </div>
        {multi && (
          <div className="flex items-center gap-2 bg-slate-100 rounded-full p-1">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Less" className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center disabled:opacity-40" disabled={qty <= 1}><Minus size={14} /></button>
            <span className="w-5 text-center font-bold">{qty}</span>
            <button onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="More" className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center"><Plus size={14} /></button>
          </div>
        )}
      </div>

      <label className="mk-label mt-4">Note for the seller (optional)</label>
      <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="e.g. Deliver to Block B4 after 6pm" className="mk-input" />

      <div className="mt-4 rounded-2xl bg-slate-50 p-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-slate-600"><span>{listing.title}{qty > 1 ? ` × ${qty}` : ''}</span><span>{naira(total)}</span></div>
        <div className="flex justify-between font-bold text-slate-900 text-base pt-1.5 border-t border-slate-200"><span>Total</span><span>{naira(total)}</span></div>
      </div>

      <div className="mt-3 flex gap-2.5 rounded-2xl bg-indigo-50 p-3.5 text-[13px] text-indigo-900">
        <ShieldCheck size={18} className="text-indigo-600 shrink-0" />
        <p><b>Buyer protection.</b> Your money is held safely and only released to the seller when you confirm you got it. Something wrong? Report it and estate management steps in.</p>
      </div>
    </BottomSheet>
  );
}

const STEPS = ['paid', 'delivered', 'completed'];
const STATUS_TEXT = {
  paid:      { buyer: 'Paid · waiting for delivery', seller: 'New order · deliver it', cls: 'bg-amber-50 text-amber-700' },
  delivered: { buyer: 'Delivered · confirm receipt', seller: 'Delivered · waiting for buyer', cls: 'bg-sky-50 text-sky-700' },
  completed: { buyer: 'Completed', seller: 'Paid out to your wallet', cls: 'bg-emerald-50 text-emerald-700' },
  disputed:  { buyer: 'Problem reported · on hold', seller: 'Buyer reported a problem', cls: 'bg-red-50 text-red-700' },
  refunded:  { buyer: 'Refunded', seller: 'Refunded to buyer', cls: 'bg-slate-100 text-slate-600' },
  cancelled: { buyer: 'Cancelled', seller: 'Cancelled', cls: 'bg-slate-100 text-slate-500' },
};

function Progress({ status }) {
  const i = STEPS.indexOf(status);
  if (i < 0) return null;
  return (
    <div className="flex items-center gap-1.5 mt-3">
      {['Paid', 'Delivered', 'Done'].map((label, k) => (
        <div key={label} className="flex-1">
          <div className={`h-1.5 rounded-full ${k <= i ? 'bg-indigo-500' : 'bg-slate-200'}`} />
          <p className={`text-[10px] mt-1 font-semibold ${k <= i ? 'text-indigo-700' : 'text-slate-400'}`}>{label}</p>
        </div>
      ))}
    </div>
  );
}

const until = (d) => {
  const h = Math.max(0, Math.round((new Date(d) - Date.now()) / 3600_000));
  return h >= 48 ? `${Math.round(h / 24)} days` : `${h}h`;
};

/** One order, seen by the buyer or the seller. */
export function OrderCard({ order: o, as, onChanged, onChat, onCall, onDispute, onCancel }) {
  const [busy, setBusy] = useState(false);
  const other = as === 'buyer' ? o.sellerId : o.buyerId;
  const st = STATUS_TEXT[o.status] || STATUS_TEXT.cancelled;
  const run = async (fn, msg) => {
    setBusy(true);
    try { const { data } = await fn(); onChanged(data.data); toast.success(msg); }
    catch (e) { toast.error(e.response?.data?.message || 'Something went wrong'); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-3.5">
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center text-xl">
          {o.image ? <img src={imgUrl(o.image)} alt="" className="w-full h-full object-cover" /> : CAT[o.category]?.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${st.cls}`}>{st[as]}</span>
          <p className="font-semibold text-slate-900 truncate mt-1">{o.title}{o.quantity > 1 ? ` × ${o.quantity}` : ''}</p>
          <p className="text-xs text-slate-500">{as === 'buyer' ? 'From' : 'To'} {other?.name || 'a neighbour'} · {timeAgo(o.paidAt || o.createdAt)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-slate-900">{naira(as === 'seller' ? o.sellerAmount : o.amount)}</p>
          {as === 'seller' && <p className="text-[10px] text-slate-400">of {naira(o.amount)}</p>}
        </div>
      </div>

      {o.note && <p className="mt-2.5 text-[13px] rounded-xl bg-slate-50 px-3 py-2 text-slate-700">📝 {o.note}</p>}
      <Progress status={o.status} />

      {['paid', 'delivered'].includes(o.status) && o.autoReleaseAt && (
        <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
          <Clock size={11} />
          {as === 'buyer'
            ? `Payment goes to the seller automatically in ${until(o.autoReleaseAt)} unless you report a problem.`
            : `You'll be paid ${naira(o.sellerAmount)} when they confirm, or automatically in ${until(o.autoReleaseAt)}.`}
        </p>
      )}
      {o.status === 'disputed' && <p className="mt-2 text-[12px] text-red-700 rounded-xl bg-red-50 px-3 py-2">{o.dispute?.reason}{o.dispute?.note ? ` — ${o.dispute.note}` : ''}. Estate management will decide.</p>}
      {o.status === 'refunded' && <p className="mt-2 text-[12px] text-slate-600 rounded-xl bg-slate-50 px-3 py-2">{o.refund?.reason}{as === 'buyer' ? ' · Refunds take 5–10 working days to reach your card/bank.' : ''}</p>}
      {as === 'seller' && o.status === 'completed' && <p className="mt-2 text-[11px] text-slate-400">{naira(o.amount)} − {Math.round(o.commissionRate * 100)}% AreaConnect fee ({naira(o.commission)}) = {naira(o.sellerAmount)}</p>}

      <div className="flex flex-wrap gap-2 mt-3">
        {as === 'buyer' && ['paid', 'delivered'].includes(o.status) && (
          <>
            <button disabled={busy} onClick={() => run(() => marketplaceAPI.confirm(o._id), 'Thanks! The seller has been paid')} className="mk-btn flex-1 !py-2.5 !text-sm text-white bg-indigo-600"><CheckCircle2 size={15} /> I got it</button>
            <button onClick={() => onDispute(o)} className="mk-btn !py-2.5 !text-sm border border-red-200 text-red-600"><AlertTriangle size={15} /> Problem</button>
          </>
        )}
        {as === 'seller' && o.status === 'paid' && (
          <>
            <button disabled={busy} onClick={() => run(() => marketplaceAPI.deliver(o._id), 'Marked as delivered')} className="mk-btn basis-full !py-2.5 !text-sm text-white bg-indigo-600"><Truck size={15} /> Mark as delivered</button>
            <button onClick={() => onCancel(o)} aria-label="Cancel and refund" className="mk-btn flex-1 !py-2.5 !text-sm border border-slate-200 text-slate-600"><Undo2 size={15} /> Cancel & refund</button>
          </>
        )}
        {['paid', 'delivered', 'disputed'].includes(o.status) && other?._id && (
          <>
            <button onClick={() => onChat(other, o)} aria-label="Chat" className="mk-btn !p-2.5 border border-slate-200 text-slate-700"><MessageCircle size={16} /></button>
            <button onClick={() => onCall(other)} aria-label="Call" className="mk-btn !p-2.5 border border-slate-200 text-slate-700"><Phone size={16} /></button>
          </>
        )}
      </div>
    </div>
  );
}

const DISPUTES = ['Not delivered', 'Not as described', 'Damaged or faulty', 'Wrong quantity', 'Seller unresponsive', 'Other'];

export function DisputeSheet({ order, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setReason(''); setNote(''); }, [order?._id]);
  const send = async () => {
    setBusy(true);
    try { const { data } = await marketplaceAPI.dispute(order._id, reason, note); toast.success('Reported. Your payment is on hold.'); onDone(data.data); onClose(); }
    catch (e) { toast.error(e.response?.data?.message || 'Couldn\'t report'); }
    finally { setBusy(false); }
  };
  return (
    <BottomSheet open={!!order} onClose={onClose} title="Report a problem" subtitle="The seller won't be paid while estate management reviews it"
      footer={<button onClick={send} disabled={!reason || busy} className="mk-btn w-full bg-red-600 text-white disabled:opacity-40">{busy ? <RefreshCw size={16} className="animate-spin" /> : 'Report problem'}</button>}>
      <div className="grid grid-cols-2 gap-2">
        {DISPUTES.map((d) => <button key={d} onClick={() => setReason(d)} className={`rounded-xl border p-3 text-sm font-semibold text-left ${reason === d ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 text-slate-700'}`}>{d}</button>)}
      </div>
      <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value.slice(0, 500))} placeholder="What happened? (optional)" className="mk-input resize-none mt-3" />
    </BottomSheet>
  );
}

export function CancelSheet({ order, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setReason(''), [order?._id]);
  const send = async () => {
    setBusy(true);
    try { const { data } = await marketplaceAPI.cancelOrder(order._id, reason || 'The seller couldn\'t fulfil this order'); toast.success('Order cancelled — buyer refunded'); onDone(data.data); onClose(); }
    catch (e) { toast.error(e.response?.data?.message || 'Couldn\'t cancel'); }
    finally { setBusy(false); }
  };
  return (
    <BottomSheet open={!!order} onClose={onClose} title="Cancel & refund" subtitle={order ? `${naira(order.amount)} goes back to the buyer in full` : ''}
      footer={<button onClick={send} disabled={busy} className="mk-btn w-full bg-slate-900 text-white disabled:opacity-40">{busy ? <RefreshCw size={16} className="animate-spin" /> : 'Cancel order & refund'}</button>}>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {['Out of stock', 'Can\'t deliver in time', 'Item no longer available'].map((r) => <button key={r} onClick={() => setReason(r)} className={`text-xs px-3 py-1.5 rounded-full border ${reason === r ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>{r}</button>)}
      </div>
      <input value={reason} onChange={(e) => setReason(e.target.value.slice(0, 200))} placeholder="Reason for the buyer" className="mk-input" />
    </BottomSheet>
  );
}

