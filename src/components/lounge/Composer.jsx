import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { postAPI } from '../../api';
import BottomSheet from '../payments/BottomSheet';
import { Avatar } from './shared';

// New post: text and/or up to 4 photos.
// mode 'story' → posts to the stories row only (24h), never the timeline.
export default function Composer({ open, me, onClose, onPosted, startWithPhoto, mode = 'post' }) {
  const isStory = mode === 'story';
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);
  const previews = files.map((f) => f.preview);

  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (e) => {
    const picked = Array.from(e.target.files || []).slice(0, 4 - files.length)
      .map((file) => Object.assign(file, { preview: URL.createObjectURL(file) }));
    setFiles((prev) => [...prev, ...picked].slice(0, 4));
    e.target.value = '';
  };
  const remove = (i) => setFiles((prev) => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, j) => j !== i); });

  const reset = () => { setContent(''); setFiles([]); };
  const close = () => { if (!posting) { reset(); onClose(); } };

  const post = async () => {
    if (!content.trim() && !files.length) return;
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('content', content.trim());
      if (isStory) fd.append('kind', 'story');
      files.forEach((f) => fd.append('images', f));
      const { data } = await postAPI.create(fd);
      onPosted(data.data);
      reset();
      onClose();
      toast.success(isStory ? 'Added to your story' : 'Shared to the Lounge');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Couldn\'t share — try again');
    } finally { setPosting(false); }
  };

  return (
    <BottomSheet open={open} onClose={close} title={isStory ? 'Add to your story' : 'New post'}
      subtitle={isStory ? 'Only in Stories · disappears after 24 hours' : undefined}
      footer={
        <button onClick={post} disabled={posting || (!content.trim() && !files.length)}
          className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-40 inline-flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(90deg,#6366F1,#4F46E5)' }}>
          {posting ? <><RefreshCw size={16} className="animate-spin" /> Sharing…</> : isStory ? 'Share to story' : 'Share'}
        </button>
      }>
      <div className="space-y-4">
        <div className="flex gap-3">
          <Avatar person={me} size={40} />
          <textarea autoFocus={!startWithPhoto} rows={4} value={content} onChange={(e) => setContent(e.target.value.slice(0, 1000))}
            placeholder={isStory ? 'Say something for your story… (or just add a photo)' : `What's happening in the estate, ${me?.name?.split(' ')[0] || ''}?`}
            className="flex-1 resize-none text-[16px] leading-relaxed outline-none placeholder:text-slate-400" />
        </div>
        {previews.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {previews.map((src, i) => (
              <div key={src} className="relative w-28 shrink-0 rounded-xl overflow-hidden bg-slate-100" style={{ aspectRatio: '4 / 5' }}>
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button onClick={() => remove(i)} aria-label="Remove photo" className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <button onClick={() => fileRef.current?.click()} disabled={files.length >= 4}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 disabled:opacity-40">
            <ImagePlus size={20} className="text-indigo-600" /> {files.length ? `Photos ${files.length}/4` : 'Add photos'}
          </button>
          <span className="text-xs text-slate-400">{content.length}/1000</span>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={add} />
        </div>
      </div>
    </BottomSheet>
  );
}
