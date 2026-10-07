import { useEffect, useRef, useState } from 'react';
import { X, Users, Heart, Send, Hand, Mic, MicOff, Smile, Megaphone } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth }   from '../context/AuthContext';
import { useLiveAudio } from '../hooks/useLiveAudio';
import BoostedRemoteAudio from './BoostedRemoteAudio';

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '💯', '🎉'];
const MAX_CHAT   = 50;
const CHAT_LIFE  = 8000;
const MAX_FLOATS = 60;

const KIND_ACCENT = {
  dj:           ['#F472B6', '#8B5CF6'],
  announcement: ['#F97316', '#DC2626'],
  prayer:       ['#F472B6', '#EC4899'],
  chat:         ['#38BDF8', '#0EA5E9'],
  podcast:      ['#C084FC', '#8B5CF6'],
  default:      ['#F472B6', '#8B5CF6'],
};

/**
 * Unified IG-Live listener modal. Works for admin podcasts AND estate DJ-type
 * rooms (dj, prayer, chat, announcement, podcast kinds).
 *
 *   room: {
 *     type: 'dj' | 'podcast',
 *     id: string,
 *     kind?: string,              // 'dj' | 'announcement' | 'prayer' | 'chat' | 'podcast'
 *     hostName, hostPhoto, title, description, coverImage,
 *     nowPlaying?: { videoId, title, artist, startedAt },
 *     musicVolume?: number,       // 0-100
 *   }
 */
