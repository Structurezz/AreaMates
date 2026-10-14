import { useRef, useState } from 'react';
import { Heart, MessageCircle, Send, MoreHorizontal, Trash2, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { postAPI } from '../../api';
import { Avatar, VerifiedTick, imgUrl, timeAgo, isManagerRole } from './shared';

// Short text-only posts render as a bold gradient tile (Instagram-style).
const TILE_GRADIENTS = [
  'linear-gradient(135deg,#F58529,#DD2A7B)',
  'linear-gradient(135deg,#4F46E5,#EC4899)',
  'linear-gradient(135deg,#0EA5E9,#6366F1)',
  'linear-gradient(135deg,#10B981,#0EA5E9)',
  'linear-gradient(135deg,#F59E0B,#EF4444)',
];

function Carousel({ images, onDoubleTap }) {
  const [index, setIndex] = useState(0);
  const ref = useRef(null);
  const onScroll = () => {
    const el = ref.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <div className="relative bg-slate-100 select-none" onDoubleClick={onDoubleTap}>
      <div ref={ref} onScroll={onScroll} className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar" style={{ aspectRatio: '4 / 5' }}>
        {images.map((src, i) => (
          <img key={i} src={imgUrl(src)} alt="" loading="lazy" draggable={false}
            className="w-full h-full object-cover shrink-0 snap-center" />
        ))}
      </div>
      {images.length > 1 && (
        <>
          <span className="absolute top-3 right-3 text-[11px] font-semibold text-white bg-black/55 px-2 py-0.5 rounded-full">
            {index + 1}/{images.length}
          </span>
          <div className="absolute -bottom-5 inset-x-0 flex justify-center gap-1">
            {images.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-1.5 bg-[#3897F0]' : 'w-1.5 bg-slate-300'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PostCard({ post, me, onLikeLocal, onOpenComments, onDelete, onOpenAuthor }) {
  const [burst, setBurst] = useState(0);
  const [pop, setPop] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState(false);
  const tapRef = useRef(0);

  const author = post.author || {};
  const isOwn = String(author._id) === String(me?._id);
  const canDelete = isOwn || isManagerRole(me?.role);
  const liked = (post.likes || []).some((l) => String(l?._id || l) === String(me?._id));
  const likeCount = post.likeCount ?? post.likes?.length ?? 0;
  const comments = post.comments || [];
  const hasImages = post.images?.length > 0;
  const tile = !hasImages && post.content && post.content.length <= 140;
  const tileBg = TILE_GRADIENTS[parseInt(String(post._id).slice(-2), 16) % TILE_GRADIENTS.length];

  // One like request at a time: on phones a double-tap can fire both our
  // touch handler and the browser's dblclick, which would like then unlike.
  const busy = useRef(false);
  const toggleLike = async (forceLike = false) => {
    if (busy.current) return;
    if (forceLike && liked) return; // double-tap never unlikes
    busy.current = true;
    onLikeLocal(post._id, !liked); // optimistic
    setPop((p) => p + 1);
    try {
      const { data } = await postAPI.like(post._id);
      onLikeLocal(post._id, data.liked, data.likes);
    } catch {
      onLikeLocal(post._id, liked);
      toast.error('Couldn\'t like that — try again');
    } finally { busy.current = false; }
  };

  const doubleTap = () => { setBurst((b) => b + 1); toggleLike(true); };
  // Touch double-tap (onDoubleClick doesn't fire reliably on mobile)
  const onTouchEnd = () => {
    const now = Date.now();
    if (now - tapRef.current < 300) { doubleTap(); tapRef.current = 0; } else tapRef.current = now;
  };

  const share = async () => {
    const text = `${author.name} on AreaMates: ${post.content || 'shared a photo'}`;
    try {
      if (navigator.share) await navigator.share({ title: 'AreaMates Lounge', text, url: `${location.origin}/lounge` });
      else { await navigator.clipboard.writeText(`${text}\n${location.origin}/lounge`); toast.success('Copied to clipboard'); }
    } catch { /* cancelled */ }
  };

  const caption = post.content || '';
  const long = caption.length > 120;

  return (
    <article className="bg-white sm:rounded-2xl sm:border sm:border-slate-200 overflow-visible">
      {/* Header */}
      <header className="flex items-center gap-3 px-3 py-2.5">
        <button onClick={() => onOpenAuthor?.(author)} className="shrink-0"><Avatar person={author} size={34} /></button>
        <div className="flex-1 min-w-0 leading-tight">
          <div className="flex items-center gap-1 text-[14px] font-semibold text-slate-900 truncate">
            {author.name || 'Resident'} {isManagerRole(author.role) && <VerifiedTick />}
          </div>
          <div className="text-[12px] text-slate-500 truncate">{isManagerRole(author.role) ? 'Estate Management' : 'Resident'} · {timeAgo(post.createdAt)}</div>
        </div>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} aria-label="More" className="w-9 h-9 -mr-1 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100">
            <MoreHorizontal size={20} />
          </button>
          {menu && (
            <div className="absolute right-0 top-10 z-20 w-44 rounded-xl bg-white shadow-xl border border-slate-100 overflow-hidden" onMouseLeave={() => setMenu(false)}>
              {canDelete && (
                <button onClick={() => { setMenu(false); onDelete(post._id); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50">
                  <Trash2 size={15} /> Delete post
                </button>
              )}
              <button onClick={() => { setMenu(false); toast.success('Thanks — estate management will review this post'); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                <Flag size={15} /> Report
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Media */}
      <div className="relative" onTouchEnd={onTouchEnd}>
        {hasImages ? (
          <Carousel images={post.images} onDoubleTap={doubleTap} />
        ) : tile ? (
          <div onDoubleClick={doubleTap} className="flex items-center justify-center px-8 text-center text-white font-bold select-none"
            style={{ aspectRatio: '4 / 5', background: tileBg, fontSize: caption.length < 60 ? 28 : 21, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
            <span style={{ whiteSpace: 'pre-wrap', textShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>{caption}</span>
          </div>
        ) : null}
        {burst > 0 && (
          <div key={burst} className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart size={96} className="heart-burst text-white drop-shadow-xl" fill="white" strokeWidth={0} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-4 px-3 ${hasImages && post.images.length > 1 ? 'pt-6' : 'pt-2.5'} pb-1`}>
        <button onClick={() => toggleLike()} aria-label={liked ? 'Unlike' : 'Like'} key={`l${pop}`} className={pop ? 'like-pop' : ''}>
          <Heart size={25} className={liked ? 'text-[#ED4956]' : 'text-slate-900'} fill={liked ? '#ED4956' : 'none'} strokeWidth={liked ? 0 : 1.8} />
        </button>
        <button onClick={() => onOpenComments(post)} aria-label="Comment"><MessageCircle size={24} className="text-slate-900 -scale-x-100" strokeWidth={1.8} /></button>
        <button onClick={share} aria-label="Share"><Send size={22} className="text-slate-900" strokeWidth={1.8} /></button>
      </div>

      <div className="px-3 pb-3 space-y-1">
        {likeCount > 0 && <div className="text-[14px] font-semibold text-slate-900">{likeCount.toLocaleString()} like{likeCount === 1 ? '' : 's'}</div>}
        {caption && !tile && (
          <p className="text-[14px] text-slate-900 leading-snug" style={{ whiteSpace: 'pre-wrap' }}>
            <span className="font-semibold mr-1.5">{author.name?.split(' ')[0]}</span>
            {long && !expanded ? <>{caption.slice(0, 120).trimEnd()}… <button onClick={() => setExpanded(true)} className="text-slate-500">more</button></> : caption}
          </p>
        )}
        {comments.length > 2 && (
          <button onClick={() => onOpenComments(post)} className="text-[14px] text-slate-500">View all {comments.length} comments</button>
        )}
        {comments.slice(-2).map((c) => (
          <p key={c._id} className="text-[14px] text-slate-900 leading-snug truncate">
            <span className="font-semibold mr-1.5">{c.author?.name?.split(' ')[0] || 'Resident'}</span>{c.text}
          </p>
        ))}
        {comments.length > 0 && comments.length <= 2 && (
          <button onClick={() => onOpenComments(post)} className="text-[13px] text-slate-500">Add a comment…</button>
        )}
        <div className="text-[11px] uppercase tracking-wide text-slate-400 pt-0.5">{timeAgo(post.createdAt, true)}</div>
      </div>
    </article>
  );
}
