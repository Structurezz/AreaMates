import { useEffect, useRef, useState } from 'react';
import { Send, RefreshCw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { postAPI } from '../../api';
import BottomSheet from '../payments/BottomSheet';
import { Avatar, timeAgo, isManagerRole, VerifiedTick } from './shared';

const QUICK = ['❤️', '🔥', '👏', '😂', '😍', '🙌'];

// Comments for one post. The parent keeps the post in sync with live socket
// events, so new comments from neighbours appear here as they're written.
export default function CommentsSheet({ post, me, onClose, onCommentAdded, onCommentDeleted }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const comments = post?.comments || [];

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [comments.length]);

  const send = async (value = text) => {
    const body = value.trim();
    if (!body) return;
    setSending(true);
    try {
      const { data } = await postAPI.addComment(post._id, body);
      onCommentAdded(post._id, data.data, data.total);
      setText('');
    } catch { toast.error('Couldn\'t post your comment'); }
    finally { setSending(false); }
  };

  const remove = async (c) => {
    try {
      const { data } = await postAPI.deleteComment(post._id, c._id);
      onCommentDeleted(post._id, c._id, data.total);
    } catch { toast.error('Couldn\'t delete'); }
  };

  return (
    <BottomSheet open={!!post} onClose={onClose} title="Comments"
      footer={post && (
        <div className="space-y-2">
          <div className="flex justify-between px-1">
            {QUICK.map((e) => (
              <button key={e} onClick={() => send(e)} disabled={sending} className="text-2xl hover:scale-110 transition-transform">{e}</button>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
            <Avatar person={me} size={34} />
            <input value={text} onChange={(e) => setText(e.target.value.slice(0, 500))}
              placeholder={`Add a comment for ${post.author?.name?.split(' ')[0] || 'them'}…`}
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-[15px] outline-none focus:border-slate-300" />
            <button type="submit" disabled={sending || !text.trim()} className="text-[#3897F0] font-semibold text-sm px-1 disabled:opacity-40">
              {sending ? <RefreshCw size={16} className="animate-spin" /> : 'Post'}
            </button>
          </form>
        </div>
      )}>
      {post && (
        <div ref={listRef} className="space-y-4 -mx-1 px-1">
          {post.content && (
            <div className="flex gap-3 pb-4 border-b border-slate-100">
              <Avatar person={post.author} size={32} />
              <p className="text-[14px] leading-snug text-slate-900 min-w-0">
                <span className="font-semibold mr-1.5 inline-flex items-center gap-1">{post.author?.name}{isManagerRole(post.author?.role) && <VerifiedTick size={12} />}</span>
                <span style={{ whiteSpace: 'pre-wrap' }}>{post.content}</span>
                <span className="block text-xs text-slate-400 mt-1">{timeAgo(post.createdAt)}</span>
              </p>
            </div>
          )}
          {comments.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-lg font-bold text-slate-900">No comments yet</p>
              <p className="text-sm text-slate-500">Start the conversation.</p>
            </div>
          )}
          {comments.map((c) => {
            const mine = String(c.author?._id || c.author) === String(me?._id);
            return (
              <div key={c._id} className="flex gap-3 group">
                <Avatar person={c.author} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] leading-snug text-slate-900">
                    <span className="font-semibold mr-1.5 inline-flex items-center gap-1">{c.author?.name || 'Resident'}{isManagerRole(c.author?.role) && <VerifiedTick size={12} />}</span>
                    {c.text}
                  </p>
                  <span className="text-xs text-slate-400">{timeAgo(c.createdAt)}</span>
                </div>
                {(mine || isManagerRole(me?.role)) && (
                  <button onClick={() => remove(c)} aria-label="Delete comment" className="self-start p-1.5 text-slate-300 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </BottomSheet>
  );
}
