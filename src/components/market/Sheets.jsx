import { useEffect, useMemo, useState } from 'react';
import { Camera, X, RefreshCw, ShieldCheck, Star, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import BottomSheet from '../payments/BottomSheet';
import { marketplaceAPI } from '../../api';
import { imgUrl } from '../lounge/shared';
import { CAT, CATEGORIES, CONDITION, REPORT_REASONS, naira } from './shared';

const BLANK = { title: '', description: '', price: '', category: 'food', condition: 'good', isNegotiable: false };

// Sell / edit. Shows the estate's price cap up front so nobody is surprised.
export function SellSheet({ open, editing, rules, onClose, onSaved }) {
  const [form, setForm] = useState(BLANK);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setFiles([]);
    setForm(editing ? {
      title: editing.title, description: editing.description, price: String(editing.price),
      category: editing.category, condition: editing.condition || 'good', isNegotiable: !!editing.isNegotiable,
    } : BLANK);
  }, [open, editing]);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const cap = rules?.priceCaps?.[form.category];
  const price = Number(form.price || 0);
  const overCap = cap > 0 && price > cap;
  const showCondition = ['items_for_sale', 'rentals'].includes(form.category);

  const addFiles = (e) => {
    const picked = [...(e.target.files || [])];
    e.target.value = '';
    setFiles((f) => [...f, ...picked].slice(0, 5));
    if (files.length + picked.length > 5) toast('Up to 5 photos', { icon: '📸' });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (overCap) return toast.error(`Estate cap for ${CAT[form.category].label} is ${naira(cap)}`);
    setSaving(true);
    try {
      let data;
      if (editing) {
        ({ data } = await marketplaceAPI.update(editing._id, { ...form, price }));
      } else {
        const fd = new FormData();
        Object.entries({ ...form, price }).forEach(([k, v]) => fd.append(k, v));
        files.forEach((f) => fd.append('images', f));
        ({ data } = await marketplaceAPI.create(fd));
      }
      toast.success(data.held ? 'Sent to estate management for review' : editing ? 'Listing updated' : 'Your listing is live 🎉', { duration: 4000 });
      onSaved(data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Couldn\'t save the listing');
    } finally { setSaving(false); }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={editing ? 'Edit listing' : 'Sell something'}
      subtitle={editing ? null : 'Neighbours see it instantly'}
      footer={(
        <button form="sell-form" type="submit" disabled={saving || overCap}
          className="mk-btn w-full text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
          {saving ? <RefreshCw size={16} className="animate-spin" /> : editing ? (editing.status === 'rejected' ? 'Resubmit for review' : 'Save changes') : rules?.requireApproval ? 'Submit for review' : 'Post listing'}
        </button>
      )}>
      <form id="sell-form" onSubmit={submit} className="space-y-4">
        {rules?.requireApproval && !editing && (
          <p className="flex gap-2 text-[13px] rounded-xl bg-indigo-50 text-indigo-900 p-3"><ShieldCheck size={16} className="shrink-0 text-indigo-600" /> Estate management approves listings before they go live.</p>
        )}

        {/* Photos */}
        {editing ? (
          editing.images?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {editing.images.map((src, i) => <img key={i} src={imgUrl(src)} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" />)}
            </div>
          )
        ) : (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {files.length < 5 && (
              <label className="w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 flex flex-col items-center justify-center text-indigo-600 cursor-pointer active:scale-95 transition-transform">
                <Camera size={20} />
                <span className="text-[10px] font-semibold mt-1">{files.length ? `${files.length}/5` : 'Add photos'}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={addFiles} />
              </label>
            )}
            {previews.map((src, i) => (
              <div key={src} className="relative w-20 h-20 shrink-0">
                <img src={src} alt="" className="w-full h-full rounded-xl object-cover" />
                {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-black/60 text-white rounded px-1">COVER</span>}
                <button type="button" onClick={() => setFiles((f) => f.filter((_, k) => k !== i))} aria-label="Remove photo"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center"><X size={11} /></button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="mk-label">Category</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button type="button" key={c} onClick={() => set('category', c)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold border transition-colors ${form.category === c ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                {CAT[c].emoji} {CAT[c].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mk-label">Title</label>
          <input required maxLength={120} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Homemade jollof, 2 plates" className="mk-input" />
        </div>

        <div>
          <label className="mk-label">Price (₦)</label>
          <input type="number" inputMode="numeric" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="0 = free" className={`mk-input ${overCap ? '!border-red-400 !bg-red-50' : ''}`} />
          {cap > 0 && (
            <p className={`text-xs mt-1.5 flex items-center gap-1 ${overCap ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
              <Info size={12} /> Estate price cap for {CAT[form.category].label.toLowerCase()}: {naira(cap)}
            </p>
          )}
          <label className="flex items-center gap-2 mt-2.5 text-sm text-slate-700">
            <input type="checkbox" checked={form.isNegotiable} onChange={(e) => set('isNegotiable', e.target.checked)} className="w-4 h-4 accent-indigo-600" />
            Price is negotiable
          </label>
        </div>

        {showCondition && (
          <div>
            <label className="mk-label">Condition</label>
            <div className="grid grid-cols-4 gap-1.5">
              {Object.entries(CONDITION).map(([k, v]) => (
                <button type="button" key={k} onClick={() => set('condition', k)}
                  className={`py-2 rounded-xl text-xs font-semibold border ${form.condition === k ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>{v}</button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mk-label">Description</label>
          <textarea required rows={4} maxLength={2000} value={form.description} onChange={(e) => set('description', e.target.value)}
            placeholder="What is it, what's included, when can people pick it up?" className="mk-input resize-none" />
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Fair pricing is protected: listings priced far above similar items go to estate management for review, and residents can report listings.
        </p>
      </form>
    </BottomSheet>
  );
}

export function ReportSheet({ listing, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => { setReason(''); setNote(''); }, [listing?._id]);

  const send = async () => {
    setSending(true);
    try {
      const { data } = await marketplaceAPI.report(listing._id, reason, note);
      toast.success(data.message || 'Report sent');
      onDone?.(); onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Couldn\'t send report');
      if (e.response?.status === 409) { onDone?.(); onClose(); }
    } finally { setSending(false); }
  };

  return (
    <BottomSheet open={!!listing} onClose={onClose} title="Report listing" subtitle="Only estate management sees who reported"
      footer={<button onClick={send} disabled={!reason || sending} className="mk-btn w-full bg-red-600 text-white disabled:opacity-40">{sending ? <RefreshCw size={16} className="animate-spin" /> : 'Send report'}</button>}>
      <div className="space-y-2">
        {REPORT_REASONS.map((r) => (
          <button key={r.id} onClick={() => setReason(r.id)}
            className={`w-full text-left rounded-xl border p-3 transition-colors ${reason === r.id ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
            <p className="text-sm font-semibold text-slate-900">{r.label}</p>
            {r.hint && <p className="text-xs text-slate-500">{r.hint}</p>}
          </button>
        ))}
        <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything else estate management should know? (optional)" className="mk-input resize-none mt-1" />
      </div>
    </BottomSheet>
  );
}

export function RateSheet({ listing, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => {
    setRating(listing?.myReview?.rating || 0);
    setComment(listing?.myReview?.comment || '');
  }, [listing?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    setSending(true);
    try {
      const { data } = await marketplaceAPI.review(listing._id, rating, comment);
      toast.success('Thanks for rating!');
      onDone?.(data.sellerRating, data.data); onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Couldn\'t save rating'); }
    finally { setSending(false); }
  };

  const name = listing?.sellerId?.name?.split(' ')[0] || 'the seller';
  return (
    <BottomSheet open={!!listing} onClose={onClose} title={`Rate ${name}`} subtitle="Helps neighbours buy with confidence"
      footer={<button onClick={send} disabled={!rating || sending} className="mk-btn w-full text-white disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>{sending ? <RefreshCw size={16} className="animate-spin" /> : 'Submit rating'}</button>}>
      <div className="flex justify-center gap-2 py-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} onClick={() => setRating(i)} aria-label={`${i} star${i > 1 ? 's' : ''}`} className="active:scale-90 transition-transform">
            <Star size={38} className={i <= rating ? 'text-amber-400' : 'text-slate-200'} fill="currentColor" strokeWidth={0} />
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-slate-500 mb-3 h-5">{['', 'Poor', 'Not great', 'Okay', 'Good', 'Excellent'][rating]}</p>
      <textarea rows={3} maxLength={400} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How was it? (optional)" className="mk-input resize-none" />
    </BottomSheet>
  );
}
