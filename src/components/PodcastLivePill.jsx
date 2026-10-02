import { useEffect, useRef, useState } from 'react';
import { Radio, X, Users, Hand, Mic, MicOff } from 'lucide-react';
import { podcastAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import { useAuth }   from '../context/AuthContext';
import { useLiveAudio } from '../hooks/useLiveAudio';
import BoostedRemoteAudio from './BoostedRemoteAudio';

const BRAND = '#8B5CF6';
const BRAND_DARK = '#6D28D9';


function ListenerModal({ show, onClose }) {
  const { user } = useAuth();
  const live = useLiveAudio({
    roomType: 'podcast',
    roomId:   show._id,
    role:     'listener',
    enabled:  true,
  });

  const toggleHand = () => {
    if (live.handRaised) live.lowerHand();
    else live.raiseHand({ userId: user?._id, userName: user?.name, userPhoto: user?.profilePhoto });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 100%)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
        {Array.from(live.remoteStreams.entries()).map(([id, s]) => <BoostedRemoteAudio key={id} stream={s}/>)}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#EF4444', animation: 'ping 1.6s infinite' }} />
            <span style={{ position: 'relative', width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
          </span>
          <span style={{ color: '#FCA5A5', fontSize: 11, fontWeight: 800, letterSpacing: '0.14em' }}>LIVE</span>
          <div style={{ height: 14, width: 1, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>AreaConnect FM</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#CBD5E1', fontSize: 12 }}>
            <Users size={13}/> {live.listenerCount}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer' }}>
            <X size={16}/>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440, textAlign: 'center' }}>
          <div style={{ width: 110, height: 110, borderRadius: 28, background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 48px rgba(139,92,246,0.5)' }}>
            <Radio size={44} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: '#A5B4FC', textTransform: 'uppercase', marginBottom: 6 }}>
            AreaConnect FM · {show.hostName}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '2px 0 8px', letterSpacing: '-0.02em' }}>{show.title}</h1>
          {show.description && <p style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 1.55, marginBottom: 24 }}>{show.description}</p>}

          {live.calledIn ? (
            <>
              <div style={{ fontSize: 12, color: '#86EFAC', fontWeight: 700, marginBottom: 10 }}>🎙️ You're on air!</div>
              <button onClick={live.toggleMic}
                style={{ padding: '12px 24px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: live.micOn ? `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` : '#334155', color: '#fff',
                  fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {live.micOn ? <><Mic size={16}/> Mic open</> : <><MicOff size={16}/> Muted</>}
              </button>
            </>
          ) : (
            <button onClick={toggleHand}
              style={{ padding: '12px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: live.handRaised ? '#FBBF24' : 'rgba(255,255,255,0.1)',
                color: live.handRaised ? '#0F172A' : '#fff',
                fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8,
                border: live.handRaised ? 'none' : '1px solid rgba(255,255,255,0.14)' }}>
              <Hand size={16}/> {live.handRaised ? 'Hand raised — waiting' : 'Raise hand to speak'}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes ping { 75%,100% { transform: scale(2.4); opacity: 0; } }`}</style>
    </div>
  );
}

export default function PodcastLivePill() {
  const { subscribe } = useSocket();
  const [show, setShow] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    podcastAPI.getLive().then(({ data }) => setShow(data.data)).catch(() => {});
    const u1 = subscribe('podcast:started', (s) => setShow(s));
    const u2 = subscribe('podcast:ended', () => { setShow(null); setOpen(false); });
    return () => { u1 && u1(); u2 && u2(); };
  }, [subscribe]);

  if (!show) return null;

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 86, right: 16, zIndex: 55,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, color: '#fff',
          boxShadow: '0 14px 32px rgba(139,92,246,0.5)',
          fontSize: 12, fontWeight: 800, letterSpacing: '0.02em',
          animation: 'pill-pulse 2.4s ease-in-out infinite',
        }}>
        <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#FEE2E2', animation: 'ping 1.6s infinite' }} />
          <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
        </span>
        AreaConnect FM · {show.title}
      </button>

      {open && <ListenerModal show={show} onClose={() => setOpen(false)} />}

      <style>{`
        @keyframes pill-pulse {
          0%,100% { transform: translateY(0); box-shadow: 0 14px 32px rgba(139,92,246,0.5); }
          50%     { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(139,92,246,0.6); }
        }
      `}</style>
    </>
  );
}
