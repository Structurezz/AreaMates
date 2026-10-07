import { useEffect, useRef, useState } from 'react';
import { X, Users, Heart, Send, Hand, Mic, MicOff, Smile } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth }   from '../context/AuthContext';
import { useLiveAudio } from '../hooks/useLiveAudio';
import BoostedRemoteAudio from './BoostedRemoteAudio';

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '💯', '🎉'];
const MAX_CHAT   = 50;   // visible overlay history
const CHAT_LIFE  = 8000; // ms before a bubble fades
const MAX_FLOATS = 60;

/**
 * Instagram-Live-style listener experience:
 *  - Full-bleed background (host "stream")
 *  - Overlay chat bubbles bottom-left that auto-fade
 *  - Vertical reaction/heart column bottom-right; hearts spawn ONLY along the right edge
 *  - Pill "Add a comment…" input along the bottom
 */
export default function PodcastLiveListener({ show, onClose }) {
  const { user } = useAuth();
  const { subscribe, emit } = useSocket() || {};

  const [chat, setChat]       = useState([]);     // visible chat (auto-expires)
  const [floats, setFloats]   = useState([]);     // floating emojis (right rail)
  const [likes, setLikes]     = useState(0);
  const [input, setInput]     = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [heartKick, setHeartKick]   = useState(0);

  // Host-synced background music
  const [music, setMusic]     = useState(show.nowPlaying?.videoId ? show.nowPlaying : null);
  const [musicVol, setMVol]   = useState(show.musicVolume ?? 35);
  const musicIframeRef        = useRef(null);
  const applyMusicVolume = (v) => {
    setMVol(v);
    try { musicIframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }), '*'); } catch {}
  };
  const musicStartSec = music?.videoId && music.startedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(music.startedAt).getTime()) / 1000))
    : 0;

  const live = useLiveAudio({
    roomType: 'podcast',
    roomId:   show._id,
    role:     'listener',
    enabled:  true,
  });

  // ── Sockets ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!subscribe) return;
    const u1 = subscribe('podcast:chat', (msg) => {
      if (String(msg.showId) !== String(show._id)) return;
      setChat(prev => [...prev.slice(-(MAX_CHAT - 1)), msg]);
      // Auto-expire this bubble
      setTimeout(() => setChat(prev => prev.filter(m => m.id !== msg.id)), CHAT_LIFE);
    });
    const u2 = subscribe('podcast:reaction', ({ emoji, at }) => {
      spawnFloat(emoji, at);
    });
    const u3 = subscribe('podcast:like', ({ at }) => {
      setLikes(n => n + 1);
      spawnFloat('❤️', at);
      setHeartKick(k => k + 1);
    });
    const u4 = subscribe('podcast:ended', ({ showId }) => {
      if (String(showId) === String(show._id)) onClose();
    });
    const u5 = subscribe('podcast:music-change', ({ showId, nowPlaying }) => {
      if (String(showId) !== String(show._id)) return;
      setMusic(nowPlaying && nowPlaying.videoId ? nowPlaying : null);
    });
    const u6 = subscribe('podcast:volume', ({ showId, volume }) => {
      if (String(showId) !== String(show._id)) return;
      applyMusicVolume(volume);
    });
    return () => { u1 && u1(); u2 && u2(); u3 && u3(); u4 && u4(); u5 && u5(); u6 && u6(); };
    // eslint-disable-next-line
  }, [subscribe, show._id]);

  const spawnFloat = (emoji, at) => {
    const id = `${at || Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    // horizontal drift — small sway along the right rail (0–60px from the edge)
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
    emit('podcast:chat:send', {
      showId: show._id, text,
      userId: user?._id, userName: user?.name, userPhoto: user?.profilePhoto,
    });
    setInput('');
  };

  const sendReaction = (emoji) => {
    emit?.('podcast:reaction:send', { showId: show._id, emoji, userId: user?._id, userName: user?.name });
    setShowEmojis(false);
  };

  const sendLike = () => emit?.('podcast:like:send', { showId: show._id, userId: user?._id });

  const toggleHand = () => {
    if (live.handRaised) live.lowerHand();
    else live.raiseHand({ userId: user?._id, userName: user?.name, userPhoto: user?.profilePhoto });
  };

  const initial = (show.hostName?.[0] || 'A').toUpperCase();
  const bgImage = show.coverImage || null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70, overflow: 'hidden', color: '#fff',
      background: bgImage
        ? `url(${bgImage}) center/cover no-repeat`
        : 'linear-gradient(180deg, #1E1B4B 0%, #4C1D95 50%, #312E81 100%)',
    }}>
      {/* Hidden audio sinks */}
      <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
        {Array.from(live.remoteStreams.entries()).map(([id, s]) => <BoostedRemoteAudio key={id} stream={s} />)}
      </div>

      {/* Hidden synced music iframe (if host picked a background track) */}
      {music?.videoId && (
        <iframe ref={musicIframeRef} key={music.videoId}
          src={`https://www.youtube.com/embed/${music.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&start=${musicStartSec}`}
          onLoad={() => setTimeout(() => applyMusicVolume(musicVol), 400)}
          allow="autoplay; encrypted-media"
          title="background music"
          style={{ position: 'absolute', width: 1, height: 1, border: 0, opacity: 0, pointerEvents: 'none' }} />
      )}

      {/* Backdrop blur layer (if cover image) */}
      {bgImage && <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(28px)', background: 'rgba(10,8,28,0.55)' }} />}

      {/* Top gradient fade */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140, background: 'linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0))', pointerEvents: 'none' }} />
      {/* Bottom gradient fade */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 260, background: 'linear-gradient(0deg, rgba(0,0,0,0.75), rgba(0,0,0,0))', pointerEvents: 'none' }} />

      {/* ── Top bar: avatar · title · LIVE · viewers · X ───────────────── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 14px 0', display: 'flex', alignItems: 'center', gap: 10, zIndex: 3 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: show.coverImage ? `url(${show.coverImage}) center/cover` : 'linear-gradient(135deg, #F472B6, #EC4899, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '2px solid #fff', flexShrink: 0, fontWeight: 900, fontSize: 15,
        }}>
          {!show.coverImage && initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
            {show.hostName}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
            {music?.title ? <>🎵 {music.title}</> : show.title}
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

      {/* ── Center: host hero (audio-only "stream") ───────────────────── */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2 }}>
        <div style={{ position: 'relative' }}>
          {/* Pulsing rings */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 220, height: 220, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.25)', animation: 'ig-rings 2.4s ease-out infinite' }} />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 220, height: 220, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', animation: 'ig-rings 2.4s ease-out 0.8s infinite' }} />

          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            background: show.coverImage ? `url(${show.coverImage}) center/cover` : 'linear-gradient(135deg, #F472B6, #EC4899, #8B5CF6)',
            border: '4px solid rgba(255,255,255,0.2)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5), 0 0 100px rgba(236,72,153,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 56, fontWeight: 900,
          }}>
            {!show.coverImage && initial}
          </div>
        </div>
      </div>

      {/* ── Overlay chat (bottom-left) — bubbles, auto-fade ───────────── */}
      <div style={{
        position: 'absolute', bottom: 76, left: 10, right: 68, zIndex: 4,
        display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320,
        overflow: 'hidden', pointerEvents: 'none',
        maskImage: 'linear-gradient(180deg, transparent 0%, black 25%)',
        WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 25%)',
      }}>
        {chat.map(m => <ChatBubble key={m.id} msg={m} />)}
      </div>

      {/* ── Right rail: heart FAB + reaction popover + hand ───────────── */}
      <div style={{ position: 'absolute', right: 10, bottom: 76, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        {/* Reaction picker popover */}
        {showEmojis && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 4, padding: 6, borderRadius: 22,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
            animation: 'ig-pop 0.18s ease-out',
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

        {/* Hand raise */}
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

        {/* Emoji toggle */}
        <button onClick={() => setShowEmojis(s => !s)}
          style={{
            width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}>
          <Smile size={18} />
        </button>

        {/* Heart FAB */}
        <button onClick={sendLike} key={heartKick}
          style={{
            width: 54, height: 54, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #F43F5E, #BE123C)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 24px rgba(244,63,94,0.6)',
            animation: heartKick ? 'ig-kick 0.5s ease-out' : undefined,
          }}>
          <Heart size={22} fill="#fff"/>
        </button>
        {likes > 0 && (
          <div style={{ fontSize: 10, fontWeight: 800, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {likes}
          </div>
        )}
      </div>

      {/* ── Bottom bar: "Add a comment…" pill ─────────────────────────── */}
      <div style={{
        position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 6,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.22)', borderRadius: 999,
          padding: '4px 4px 4px 16px',
        }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
            placeholder="Add a comment…"
            style={{
              flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
              color: '#fff', fontSize: 14, padding: '8px 4px',
            }} />
          <button onClick={sendChat} disabled={!input.trim()}
            style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              background: input.trim() ? 'linear-gradient(135deg, #F472B6, #8B5CF6)' : 'rgba(255,255,255,0.1)',
              color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              opacity: input.trim() ? 1 : 0.5, flexShrink: 0,
            }}>
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* ── Floating hearts/emojis — only along the right edge ────────── */}
      <div style={{ position: 'absolute', bottom: 60, right: 0, width: 120, top: 0, pointerEvents: 'none', zIndex: 7, overflow: 'hidden' }}>
        {floats.map(f => (
          <div key={f.id} style={{
            position: 'absolute', bottom: 0, right: `${f.drift + 20}px`,
            fontSize: `${Math.round(26 * f.scale)}px`,
            animation: `ig-rise ${f.dur}ms cubic-bezier(.22,1,.36,1) forwards`,
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
          }}>
            {f.emoji}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes ig-rings { 0% { transform: translate(-50%,-50%) scale(0.6); opacity: 0.9; } 100% { transform: translate(-50%,-50%) scale(1.6); opacity: 0; } }
        @keyframes ig-rise {
          0%   { transform: translateY(0) translateX(0) scale(0.7) rotate(-8deg); opacity: 0; }
          12%  { transform: translateY(-30px) translateX(-6px) scale(1) rotate(6deg);  opacity: 1; }
          40%  { transform: translateY(-180px) translateX(14px) scale(1) rotate(-4deg); opacity: 1; }
          70%  { transform: translateY(-360px) translateX(-10px) scale(0.95) rotate(5deg); opacity: 0.9; }
          100% { transform: translateY(-520px) translateX(8px)  scale(0.85) rotate(-6deg); opacity: 0; }
        }
        @keyframes ig-kick { 0% { transform: scale(1); } 40% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes ig-pop  { 0% { transform: translateY(6px) scale(0.9); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}

function ChatBubble({ msg }) {
  const name = msg.userName || 'Listener';
  const initial = (name[0] || 'L').toUpperCase();
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      maxWidth: '100%', animation: 'ig-slide-in 0.25s ease-out',
    }}>
      {msg.userPhoto ? (
        <img src={msg.userPhoto} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.3)' }} />
      ) : (
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #F472B6, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.3)' }}>{initial}</div>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 2px rgba(0,0,0,0.6)', lineHeight: 1 }}>{name}</div>
        <div style={{ fontSize: 14, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.6)', lineHeight: 1.3, wordBreak: 'break-word' }}>{msg.text}</div>
      </div>
      <style>{`@keyframes ig-slide-in { 0% { transform: translateY(16px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}
