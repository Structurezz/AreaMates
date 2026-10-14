import { useState } from 'react';
import { Heart, TrendingDown } from 'lucide-react';
import { imgUrl } from '../lounge/shared';
import { naira, priceDrop, sellerOf, NoPhoto, RatingPill } from './shared';

// Grid tile: square photo, price first (that's what people scan for).
export default function ListingCard({ listing, me, onOpen, onToggleSave }) {
  const [broken, setBroken] = useState(false);
  const saved = (listing.savedBy || []).some((id) => String(id) === String(me?._id));
  const drop = priceDrop(listing);
  const seller = sellerOf(listing);
  const photo = listing.images?.[0];

  return (
    <button onClick={() => onOpen(listing)} className="text-left group min-w-0">
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100">
        {photo && !broken
          ? <img src={imgUrl(photo)} alt="" loading="lazy" onError={() => setBroken(true)} className="w-full h-full object-cover group-active:scale-[0.98] transition-transform" />
          : <NoPhoto category={listing.category} />}
        {listing.status === 'sold' && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-white text-slate-900 text-xs font-bold tracking-wide">SOLD</span>
          </div>
        )}
        {drop && listing.status !== 'sold' && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 shadow">
            <TrendingDown size={11} /> Price drop
          </span>
        )}
        <span
          role="button" tabIndex={0} aria-label={saved ? 'Unsave' : 'Save'}
          onClick={(e) => { e.stopPropagation(); onToggleSave(listing); }}
          className="absolute right-2 top-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm active:scale-90 transition-transform"
        >
          <Heart size={15} className={saved ? 'text-rose-500' : 'text-slate-700'} fill={saved ? 'currentColor' : 'none'} strokeWidth={2} />
        </span>
        {listing.images?.length > 1 && (
          <span className="absolute right-2 bottom-2 text-[10px] font-semibold text-white bg-black/50 rounded-full px-1.5 py-0.5">1/{listing.images.length}</span>
        )}
      </div>
      <div className="pt-2 px-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold text-slate-900 tracking-tight">{naira(listing.price)}</span>
          {drop && <span className="text-[11px] text-slate-400 line-through">{naira(drop)}</span>}
        </div>
        <p className="text-[13px] text-slate-700 leading-snug line-clamp-2 mt-0.5">{listing.title}</p>
        <div className="flex items-center justify-between gap-1 mt-1">
          <span className="text-[11px] text-slate-400 truncate">{seller.name?.split(' ')[0] || 'Neighbour'}</span>
          <RatingPill rating={listing.sellerRating} />
        </div>
      </div>
    </button>
  );
}
