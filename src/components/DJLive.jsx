import { useEffect, useRef, useState } from 'react';
import { Radio, Mic, X, Users, Volume2, Heart, Headphones, Play, Megaphone } from 'lucide-react';
import { djAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import { useAuth }   from '../context/AuthContext';
import { useLiveAudio } from '../hooks/useLiveAudio';

const INDIGO       = '#6366F1';
const INDIGO_DARK  = '#4F46E5';
const RED          = '#EF4444';
const RED_DARK     = '#DC2626';

/** Audio sink — mounts audio elements for each remote MediaStream so it plays. */
function AudioSinks({ streams }) {
  return (
    <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      {Array.from(streams.entries()).map(([id, stream]) => (
        <RemoteAudio key={id} stream={stream} />
      ))}
    </div>
  );
}

function RemoteAudio({ stream }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
    ref.current.play().catch(() => {});
  }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
}

function ListenerModal({ session, onClose }) {
  const { user } = useAuth();
  const { subscribe } = useSocket();
  const [np, setNp]       = useState(session.nowPlaying);
  const [reactions, setR] = useState([]);  // ephemeral floating reactions
  const [vol, setVol]     = useState(60);
  const iframeRef         = useRef(null);
  const isAnnounce        = session.kind === 'announcement';

  const live = useLiveAudio({
    roomType: 'dj',
    roomId:   session._id,
    role:     'listener',
    enabled:  true,
  });

  // Apply volume to the embedded YouTube player
  const applyLocalVol = (v) => {
    setVol(v);
    const win = iframeRef.current?.contentWindow;
    if (win) {
      try { win.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [v] }), '*'); } catch {}
    }
  };

  useEffect(() => {
    const u1 = subscribe('dj:track-change', ({ sessionId, nowPlaying }) => {
      if (String(sessionId) === String(session._id)) setNp(nowPlaying);
    });
    const u2 = subscribe('dj:ended', ({ sessionId }) => {
      if (String(sessionId) === String(session._id)) onClose();
    });
    const u3 = subscribe('live:reaction', ({ emoji, userName }) => {
      const id = Math.random().toString(36).slice(2);
      setR(prev => [...prev, { id, emoji, userName, x: 40 + Math.random() * 220 }]);
      setTimeout(() => setR(prev => prev.filter(r => r.id !== id)), 3200);
    });
    const u4 = subscribe('dj:volume', ({ sessionId, volume }) => {
      if (String(sessionId) === String(session._id)) applyLocalVol(volume);
    });
    return () => { u1 && u1(); u2 && u2(); u3 && u3(); u4 && u4(); };
  }, [session._id, subscribe, onClose]);

  const sendReaction = (emoji) => {
    const { emit } = window.__dj_socket || {};
    // We can't easily access the raw socket; just emit via existing useSocket emit:
    // (passed through useLiveAudio's socket connection)
    if (window.__areaconnect_emit) window.__areaconnect_emit('live:reaction', {
      roomType: 'dj', roomId: session._id, emoji, userName: user?.name || 'Resident',
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: isAnnounce ? 'linear-gradient(180deg,#450A0A,#7F1D1D)' : 'rgba(2,6,23,0.9)', display: 'flex', flexDirection: 'column' }}>
      <AudioSinks streams={live.remoteStreams} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#EF4444', animation: 'ping 1.6s infinite' }} />
            <span style={{ position: 'relative', width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
          </span>
          <span style={{ color: '#FCA5A5', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em' }}>{isAnnounce ? 'ANNOUNCEMENT' : 'ON AIR'}</span>
          <div style={{ height: 14, width: 1, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>{session.hostName}</span>
          {!isAnnounce && <span style={{ color: '#94A3B8', fontSize: 12 }}>· {session.title}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#CBD5E1', fontSize: 12 }}>
            <Users size={13} /> {live.listenerCount}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 18px', position: 'relative' }}>
        <div style={{ width: '100%', maxWidth: 820 }}>
          {isAnnounce ? (
            <div style={{ textAlign: 'center', padding: '12px 10px' }}>
              {/* Background music, if set */}
              {np?.videoId && (
                <div style={{ position: 'relative', paddingBottom: '42%', background: '#000', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 18 }}>
                  <iframe ref={iframeRef} key={np.videoId}
                    src={`https://www.youtube.com/embed/${np.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&start=${Math.floor(np.seekSec || 0)}`}
                    title={np.title || 'Background'}
                    allow="autoplay; encrypted-media; fullscreen"
                    onLoad={() => setTimeout(() => applyLocalVol(vol), 400)}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                </div>
              )}
              <div style={{ width: np?.videoId ? 72 : 100, height: np?.videoId ? 72 : 100, borderRadius: np?.videoId ? 20 : 26, background: `linear-gradient(135deg, ${RED}, ${RED_DARK})`, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 48px rgba(239,68,68,0.5)' }}>
                <Megaphone size={np?.videoId ? 32 : 44} color="#fff"/>
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: '#FCA5A5', textTransform: 'uppercase', marginBottom: 6 }}>
                Message from {session.hostName}
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
                {session.message || session.title}
              </h1>
              {np?.videoId && (
                <>
                  <div style={{ marginTop: 10, fontSize: 11, color: '#FCA5A5' }}>🎵 {np.title}{np.artist ? ` · ${np.artist}` : ''}</div>
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10, maxWidth: 420, margin: '14px auto 0' }}>
                    <Volume2 size={14} color="#FCA5A5"/>
                    <input type="range" min="0" max="100" value={vol}
                      onChange={e => applyLocalVol(Number(e.target.value))}
                      style={{ flex: 1, accentColor: RED }} />
                    <span style={{ color: '#FCA5A5', fontSize: 11, fontWeight: 700, width: 36, textAlign: 'right' }}>{vol}%</span>
                  </div>
                </>
              )}
              {!np?.videoId && <div style={{ marginTop: 14, fontSize: 13, color: '#FCA5A5' }}>Audio is live — stay on this screen to listen.</div>}
            </div>
          ) : (
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              {np?.videoId ? (
                <iframe ref={iframeRef} key={np.videoId}
                  src={`https://www.youtube.com/embed/${np.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&start=${Math.floor(np.seekSec || 0)}`}
                  title={np.title || 'Now playing'}
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                  onLoad={() => setTimeout(() => applyLocalVol(vol), 400)}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: 13 }}>
                  Waiting for the DJ to drop a track…
                </div>
              )}
            </div>
          )}

          {!isAnnounce && (
            <>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${INDIGO}, ${INDIGO_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                  {session.hostPhoto
                    ? <img src={session.hostPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                    : <Mic size={18} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#A5B4FC', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Now playing</div>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{np?.title || 'Setup'}</div>
                  <div style={{ color: '#CBD5E1', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{np?.artist || session.hostName}</div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#A5B4FC', fontSize: 11, fontWeight: 600 }}>
                  <Volume2 size={13} /> Live mic
                </div>
              </div>

              {/* Local music volume (listener-controlled) */}
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Volume2 size={14} color="#94A3B8" />
                <input type="range" min="0" max="100" value={vol}
                  onChange={e => applyLocalVol(Number(e.target.value))}
                  style={{ flex: 1, accentColor: INDIGO }} />
                <span style={{ color: '#94A3B8', fontSize: 11, fontWeight: 700, width: 36, textAlign: 'right' }}>{vol}%</span>
              </div>

              {/* Reactions */}
              <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['🔥', '💃', '👏', '🎉', '❤️'].map(e => (
                  <button key={e} onClick={() => sendReaction(e)}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999, padding: '8px 14px', fontSize: 16, cursor: 'pointer', color: '#fff' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.14)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Floating reaction stream */}
        <div style={{ position: 'absolute', bottom: 80, left: 0, right: 0, pointerEvents: 'none' }}>
          {reactions.map(r => (
            <div key={r.id} style={{ position: 'absolute', left: `calc(50% - 150px + ${r.x}px)`, fontSize: 24, animation: 'float-up 3s ease-out forwards' }}>
              {r.emoji}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes float-up {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-180px); }
        }
      `}</style>
    </div>
  );
}

export default function DJLive() {
  const { subscribe, emit } = useSocket();
  const [session, setSession] = useState(null);
  const [open, setOpen]       = useState(false);

  // Expose emit to the inner reactions button (minor hack to avoid prop-drilling)
  useEffect(() => { window.__areaconnect_emit = emit; }, [emit]);

  useEffect(() => {
    djAPI.getActive().then(({ data }) => setSession(data.data)).catch(() => {});
    const u1 = subscribe('dj:started', (s) => setSession(s));
    const u2 = subscribe('dj:ended',   () => { setSession(null); setOpen(false); });
    const u3 = subscribe('dj:track-change', ({ sessionId, nowPlaying }) =>
      setSession(prev => prev && String(prev._id) === String(sessionId) ? { ...prev, nowPlaying } : prev));
    return () => { u1 && u1(); u2 && u2(); u3 && u3(); };
  }, [subscribe]);

  if (!session) return null;

  const isAnnounce = session.kind === 'announcement';
  const bannerBg   = isAnnounce
    ? 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)'
    : 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)';
  const iconBg     = isAnnounce
    ? `linear-gradient(135deg, ${RED}, ${RED_DARK})`
    : `linear-gradient(135deg, ${INDIGO}, ${INDIGO_DARK})`;
  const subColor   = isAnnounce ? '#FCA5A5' : '#A5B4FC';
  const pillBg     = isAnnounce ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)';
  const pillBorder = isAnnounce ? 'rgba(252,165,165,0.4)' : 'rgba(165,180,252,0.4)';
  const shadow     = isAnnounce ? '0 12px 28px -14px rgba(239,68,68,0.6)' : '0 12px 28px -14px rgba(79,70,229,0.55)';

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{
          width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
          background: bannerBg,
          borderRadius: 18, padding: '14px 16px', position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
          boxShadow: shadow,
        }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: isAnnounce ? 'rgba(239,68,68,0.25)' : 'rgba(99,102,241,0.25)' }} />
        <div style={{ position: 'relative', width: 44, height: 44, borderRadius: 14, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          {session.hostPhoto ? (
            <img src={session.hostPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          ) : (
            isAnnounce ? <Megaphone size={20} color="#fff"/> : <Radio size={20} color="#fff"/>
          )}
          <span style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderRadius: '50%', background: '#EF4444', border: '2px solid #1E1B4B', animation: 'ping-dot 1.6s infinite' }} />
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <div style={{ color: '#FCA5A5', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {isAnnounce ? '📢 Announcement' : 'Live now'}
          </div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isAnnounce ? session.hostName : `${session.hostName} is DJing`}
          </div>
          <div style={{ color: subColor, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
            {isAnnounce ? (session.message || 'Tap to listen') : (session.nowPlaying?.title || 'Warming up the decks…')}
          </div>
        </div>
        <div style={{ position: 'relative', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: pillBg, border: `1px solid ${pillBorder}` }}>
          <Headphones size={12} /> Tune in
        </div>
        <style>{`@keyframes ping-dot { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } }`}</style>
      </button>

      {open && <ListenerModal session={session} onClose={() => setOpen(false)} />}
    </>
  );
}
