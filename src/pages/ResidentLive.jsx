import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Users, X, Save, SkipForward, Music, Volume2, VolumeX, Volume1,
  Loader2, Headphones, Radio, Megaphone, Hand, MessageSquare, Headphones as HeadphonesIcon,
  Church, Heart,
  Clock3, TrendingUp, Smile, ListMusic, Disc3, Search, CheckCircle2, ThumbsUp, ArrowLeft, Play, Pause, Laptop,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth }   from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { djAPI, loungeAPI } from '../api';
import { useLiveAudio } from '../hooks/useLiveAudio';
import { Fader }      from '../components/MixerDeck';
import AudiencePanel  from '../components/AudiencePanel';
import Portal from '../components/ui/Portal';
import useIsDesktop from '../hooks/useIsDesktop';
import useFillHeight from '../hooks/useFillHeight';
import { useRoomEngagement, ReactionLayer, ChatPanel, Soundboard, useMicLevel, NotesPanel } from '../components/studio/StudioPanels';
import AddTracks from '../components/live/AddTracks';

const INDIGO = '#6366F1';
const INDIGO_DARK = '#4F46E5';

const MODES = [
  { key: 'dj',      Icon: Radio,          label: 'DJ set',      desc: 'Spin tracks + talk over them.',    color: INDIGO },
  { key: 'prayer',  Icon: Heart,          label: 'Prayer room', desc: 'Lead a prayer or devotional.',     color: '#EC4899' },
  { key: 'chat',    Icon: MessageSquare,  label: 'Chat room',   desc: 'Just talk — hangout with neighbours.', color: '#0EA5E9' },
  { key: 'podcast', Icon: HeadphonesIcon, label: 'Podcast',     desc: 'Record a show — saved to the archive.', color: '#F59E0B' },
];

const fmtDur = (ms) => {
  const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

function createVoiceRecorder() {
  let recorder = null;
  const chunks = [];
  return {
    start(stream) {
      try {
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
        recorder = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 96000 });
        recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
        recorder.start(1000);
      } catch (e) { console.warn('recorder unsupported', e); }
    },
    async stop() {
      if (!recorder) return null;
      await new Promise(r => { recorder.onstop = r; recorder.stop(); });
      return new Blob(chunks, { type: 'audio/webm' });
    },
  };
}