export default function LiveListenerModal({ room, onClose }) {
  const { user } = useAuth();
  const { subscribe, emit } = useSocket() || {};

  const [chat, setChat]       = useState([]);
  const [floats, setFloats]   = useState([]);
  const [likes, setLikes]     = useState(0);
  const [input, setInput]     = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [heartKick, setHeartKick]   = useState(0);

  const [music, setMusic]     = useState(room.nowPlaying?.videoId ? room.nowPlaying : null);
  const [musicVol, setMVol]   = useState(room.musicVolume ?? 35);
  const musicIframeRef        = useRef(null);
  const applyMusicVolume = (v) => {
    setMVol(v);
    try { musicIframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }), '*'); } catch {}
  };
  const musicStartSec = music?.videoId && music.startedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(music.startedAt).getTime()) / 1000))
    : 0;

  const live = useLiveAudio({
    roomType: room.type,
    roomId:   room.id,
    role:     'listener',
    enabled:  true,
  });

  // Socket event names depend on room type
  const E = room.type === 'podcast'
    ? { chat: 'podcast:chat', like: 'podcast:like', react: 'podcast:reaction', ended: 'podcast:ended', musicCh: 'podcast:music-change', vol: 'podcast:volume', trackCh: null, idKey: 'showId' }
    : { chat: 'dj:chat',      like: 'dj:like',      react: 'dj:reaction',      ended: 'dj:ended',      musicCh: null,                      vol: 'dj:volume',      trackCh: 'dj:track-change', idKey: 'sessionId' };

  const emitPrefixed = (base, payload) => emit?.(`${room.type}:${base}`, { [E.idKey]: room.id, ...payload });

  // ── Socket subs ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!subscribe) return;
    const unsubs = [];
    unsubs.push(subscribe(E.chat, (msg) => {
      if (String(msg[E.idKey]) !== String(room.id)) return;
      setChat(prev => [...prev.slice(-(MAX_CHAT - 1)), msg]);
      setTimeout(() => setChat(prev => prev.filter(m => m.id !== msg.id)), CHAT_LIFE);
    }));
    unsubs.push(subscribe(E.react, ({ emoji, at, ...rest }) => {
      if (String(rest[E.idKey]) !== String(room.id)) return;
      spawnFloat(emoji, at);
    }));
    unsubs.push(subscribe(E.like, ({ at, ...rest }) => {
      if (String(rest[E.idKey]) !== String(room.id)) return;
      setLikes(n => n + 1);
      spawnFloat('❤️', at);
      setHeartKick(k => k + 1);
    }));
    unsubs.push(subscribe(E.ended, (p) => {
      if (String(p[E.idKey]) !== String(room.id)) return;
      onClose();
    }));
    if (E.musicCh) {
      unsubs.push(subscribe(E.musicCh, (p) => {
        if (String(p[E.idKey]) !== String(room.id)) return;
        setMusic(p.nowPlaying && p.nowPlaying.videoId ? p.nowPlaying : null);
      }));
    }
    if (E.trackCh) {
      unsubs.push(subscribe(E.trackCh, ({ sessionId, nowPlaying }) => {
        if (String(sessionId) !== String(room.id)) return;
        setMusic(nowPlaying && nowPlaying.videoId ? nowPlaying : null);
      }));
    }
    unsubs.push(subscribe(E.vol, (p) => {
      if (String(p[E.idKey]) !== String(room.id)) return;
      applyMusicVolume(p.volume);
    }));
    return () => unsubs.forEach(u => u && u());
    // eslint-disable-next-line
  }, [subscribe, room.type, room.id]);

  const spawnFloat = (emoji, at) => {
    const id = `${at || Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const drift = Math.round(Math.random() * 60);
    const scale = 0.9 + Math.random() * 0.5;
    const dur   = 3200 + Math.round(Math.random() * 1600);
    setFloats(prev => [...prev.slice(-(MAX_FLOATS - 1)), { id, emoji, drift, scale, dur }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), dur + 100);
  };

  // ── Actions ────────────────────────────────────────────────────────────
  const sendChat = () => {
    const text = input.trim();
    if (!text || !emit) return;
    emitPrefixed('chat:send', {
      text, userId: user?._id, userName: user?.name, userPhoto: user?.profilePhoto,
    });
    setInput('');
  };
  const sendReaction = (emoji) => {
    emitPrefixed('reaction:send', { emoji, userId: user?._id, userName: user?.name });
    setShowEmojis(false);
  };
  const sendLike = () => emitPrefixed('like:send', { userId: user?._id });

  // Call-ins only exist on podcast rooms (host approves to speak)
  const canCallIn = room.type === 'podcast';
  const toggleHand = () => {
    if (!canCallIn) return;
    if (live.handRaised) live.lowerHand();
    else live.raiseHand({ userId: user?._id, userName: user?.name, userPhoto: user?.profilePhoto });
  };

  const initial = (room.hostName?.[0] || 'A').toUpperCase();
  const bgImage = room.coverImage || null;
  const [accent, accentDark] = KIND_ACCENT[room.kind] || KIND_ACCENT.default;
  const isAnnounce = room.kind === 'announcement';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70, overflow: 'hidden', color: '#fff',
      background: bgImage
        ? `url(${bgImage}) center/cover no-repeat`
        : isAnnounce
          ? 'linear-gradient(180deg, #450A0A 0%, #7F1D1D 50%, #991B1B 100%)'
          : 'linear-gradient(180deg, #1E1B4B 0%, #4C1D95 50%, #312E81 100%)',
    }}>
      <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
        {Array.from(live.remoteStreams.entries()).map(([id, s]) => <BoostedRemoteAudio key={id} stream={s} />)}
      </div>

      {/* Hidden synced music iframe */}
      {music?.videoId && (
        <iframe ref={musicIframeRef} key={music.videoId}
          src={`https://www.youtube.com/embed/${music.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&start=${musicStartSec}`}
          onLoad={() => setTimeout(() => applyMusicVolume(musicVol), 400)}
          allow="autoplay; encrypted-media"
          title="background music"
          style={{ position: 'absolute', width: 1, height: 1, border: 0, opacity: 0, pointerEvents: 'none' }} />
      )}

      {bgImage && <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(28px)', background: 'rgba(10,8,28,0.55)' }} />}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140, background: 'linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0))', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 260, background: 'linear-gradient(0deg, rgba(0,0,0,0.75), rgba(0,0,0,0))', pointerEvents: 'none' }} />

      {/* ── Top bar ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 14px 0', display: 'flex', alignItems: 'center', gap: 10, zIndex: 3 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: room.hostPhoto ? `url(${room.hostPhoto}) center/cover` : `linear-gradient(135deg, ${accent}, ${accentDark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #fff', flexShrink: 0, fontWeight: 900, fontSize: 15,
        }}>
          {!room.hostPhoto && initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
            {room.hostName}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
            {music?.title ? <>🎵 {music.title}</> : room.title}
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: 6, background: '#DC2626', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', flexShrink: 0 }}>
          LIVE
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.45)', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
          <Users size={12} /> {live.listenerCount}
        </div>
        <button onClick={onClose}
          style={{ background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>

      {/* ── Center hero ── */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 220, height: 220, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', animation: 'll-rings 2.4s ease-out infinite' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 220, height: 220, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', animation: 'll-rings 2.4s ease-out 0.8s infinite' }} />

          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            background: room.coverImage ? `url(${room.coverImage}) center/cover` : `linear-gradient(135deg, ${accent}, ${accentDark})`,
            border: '4px solid rgba(255,255,255,0.2)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5), 0 0 100px rgba(236,72,153,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 56, fontWeight: 900,
          }}>
            {!room.coverImage && (isAnnounce ? <Megaphone size={64}/> : initial)}
          </div>
          {isAnnounce && (
            <div style={{ marginTop: 16, textAlign: 'center', maxWidth: 320, color: '#fff' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>Announcement</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, lineHeight: 1.3 }}>{room.message || room.title}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Overlay chat bottom-left ── */}
      <div style={{
        position: 'absolute', bottom: 76, left: 10, right: 68, zIndex: 4,
        display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320,
        overflow: 'hidden', pointerEvents: 'none',
        maskImage: 'linear-gradient(180deg, transparent 0%, black 25%)',
        WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 25%)',
      }}>
        {chat.map(m => <ChatBubble key={m.id} msg={m} accent={accent} />)}
      </div>

      {/* ── Right rail ── */}
      <div style={{ position: 'absolute', right: 10, bottom: 76, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {showEmojis && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 4, padding: 6, borderRadius: 22,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
            animation: 'll-pop 0.18s ease-out',
          }}>
            {REACTION_EMOJIS.map(e => (
              <button key={e} onClick={() => sendReaction(e)}
                style={{ width: 36, height: 36, border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer', borderRadius: '50%' }}
                onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                {e}
              </button>
            ))}
          </div>
        )}

        {canCallIn && (
          <button onClick={toggleHand} title={live.handRaised ? 'Lower hand' : 'Raise hand'}
            style={{
              width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: live.handRaised ? '#FBBF24' : 'rgba(0,0,0,0.5)',
              color: live.handRaised ? '#1E293B' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)',
            }}>
            {live.calledIn ? (live.micOn ? <Mic size={18}/> : <MicOff size={18}/>) : <Hand size={18}/>}
          </button>
        )}

        <button onClick={() => setShowEmojis(s => !s)}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
          <Smile size={18} />
        </button>

        <button onClick={sendLike} key={heartKick}
          style={{
            width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #F43F5E, #BE123C)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 24px rgba(244,63,94,0.6)',
            animation: heartKick ? 'll-kick 0.5s ease-out' : undefined,
          }}>
          <Heart size={22} fill="#fff"/>
        </button>
        {likes > 0 && (
          <div style={{ fontSize: 10, fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {likes}
          </div>
        )}
      </div>

      {/* ── Bottom input bar ── */}
      <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.22)', borderRadius: 999,
          padding: '4px 4px 4px 16px',
        }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
            placeholder="Add a comment…"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, padding: '8px 4px' }} />
          <button onClick={sendChat} disabled={!input.trim()}
            style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              background: input.trim() ? `linear-gradient(135deg, ${accent}, ${accentDark})` : 'rgba(255,255,255,0.1)',
              color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              opacity: input.trim() ? 1 : 0.5, flexShrink: 0,
            }}>
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Floating hearts/emojis */}
      <div style={{ position: 'absolute', bottom: 60, right: 0, width: 120, top: 0, pointerEvents: 'none', zIndex: 7, overflow: 'hidden' }}>
        {floats.map(f => (
          <div key={f.id} style={{
            position: 'absolute', bottom: 0, right: `${f.drift + 20}px`,
            fontSize: `${Math.round(26 * f.scale)}px`,
            animation: `ll-rise ${f.dur}ms cubic-bezier(.22,1,.36,1) forwards`,
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
          }}>
            {f.emoji}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ll-rings { 0% { transform: translate(-50%,-50%) scale(0.6); opacity: 0.9; } 100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; } }
        @keyframes ll-rise {
          0%   { transform: translateY(0) translateX(0) scale(0.7) rotate(-8deg); opacity: 0; }
          12%  { transform: translateY(-30px) translateX(-6px) scale(1) rotate(6deg);  opacity: 1; }
          40%  { transform: translateY(-180px) translateX(14px) scale(1) rotate(-4deg); opacity: 1; }
          70%  { transform: translateY(-360px) translateX(-10px) scale(0.95) rotate(5deg); opacity: 0.9; }
          100% { transform: translateY(-520px) translateX(8px)  scale(0.85) rotate(-6deg); opacity: 0; }
        }
        @keyframes ll-kick { 0% { transform: scale(1); } 40% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes ll-pop  { 0% { transform: translateY(6px) scale(0.9); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

function ChatBubble({ msg, accent }) {
  const name = msg.userName || 'Listener';
  const initial = (name[0] || 'L').toUpperCase();
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '100%', animation: 'll-slide-in 0.25s ease-out' }}>
      {msg.userPhoto ? (
        <img src={msg.userPhoto} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.3)' }} />
      ) : (
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: `linear-gradient(135deg, ${accent}, #8B5CF6)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.3)' }}>{initial}</div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 2px rgba(0,0,0,0.6)', lineHeight: 1 }}>{name}</div>
        <div style={{ fontSize: 14, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.6)', lineHeight: 1.3, wordBreak: 'break-word' }}>{msg.text}</div>
      </div>
      <style>{`@keyframes ll-slide-in { 0% { transform: translateY(16px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
