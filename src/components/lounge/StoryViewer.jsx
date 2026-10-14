import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Heart, MessageCircle, Trash2 } from 'lucide-react';
import Portal from '../ui/Portal';
import { Avatar, imgUrl, timeAgo, VerifiedTick, isManagerRole } from './shared';

const DURATION = 5000;

// Full-screen stories: each neighbour's posts from the last 24h, Instagram
// style — segmented progress, tap right/left to move, hold to pause.
export default function StoryViewer({ groups, startIndex, onClose, onSeen, onOpenComments, me, onDelete }) {
  const [g, setG] = useState(startIndex);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);
  const group = groups[g];
  const post = group?.posts[i];

  const next = useCallback(() => {
    if (!group) return;
    if (i < group.posts.length - 1) setI(i + 1);
    else if (g < groups.length - 1) { setG(g + 1); setI(0); }
    else onClose();
  }, [g, i, group, groups.length, onClose]);
  const prev = () => {
    if (i > 0) setI(i - 1);
    else if (g > 0) { setG(g - 1); setI(groups[g - 1].posts.length - 1); }
  };

  useEffect(() => { if (group) onSeen(group.author._id); }, [g]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (paused || !post) return;
    timer.current = setTimeout(next, DURATION);
    return () => clearTimeout(timer.current);
  }, [g, i, paused, post, next]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!post) return null;
  const author = group.author;
  const img = post.images?.[0];

  return (
    <Portal>
      <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ zIndex: 220 }}>
        <div className="relative w-full h-full sm:max-w-[420px] sm:h-[92vh] sm:rounded-2xl overflow-hidden bg-neutral-900">
          {/* Media */}
          {img ? (
            <>
              {/* Blurred fill behind photos that don't match the portrait frame */}
              <img src={imgUrl(img)} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60" />
              <img src={imgUrl(img)} alt="" className="absolute inset-0 w-full h-full object-contain" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-white text-2xl font-bold"
              style={{ background: 'linear-gradient(135deg,#312E81,#4F46E5 55%,#818CF8)', whiteSpace: 'pre-wrap' }}>
              {post.content}
            </div>
          )}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />

          {/* Progress */}
          <div className="absolute top-2 inset-x-2 flex gap-1" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            {group.posts.map((_, k) => (
              <div key={k} className="h-[3px] flex-1 rounded-full bg-white/35 overflow-hidden">
                <div className="h-full bg-white"
                  style={k < i ? { width: '100%' } : k === i ? { animation: `storyFill ${DURATION}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' } : { width: 0 }} />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-6 inset-x-3 flex items-center gap-2.5 text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
            <Avatar person={author} size={32} />
            <span className="text-sm font-semibold inline-flex items-center gap-1">{author.name}{isManagerRole(author.role) && <VerifiedTick size={13} />}</span>
            <span className="text-sm text-white/70">{timeAgo(post.createdAt)}</span>
            {String(author._id) === String(me?._id) && onDelete && (
              <button onClick={() => { setPaused(true); onDelete(post._id); }} aria-label="Delete story" className="ml-auto w-9 h-9 flex items-center justify-center text-white/90">
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className={`${String(author._id) === String(me?._id) && onDelete ? '' : 'ml-auto '}w-9 h-9 flex items-center justify-center`}><X size={26} /></button>
          </div>

          {/* Tap zones */}
          <button aria-label="Previous" className="absolute left-0 top-16 bottom-24 w-1/3" onClick={prev}
            onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)} />
          <button aria-label="Next" className="absolute right-0 top-16 bottom-24 w-2/3" onClick={next}
            onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)} />

          {/* Caption + actions */}
          <div className="absolute bottom-0 inset-x-0 p-4 text-white" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            {img && post.content && <p className="text-[15px] leading-snug mb-3 line-clamp-3">{post.content}</p>}
            <div className="flex items-center gap-5 text-sm">
              <span className="inline-flex items-center gap-1.5"><Heart size={20} /> {post.likeCount ?? post.likes?.length ?? 0}</span>
              <button onClick={() => { onClose(); onOpenComments(post); }} className="inline-flex items-center gap-1.5">
                <MessageCircle size={20} className="-scale-x-100" /> Reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
