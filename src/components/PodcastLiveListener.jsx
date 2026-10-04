import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Radio, X, Users, Hand, Mic, MicOff, Heart, Send, Flame, Sparkles,
  PartyPopper, ThumbsUp,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth }   from '../context/AuthContext';
import { useLiveAudio } from '../hooks/useLiveAudio';
import BoostedRemoteAudio from './BoostedRemoteAudio';

const VIOLET      = '#8B5CF6';
const VIOLET_DARK = '#6D28D9';

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '💯', '🎉'];
const REACTION_COLORS = {
  '❤️': '#EC4899', '🔥': '#F97316', '😂': '#FACC15',
  '👏': '#60A5FA', '💯': '#A78BFA', '🎉': '#F472B6',
};

const MAX_CHAT   = 100;
const MAX_FLOATS = 40;

/**
 * Twitch/IG-Live-style listener experience for AreaConnect FM shows.
 * Pulsing host avatar · scrolling chat · floating reactions · live
 * viewer and like counter · raise-hand to call in.
 */
export default function PodcastLiveListener({ show, onClose }) {
  const { user } = useAuth();
  const { subscribe, emit } = useSocket() || {};

  const [chat, setChat]       = useState([]);     // {id, userName, userPhoto, text, at}
  const [floats, setFloats]   = useState([]);     // {id, emoji, x, at}
  const [likes, setLikes]     = useState(0);
  const [input, setInput]     = useState('');
  const [heartPulse, setHP]   = useState(0);

  const chatBoxRef = useRef(null);

  const live = useLiveAudio({
    roomType: 'podcast',
    roomId:   show._id,
    role:     'listener',
    enabled:  true,
  });

  // ── Socket subscriptions ──────────────────────────────────────────────────
  useEffect(() => {
    if (!subscribe) return;
    const u1 = subscribe('podcast:chat', (msg) => {
      if (String(msg.showId) !== String(show._id)) return;
      setChat(prev => [...prev.slice(-MAX_CHAT + 1), msg]);
    });
    const u2 = subscribe('podcast:reaction', ({ emoji, at }) => {
      const id = `${at}-${Math.random().toString(36).slice(2, 6)}`;
      const x  = 30 + Math.random() * 60;  // 30%–90% from left of FAB rail
      setFloats(prev => [...prev.slice(-(MAX_FLOATS - 1)), { id, emoji, x, at }]);
      setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 3800);
    });
    const u3 = subscribe('podcast:like', () => {
      setLikes(n => n + 1);
      setHP(k => k + 1);
    });
    const u4 = subscribe('podcast:ended', ({ showId }) => {
      if (String(showId) === String(show._id)) onClose();
    });
    return () => { u1 && u1(); u2 && u2(); u3 && u3(); u4 && u4(); };
  }, [subscribe, show._id, onClose]);

  // Autoscroll chat
  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
  }, [chat.length]);

  // ── Actions ───────────────────────────────────────────────────────────────
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
    if (!emit) return;
    emit('podcast:reaction:send', { showId: show._id, emoji, userId: user?._id, userName: user?.name });
  };

  const sendLike = () => {
    if (!emit) return;
    emit('podcast:like:send', { showId: show._id, userId: user?._id });
  };

  const toggleHand = () => {
    if (live.handRaised) live.lowerHand();
    else live.raiseHand({ userId: user?._id, userName: user?.name, userPhoto: user?.profilePhoto });
  };

  const initial = (show.hostName?.[0] || 'A').toUpperCase();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 70,
      background: 'linear-gradient(170deg, #0B0B14 0%, #1E1B4B 30%, #4C1D95 100%)',
      color: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Hidden audio sinks (routed through Web Audio for boost) */}
      <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
        {Array.from(live.remoteStreams.entries()).map(([id, s]) => <BoostedRemoteAudio key={id} stream={s}/>)}
      </div>

      {/* ── Header ── */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em' }}>
            <span style={{ position: 'relative', display: 'inline-flex', width: 6, height: 6 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#fff', animation: 'pll-ping 1.4s infinite' }} />
              <span style={{ position: 'relative', width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
            </span>
            LIVE
          </div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>AreaConnect FM</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#CBD5E1', fontSize: 12 }}>
            <Users size={13}/> {live.listenerCount}
          </div>
          {likes > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#FDA4AF', fontSize: 12 }}>
              <Heart size={13} fill="#F43F5E"/> {likes}
            </div>
          )}
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer' }}>
            <X size={16}/>
          </button>
        </div>
      </div>

      {/* ── Center: host avatar + show info ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px', position: 'relative', minHeight: 0 }}>
        {/* Pulsing rings */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -70%)', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', inset: 0, width: 180, height: 180, borderRadius: '50%', marginLeft: -90, marginTop: -90, border: `2px solid ${VIOLET}66`, animation: 'pll-rings 2.6s ease-out infinite' }}/>
          <div style={{ position: 'absolute', inset: 0, width: 180, height: 180, borderRadius: '50%', marginLeft: -90, marginTop: -90, border: `2px solid ${VIOLET}44`, animation: 'pll-rings 2.6s ease-out 0.9s infinite' }}/>
        </div>

        {/* Avatar */}
        <div style={{
          position: 'relative', zIndex: 1,
          width: 128, height: 128, borderRadius: 32,
          background: show.coverImage ? `url(${show.coverImage}) center/cover` : `linear-gradient(135deg, ${VIOLET}, ${VIOLET_DARK})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 20px 48px ${VIOLET}66, 0 0 60px rgba(139,92,246,0.3)`,
          border: '3px solid rgba(255,255,255,0.12)',
        }}>
          {!show.coverImage && <span style={{ fontSize: 44, fontWeight: 900, color: '#fff' }}>{initial}</span>}
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#C4B5FD', textTransform: 'uppercase' }}>{show.hostName}</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 2px', lineHeight: 1.2 }}>{show.title}</h1>
          {show.description && <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', margin: '2px 0 0', lineHeight: 1.5, maxWidth: 440, marginInline: 'auto' }}>{show.description}</p>}
        </div>

        {/* Call-in */}
        <div style={{ marginTop: 20 }}>
          {live.calledIn ? (
            <button onClick={live.toggleMic}
              style={{ padding: '10px 20px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: live.micOn ? `linear-gradient(135deg, ${VIOLET}, ${VIOLET_DARK})` : '#334155',
                color: '#fff', fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              {live.micOn ? <><Mic size={14}/> You're on air</> : <><MicOff size={14}/> Muted</>}
            </button>
          ) : (
            <button onClick={toggleHand}
              style={{ padding: '9px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: live.handRaised ? '#FBBF24' : 'rgba(255,255,255,0.1)',
                color: live.handRaised ? '#0F172A' : '#fff',
                fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 7,
                border: live.handRaised ? 'none' : '1px solid rgba(255,255,255,0.14)' }}>
              <Hand size={14}/> {live.handRaised ? 'Hand raised — waiting' : 'Raise hand to speak'}
            </button>
          )}
        </div>
      </div>

      {/* ── Chat panel (overlay bottom) ── */}
      <div style={{
        position: 'relative', borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(180deg, rgba(2,6,23,0) 0%, rgba(2,6,23,0.55) 50%, rgba(2,6,23,0.85) 100%)',
        padding: '10px 12px 10px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        maxHeight: '42%',
        display: 'flex', flexDirection: 'column',
      }}>
        <div ref={chatBoxRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180 }}>
          {chat.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
              Say hi 👋 — the room is listening.
            </div>
          )}
          {chat.map(m => (
            <ChatLine key={m.id} msg={m} />
          ))}
        </div>

        {/* Composer + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
            placeholder="Say something…"
            style={{
              flex: 1, minWidth: 0, padding: '10px 14px', borderRadius: 999,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff', fontSize: 13, outline: 'none',
            }}
          />
          <button onClick={sendChat} disabled={!input.trim()}
            style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              background: input.trim() ? `linear-gradient(135deg, ${VIOLET}, ${VIOLET_DARK})` : 'rgba(255,255,255,0.08)',
              color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              opacity: input.trim() ? 1 : 0.5 }}>
            <Send size={15}/>
          </button>
          <button onClick={() => { sendLike(); setHP(k => k + 1); }}
            style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #F43F5E, #BE123C)', color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 6px 18px rgba(244,63,94,0.5)`, animation: heartPulse ? 'pll-heart 0.4s ease-out' : undefined, position: 'relative' }}
            onAnimationEnd={() => setHP(0)}>
            <Heart size={15} fill="#fff"/>
          </button>
        </div>

        {/* Emoji reaction rail */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {REACTION_EMOJIS.map(e => (
            <button key={e} onClick={() => sendReaction(e)}
              style={{ padding: '6px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)',
                background: 'rgba(255,255,255,0.06)', fontSize: 16, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
              onMouseLeave={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* ── Floating reactions overlay (above everything but non-blocking) ── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, overflow: 'hidden' }}>
        {floats.map(f => (
          <div key={f.id} style={{
            position: 'absolute', bottom: '42%', left: `${f.x}%`,
            fontSize: 28, animation: 'pll-float 3.6s ease-out forwards',
            textShadow: `0 0 20px ${REACTION_COLORS[f.emoji] || '#fff'}66`,
          }}>
            {f.emoji}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pll-ping  { 75%,100% { transform: scale(2.4); opacity: 0; } }
        @keyframes pll-rings { 0% { transform: scale(0.7); opacity: 0.9; } 100% { transform: scale(1.9); opacity: 0; } }
        @keyframes pll-float {
          0%   { transform: translateY(0) scale(0.7) rotate(-6deg); opacity: 0; }
          15%  { transform: translateY(-30px) scale(1.15) rotate(4deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(-320px) scale(1) rotate(-8deg); opacity: 0; }
        }
        @keyframes pll-heart { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

function ChatLine({ msg }) {
  const you = msg.userName || 'Listener';
  const initial = (you[0] || 'L').toUpperCase();
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', borderRadius: 10, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}>
      {msg.userPhoto ? (
        <img src={msg.userPhoto} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}/>
      ) : (
        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 800 }}>{initial}</div>
      )}
      <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.4, minWidth: 0, flex: 1 }}>
        <span style={{ fontWeight: 700, color: '#C4B5FD', marginRight: 6 }}>{you}</span>
        <span style={{ wordBreak: 'break-word' }}>{msg.text}</span>
      </div>
    </div>
  );
}
