import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft, Heart, Share2, Phone, MessageCircle, ShieldCheck, Flag, Star,
  Eye, Tag, RefreshCw, Pencil, Trash2, CheckCircle2, RotateCcw, AlertTriangle, Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Portal, { Z, useScrollLock } from '../ui/Portal';
import { marketplaceAPI } from '../../api';
import { useCall } from '../../context/CallContext';
import { Avatar, imgUrl, timeAgo } from '../lounge/shared';
import { CAT, CONDITION, STATUS, naira, priceDrop, sellerOf, isMine, NoPhoto, Stars } from './shared';

function Gallery({ listing }) {
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const imgs = listing.images || [];
  if (!imgs.length) return <div className="aspect-square sm:aspect-[4/3]"><NoPhoto category={listing.category} /></div>;
  return (
    <div className="relative bg-slate-100">
      <div ref={ref} onScroll={() => setI(Math.round(ref.current.scrollLeft / ref.current.clientWidth))}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar aspect-square sm:aspect-[4/3]">
        {imgs.map((src, k) => <img key={k} src={imgUrl(src)} alt="" className="w-full h-full object-cover shrink-0 snap-center" />)}
      </div>
      {imgs.length > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
          {imgs.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />)}
        </div>
      )}
    </div>
  );
}

// How escrow works — mirrors server/services/marketplaceEscrow.js (48h after delivery, 7 days after payment)
const ESCROW_STEPS = [
  { t: 'You pay in the app', d: 'Your money goes into AreaConnect escrow, not to the seller.' },
  { t: 'We hold it safely', d: 'The seller can see you’ve paid, but can’t touch the money yet.' },
  { t: 'Seller delivers', d: 'Check the item at the gate or your door before you confirm.' },
  { t: 'You confirm, seller is paid', d: 'Not right? Raise a problem instead and the payment is frozen.' },
];

const TIPS = [
  'Only pay with the Buy button. Cash or bank transfers to the seller aren’t protected.',
  'Never share your card PIN, OTP or bank login with anyone, including the seller.',
  'Meet at the gate or a common area, in daylight.',
  'Don’t tap “I received it” until you have the item and it works.',
];

