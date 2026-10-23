import { useEffect, useRef, useState } from 'react';
import { Youtube, Plus, Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { parseYouTubeId } from '../studio/MusicDeck';

// Add a track from YouTube (saved to the Lounge library) or from this computer (this session only)
export default function AddTracks({ onAddYouTube, onAddFiles, accent = '#6366F1' }) {
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const id = parseYouTubeId(link);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`)
      .then((r) => r.json()).then((d) => { if (!cancelled && d?.title) setTitle((t) => t || d.title); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const addYT = async (e) => {
    e.preventDefault();
    if (!id) { toast.error('Paste a YouTube link'); return; }
    if (!title.trim()) { toast.error('Add the song title'); return; }
    setBusy(true);
    if (await onAddYouTube(id, title.trim())) { setLink(''); setTitle(''); }
    setBusy(false);
  };

  return (
    <div className="p-3 border-t border-slate-100 space-y-2">
      <form onSubmit={addYT} className="space-y-1.5">
        <div className="relative">
          <Youtube size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-500" />
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a YouTube link…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white focus:border-slate-300" />
        </div>
        {id && (
          <div className="flex items-center gap-1.5 animate-scale-in">
            <img src={`https://i.ytimg.com/vi/${id}/default.jpg`} alt="" className="w-10 h-7 rounded object-cover flex-shrink-0" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title"
              className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white focus:border-slate-300" />
            <button type="submit" disabled={busy} aria-label="Add to library"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0 disabled:opacity-50" style={{ background: accent }}>
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>
        )}
      </form>
      <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden"
        onChange={(e) => { onAddFiles(e.target.files); e.target.value = ''; }} />
      <button type="button" onClick={() => fileRef.current?.click()}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-300 text-[12px] font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50/50 transition-colors">
        <Upload size={13} /> Add audio from this computer
      </button>
    </div>
  );
}
