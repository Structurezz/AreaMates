import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ImagePlus, ArrowUp, PartyPopper } from 'lucide-react';
import toast from 'react-hot-toast';
import { postAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { Avatar } from './shared';
import PostCard from './PostCard';
import CommentsSheet from './CommentsSheet';
import Composer from './Composer';
import StoryViewer from './StoryViewer';

const SEEN_KEY = 'am_lounge_seen_stories';
const loadSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch { return {}; } };
const DAY = 24 * 3600_000;

const norm = (p) => ({ ...p, likeCount: p.likeCount ?? p.likes?.length ?? 0, comments: p.comments || [] });
const scroller = () => document.querySelector('main') || document.scrollingElement;

function Skeleton() {
  return (
    <div className="bg-white sm:rounded-2xl sm:border sm:border-slate-200">
      <div className="flex items-center gap-3 p-3"><div className="w-9 h-9 rounded-full skeleton" /><div className="h-3 w-32 rounded skeleton" /></div>
      <div className="w-full skeleton" style={{ aspectRatio: '4 / 5' }} />
      <div className="p-3 space-y-2"><div className="h-3 w-20 rounded skeleton" /><div className="h-3 w-3/4 rounded skeleton" /></div>
    </div>
  );
}

// The Lounge feed: Instagram-style stories + posts, live over the socket.
export default function Feed({ me }) {
  const { subscribe } = useSocket() || {};
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [stories, setStories] = useState([]);          // kind:'story' posts (last 24h) — never in the timeline
  const [pending, setPending] = useState([]);          // live posts waiting behind the "new posts" pill
  const [commentsFor, setCommentsFor] = useState(null); // postId
  const [composer, setComposer] = useState(null);       // { photo: bool, mode: 'post'|'story' }
  const [story, setStory] = useState(null);             // group index
  const [seen, setSeen] = useState(loadSeen);
  const sentinel = useRef(null);

  const load = useCallback(async (p = 1) => {
    p === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const { data } = await postAPI.getAll(p);
      const items = (data.data || []).map(norm);
      setPosts((prev) => {
        if (p === 1) return items;
        const ids = new Set(prev.map((x) => x._id));
        return [...prev, ...items.filter((x) => !ids.has(x._id))];
      });
      setHasMore(p < data.pages);
      setPage(p);
    } catch { toast.error('Couldn\'t load the Lounge'); }
    finally { setLoading(false); setLoadingMore(false); }
  }, []);
  useEffect(() => { load(1); }, [load]);
  const loadStories = useCallback(async () => {
    try { const { data } = await postAPI.stories(); setStories((data.data || []).map(norm)); } catch { /* non-critical */ }
  }, []);
  useEffect(() => { loadStories(); }, [loadStories]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingMore) load(page + 1);
    }, { root: document.querySelector('main'), rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, page, loadingMore, load]);

  // ── Live updates ──────────────────────────────────────────────────────────
  const patch = useCallback((postId, fn) => {
    setPosts((ps) => ps.map((p) => (p._id === postId ? fn(p) : p)));
    setStories((ss) => ss.map((p) => (p._id === postId ? fn(p) : p)));
  }, []);

  useEffect(() => {
    if (!subscribe) return;
    const offs = [
      subscribe('lounge:post_new', (raw) => {
        const post = norm(raw);
        const mine = String(post.author?._id) === String(me?._id);
        const nearTop = (scroller()?.scrollTop || 0) < 300;
        if (mine || nearTop) {
          setPosts((ps) => (ps.some((p) => p._id === post._id) ? ps : [post, ...ps]));
        } else {
          setPending((q) => (q.some((p) => p._id === post._id) ? q : [post, ...q]));
        }
      }),
      subscribe('lounge:story_new', (raw) => setStories((ss) => (ss.some((s) => s._id === raw._id) ? ss : [...ss, norm(raw)]))),
      subscribe('lounge:post_like', ({ postId, likes, userId, liked }) => patch(postId, (p) => {
        const others = (p.likes || []).filter((l) => String(l?._id || l) !== String(userId));
        return { ...p, likeCount: likes, likes: liked ? [...others, userId] : others };
      })),
      subscribe('lounge:post_comment', ({ postId, comment }) => patch(postId, (p) => (
        p.comments.some((c) => c._id === comment._id) ? p : { ...p, comments: [...p.comments, comment] }
      ))),
      subscribe('lounge:comment_deleted', ({ postId, commentId }) => patch(postId, (p) => ({ ...p, comments: p.comments.filter((c) => c._id !== commentId) }))),
      subscribe('lounge:post_deleted', ({ postId }) => {
        setPosts((ps) => ps.filter((p) => p._id !== postId));
        setStories((ss) => ss.filter((p) => p._id !== postId));
        setPending((q) => q.filter((p) => p._id !== postId));
      }),
    ];
    return () => offs.forEach((off) => off?.());
  }, [subscribe, me?._id, patch]);

  const showPending = () => {
    setPosts((ps) => {
      const ids = new Set(ps.map((p) => p._id));
      return [...pending.filter((p) => !ids.has(p._id)), ...ps];
    });
    setPending([]);
    scroller()?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  // Optimistic like/unlike; `likes` (server count) overrides when it arrives.
  const onLikeLocal = (postId, liked, likes) => patch(postId, (p) => {
    const others = (p.likes || []).filter((l) => String(l?._id || l) !== String(me?._id));
    const wasLiked = others.length !== (p.likes || []).length;
    const delta = liked === wasLiked ? 0 : liked ? 1 : -1;
    return { ...p, likes: liked ? [...others, me?._id] : others, likeCount: likes ?? Math.max(0, p.likeCount + delta) };
  });
  const onPosted = (post) => {
    if (post.kind === 'story') setStories((ss) => (ss.some((s) => s._id === post._id) ? ss : [...ss, norm(post)]));
    else setPosts((ps) => (ps.some((p) => p._id === post._id) ? ps : [norm(post), ...ps]));
  };
  const onDeleteStory = async (postId) => {
    if (!confirm('Delete this story?')) return;
    try {
      await postAPI.delete(postId);
      setStories((ss) => ss.filter((s) => s._id !== postId));
      setStory(null);
      toast.success('Story deleted');
    } catch { toast.error('Couldn\'t delete'); }
  };
  const onDelete = async (postId) => {
    if (!confirm('Delete this post?')) return;
    try { await postAPI.delete(postId); setPosts((ps) => ps.filter((p) => p._id !== postId)); toast.success('Post deleted'); }
    catch { toast.error('Couldn\'t delete'); }
  };
  const onCommentAdded = (postId, comment) => patch(postId, (p) => (p.comments.some((c) => c._id === comment._id) ? p : { ...p, comments: [...p.comments, comment] }));
  const onCommentDeleted = (postId, commentId) => patch(postId, (p) => ({ ...p, comments: p.comments.filter((c) => c._id !== commentId) }));

  // ── Stories (separate from the timeline), grouped by author ───────────────
  const groups = useMemo(() => {
    const byAuthor = new Map();
    // API returns oldest first — the order they're viewed in.
    stories.filter((p) => Date.now() - new Date(p.createdAt) < DAY).forEach((p) => {
      const id = String(p.author?._id);
      if (!byAuthor.has(id)) byAuthor.set(id, { author: p.author, posts: [] });
      byAuthor.get(id).posts.push(p);
    });
    const list = [...byAuthor.values()].map((g) => ({ ...g, latest: g.posts[g.posts.length - 1]._id }));
    const isSeen = (g) => seen[String(g.author._id)] === g.latest;
    return list.sort((a, b) => {
      const meA = String(a.author._id) === String(me?._id), meB = String(b.author._id) === String(me?._id);
      if (meA !== meB) return meA ? -1 : 1;
      return isSeen(a) - isSeen(b);
    });
  }, [stories, seen, me?._id]);
  const myGroupIndex = groups.findIndex((g) => String(g.author._id) === String(me?._id));
  const markSeen = (authorId) => {
    const g = groups.find((x) => String(x.author._id) === String(authorId));
    if (!g) return;
    setSeen((s) => { const n = { ...s, [String(authorId)]: g.latest }; localStorage.setItem(SEEN_KEY, JSON.stringify(n)); return n; });
  };

  const commentsPost = posts.find((p) => p._id === commentsFor) || stories.find((p) => p._id === commentsFor);

  return (
    // Full-bleed on phones (cancel <main> padding), centred 470px column above.
    <div className="-mx-4 sm:mx-auto sm:max-w-[470px]">
      {/* Stories */}
      <div className="flex gap-3.5 overflow-x-auto no-scrollbar px-4 py-3 bg-white sm:rounded-2xl sm:border sm:border-slate-200">
        <button onClick={() => (myGroupIndex >= 0 ? setStory(myGroupIndex) : setComposer({ photo: true, mode: 'story' }))} className="flex flex-col items-center gap-1 w-[72px] shrink-0">
          <div className="relative">
            <Avatar person={me} size={60} ring={myGroupIndex >= 0 ? 'story' : null} />
            <span onClick={(e) => { e.stopPropagation(); setComposer({ photo: true, mode: 'story' }); }}
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-indigo-600 border-2 border-white text-white flex items-center justify-center">
              <Plus size={14} strokeWidth={3} />
            </span>
          </div>
          <span className="text-[11px] text-slate-700 truncate w-full text-center">Your story</span>
        </button>
        {groups.map((g, k) => String(g.author._id) === String(me?._id) ? null : (
          <button key={g.author._id} onClick={() => setStory(k)} className="flex flex-col items-center gap-1 w-[72px] shrink-0">
            <Avatar person={g.author} size={60} ring={seen[String(g.author._id)] === g.latest ? 'seen' : 'story'} />
            <span className="text-[11px] text-slate-700 truncate w-full text-center">{g.author.name?.split(' ')[0]}</span>
          </button>
        ))}
        {!loading && groups.length === 0 && (
          <div className="flex items-center text-xs text-slate-400 pl-1">Tap ＋ to share a story — it disappears after 24 hours</div>
        )}
      </div>

      {/* Composer bar */}
      <div className="flex items-center gap-3 px-4 py-3 mt-px sm:mt-3 bg-white sm:rounded-2xl sm:border sm:border-slate-200">
        <Avatar person={me} size={36} />
        <button onClick={() => setComposer({ photo: false })} className="flex-1 text-left text-[15px] text-slate-400 bg-slate-100 rounded-full px-4 py-2.5">
          What's happening, {me?.name?.split(' ')[0] || 'neighbour'}?
        </button>
        <button onClick={() => setComposer({ photo: true })} aria-label="Post a photo" className="w-10 h-10 rounded-full flex items-center justify-center text-indigo-600 hover:bg-indigo-50">
          <ImagePlus size={22} />
        </button>
      </div>

      {/* New posts pill */}
      {pending.length > 0 && (
        <div className="sticky top-[104px] md:top-[96px] z-40 flex justify-center pointer-events-none">
          <button onClick={showPending}
            className="pointer-events-auto mt-3 inline-flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full text-white text-sm font-semibold shadow-lg"
            style={{ background: 'linear-gradient(90deg,#6366F1,#4F46E5)' }}>
            <span className="flex -space-x-2">
              {pending.slice(0, 3).map((p) => <span key={p._id} className="ring-2 ring-white rounded-full"><Avatar person={p.author} size={22} /></span>)}
            </span>
            <ArrowUp size={14} /> {pending.length} new post{pending.length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Posts */}
      <div className="mt-2 sm:mt-3 space-y-2 sm:space-y-4">
        {loading ? (
          <><Skeleton /><Skeleton /></>
        ) : posts.length === 0 ? (
          <div className="bg-white sm:rounded-2xl sm:border sm:border-slate-200 py-16 px-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ background: 'linear-gradient(45deg,#818CF8,#4F46E5)' }}>
              <PartyPopper size={28} className="text-white" />
            </div>
            <p className="text-lg font-bold text-slate-900">Start the conversation</p>
            <p className="text-sm text-slate-500 mt-1 mb-5">Share a photo, a shout-out or what's happening on your street.</p>
            <button onClick={() => setComposer({ photo: true })} className="px-5 py-2.5 rounded-full text-sm font-bold text-white bg-indigo-600">Share the first post</button>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post._id} post={post} me={me} onLikeLocal={onLikeLocal}
              onOpenComments={(p) => setCommentsFor(p._id)} onDelete={onDelete} />
          ))
        )}
        <div ref={sentinel} />
        {loadingMore && <Skeleton />}
        {!loading && !hasMore && posts.length > 4 && (
          <p className="text-center text-xs text-slate-400 py-6">You're all caught up ✨</p>
        )}
      </div>

      <CommentsSheet post={commentsPost} me={me} onClose={() => setCommentsFor(null)}
        onCommentAdded={onCommentAdded} onCommentDeleted={onCommentDeleted} />
      <Composer open={!!composer} mode={composer?.mode} startWithPhoto={composer?.photo} me={me} onClose={() => setComposer(null)} onPosted={onPosted} />
      {story != null && groups[story] && (
        <StoryViewer groups={groups} startIndex={story} onClose={() => setStory(null)} onSeen={markSeen}
          onOpenComments={(p) => setCommentsFor(p._id)} me={me} onDelete={onDeleteStory} />
      )}
    </div>
  );
}
