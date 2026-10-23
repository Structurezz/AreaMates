import { useCallback, useEffect, useRef, useState } from 'react';
import { Music, Plus, X, Play, SkipForward, Volume2, Volume1, VolumeX, Repeat, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { loungeAPI, djAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { Fader } from '../MixerDeck';

/* The Podcast's own music deck. Seeded once from the estate's song library,
 * then kept separately (this device) so adding/removing here never touches the Lounge. */
const DECK_KEY = 'ac_podcast_deck';

export function parseYouTubeId(input = '') {
  const s = String(input).trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function useMusicDeck() {
  const [tracks, setTracks] = useState(() => { try { return JSON.parse(localStorage.getItem(DECK_KEY)); } catch { return null; } });
  const persist = (next) => { setTracks(next); try { localStorage.setItem(DECK_KEY, JSON.stringify(next)); } catch {} };

  // First use: start from the estate library so the deck isn't empty
  useEffect(() => {
    if (tracks) return;
    loungeAPI.getSession()
      .then(({ data }) => {
        const seed = (data.data?.suggestions || [])
          .sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))
          .slice(0, 30)
          .map((t) => ({ videoId: t.videoId, title: t.title, artist: t.artist || '' }));
        persist(seed);
      })
      .catch(() => persist([]));
  }, [tracks]);

  return {
    tracks: tracks || [],
    loading: tracks === null,
    add: (t) => {
      const list = tracks || [];
      if (list.some((x) => x.videoId === t.videoId)) { toast.error('That song is already on the deck'); return false; }
      persist([...list, t]);
      return true;
    },
    remove: (videoId) => persist((tracks || []).filter((t) => t.videoId !== videoId)),
  };
}

/**
 * Live music player state. Plays YouTube on the host's side; listeners follow the
 * session's now-playing track and the broadcast music volume (dj:volume).
 * Played songs are reported through onSetlist for the saved recording.
 */
export function useMusicPlayer({ deck, session, startedAt, onSetlist }) {
  const { emit } = useSocket() || {};
  const [current, setCurrent] = useState(null);
  const [vol, setVol] = useState(45);
  const [autoNext, setAutoNext] = useState(true);
  const iframeRef = useRef(null);

  const post = useCallback((func, args = []) => {
    try { iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch {}
  }, []);

  const setVolume = (v) => {
    setVol(v);
    post('setVolume', [v]);
    if (session && emit) emit('dj:volume', { sessionId: session._id, volume: v });
  };

  const play = useCallback(async (t) => {
    if (!session) return;
    const sec = Math.floor((Date.now() - startedAt) / 1000);
    onSetlist((prev) => {
      const copy = [...prev];
      if (copy.length) copy[copy.length - 1] = { ...copy[copy.length - 1], endSec: sec };
      copy.push({ videoId: t.videoId, title: t.title, artist: t.artist || '', startSec: sec, endSec: 0 });
      return copy;
    });
    setCurrent(t);
    try { await djAPI.updateTrack(session._id, { videoId: t.videoId, title: t.title, artist: t.artist || '' }); } catch { /* optimistic */ }
  }, [session, startedAt, onSetlist]);

  const next = useCallback(() => {
    const list = deck.tracks;
    if (!list.length) return;
    const i = current ? list.findIndex((t) => t.videoId === current.videoId) : -1;
    play(list[(i + 1) % list.length]);
  }, [deck.tracks, current, play]);

  // Auto-advance when the YouTube player reports "ended"
  useEffect(() => {
    if (!session || !current) return;
    const onMsg = (e) => {
      if (!String(e.origin).includes('youtube')) return;
      let data; try { data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch { return; }
      const state = data?.event === 'onStateChange' ? data.info : data?.info?.playerState;
      if (state === 0 && autoNext) next();
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [session, current, autoNext, next]);

  return { live: !!session, current, vol, setVolume, autoNext, setAutoNext, play, next, iframeRef, post };
}

/* Music channel for the console: now playing + transport + the "everyone" fader */
export function MusicChannel({ player, hasTracks, accent }) {
  const { current, vol, setVolume, autoNext, setAutoNext, next, iframeRef, post } = player;
  const VolIcon = vol === 0 ? VolumeX : vol < 40 ? Volume1 : Volume2;
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5"><Music size={12} /> Music</span>
        <span className="text-[11px] font-medium" style={{ color: current ? '#A7F3D0' : 'rgba(255,255,255,0.4)' }}>{current ? 'Playing' : 'Off'}</span>
      </div>
      <div className="relative mt-3 w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10">
        {current ? (
          <iframe ref={iframeRef} key={current.videoId} title="Now playing"
            src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
            allow="autoplay; encrypted-media"
            onLoad={() => {
              try { iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening' }), '*'); } catch {}
              setTimeout(() => post('setVolume', [vol]), 400);
            }}
            className="absolute inset-0 w-full h-full border-0" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 text-[12px] gap-1.5">
            <Music size={22} /> Pick a song from the deck
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0 text-[13px] font-semibold truncate">{current?.title || 'No music playing'}</div>
        <button onClick={next} disabled={!hasTracks} aria-label="Next song"
          className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-lg text-white disabled:opacity-40 flex-shrink-0" style={{ background: accent }}>
          <SkipForward size={12} /> Next
        </button>
        <button onClick={() => setAutoNext((a) => !a)} title="Play the next song automatically"
          className={`inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1 rounded-lg border flex-shrink-0 transition-colors ${autoNext ? 'bg-white/15 border-white/20 text-white' : 'border-white/15 text-white/50'}`}>
          <Repeat size={12} /> Auto
        </button>
      </div>
      <div className="mt-auto pt-3">
        <div className="p-3 rounded-xl bg-black/25 border border-white/10">
          <Fader label="Music · everyone" value={vol} max={100} unit="%" disabled={!current} onChange={setVolume}
            color={accent} icon={<VolIcon size={13} />}
            quickActions={[{ label: 'Duck', value: 15 }, { label: 'Bed', value: 35 }, { label: 'Up', value: 70 }, { label: 'Mute', value: 0 }]} />
        </div>
      </div>
    </div>
  );
}

function AddSongForm({ onAdd, accent }) {
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const id = parseYouTubeId(link);

  // Fill the title from the link when we can
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d?.title) setTitle((t) => t || d.title); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  const submit = (e) => {
    e.preventDefault();
    if (!id) { toast.error('Paste a YouTube link'); return; }
    if (!title.trim()) { toast.error('Add the song title'); return; }
    if (onAdd({ videoId: id, title: title.trim(), artist: '' })) { setLink(''); setTitle(''); toast.success('Added to the deck'); }
  };

  return (
    <form onSubmit={submit} className="flex-none p-3 border-t border-slate-100 space-y-1.5">
      <div className="relative">
        <Link2 size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a YouTube link to add a song…"
          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white focus:border-slate-300" />
      </div>
      {id && (
        <div className="flex items-center gap-1.5 animate-scale-in">
          <img src={`https://i.ytimg.com/vi/${id}/default.jpg`} alt="" className="w-10 h-7 rounded object-cover flex-shrink-0" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title"
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white focus:border-slate-300" />
          <button type="submit" aria-label="Add song" className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: accent }}>
            <Plus size={14} />
          </button>
        </div>
      )}
    </form>
  );
}

/* The song list: play (when live), remove, add */
export default function DeckList({ deck, player, accent, className = '' }) {
  const live = !!player?.live;
  const current = player?.current;
  return (
    <div className={`rounded-2xl bg-white border border-slate-200/70 overflow-hidden flex flex-col ${className}`}>
      <div className="flex-none flex items-center justify-between px-4 h-12 border-b border-slate-100">
        <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: accent }}>
            <Music size={12} className="text-white" />
          </span>
          Music deck
        </h3>
        <span className="text-[12px] text-slate-400">{deck.tracks.length} song{deck.tracks.length === 1 ? '' : 's'}</span>
      </div>
      <div className="flex-1 min-h-0 max-h-[300px] overflow-y-auto py-1">
        {deck.loading && <div className="p-4 space-y-2">{[0, 1, 2].map((k) => <div key={k} className="skeleton h-8 rounded-lg" />)}</div>}
        {!deck.loading && deck.tracks.length === 0 && (
          <p className="px-4 py-4 text-[12px] text-slate-400">The deck is empty. Paste a YouTube link below to add songs.</p>
        )}
        {deck.tracks.map((t, i) => {
          const on = current?.videoId === t.videoId;
          return (
            <div key={t.videoId} className="group flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 transition-colors" style={on ? { background: `${accent}0D` } : undefined}>
              <button onClick={() => player?.play(t)} disabled={!live} title={live ? 'Play now' : 'Go live to play'}
                className="relative w-12 h-8 rounded-md overflow-hidden flex-shrink-0 bg-slate-100 disabled:cursor-default">
                <img src={`https://i.ytimg.com/vi/${t.videoId}/default.jpg`} alt="" className="w-full h-full object-cover" loading="lazy" />
                {live && (
                  <span className={`absolute inset-0 flex items-center justify-center text-white transition-opacity ${on ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    style={{ background: on ? `${accent}CC` : 'rgba(0,0,0,0.45)' }}>
                    {on
                      ? <span className="dash-eq flex items-end gap-[2px] h-3">{[0, 1, 2].map((k) => <span key={k} className="w-[2px] h-full bg-white rounded-full" style={{ animationDelay: `${k * 200}ms` }} />)}</span>
                      : <Play size={12} fill="currentColor" />}
                  </span>
                )}
              </button>
              <span className="text-[11px] text-slate-400 w-4 text-right tabular-nums">{i + 1}</span>
              <span className={`flex-1 min-w-0 text-[12px] truncate ${on ? 'font-semibold' : 'text-slate-700'}`} style={on ? { color: accent } : undefined}>{t.title}</span>
              {!on && (
                <button onClick={() => deck.remove(t.videoId)} aria-label="Remove from deck" title="Remove from deck"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                  <X size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <AddSongForm onAdd={deck.add} accent={accent} />
    </div>
  );
}

