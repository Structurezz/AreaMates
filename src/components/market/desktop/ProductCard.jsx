import { useState } from 'react';
import { Heart, TrendingDown, MessageCircle, ShoppingCart, Eye } from 'lucide-react';
import { imgUrl } from '../../lounge/shared';
import { CAT, naira, priceDrop, sellerOf, isMine, NoPhoto, RatingPill } from '../shared';

// Desktop: image-first product card with hover zoom and quick actions.
export default function ProductCard({ listing, me, i = 0, onOpen, onToggleSave, onChat, onBuy }) {
  const [broken, setBroken] = useState(false);
  const saved = (listing.savedBy || []).some((id) => String(id) === String(me?._id));
  const drop = priceDrop(listing);
  const seller = sellerOf(listing);
  const photo = listing.images?.[0];
  const mine = isMine(listing, me);
  const buyable = listing.status === 'active' && !mine;

  return (
    <div className="dash-tile dash-rise group rounded-2xl bg-white border border-slate-200/70 overflow-hidden flex flex-col"
      style={{ animationDelay: `${40 + Math.min(i, 12) * 35}ms` }}>
      <button onClick={() => onOpen(listing)} className="relative block w-full aspect-[4/3] bg-slate-100 overflow-hidden text-left">
        {photo && !broken
          ? <img src={imgUrl(photo)} alt="" loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          : <span className="absolute inset-0"><NoPhoto category={listing.category} /></span>}
        <span className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
        {listing.status === 'sold' && (
          <span className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-white text-slate-900 text-xs font-bold tracking-wide">SOLD</span>
          </span>
        )}
        {drop && listing.status !== 'sold' && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 shadow"><TrendingDown size={11} /> Price drop</span>
        )}
        <span className="absolute left-3 bottom-2.5 flex items-baseline gap-1.5 text-white drop-shadow">
          <span className="text-[18px] font-bold">{naira(listing.price)}</span>
          {drop && <span className="text-[11px] line-through opacity-80">{naira(drop)}</span>}
        </span>
        {listing.images?.length > 1 && (
          <span className="absolute right-2.5 bottom-2.5 text-[10px] font-semibold text-white bg-black/45 rounded-full px-1.5 py-0.5">1/{listing.images.length}</span>
        )}
      </button>
      <button type="button" aria-label={saved ? 'Unsave' : 'Save'} onClick={() => onToggleSave(listing)}
        className="absolute right-2.5 top-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:scale-110 transition-transform">
        <Heart size={15} className={saved ? 'text-rose-500' : 'text-slate-700'} fill={saved ? 'currentColor' : 'none'} strokeWidth={2} />
      </button>

      <div className="p-3.5 flex-1 flex flex-col">
        <div className="text-[11px] text-slate-400">{CAT[listing.category]?.emoji} {CAT[listing.category]?.label}{listing.views ? <span className="inline-flex items-center gap-0.5 ml-1.5"><Eye size={10} /> {listing.views}</span> : null}</div>
        <button onClick={() => onOpen(listing)} className="mt-0.5 text-left text-[14px] font-semibold text-slate-900 line-clamp-2 hover:text-indigo-700 transition-colors">{listing.title}</button>
        <div className="mt-2 flex items-center gap-2 min-w-0">
          {seller.profilePhoto
            ? <img src={imgUrl(seller.profilePhoto)} alt="" className="w-6 h-6 rounded-full object-cover" />
            : <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold flex items-center justify-center">{(seller.name || 'N')[0]}</span>}
          <span className="text-[12px] text-slate-500 truncate flex-1">{mine ? 'You' : (seller.name || 'Neighbour')}</span>
          <RatingPill rating={listing.sellerRating} />
        </div>
        <div className="mt-auto pt-3 flex gap-1.5">
          {buyable ? (
            <>
              <button onClick={() => onBuy(listing)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">
                <ShoppingCart size={13} /> Buy
              </button>
              <button onClick={() => onChat(listing)} aria-label="Message seller" className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                <MessageCircle size={13} /> Message
              </button>
            </>
          ) : (
            <button onClick={() => onOpen(listing)} className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">
              {mine ? 'Manage listing' : 'View details'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
