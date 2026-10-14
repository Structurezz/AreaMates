import { Star } from 'lucide-react';

// Marketplace building blocks — AreaMates indigo theme.
export const CAT = {
  food:           { label: 'Food',     emoji: '🍲', tint: '#FEF3C7' },
  services:       { label: 'Services', emoji: '🔧', tint: '#DBEAFE' },
  skills:         { label: 'Skills',   emoji: '💡', tint: '#EDE9FE' },
  items_for_sale: { label: 'For sale', emoji: '🏷️', tint: '#D1FAE5' },
  rentals:        { label: 'Rentals',  emoji: '🏠', tint: '#FCE7F3' },
};
export const CATEGORIES = Object.keys(CAT);

export const CONDITION = { new: 'Brand new', like_new: 'Like new', good: 'Good', fair: 'Fair' };

export const REPORT_REASONS = [
  { id: 'scam',          label: 'Scam or fraud',       hint: 'Asking for payment upfront, fake item' },
  { id: 'overpriced',    label: 'Price gouging',        hint: 'Far above a fair price' },
  { id: 'misleading',    label: 'Misleading listing',   hint: 'Photos or description don\'t match' },
  { id: 'unsafe',        label: 'Unsafe or prohibited', hint: 'Drugs, weapons, expired food…' },
  { id: 'not_delivered', label: 'Paid but not delivered', hint: 'You paid and got nothing' },
  { id: 'other',         label: 'Something else',       hint: '' },
];

export const naira = (n) => (Number(n) === 0 ? 'Free' : `₦${Number(n || 0).toLocaleString('en-NG')}`);

export const sellerOf = (l) => l?.sellerId || {};
export const isMine = (l, me) => String(sellerOf(l)._id || l?.sellerId) === String(me?._id);

/** Previous higher price, if the seller dropped it. */
export function priceDrop(l) {
  const h = l?.priceHistory || [];
  if (h.length < 2) return null;
  const prev = h[h.length - 2].price;
  return prev > l.price ? prev : null;
}

export const STATUS = {
  active:           { label: 'Live',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending_approval: { label: 'In review',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  rejected:         { label: 'Not approved',  cls: 'bg-red-50 text-red-700 border-red-200' },
  removed:          { label: 'Removed',       cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  sold:             { label: 'Sold',          cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export function Stars({ value = 0, size = 12, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-px ${className}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? 'text-amber-400' : 'text-slate-200'} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

export function RatingPill({ rating }) {
  if (!rating?.count) return <span className="text-[11px] text-slate-400">New seller</span>;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-700">
      <Star size={11} className="text-amber-400" fill="currentColor" strokeWidth={0} />
      {rating.avg.toFixed(1)} <span className="font-normal text-slate-400">({rating.count})</span>
    </span>
  );
}

/** Placeholder art for listings without photos. */
export function NoPhoto({ category }) {
  const c = CAT[category] || { emoji: '📦', tint: '#EEF2FF' };
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: c.tint }}>
      <span className="text-5xl opacity-80">{c.emoji}</span>
    </div>
  );
}