export default function ResidentLive() {
  const { user } = useAuth();
  const { emit } = useSocket() || {};
  const navigate = useNavigate();

  const [mode, setMode]         = useState('dj');
  const [title, setTitle]       = useState('');
  const [session, setSession]   = useState(null);
  const [starting, setStarting] = useState(false);
  const [library, setLibrary]   = useState([]);
  const [current, setCurrent]   = useState(null);
  const [setlist, setSetlist]   = useState([]);
  const [elapsed, setElapsed]   = useState(0);
  const [showSave, setShowSave] = useState(false);
  const [mixTitle, setMixTitle] = useState('');
  const [saving, setSaving]     = useState(false);
  const [peak, setPeak]         = useState(0);
  const [musicVol, setMusicVol] = useState(45);  // voice must sit on top

  const recorderRef = useRef(createVoiceRecorder());
  const sessionStartRef = useRef(0);
  const voiceBlobRef = useRef(null);
  const voiceDurRef  = useRef(0);
  const iframeRef    = useRef(null);
  const isDesktop    = useIsDesktop();
  const shellRef     = useRef(null);
  const localAudioRef = useRef(null);                 // { audio, gain } for the file playing now
  const [crateQ, setCrateQ]           = useState('');
  const [rawStream, setRawStream]     = useState(null);
  const [localTracks, setLocalTracks] = useState([]); // { id, title, url } — this session only
  const [localPos, setLocalPos]       = useState({ t: 0, d: 0, playing: false });

  const live = useLiveAudio({
    roomType: 'dj',
    roomId:   session?._id || null,
    role:     'host',
    enabled:  !!session,
  });
  const engagement  = useRoomEngagement(session?._id);
  const level       = useMicLevel(rawStream, !!session && live.micOn);
  const shellHeight = useFillHeight(shellRef, !!session && isDesktop, { min: 560 });

  // M toggles the mic while live (not while typing)
  useEffect(() => {
    if (!session) return;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); live.toggleMic(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, live]);

  // Stop any local file and free its memory when leaving the page
  const localTracksRef = useRef([]);
  localTracksRef.current = localTracks;
  useEffect(() => () => {
    try { localAudioRef.current?.audio.pause(); } catch { /* noop */ }
    localTracksRef.current.forEach((t) => URL.revokeObjectURL(t.url));
  }, []);

  const needsMusic = mode === 'dj' || mode === 'podcast';

  useEffect(() => {
    if (needsMusic) {
      loungeAPI.getSession().then(({ data }) => setLibrary(data.data?.suggestions || [])).catch(() => {});
    }
  }, [needsMusic]);

  useEffect(() => { if (live.listenerCount > peak) setPeak(live.listenerCount); }, [live.listenerCount, peak]);

  useEffect(() => {
    if (!session) return;
    const id = setInterval(() => setElapsed(Date.now() - sessionStartRef.current), 1000);
    return () => clearInterval(id);
  }, [session]);

  const sortedLibrary = useMemo(() =>
    [...library].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0)), [library]);

  const applyVolume = (v) => {
    setMusicVol(v);
    if (localAudioRef.current) localAudioRef.current.gain.gain.value = v / 100;
    try { iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }), '*'); } catch {}
    if (session && emit) emit('dj:volume', { sessionId: session._id, volume: v });
  };

  const goLive = async () => {
    try {
      setStarting(true);
      const stream = await live.getLocalStream();
      recorderRef.current.start(stream);
      setRawStream(live.getRawStream?.() || stream);

      const defaultTitle = title.trim() || {
        dj: `${user?.name}'s Live Set`,
        prayer: `${user?.name}'s Prayer Room`,
        chat: `${user?.name}'s Chat Room`,
        podcast: `${user?.name}'s Podcast`,
      }[mode];

      let np = {};
      let first = null;
      if (needsMusic) {
        first = sortedLibrary[0];
        if (first) np = { videoId: first.videoId, title: first.title, artist: first.artist };
      }

      const { data } = await djAPI.start({ kind: mode, title: defaultTitle, nowPlaying: np });
      sessionStartRef.current = Date.now();
      setSession(data.data);
      if (first) {
        setCurrent({ videoId: first.videoId, title: first.title, artist: first.artist, startedAt: Date.now() });
        setSetlist([{ videoId: first.videoId, title: first.title, artist: first.artist, startSec: 0, endSec: 0 }]);
      }
      toast.success(`You are LIVE 🎙️`);
    } catch (e) {
      console.error('[goLive]', e);
      const serverMsg = e.response?.data?.message;
      // Mic errors (DOMException from getUserMedia)
      const micErrors = {
        NotAllowedError:       'Mic blocked. Allow microphone access in your browser.',
        NotFoundError:         'No microphone found on this device.',
        NotReadableError:      'Your microphone is in use by another app.',
        OverconstrainedError:  'Mic settings not supported on this device.',
        SecurityError:         'Mic needs a secure (HTTPS) connection to work.',
      };
      if (micErrors[e?.name]) {
        toast.error(micErrors[e.name]);
      } else if (serverMsg?.toLowerCase().includes('already')) {
        toast.error(serverMsg);
      } else if (serverMsg) {
        toast.error(serverMsg);
      } else if (e?.response?.status === 404) {
        toast.error('Live rooms not available yet — server may still be deploying.');
      } else if (e?.response?.status === 403) {
        toast.error('Not allowed to start this kind of room.');
      } else if (!e?.response && e?.message) {
        toast.error(`Network: ${e.message}`);
      } else {
        toast.error('Could not start session — check console for details.');
      }
    } finally {
      setStarting(false);
    }
  };

  const playTrack = async (t) => {
    if (!session) return;
    stopLocal();
    const now = Date.now();
    setSetlist(prev => {
      const sec = Math.floor((now - sessionStartRef.current) / 1000);
      if (prev.length === 0) return [{ videoId: t.videoId, title: t.title, artist: t.artist, startSec: sec, endSec: 0 }];
      const copy = [...prev];
      copy[copy.length - 1] = { ...copy[copy.length - 1], endSec: sec };
      copy.push({ videoId: t.videoId, title: t.title, artist: t.artist, startSec: sec, endSec: 0 });
      return copy;
    });
    setCurrent({ videoId: t.videoId, title: t.title, artist: t.artist, startedAt: now });
    try { await djAPI.updateTrack(session._id, { videoId: t.videoId, title: t.title, artist: t.artist }); } catch {}
  };

  // ── Your own tracks ──────────────────────────────────────────────────────
  // YouTube links join the estate's Lounge library. Audio files stay on this
  // computer and are mixed straight into the broadcast (listeners hear them
  // through the live stream, and they're part of the saved recording).
  const addYouTubeTrack = async (videoId, trackTitle) => {
    try {
      const { data } = await loungeAPI.suggest(videoId, trackTitle);
      if (data.data?.suggestions) setLibrary(data.data.suggestions);
      else loungeAPI.getSession().then(({ data: d }) => setLibrary(d.data?.suggestions || [])).catch(() => {});
      toast.success('Added to the Lounge library');
      return true;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not add that track');
      return false;
    }
  };

  const addLocalFiles = (fileList) => {
    const files = [...(fileList || [])].filter((f) => f.type.startsWith('audio/'));
    if (!files.length) { toast.error('Pick an audio file (MP3, WAV, M4A…)'); return; }
    setLocalTracks((prev) => [...prev, ...files.map((f, i) => ({
      id: `local-${Date.now()}-${i}`, title: f.name.replace(/\.[^.]+$/, ''), url: URL.createObjectURL(f),
    }))]);
    toast.success(`${files.length} track${files.length > 1 ? 's' : ''} added from your computer`);
  };

  const stopLocal = () => {
    const cur = localAudioRef.current;
    if (!cur) return;
    try { cur.audio.pause(); cur.gain.disconnect(); } catch { /* already gone */ }
    localAudioRef.current = null;
    setLocalPos({ t: 0, d: 0, playing: false });
  };

  const removeLocal = (t) => {
    if (current?.local && current.id === t.id) stopLocal();
    URL.revokeObjectURL(t.url);
    setLocalTracks((prev) => prev.filter((x) => x.id !== t.id));
  };

  const playLocal = async (t) => {
    if (!session) return;
    const bus = live.getMixBus?.();
    if (!bus) { toast.error('The live mixer is not ready yet'); return; }
    stopLocal();
    const { ctx, dest } = bus;
    if (ctx.state === 'suspended') await ctx.resume();
    const audio = new Audio(t.url);
    const gain = ctx.createGain();
    gain.gain.value = musicVol / 100;
    ctx.createMediaElementSource(audio).connect(gain);
    gain.connect(dest);                 // listeners + recording
    gain.connect(ctx.destination);      // the host hears it too
    audio.ontimeupdate = () => setLocalPos({ t: audio.currentTime, d: audio.duration || 0, playing: !audio.paused });
    audio.onpause = () => setLocalPos((p) => ({ ...p, playing: false }));
    audio.onplay = () => setLocalPos((p) => ({ ...p, playing: true }));
    localAudioRef.current = { audio, gain };
    try { await audio.play(); } catch { toast.error('Could not play that file'); return; }

    const now = Date.now();
    const sec = Math.floor((now - sessionStartRef.current) / 1000);
    setSetlist((prev) => {
      const copy = [...prev];
      if (copy.length) copy[copy.length - 1] = { ...copy[copy.length - 1], endSec: sec };
      copy.push({ videoId: '', title: t.title, artist: 'Own track', startSec: sec, endSec: 0 });
      return copy;
    });
    setCurrent({ local: true, id: t.id, title: t.title, artist: 'Own track', startedAt: now });
    // Listeners' YouTube player stops; they hear this track through the stream
    try { await djAPI.updateTrack(session._id, { videoId: '', title: t.title, artist: 'Own track' }); } catch { /* optimistic */ }
  };

  const toggleLocal = () => {
    const a = localAudioRef.current?.audio;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };
  const seekLocal = (frac) => {
    const a = localAudioRef.current?.audio;
    if (a && a.duration) a.currentTime = Math.max(0, Math.min(1, frac)) * a.duration;
  };

  const endSession = async () => {
    if (!session) return;
    stopLocal();
    const totalSec = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    setSetlist(prev => {
      if (prev.length === 0) return prev;
      const copy = [...prev]; copy[copy.length - 1] = { ...copy[copy.length - 1], endSec: totalSec };
      return copy;
    });
    const blob = await recorderRef.current.stop();
    voiceBlobRef.current = blob; voiceDurRef.current = totalSec;
    try { await djAPI.end(session._id); } catch {}
    if (needsMusic || mode === 'podcast') {
      setMixTitle(`${user?.name} — ${new Date().toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} ${MODES.find(m => m.key === mode)?.label || 'Live'}`);
      setShowSave(true);
    } else {
      toast.success('Live ended');
      navigate('/lounge');
    }
  };

  const uploadVoice = async (blob) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset    = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !preset || !blob) return '';
    const form = new FormData();
    form.append('file', blob); form.append('upload_preset', preset); form.append('resource_type', 'video');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    return (await res.json()).secure_url;
  };

  const saveMixtape = async () => {
    if (!mixTitle.trim()) { toast.error('Give it a title'); return; }
    setSaving(true);
    try {
      let voiceAudioUrl = '';
      if (voiceBlobRef.current) {
        try { voiceAudioUrl = await uploadVoice(voiceBlobRef.current); } catch { toast('Saved without voice', { icon: '⚠️' }); }
      }
      await djAPI.saveMixtape({
        sessionId: session._id, title: mixTitle.trim(), voiceAudioUrl,
        voiceDurationSec: voiceDurRef.current, setlist, totalDurationSec: voiceDurRef.current,
        peakListeners: peak,
      });
      toast.success('Saved to the Lounge archive 🎵');
      navigate('/lounge');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  // ── Desktop setup ──────────────────────────────────────────────────────────
  if (!session && isDesktop) {
    const picked = MODES.find((m) => m.key === mode) || MODES[0];
    const top = sortedLibrary.slice(0, 8);
    return (
      <div className="max-w-[1200px] mx-auto pb-10">
        <button onClick={() => navigate('/lounge')} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 mb-4 transition-colors">
          <ArrowLeft size={14} /> Lounge
        </button>
        <div className="grid grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            <div className="dash-rise relative overflow-hidden rounded-2xl p-7 text-white"
              style={{ background: `linear-gradient(130deg, #1E1B4B 0%, #312E81 45%, ${picked.color} 140%)`, boxShadow: '0 18px 36px -20px rgba(49,46,129,0.9)' }}>
              <div className="dash-blob absolute -top-20 right-10 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: `${picked.color}55` }} />
              <picked.Icon size={170} className="absolute -right-8 -bottom-10 text-white/[0.06] pointer-events-none" />
              <div className="relative max-w-lg">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/15 border border-white/20"><picked.Icon size={11} /> {picked.label}</span>
                <h1 className="mt-3 text-[24px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Go live, {user?.name?.split(' ')[0] || 'there'}</h1>
                <p className="mt-1 text-[13px] text-white/75">{picked.desc} Your neighbours get a notification the moment you start.</p>
                <label className="block mt-5 text-[11px] font-semibold uppercase tracking-wider text-white/70">Room name</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
                  placeholder={`Give your ${picked.label.toLowerCase()} a name…`}
                  className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl bg-white/15 border border-white/25 text-[14px] text-white placeholder-white/50 outline-none focus:bg-white/20 focus:border-white/50 transition-colors" />
                <button onClick={goLive} disabled={starting}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-white font-semibold text-[14px] transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-wait"
                  style={{ color: '#312E81', boxShadow: '0 10px 22px -10px rgba(0,0,0,0.4)' }}>
                  {starting ? <><Loader2 size={16} className="animate-spin" /> Starting…</> : <><Mic size={16} /> Go live now</>}
                </button>
                <p className="mt-2.5 text-[11px] text-white/60 text-center">Needs microphone access. Only one live room per estate; if someone is already live you'll be asked to join theirs.</p>
              </div>
            </div>

            <div className="dash-rise" style={{ animationDelay: '80ms' }}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Room style</div>
              <div className="grid grid-cols-4 gap-3">
                {MODES.map(({ key, Icon, label, desc, color }) => {
                  const on = mode === key;
                  return (
                    <button key={key} onClick={() => setMode(key)}
                      className="text-left p-3.5 rounded-2xl border bg-white transition-all hover:-translate-y-0.5"
                      style={on ? { borderColor: color, background: `${color}0E`, boxShadow: `0 0 0 3px ${color}1F` } : { borderColor: '#E2E8F0' }}>
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={on ? { background: color } : { background: `${color}18` }}>
                        <Icon size={15} style={{ color: on ? '#fff' : color }} />
                      </span>
                      <span className="block mt-2 text-[13px] font-semibold" style={{ color: on ? color : '#0F172A' }}>{label}</span>
                      <span className="block mt-0.5 text-[12px] text-slate-500 leading-snug">{desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {needsMusic ? (
              <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '60ms' }}>
                <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100">
                  <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-500"><ListMusic size={12} className="text-white" /></span>
                    Your crate
                  </h3>
                  <span className="text-[12px] text-slate-400">{sortedLibrary.length} tracks</span>
                </div>
                {top.length === 0 ? (
                  <p className="px-4 py-5 text-[12px] text-slate-400">The Lounge library is empty. Add a song below.</p>
                ) : (
                  <div className="py-1.5">
                    {top.map((t, i) => (
                      <div key={t._id || t.videoId} className="flex items-center gap-2.5 px-4 py-1.5">
                        <span className="text-[11px] text-slate-400 w-4 tabular-nums">{i + 1}</span>
                        <img src={`https://i.ytimg.com/vi/${t.videoId}/default.jpg`} alt="" className="w-11 h-8 rounded-md object-cover flex-shrink-0" loading="lazy" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[12px] font-medium text-slate-800 truncate">{t.title}</span>
                          <span className="block text-[11px] text-slate-400 truncate">{t.artist || 'Resident'}</span>
                        </span>
                        <span className="text-[11px] text-slate-400 tabular-nums flex items-center gap-0.5"><ThumbsUp size={11} /> {t.votes?.length || 0}</span>
                      </div>
                    ))}
                    {sortedLibrary.length > top.length && <p className="px-4 pt-1 pb-2 text-[11px] text-slate-400">+{sortedLibrary.length - top.length} more once you're live</p>}
                  </div>
                )}
                {localTracks.length > 0 && (
                  <div className="py-1.5 border-t border-slate-100">
                    <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Laptop size={11} /> From your computer</div>
                    {localTracks.map((t) => (
                      <div key={t.id} className="group flex items-center gap-2.5 px-4 py-1.5">
                        <span className="w-11 h-8 rounded-md bg-slate-900 flex items-center justify-center flex-shrink-0"><Music size={13} className="text-indigo-300" /></span>
                        <span className="flex-1 min-w-0 text-[12px] font-medium text-slate-800 truncate">{t.title}</span>
                        <button onClick={() => removeLocal(t)} aria-label="Remove" className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-300 hover:text-red-500"><X size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <AddTracks onAddYouTube={addYouTubeTrack} onAddFiles={addLocalFiles} />
              </div>
            ) : (
              <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4" style={{ animationDelay: '60ms' }}>
                <div className="text-[13px] font-semibold text-slate-900">Voice-only room</div>
                <p className="mt-1 text-[12px] text-slate-500">{picked.label}s have no music deck. You'll get the mic, sound effects, notes and the live chat.</p>
              </div>
            )}
            <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4 text-[12px] text-slate-500 space-y-2" style={{ animationDelay: '120ms' }}>
              <div className="text-[13px] font-semibold text-slate-900">Before you start</div>
              <p>🎧 Use headphones so the music doesn't echo into your mic.</p>
              <p>💬 Chat, pin messages and fire sound effects while you host.</p>
              {needsMusic && <p>💾 When you end, save the session to the archive.</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Pre-live mode picker ──────────────────────────────────────────────────
  if (!session) {
    const picked = MODES.find(m => m.key === mode);
    return (
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '24px 16px 40px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 12, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>← Back</button>

        <div style={{ background: `linear-gradient(135deg, ${picked.color}, ${picked.color}dd)`, borderRadius: 22, padding: '26px 22px', color: '#fff', boxShadow: `0 20px 44px -18px ${picked.color}88` }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 14 }}>
            <picked.Icon size={13}/> {picked.label.toUpperCase()}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>Go live, {user?.name?.split(' ')[0] || 'there'}.</h1>
          <p style={{ fontSize: 14, lineHeight: 1.55, marginTop: 8, opacity: 0.9 }}>{picked.desc} Residents will get a notification when you start.</p>

          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder={`Give your ${picked.label.toLowerCase()} a name…`}
            style={{ width: '100%', marginTop: 16, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, outline: 'none' }} />

          <button onClick={goLive} disabled={starting}
            style={{ marginTop: 16, width: '100%', padding: '13px 20px', borderRadius: 14, border: 'none',
              background: '#fff', color: picked.color, fontWeight: 800, fontSize: 15,
              cursor: starting ? 'wait' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            {starting ? <><Loader2 size={16} className="animate-spin"/> Starting…</> : <><Mic size={16}/> Go live now</>}
          </button>
          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 10, textAlign: 'center' }}>
            Mic access required. Only one live room per estate — if someone else is live, you'll be asked to join theirs.
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Pick a room style</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
            {MODES.map(({ key, Icon, label, desc, color }) => (
              <button key={key} onClick={() => setMode(key)}
                style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                  border: mode === key ? `1.5px solid ${color}` : '1px solid #E2E8F0',
                  background: mode === key ? `${color}0E` : '#fff' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Icon size={16}/>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: mode === key ? color : '#0F172A' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 1.35 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Live state ─────────────────────────────────────────────────────────────
  const upcoming = sortedLibrary.filter(t => t.videoId !== current?.videoId).slice(0, 20);
  const modeMeta = MODES.find(m => m.key === session.kind) || MODES[0];

  const saveModal = showSave && (
        <Portal>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 22, width: '100%', maxWidth: 440 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>Save to the archive?</div>
            <input value={mixTitle} onChange={e => setMixTitle(e.target.value)}
              className="input-field" style={{ marginBottom: 12 }} placeholder="Title" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowSave(false); navigate('/lounge'); }} disabled={saving}
                style={{ flex: '0 0 auto', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer' }}>Skip</button>
              <button onClick={saveMixtape} disabled={saving || !mixTitle.trim()}
                style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
                  background: mixTitle.trim() ? `linear-gradient(135deg, ${modeMeta.color}, ${modeMeta.color}dd)` : '#E2E8F0',
                  color: mixTitle.trim() ? '#fff' : '#94A3B8', fontWeight: 700, fontSize: 13,
                  cursor: saving || !mixTitle.trim() ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : <><Save size={13}/> Save</>}
              </button>
            </div>
          </div>
        </div>
        </Portal>
  );

  // ── Desktop live studio ────────────────────────────────────────────────────
  if (isDesktop) {
    const accent = modeMeta.color;
    const played = new Set(setlist.map((x) => x.videoId).filter(Boolean));
    const term = crateQ.trim().toLowerCase();
    const crate = sortedLibrary.filter((t) => !term || `${t.title} ${t.artist || ''}`.toLowerCase().includes(term));
    const nextUp = sortedLibrary.find((t) => t.videoId !== current?.videoId && !played.has(t.videoId)) || sortedLibrary.find((t) => t.videoId !== current?.videoId);
    const VolIcon = musicVol === 0 ? VolumeX : musicVol < 40 ? Volume1 : Volume2;

    const micChannel = (
      <div className="p-5 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5"><Mic size={12} /> Mic</span>
          <span className="text-[11px] font-medium" style={{ color: live.micOn ? '#A5B4FC' : '#FCA5A5' }}>{live.micOn ? 'Live' : 'Muted'}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center py-4">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {live.micOn && (
              <>
                <span className="absolute inset-0 rounded-full transition-transform duration-100" style={{ background: `${accent}24`, transform: `scale(${1 + level * 0.5})` }} />
                <span className="absolute inset-5 rounded-full transition-transform duration-100" style={{ background: `${accent}38`, transform: `scale(${1 + level * 0.3})` }} />
              </>
            )}
            <button onClick={live.toggleMic} aria-label={live.micOn ? 'Mute mic' : 'Unmute mic'}
              className="relative w-24 h-24 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={live.micOn ? { background: `linear-gradient(135deg, ${accent}, ${accent}CC)`, boxShadow: `0 16px 40px -12px ${accent}` } : { background: '#334155' }}>
              {live.micOn ? <Mic size={34} /> : <MicOff size={34} />}
            </button>
          </div>
          <div className="mt-2 text-[12px] text-white/60">{live.micOn ? (needsMusic ? 'Talk over the music' : 'You are speaking') : 'You are muted'} · press <kbd className="px-1 rounded bg-white/10 text-white/80">M</kbd></div>
          {!needsMusic && session.message && <p className="mt-2 text-[13px] text-white/70 max-w-md text-center">{session.message}</p>}
        </div>
        <div className="p-3 rounded-xl bg-black/25 border border-white/10">
          <Fader label="Mic" value={Math.round((live.micGain || 1) * 100)} max={200} unit="%"
            onChange={(v) => live.setMicGain((v || 0) / 100)} color={accent} icon={<Mic size={13} />}
            quickActions={[{ label: 'Low', value: 80 }, { label: 'Hot', value: 150 }]} />
        </div>
      </div>
    );

    return (
      <div ref={shellRef} className="max-w-[1500px] mx-auto flex flex-col gap-4" style={shellHeight ? { height: shellHeight } : undefined}>
        {/* On-air bar */}
        <div className="dash-rise flex-none flex items-center justify-between gap-4 px-5 py-3 rounded-2xl bg-slate-900 text-white">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 flex-shrink-0">
              <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-red-400 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-red-500" /></span>
              <span className="text-[11px] font-bold tracking-wider text-red-300">ON AIR</span>
            </span>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold truncate">{session.title}</div>
              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                <modeMeta.Icon size={11} /> {modeMeta.label}{needsMusic ? ` · ${current ? current.title : 'No track playing'}` : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {[
              [Clock3, fmtDur(elapsed), 'On air', '#CBD5E1'],
              [Users, live.listenerCount, 'Listening', '#7DD3FC'],
              [TrendingUp, peak, 'Peak', '#A5B4FC'],
              [Heart, engagement.likes, 'Likes', '#FDA4AF'],
              [Smile, engagement.reactionCount, 'Reactions', '#FDE68A'],
              ...(needsMusic ? [[ListMusic, setlist.length, 'Tracks played', '#C4B5FD']] : []),
            ].map(([Icon, v, label, color]) => (
              <div key={label} title={label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[12px] tabular-nums">
                <Icon size={13} style={{ color }} /> <span className="font-semibold">{v}</span>
              </div>
            ))}
            <button onClick={endSession}
              className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold text-[12px] transition-colors">
              <X size={13} /> End room
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
          <div className="h-full min-h-0 overflow-y-auto no-scrollbar space-y-4 min-w-0">
            {/* Console */}
            <div className="relative overflow-hidden rounded-2xl text-white" style={{ background: 'linear-gradient(150deg, #0F172A 0%, #1E1B4B 55%, #312E81 150%)' }}>
              <div className="dash-blob absolute -top-24 left-1/3 w-72 h-72 rounded-full blur-3xl pointer-events-none" style={{ background: `${accent}40` }} />
              <ReactionLayer reactions={engagement.reactions} />
              {needsMusic ? (
                <div className="relative grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] divide-x divide-white/10">
                  {/* Deck */}
                  <div className="p-5 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5"><Disc3 size={12} className={current ? 'animate-spin' : ''} style={{ animationDuration: '3s' }} /> Deck</span>
                      <span className="text-[11px] font-medium" style={{ color: current ? '#A5B4FC' : 'rgba(255,255,255,0.4)' }}>{current ? 'Playing to everyone' : 'Idle'}</span>
                    </div>
                    <div className="relative mt-3 w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10">
                      {current?.local ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(99,102,241,0.4), transparent 65%)' }}>
                          <div className="relative w-28 h-28 rounded-full flex items-center justify-center shadow-2xl"
                            style={{ background: 'repeating-radial-gradient(circle, #111827 0 3px, #1F2937 3px 5px)', animation: localPos.playing ? 'spin 3s linear infinite' : 'none' }}>
                            <span className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center"><Laptop size={15} className="text-white" /></span>
                          </div>
                          <div className="w-full max-w-sm">
                            <button onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seekLocal((e.clientX - r.left) / r.width); }}
                              className="block w-full h-1.5 rounded-full bg-white/15 overflow-hidden" aria-label="Seek">
                              <span className="block h-full bg-indigo-400" style={{ width: `${localPos.d ? (localPos.t / localPos.d) * 100 : 0}%` }} />
                            </button>
                            <div className="mt-1 flex justify-between text-[10px] text-white/50 tabular-nums">
                              <span>{fmtDur(localPos.t * 1000)}</span><span>{fmtDur(localPos.d * 1000)}</span>
                            </div>
                          </div>
                          <button onClick={toggleLocal} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-[12px] font-semibold">
                            {localPos.playing ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Play</>}
                          </button>
                        </div>
                      ) : current ? (
                        <iframe ref={iframeRef} key={current.videoId} title="Now playing"
                          src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                          allow="autoplay; encrypted-media" allowFullScreen
                          onLoad={() => setTimeout(() => applyVolume(musicVol), 400)}
                          className="absolute inset-0 w-full h-full border-0" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/45 text-[13px]">
                          <Disc3 size={30} /> Pick a track from your crate
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold truncate">{current?.title || 'Nothing playing'}</div>
                        <div className="text-[12px] text-white/55 truncate">{nextUp ? `Up next: ${nextUp.title}` : 'Add songs to your crate below'}</div>
                      </div>
                      {current?.local && <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-white/10 text-indigo-200 flex-shrink-0 inline-flex items-center gap-1"><Laptop size={11} /> From this computer</span>}
                      <button onClick={() => nextUp && playTrack(nextUp)} disabled={!nextUp}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-40 flex-shrink-0 transition-colors">
                        <SkipForward size={13} /> Next
                      </button>
                    </div>
                    <div className="mt-3 p-3 rounded-xl bg-black/25 border border-white/10">
                      <Fader label="Music · everyone" value={musicVol} max={100} unit="%" disabled={!current} onChange={applyVolume}
                        color={accent} icon={<VolIcon size={13} />}
                        quickActions={[{ label: 'Duck', value: 15 }, { label: 'Bed', value: 35 }, { label: 'Up', value: 70 }, { label: 'Mute', value: 0 }]} />
                    </div>
                  </div>
                  {micChannel}
                </div>
              ) : (
                <div className="relative max-w-xl mx-auto">{micChannel}</div>
              )}
            </div>

            {/* Crate + soundboard (music rooms) or soundboard + notes (voice rooms) */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-4 items-start">
              {needsMusic ? (
                <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100">
                    <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-500"><ListMusic size={12} className="text-white" /></span>
                      Your crate
                    </h3>
                    <span className="text-[12px] text-slate-400">{sortedLibrary.length} tracks · top voted first</span>
                  </div>
                  <div className="px-3 pt-3">
                    <div className="relative">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={crateQ} onChange={(e) => setCrateQ(e.target.value)} placeholder="Search tracks"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white focus:border-slate-300" />
                    </div>
                  </div>
                  <div className="max-h-[340px] overflow-y-auto py-1.5">
                    {localTracks.length > 0 && (
                      <div className="pb-1.5 mb-1.5 border-b border-slate-100">
                        <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Laptop size={11} /> From your computer · this session</div>
                        {localTracks.map((t) => {
                          const on = current?.local && current.id === t.id;
                          return (
                            <div key={t.id} className="group flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 transition-colors" style={on ? { background: 'rgba(99,102,241,0.08)' } : undefined}>
                              <button onClick={() => (on ? toggleLocal() : playLocal(t))} aria-label={on ? 'Play or pause' : `Play ${t.title}`}
                                className={`w-12 h-8 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${on ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white/80 group-hover:bg-indigo-600'}`}>
                                {on && localPos.playing
                                  ? <span className="dash-eq flex items-end gap-[2px] h-3">{[0, 1, 2].map((k) => <span key={k} className="w-[2px] h-full bg-white rounded-full" style={{ animationDelay: `${k * 200}ms` }} />)}</span>
                                  : <Play size={12} fill="currentColor" />}
                              </button>
                              <span className="flex-1 min-w-0">
                                <span className={`block text-[12px] truncate ${on ? 'font-semibold text-indigo-700' : 'font-medium text-slate-800'}`}>{t.title}</span>
                                <span className="block text-[11px] text-slate-400">Audio file</span>
                              </span>
                              <button onClick={() => removeLocal(t)} aria-label="Remove" className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"><X size={13} /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {crate.length === 0 && <p className="px-4 py-6 text-[12px] text-slate-400 text-center">{term ? 'No tracks match.' : 'The library is empty. Add a song below.'}</p>}
                    {crate.map((t) => {
                      const on = !current?.local && current?.videoId === t.videoId;
                      const done = !on && played.has(t.videoId);
                      return (
                        <button key={t._id || t.videoId} onClick={() => playTrack(t)}
                          className="group w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-slate-50 transition-colors" style={on ? { background: 'rgba(99,102,241,0.08)' } : undefined}>
                          <span className="relative w-12 h-8 rounded-md overflow-hidden flex-shrink-0 bg-slate-100">
                            <img src={`https://i.ytimg.com/vi/${t.videoId}/default.jpg`} alt="" className="w-full h-full object-cover" loading="lazy" />
                            <span className={`absolute inset-0 flex items-center justify-center text-white transition-opacity ${on ? 'opacity-100 bg-indigo-600/80' : 'opacity-0 group-hover:opacity-100 bg-black/45'}`}>
                              {on ? <span className="dash-eq flex items-end gap-[2px] h-3">{[0, 1, 2].map((k) => <span key={k} className="w-[2px] h-full bg-white rounded-full" style={{ animationDelay: `${k * 200}ms` }} />)}</span> : <Play size={12} fill="currentColor" />}
                            </span>
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className={`block text-[12px] truncate ${on ? 'font-semibold text-indigo-700' : done ? 'text-slate-400' : 'font-medium text-slate-800'}`}>{t.title}</span>
                            <span className="block text-[11px] text-slate-400 truncate">{t.artist || 'Resident'}</span>
                          </span>
                          {done && <CheckCircle2 size={13} className="text-slate-300 flex-shrink-0" />}
                          <span className="text-[11px] text-slate-400 tabular-nums flex-shrink-0 flex items-center gap-0.5"><ThumbsUp size={11} /> {t.votes?.length || 0}</span>
                        </button>
                      );
                    })}
                  </div>
                  <AddTracks onAddYouTube={addYouTubeTrack} onAddFiles={addLocalFiles} />
                </div>
              ) : (
                <NotesPanel accent={accent} />
              )}
              <Soundboard getMixBus={live.getMixBus} accent={accent} enabled={!!session} />
            </div>
          </div>

          {/* Live chat */}
          <div className="h-full min-h-0">
            <ChatPanel engagement={engagement} accent={accent} />
          </div>
        </div>
        {saveModal}
      </div>
    );
  }

  // Simple view for non-music rooms (prayer, chat)
  if (!needsMusic) {
    return (
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '24px 16px 40px' }}>
        <div style={{ background: `linear-gradient(135deg, ${modeMeta.color}, ${modeMeta.color}dd)`, borderRadius: 22, padding: 26, color: '#fff', boxShadow: `0 20px 44px -18px ${modeMeta.color}88` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#fff', animation: 'ping 1.6s infinite' }} />
                <span style={{ position: 'relative', borderRadius: '50%', width: 10, height: 10, background: '#fff' }} />
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em' }}>LIVE · {modeMeta.label.toUpperCase()}</span>
              <span style={{ fontSize: 12, opacity: 0.85, marginLeft: 4 }}>{fmtDur(elapsed)}</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              <Users size={13}/> {live.listenerCount}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={live.toggleMic}
              style={{ width: 80, height: 80, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: live.micOn ? '#fff' : 'rgba(255,255,255,0.14)',
                color: live.micOn ? modeMeta.color : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: live.micOn ? '0 10px 24px rgba(0,0,0,0.2)' : 'none', flexShrink: 0 }}>
              {live.micOn ? <Mic size={30}/> : <MicOff size={30}/>}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>
                {live.micOn ? 'Speaking' : 'Muted'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.2, marginTop: 3 }}>{session.title}</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>{user?.name} · Peak {peak}</div>
            </div>
          </div>

          {/* Mic fader (no music in prayer/chat) */}
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Fader label="Mic" value={Math.round((live.micGain || 1) * 100)} max={200} unit="%"
              onChange={(v) => live.setMicGain((v || 0) / 100)}
              color="#10B981"
              icon={<Mic size={13}/>}
              quickActions={[{ label: 'Low', value: 80 }, { label: 'Hot', value: 150 }]}
            />
          </div>

          <button onClick={endSession}
            style={{ marginTop: 16, width: '100%', padding: '11px 0', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <X size={14}/> End room
          </button>
        </div>

        {/* Audience panel */}
        <div style={{ marginTop: 14, background: 'linear-gradient(180deg, #0F172A, #1E1B4B)', borderRadius: 18, padding: 14, border: '1px solid #334155' }}>
          <AudiencePanel roomType="dj" roomId={session._id} accent={modeMeta.color} />
        </div>

        <style>{`@keyframes ping { 75%,100% { transform: scale(2.4); opacity: 0; } }`}</style>
      </div>
    );
  }

  // DJ / podcast view (with music + volume control)
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 16px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '14px 18px', borderRadius: 16, marginBottom: 14,
        background: 'linear-gradient(135deg, #0F172A, #1E293B)', color: '#fff', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#EF4444', animation: 'ping 1.6s infinite' }} />
            <span style={{ position: 'relative', borderRadius: '50%', width: 10, height: 10, background: '#EF4444' }} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#FCA5A5' }}>ON AIR · {modeMeta.label.toUpperCase()}</span>
          <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 6 }}>{fmtDur(elapsed)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} color="#94A3B8" />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{live.listenerCount}</span>
          </div>
          <button onClick={endSession}
            style={{ padding: '7px 14px', borderRadius: 10, background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <X size={13} /> End
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 14 }} className="live-grid">
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
            {current && !current.local ? (
              <iframe ref={iframeRef} key={current.videoId}
                src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
                allow="autoplay; encrypted-media" allowFullScreen
                onLoad={() => setTimeout(() => applyVolume(musicVol), 400)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>Pick a track to start</div>
            )}
          </div>
          <div style={{ padding: '14px 18px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={live.toggleMic}
              style={{ width: 56, height: 56, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: live.micOn ? `linear-gradient(135deg, ${modeMeta.color}, ${modeMeta.color}dd)` : '#334155',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {live.micOn ? <Mic size={22}/> : <MicOff size={22}/>}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {live.micOn ? 'Mic open' : 'Mic muted'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current?.title || 'No track selected'}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{current?.artist || 'Spin something from the queue →'}</div>
            </div>
          </div>
          <div style={{ padding: '12px 18px', borderTop: '1px solid #F1F5F9', background: '#0F172A', display: 'flex', gap: 10 }}>
            <Fader label="Music" value={musicVol} max={100} unit="%"
              disabled={!current}
              onChange={applyVolume}
              color={modeMeta.color}
              icon={musicVol === 0 ? <VolumeX size={13}/> : musicVol < 40 ? <Volume1 size={13}/> : <Volume2 size={13}/>}
              quickActions={[{ label: 'Duck', value: 20 }, { label: 'Up', value: 60 }]}
            />
            <Fader label="Mic" value={Math.round((live.micGain || 1) * 100)} max={200} unit="%"
              disabled={false}
              onChange={(v) => live.setMicGain((v || 0) / 100)}
              color="#10B981"
              icon={<Mic size={13}/>}
              quickActions={[{ label: 'Low', value: 80 }, { label: 'Hot', value: 150 }]}
            />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #E2E8F0', padding: 14, maxHeight: 540, overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Music size={14} color={modeMeta.color} />
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Queue</span>
          </div>
          {upcoming.length === 0 && <div style={{ fontSize: 12, color: '#94A3B8', padding: '20px 0', textAlign: 'center' }}>Add tracks to the Lounge library first</div>}
          {upcoming.map((t) => (
            <button key={t._id} onClick={() => playTrack(t)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', textAlign: 'left', width: '100%' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${modeMeta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: modeMeta.color, flexShrink: 0 }}>
                <SkipForward size={13}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.artist || 'Resident'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Audience panel */}
      <div style={{ marginTop: 14, background: 'linear-gradient(180deg, #0F172A, #1E1B4B)', borderRadius: 18, padding: 14, border: '1px solid #334155' }}>
        <AudiencePanel roomType="dj" roomId={session._id} accent={modeMeta.color} />
      </div>

      {saveModal}

      <style>{`
        @keyframes ping { 75%,100% { transform: scale(2.4); opacity: 0; } }
        @media (max-width: 820px) { .live-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
