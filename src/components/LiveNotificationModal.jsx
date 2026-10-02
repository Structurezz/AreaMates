import { useNavigate } from 'react-router-dom';
import { Radio, Megaphone, Mic, X, Headphones } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const VARIANTS = {
  live_dj: {
    Icon: Mic,
    label: 'Lounge is Live',
    accent: '#6366F1',
    accentDark: '#4F46E5',
    gradient: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)',
    cta: 'Tune in',
    target: '/lounge',
  },
  live_announcement: {
    Icon: Megaphone,
    label: 'Live Announcement',
    accent: '#EF4444',
    accentDark: '#DC2626',
    gradient: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 55%, #DC2626 100%)',
    cta: 'Listen now',
    target: '/lounge',
  },
  live_podcast: {
    Icon: Radio,
    label: 'AreaConnect FM is LIVE',
    accent: '#8B5CF6',
    accentDark: '#6D28D9',
    gradient: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 55%, #8B5CF6 100%)',
    cta: 'Tune in',
    target: '/podcasts',
  },
};

export default function LiveNotificationModal() {
  const navigate = useNavigate();
  const { activeLive, dismissLive } = useNotifications() || {};
  if (!activeLive) return null;

  const v = VARIANTS[activeLive.type] || VARIANTS.live_dj;
  const Icon = v.Icon;

  const tuneIn = () => {
    navigate(v.target);
    dismissLive();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: 'rgba(2,6,23,0.72)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'live-fade 0.25s ease-out',
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: v.gradient, color: '#fff',
        borderRadius: 22, overflow: 'hidden',
        boxShadow: `0 30px 60px -20px ${v.accent}66, 0 10px 30px -10px rgba(0,0,0,0.5)`,
        border: '1px solid rgba(255,255,255,0.12)',
        position: 'relative',
        animation: 'live-pop 0.35s cubic-bezier(.22,1,.36,1)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        <button onClick={dismissLive}
          style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <X size={15}/>
        </button>

        <div style={{ padding: '32px 24px 24px', position: 'relative', textAlign: 'center' }}>
          <div style={{
            width: 86, height: 86, borderRadius: 24,
            background: `linear-gradient(135deg, ${v.accent}, ${v.accentDark})`,
            margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 16px 36px ${v.accent}66`,
            position: 'relative',
          }}>
            <Icon size={38}/>
            <span style={{
              position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%',
              background: '#EF4444', border: '3px solid rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'live-dot 1.2s infinite' }}/>
            </span>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.85, marginBottom: 6 }}>
            {v.label}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.25 }}>{activeLive.title}</h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, margin: '8px 0 20px' }}>
            {activeLive.body}
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={dismissLive}
              style={{ flex: '0 0 auto', padding: '12px 20px', borderRadius: 12,
                background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.14)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Later
            </button>
            <button onClick={tuneIn}
              style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                background: '#fff', color: v.accentDark, fontWeight: 800, fontSize: 14, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Headphones size={15}/> {v.cta}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes live-fade { from { opacity: 0; } to { opacity: 1; } }
          @keyframes live-pop  { 0% { transform: translateY(10px) scale(0.96); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
          @keyframes live-dot  { 0%,100% { transform: scale(1); } 50% { transform: scale(0.4); } }
        `}</style>
      </div>
    </div>
  );
}
