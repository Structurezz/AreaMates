import { useEffect, useState } from 'react';
import { podcastAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import LiveListenerModal from './LiveListenerModal';

const BRAND      = '#8B5CF6';
const BRAND_DARK = '#6D28D9';

export default function PodcastLivePill() {
  const { subscribe } = useSocket();
  const [show, setShow] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    podcastAPI.getLive().then(({ data }) => setShow(data.data)).catch(() => {});
    const u1 = subscribe('podcast:started', (s) => setShow(s));
    const u2 = subscribe('podcast:ended',   () => { setShow(null); setOpen(false); });
    return () => { u1 && u1(); u2 && u2(); };
  }, [subscribe]);

  if (!show) return null;

  const room = {
    type: 'podcast',
    id:   show._id,
    kind: 'podcast',
    hostName:   show.hostName,
    hostPhoto:  show.hostPhoto,
    title:      show.title,
    description:show.description,
    coverImage: show.coverImage,
    nowPlaying: show.nowPlaying,
    musicVolume:show.musicVolume,
  };

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
          maxWidth: '70vw',
        }}>
        <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, flexShrink: 0 }}>
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#FEE2E2', animation: 'ping-dot 1.6s infinite' }} />
          <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          AreaConnect FM · {show.title}
        </span>
      </button>

      {open && <LiveListenerModal room={room} onClose={() => setOpen(false)} />}

      <style>{`
        @keyframes pill-pulse {
          0%,100% { transform: translateY(0); box-shadow: 0 14px 32px rgba(139,92,246,0.5); }
          50%     { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(139,92,246,0.6); }
        }
        @keyframes ping-dot { 75%,100% { transform: scale(2.4); opacity: 0; } }
      `}</style>
    </>
  );
}
