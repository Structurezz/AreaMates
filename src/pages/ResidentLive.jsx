import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Users, X, Save, SkipForward, Music, Volume2, VolumeX, Volume1,
  Loader2, Headphones, Radio, Megaphone, Hand, MessageSquare, Headphones as HeadphonesIcon,
  Church, Heart,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth }   from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { djAPI, loungeAPI } from '../api';
import { useLiveAudio } from '../hooks/useLiveAudio';
import { Fader }      from '../components/MixerDeck';
import AudiencePanel  from '../components/AudiencePanel';

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

  const live = useLiveAudio({
    roomType: 'dj',
    roomId:   session?._id || null,
    role:     'host',
    enabled:  !!session,
  });

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
    try { iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }), '*'); } catch {}
    if (session && emit) emit('dj:volume', { sessionId: session._id, volume: v });
  };

  const goLive = async () => {
    try {
      setStarting(true);
      const stream = await live.getLocalStream();
      recorderRef.current.start(stream);

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

  const endSession = async () => {
    if (!session) return;
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
            {current ? (
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

      {showSave && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
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
      )}

      <style>{`
        @keyframes ping { 75%,100% { transform: scale(2.4); opacity: 0; } }
        @media (max-width: 820px) { .live-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