export default function ListingDetail({ listing: initial, me, onClose, onChat, onChanged, onEdit, onReport, onRate, onBuy }) {
  useScrollLock(true);
  const [l, setL] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { startCall } = useCall() || {};
  const mine = isMine(l, me);
  const seller = sellerOf(l);
  const drop = priceDrop(l);
  const saved = (l.savedBy || []).some((id) => String(id) === String(me?._id));
  const cat = CAT[l.category] || { label: l.category, emoji: '📦' };

  const reload = () => marketplaceAPI.getOne(initial._id)
    .then(({ data }) => setL(data.data))
    .catch((e) => { if (e.response?.status === 404) { toast.error('This listing is no longer available'); onClose(); } })
    .finally(() => setLoading(false));
  useEffect(() => { reload(); }, [initial._id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleSave = async () => {
    try {
      const { data } = await marketplaceAPI.toggleSave(l._id);
      const savedBy = data.data.savedBy;
      setL((x) => ({ ...x, savedBy }));
      onChanged?.({ ...l, savedBy });
    } catch { toast.error('Couldn\'t save'); }
  };

  const share = async () => {
    const text = `${l.title} for ${naira(l.price)} on the AreaMates marketplace`;
    try {
      if (navigator.share) await navigator.share({ title: l.title, text, url: `${location.origin}/marketplace` });
      else { await navigator.clipboard.writeText(`${text}\n${location.origin}/marketplace`); toast.success('Link copied'); }
    } catch { /* cancelled */ }
  };

  const call = async () => {
    const r = await startCall?.(seller);
    if (r?.needCredits) toast('Top up call credits on the Neighbours page to call', { icon: '🪙' });
  };

  const setStatus = async (status) => {
    setBusy(true);
    try {
      const { data } = await marketplaceAPI.update(l._id, { status });
      setL((x) => ({ ...x, ...data.data }));
      onChanged?.(data.data);
      toast.success(status === 'sold' ? 'Marked as sold 🎉' : data.held ? 'Sent to estate management for review' : 'Back on the market');
    } catch (e) { toast.error(e.response?.data?.message || 'Couldn\'t update'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm('Delete this listing for good?')) return;
    try { await marketplaceAPI.delete(l._id); onChanged?.({ ...l, _deleted: true }); toast.success('Listing deleted'); onClose(); }
    catch { toast.error('Couldn\'t delete'); }
  };

  const st = STATUS[l.status];

  return (
    <Portal>
      <div className={`fixed inset-0 ${Z.drawer} flex sm:items-center justify-center sm:p-6`}>
        <div className="overlay-backdrop hidden sm:block" onClick={onClose} aria-hidden="true" />
        <div role="dialog" aria-modal="true" aria-label={l.title}
          className="relative w-full sm:max-w-lg h-full sm:h-auto sm:max-h-[92vh] bg-white sm:rounded-3xl overflow-hidden flex flex-col animate-fade-in">
          {/* Floating top bar over the photo */}
          <div className="absolute top-0 inset-x-0 z-10 flex justify-between p-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
            <button onClick={onClose} aria-label="Back" className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow flex items-center justify-center text-slate-800"><ChevronLeft size={22} /></button>
            <div className="flex gap-2">
              <button onClick={share} aria-label="Share" className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow flex items-center justify-center text-slate-800"><Share2 size={17} /></button>
              {!mine && (
                <button onClick={toggleSave} aria-label={saved ? 'Unsave' : 'Save'} className="w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow flex items-center justify-center">
                  <Heart size={18} className={saved ? 'text-rose-500' : 'text-slate-800'} fill={saved ? 'currentColor' : 'none'} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Gallery listing={l} />

            <div className="px-5 pt-4 pb-6 space-y-5">
              {/* Price + title */}
              <div>
                {mine && st && (
                  <span className={`inline-block mb-2 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                )}
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[28px] font-extrabold text-slate-900 tracking-tight leading-none">{naira(l.price)}</span>
                  {drop && <span className="text-sm text-slate-400 line-through">{naira(drop)}</span>}
                  {drop && <span className="text-xs font-bold text-emerald-600">Save {naira(drop - l.price)}</span>}
                </div>
                <h1 className="text-lg font-semibold text-slate-900 leading-snug mt-1.5">{l.title}</h1>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="chip">{cat.emoji} {cat.label}</span>
                  {['items_for_sale', 'rentals'].includes(l.category) && l.condition && <span className="chip">{CONDITION[l.condition]}</span>}
                  {l.isNegotiable && <span className="chip"><Tag size={11} /> Negotiable</span>}
                  <span className="chip"><Eye size={11} /> {l.views || 0}</span>
                  <span className="chip">{timeAgo(l.createdAt, true)}</span>
                </div>
              </div>

              {/* Moderation note for the seller */}
              {mine && ['pending_approval', 'rejected', 'removed'].includes(l.status) && (
                <div className={`rounded-2xl p-3.5 text-sm flex gap-2.5 ${l.status === 'pending_approval' ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800'}`}>
                  <AlertTriangle size={17} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      {l.status === 'pending_approval' ? 'Estate management is reviewing this listing' : l.status === 'rejected' ? 'Not approved' : 'Removed by estate management'}
                    </p>
                    {l.moderation?.reason && <p className="mt-0.5">{l.moderation.reason}</p>}
                    {l.status === 'pending_approval' && l.flags?.length > 0 && <p className="mt-0.5 opacity-80">{l.flags.map((f) => f.detail).join(' · ')}</p>}
                    {l.status === 'rejected' && <p className="mt-1 opacity-80">Edit the listing to resubmit it.</p>}
                  </div>
                </div>
              )}

              {l.price > 0 && drop && (
                <p className="text-xs text-slate-500 -mt-2">Price history: {(l.priceHistory || []).map((p) => naira(p.price)).join(' → ')}</p>
              )}

              {/* Description */}
              <div>
                <h2 className="text-sm font-bold text-slate-900 mb-1.5">Description</h2>
                <p className="text-[15px] text-slate-700 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{l.description}</p>
              </div>

              {/* Seller */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  <Avatar person={seller} size={46} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{seller.name || 'Neighbour'}{mine && <span className="text-slate-400 font-normal"> · you</span>}</p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      {l.sellerRating?.count ? <><Stars value={l.sellerRating.avg} /> <span className="font-semibold text-slate-700">{l.sellerRating.avg.toFixed(1)}</span> ({l.sellerRating.count})</> : 'No ratings yet'}
                      {l.sellerSold > 0 && <span>· {l.sellerSold} sold</span>}
                    </div>
                  </div>
                </div>
                {loading ? (
                  <div className="flex justify-center py-3"><RefreshCw size={15} className="animate-spin text-indigo-400" /></div>
                ) : l.reviews?.length > 0 && (
                  <ul className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                    {l.reviews.map((r) => (
                      <li key={r._id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{r.reviewerId?.name?.split(' ')[0] || 'Neighbour'}</span>
                          <Stars value={r.rating} size={11} />
                          <span className="text-[11px] text-slate-400 ml-auto">{timeAgo(r.createdAt)}</span>
                        </div>
                        {r.comment && <p className="text-slate-600 mt-0.5">{r.comment}</p>}
                      </li>
                    ))}
                  </ul>
                )}
                {!mine && (
                  <button onClick={() => onRate(l, (sellerRating, review) => setL((x) => ({ ...x, sellerRating, myReview: review })))}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 active:bg-slate-50">
                    <Star size={15} className="text-amber-400" fill="currentColor" strokeWidth={0} />
                    {l.myReview ? `You rated ${l.myReview.rating}★ · Update` : 'Rate this seller'}
                  </button>
                )}
              </div>

              {/* Safety + escrow */}
              {!mine && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 overflow-hidden">
                  <div className="p-4">
                    <p className="flex items-center gap-2 text-sm font-bold text-indigo-950"><ShieldCheck size={17} className="text-indigo-600" /> {l.price > 0 ? 'Buyer protection with escrow' : 'Pick up safely'}</p>
                    {l.price > 0 && (
                      <>
                        <p className="mt-1 text-[12.5px] text-indigo-900/70">When you pay with <b>Buy</b>, the seller only gets the money after you confirm you received the item.</p>
                        <ol className="mt-3 space-y-2.5">
                          {ESCROW_STEPS.map((st, k) => (
                            <li key={st.t} className="flex gap-3">
                              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">{k + 1}</span>
                              <span className="min-w-0">
                                <span className="block text-[13px] font-semibold text-indigo-950">{st.t}</span>
                                <span className="block text-[12px] text-indigo-900/70">{st.d}</span>
                              </span>
                            </li>
                          ))}
                        </ol>
                        <div className="mt-3 rounded-xl bg-white/80 border border-indigo-100 px-3 py-2.5 text-[12px] text-indigo-950 leading-relaxed">
                          <b>Good to know:</b> after the seller marks it delivered you have <b>48 hours</b> to confirm or raise a problem — then the money is released automatically.
                          If it’s never delivered, report it within <b>7 days</b> of paying. Disputes are reviewed by estate management and refunds go back to your card or account.
                        </div>
                      </>
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-indigo-100 bg-white/50">
                    <p className="text-[11.5px] font-bold uppercase tracking-wider text-indigo-900/60">Stay safe</p>
                    <ul className="mt-1.5 space-y-1.5">
                      {(l.price > 0 ? TIPS : TIPS.slice(1)).map((t) => <li key={t} className="text-[12.5px] text-indigo-950/80 flex gap-2"><span className="text-indigo-400">•</span>{t}</li>)}
                    </ul>
                    <button onClick={() => onReport(l, () => setL((x) => ({ ...x, reported: true })))} disabled={l.reported}
                      className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-red-600 disabled:text-slate-400">
                      <Flag size={14} /> {l.reported ? 'You reported this listing' : 'Report this listing'}
                    </button>
                  </div>
                </div>
              )}

              {/* Seller controls */}
              {mine && (
                <div className="grid grid-cols-2 gap-2">
                  {l.status === 'active' && <button disabled={busy} onClick={() => setStatus('sold')} className="mk-btn bg-indigo-600 text-white col-span-2"><CheckCircle2 size={16} /> Mark as sold</button>}
                  {l.status === 'sold' && <button disabled={busy} onClick={() => setStatus('active')} className="mk-btn bg-indigo-600 text-white col-span-2"><RotateCcw size={16} /> Relist</button>}
                  {l.status !== 'removed' && <button onClick={() => onEdit(l)} className="mk-btn border border-slate-200 text-slate-800"><Pencil size={15} /> {l.status === 'rejected' ? 'Edit & resubmit' : 'Edit'}</button>}
                  <button onClick={remove} className={`mk-btn border border-red-200 text-red-600 ${l.status === 'removed' ? 'col-span-2' : ''}`}><Trash2 size={15} /> Delete</button>
                </div>
              )}
            </div>
          </div>

          {/* Sticky contact bar */}
          {!mine && l.status === 'active' && (
            <div className="border-t border-slate-100 bg-white px-4 pt-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
              {l.price > 0 ? (
                <div className="flex gap-2.5">
                  <button onClick={() => onChat(l)} aria-label="Chat with seller" className="mk-btn !px-3.5 border border-indigo-200 text-indigo-700 bg-indigo-50"><MessageCircle size={18} /></button>
                  <button onClick={call} aria-label="Call seller" className="mk-btn !px-3.5 border border-indigo-200 text-indigo-700 bg-indigo-50"><Phone size={18} /></button>
                  <button onClick={() => onBuy(l)} className="mk-btn flex-1 text-white" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}><Lock size={15} /> Buy · {naira(l.price)}</button>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <button onClick={call} className="mk-btn flex-1 border border-indigo-200 text-indigo-700 bg-indigo-50"><Phone size={17} /> Call</button>
                  <button onClick={() => onChat(l)} className="mk-btn flex-[2] text-white" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}><MessageCircle size={17} /> Chat with {seller.name?.split(' ')[0] || 'seller'}</button>
                </div>
              )}
              {l.price > 0 && <p className="text-[11px] text-slate-500 text-center mt-2 flex items-center justify-center gap-1"><ShieldCheck size={12} className="text-indigo-500" /> Held in escrow · seller is paid only when you confirm</p>}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
