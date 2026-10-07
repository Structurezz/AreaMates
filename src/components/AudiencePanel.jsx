import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Heart, Send } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth }   from '../context/AuthContext';

/**
 * Host-side audience panel: chat + likes counter + reaction stream.
 *
 *   roomType: 'dj' | 'podcast'
 *   roomId:   sessionId or showId
 *   accent:   brand color (hex)
 */
export default function AudiencePanel({ roomType, roomId, accent = '#8B5CF6' }) {
  const { subscribe, emit } = useSocket() || {};
  const { user } = useAuth() || {};
  const [chat, setChat]       = useState([]);
  const [likes, setLikes]     = useState(0);
  const [input, setInput]     = useState('');
  const [reactionBurst, setBurst] = useState([]);
  const chatBoxRef = useRef(null);

  const chatEvent     = `${roomType}:chat`;
  const likeEvent     = `${roomType}:like`;
  const reactionEvent = `${roomType}:reaction`;
  const idKey         = roomType === 'podcast' ? 'showId' : 'sessionId';

  useEffect(() => {
    if (!subscribe || !roomId) return;
    const u1 = subscribe(chatEvent, (msg) => {
      if (String(msg[idKey]) !== String(roomId)) return;
      setChat(prev => [...prev.slice(-99), msg]);
    });
    const u2 = subscribe(likeEvent, (p) => {
      if (String(p[idKey]) !== String(roomId)) return;
      setLikes(n => n + 1);
    });
    const u3 = subscribe(reactionEvent, ({ emoji, at, ...rest }) => {
      if (String(rest[idKey]) !== String(roomId)) return;
      const id = `${at}-${Math.random().toString(36).slice(2, 6)}`;
      setBurst(prev => [...prev.slice(-19), { id, emoji, x: 20 + Math.random() * 60 }]);
      setTimeout(() => setBurst(prev => prev.filter(r => r.id !== id)), 3200);
    });
    return () => { u1 && u1(); u2 && u2(); u3 && u3(); };
  }, [subscribe, chatEvent, likeEvent, reactionEvent, idKey, roomId]);

  useEffect(() => { if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight; }, [chat.length]);

  const sendChat = () => {
    const text = input.trim();
    if (!text || !emit) return;
    emit(`${roomType}:chat:send`, {
      [idKey]: roomId, text,
      userId: user?._id, userName: user?.name || 'Host', userPhoto: user?.profilePhoto,
    });
    setInput('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 200px', gap: 12 }} className="audience-grid">
      <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 12, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#fff' }}>
          <MessageSquare size={13} color="#C4B5FD"/>
          <span style={{ fontSize: 12, fontWeight: 700 }}>Live chat</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>· {chat.length}</span>
        </div>
        <div ref={chatBoxRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, paddingRight: 4 }}>
          {chat.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>
              Audience chat will appear here.
            </div>
          )}
          {chat.map(m => (
            <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 8px', borderRadius: 10, background: 'rgba(0,0,0,0.3)' }}>
              {m.userPhoto ? (
                <img src={m.userPhoto} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}/>
              ) : (
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                  {(m.userName?.[0] || 'L').toUpperCase()}
                </div>
              )}
              <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.4, minWidth: 0, flex: 1 }}>
                <span style={{ fontWeight: 700, color: '#C4B5FD', marginRight: 6 }}>{m.userName || 'Listener'}</span>
                <span style={{ wordBreak: 'break-word' }}>{m.text}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendChat(); }}
            placeholder="Reply to the room…"
            style={{ flex: 1, padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: 13, outline: 'none' }}/>
          <button onClick={sendChat} disabled={!input.trim()}
            style={{ padding: '0 14px', borderRadius: 10, border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              background: input.trim() ? accent : 'rgba(255,255,255,0.08)', color: '#fff', fontWeight: 700, fontSize: 13,
              opacity: input.trim() ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Send size={13}/>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: 'rgba(244,63,94,0.14)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 14, padding: 12, textAlign: 'center' }}>
          <Heart size={14} color="#F43F5E" fill="#F43F5E" style={{ margin: '0 auto 2px' }}/>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#FDA4AF', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Likes</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1, marginTop: 2 }}>{likes}</div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 12, flex: 1, position: 'relative', overflow: 'hidden', minHeight: 100 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#C4B5FD', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Reactions</div>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>live from the audience</div>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {reactionBurst.map(r => (
              <div key={r.id} style={{ position: 'absolute', bottom: 10, left: `${r.x}%`, fontSize: 22, animation: 'ap-float 3s ease-out forwards' }}>
                {r.emoji}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ap-float {
          0%   { transform: translateY(0) scale(0.7); opacity: 0; }
          15%  { transform: translateY(-10px) scale(1.1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(-120px) scale(1); opacity: 0; }
        }
        @media (max-width: 760px) {
          .audience-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
