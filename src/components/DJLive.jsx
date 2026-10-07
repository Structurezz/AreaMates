import { useEffect, useState } from 'react';
import { Radio, Headphones, Megaphone } from 'lucide-react';
import { djAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import LiveListenerModal from './LiveListenerModal';

const INDIGO       = '#6366F1';
const INDIGO_DARK  = '#4F46E5';
const RED          = '#EF4444';
const RED_DARK     = '#DC2626';

/**
 * Live banner for an active DJ-type session in the estate. Clicking opens
 * the IG-Live listener modal (shared with admin podcast flow).
 *   only="announcement"      → only renders when kind === 'announcement'
 *   only="not-announcement"  → renders for every other kind
 *   only omitted             → renders for any kind
 */
export default function DJLive({ only }) {
  const { subscribe } = useSocket();
  const [session, setSession] = useState(null);
  const [open, setOpen]       = useState(false);

  useEffect(() => {
    djAPI.getActive().then(({ data }) => setSession(data.data)).catch(() => {});
    const u1 = subscribe('dj:started',      (s) => setSession(s));
    const u2 = subscribe('dj:ended',        () => { setSession(null); setOpen(false); });
    const u3 = subscribe('dj:track-change', ({ sessionId, nowPlaying }) =>
      setSession(prev => prev && String(prev._id) === String(sessionId) ? { ...prev, nowPlaying } : prev));
    return () => { u1 && u1(); u2 && u2(); u3 && u3(); };
  }, [subscribe]);

  if (!session) return null;
  const isAnnouncementKind = session.kind === 'announcement';
  if (only === 'announcement' && !isAnnouncementKind) return null;
  if (only === 'not-announcement' && isAnnouncementKind) return null;

  const bannerBg   = isAnnouncementKind
    ? 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)'
    : 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)';
  const iconBg     = isAnnouncementKind
    ? `linear-gradient(135deg, ${RED}, ${RED_DARK})`
    : `linear-gradient(135deg, ${INDIGO}, ${INDIGO_DARK})`;
  const subColor   = isAnnouncementKind ? '#FCA5A5' : '#A5B4FC';
  const pillBg     = isAnnouncementKind ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.3)';
  const pillBorder = isAnnouncementKind ? 'rgba(252,165,165,0.4)' : 'rgba(165,180,252,0.4)';
  const shadow     = isAnnouncementKind ? '0 12px 28px -14px rgba(239,68,68,0.6)' : '0 12px 28px -14px rgba(79,70,229,0.55)';

  const room = {
    type: 'dj',
    id:   session._id,
    kind: session.kind,
    hostName:  session.hostName,
    hostPhoto: session.hostPhoto,
    title:     session.title,
    description: session.description,
    message:     session.message,
    coverImage:  session.coverImage,
    nowPlaying:  session.nowPlaying,
    musicVolume: session.musicVolume,
  };

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
        <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: isAnnouncementKind ? 'rgba(239,68,68,0.25)' : 'rgba(99,102,241,0.25)' }} />
        <div style={{ position: 'relative', width: 44, height: 44, borderRadius: 14, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
          {session.hostPhoto ? (
            <img src={session.hostPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
          ) : (
            isAnnouncementKind ? <Megaphone size={20} color="#fff"/> : <Radio size={20} color="#fff"/>
          )}
          <span style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderRadius: '50%', background: '#EF4444', border: '2px solid #1E1B4B', animation: 'ping-dot 1.6s infinite' }} />
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <div style={{ color: '#FCA5A5', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {isAnnouncementKind ? '📢 Announcement' : 'Live now'}
          </div>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isAnnouncementKind ? session.hostName : `${session.hostName} is live`}
          </div>
          <div style={{ color: subColor, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
            {isAnnouncementKind ? (session.message || 'Tap to listen') : (session.nowPlaying?.title || 'Warming up the decks…')}
          </div>
        </div>
        <div style={{ position: 'relative', color: '#fff', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999, background: pillBg, border: `1px solid ${pillBorder}` }}>
          <Headphones size={12} /> Tune in
        </div>
        <style>{`@keyframes ping-dot { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } }`}</style>
      </button>

      {open && <LiveListenerModal room={room} onClose={() => setOpen(false)} />}
    </>
  );
}
