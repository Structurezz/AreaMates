import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Megaphone, Mic, X, Headphones, Zap } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { djAPI, podcastAPI } from '../api';
import LiveListenerModal from './LiveListenerModal';

const VARIANTS = {
  live_dj: {
    Icon: Mic,
    label: 'Lounge is Live',
    accent: '#6366F1',
    accentDark: '#4F46E5',
    gradient: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #4338CA 100%)',
    cta: 'Tune in',
    target: '/lounge',
    kind: 'live_dj',
  },
  live_announcement: {
    Icon: Megaphone,
    label: '🚨 LIVE ANNOUNCEMENT',
    accent: '#EF4444',
    accentDark: '#DC2626',
    gradient: 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 55%, #DC2626 100%)',
    cta: 'Listen now',
    target: '/announcements',
    kind: 'live_announcement',
    dramatic: true,
  },
  live_podcast: {
    Icon: Radio,
    label: 'AreaConnect FM is LIVE',
    accent: '#8B5CF6',
    accentDark: '#6D28D9',
    gradient: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 55%, #8B5CF6 100%)',
    cta: 'Tune in',
    target: '/podcasts',
    kind: 'live_podcast',
  },
};

// Short, non-blaring attention chime — plays once when a live announcement
// modal appears. We generate it with WebAudio so there's no asset to ship.
function playAttentionChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    // Two-note ascending beep, ~0.6s total
    [[880, 0], [1174, 0.18]].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.22, now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.3);
    });
    setTimeout(() => { try { ctx.close(); } catch {} }, 1000);
  } catch { /* silent */ }
}

export default function LiveNotificationModal() {
  const navigate = useNavigate();
  const { activeLive, dismissLive } = useNotifications() || {};
  const [room, setRoom] = useState(null);          // when set, LiveListenerModal takes over
  const [loadingRoom, setLoadingRoom] = useState(false);
  const chimedRef = useRef(null);

  const v = activeLive ? (VARIANTS[activeLive.type] || VARIANTS.live_dj) : null;

  // Attention chime when a dramatic (announcement) live modal appears, once per id.
  useEffect(() => {
    if (!activeLive || !v?.dramatic) return;
    if (chimedRef.current === activeLive.id) return;
    chimedRef.current = activeLive.id;
    playAttentionChime();
  }, [activeLive, v?.dramatic]);

  // Clear the mini "listener" when the alert itself gets dismissed by context.
  useEffect(() => { if (!activeLive) setRoom(null); }, [activeLive]);

  // Build a `room` payload for LiveListenerModal from either the DJ session
  // or the active podcast. Called when user taps "Listen now".
  const openListenerInline = async () => {
    if (loadingRoom) return;
    setLoadingRoom(true);
    try {
      if (v.kind === 'live_podcast') {
        const { data } = await podcastAPI.getLive();
        const show = data?.data;
        if (!show) { dismissLive(); return; }
        setRoom({
          type: 'podcast',
          id:   show._id,
          kind: 'podcast',
          hostName:    show.hostName,
          hostPhoto:   show.hostPhoto,
          title:       show.title,
          description: show.description,
          coverImage:  show.coverImage,
          nowPlaying:  show.nowPlaying,
          musicVolume: show.musicVolume,
        });
      } else {
        // live_dj + live_announcement both live under the DJ session
        const { data } = await djAPI.getActive();
        const session = data?.data;
        if (!session) { dismissLive(); return; }
        setRoom({
          type: 'dj',
          id:   session._id,
          kind: session.kind,
          hostName:    session.hostName,
          hostPhoto:   session.hostPhoto,
          title:       session.title,
          description: session.description,
          message:     session.message,
          coverImage:  session.coverImage,
          nowPlaying:  session.nowPlaying,
          musicVolume: session.musicVolume,
        });
      }
    } catch {
      // Fallback — navigate to the right page so DJLive banner is visible
      navigate(v.target);
      dismissLive();
    } finally {
      setLoadingRoom(false);
    }
  };

  const closeListener = () => {
    setRoom(null);
    dismissLive();
  };

  if (!activeLive) return null;

  // When the user has tapped "Listen now" we hand off to the real listener modal
  if (room) return <LiveListenerModal room={room} onClose={closeListener} />;

  const Icon = v.Icon;
  const dramatic = !!v.dramatic;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      background: dramatic ? 'rgba(2,6,23,0.85)' : 'rgba(2,6,23,0.72)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'live-fade 0.25s ease-out',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: v.gradient, color: '#fff',
        borderRadius: 24, overflow: 'hidden',
        boxShadow: `0 30px 60px -20px ${v.accent}aa, 0 10px 30px -10px rgba(0,0,0,0.5)`,
        border: dramatic ? '3px solid #FEE2E2' : '1px solid rgba(255,255,255,0.12)',
        position: 'relative',
        animation: dramatic
          ? 'live-shake 0.5s cubic-bezier(.22,1,.36,1), live-pulse-border 1.6s ease-in-out infinite'
          : 'live-pop 0.35s cubic-bezier(.22,1,.36,1)',
      }}>
        {/* Siren flash sweeps */}
        {dramatic && (
          <>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(90deg, transparent, #FEE2E2, transparent)', animation: 'live-sweep 1.8s linear infinite' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(270deg, transparent, #FEE2E2, transparent)', animation: 'live-sweep 1.8s linear infinite reverse' }} />
          </>
        )}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        <button onClick={dismissLive}
          style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.35)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
          <X size={15}/>
        </button>

        <div style={{ padding: dramatic ? '38px 24px 24px' : '32px 24px 24px', position: 'relative', textAlign: 'center' }}>
          {dramatic && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '4px 12px', marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', position: 'relative', width: 8, height: 8 }}>
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#fff', animation: 'live-ping 1s infinite' }} />
                <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />
              </span>
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#fff' }}>
                LIVE NOW · HAPPENING RIGHT NOW
              </span>
            </div>
          )}

          <div style={{
            width: dramatic ? 100 : 86, height: dramatic ? 100 : 86, borderRadius: 24,
            background: `linear-gradient(135deg, ${v.accent}, ${v.accentDark})`,
            margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 16px 36px ${v.accent}aa`,
            position: 'relative',
            animation: dramatic ? 'live-icon-bob 2s ease-in-out infinite' : undefined,
          }}>
            <Icon size={dramatic ? 44 : 38}/>
            <span style={{
              position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%',
              background: '#EF4444', border: '3px solid rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'live-dot 1.2s infinite' }}/>
            </span>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.95, marginBottom: 6 }}>
            {v.label}
          </div>
          <h2 style={{ fontSize: dramatic ? 22 : 20, fontWeight: 900, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.22 }}>{activeLive.title}</h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.9)', lineHeight: 1.55, margin: '8px 0 20px' }}>
            {activeLive.body}
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={dismissLive}
              style={{ flex: '0 0 auto', padding: '12px 20px', borderRadius: 12,
                background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.14)',
                fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Later
            </button>
            <button onClick={openListenerInline} disabled={loadingRoom}
              style={{ flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                background: dramatic ? 'linear-gradient(135deg,#FEE2E2,#FFF)' : '#fff', color: v.accentDark, fontWeight: 900, fontSize: 15, cursor: loadingRoom ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: dramatic ? '0 10px 24px rgba(254,226,226,0.4)' : undefined,
                animation: dramatic ? 'live-cta-pulse 1.8s ease-in-out infinite' : undefined }}>
              {dramatic ? <Zap size={16} fill={v.accentDark}/> : <Headphones size={15}/>} {v.cta}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes live-fade  { from { opacity: 0; } to { opacity: 1; } }
          @keyframes live-pop   { 0% { transform: translateY(10px) scale(0.96); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
          @keyframes live-dot   { 0%,100% { transform: scale(1); } 50% { transform: scale(0.4); } }
          @keyframes live-ping  { 75%,100% { transform: scale(2.6); opacity: 0; } }
          @keyframes live-shake {
            0%,100% { transform: translateX(0); }
            12%     { transform: translateX(-6px) rotate(-0.6deg); }
            25%     { transform: translateX(6px)  rotate(0.6deg); }
            38%     { transform: translateX(-4px) rotate(-0.4deg); }
            50%     { transform: translateX(4px)  rotate(0.4deg); }
            63%     { transform: translateX(-2px); }
            80%     { transform: translateX(2px); }
          }
          @keyframes live-pulse-border {
            0%,100% { box-shadow: 0 30px 60px -20px rgba(239,68,68,0.6), 0 0 0 0 rgba(239,68,68,0.4); }
            50%     { box-shadow: 0 30px 60px -20px rgba(239,68,68,0.6), 0 0 0 10px rgba(239,68,68,0); }
          }
          @keyframes live-sweep { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
          @keyframes live-cta-pulse {
            0%,100% { transform: scale(1); }
            50%     { transform: scale(1.03); }
          }
          @keyframes live-icon-bob {
            0%,100% { transform: translateY(0) rotate(-4deg); }
            50%     { transform: translateY(-4px) rotate(4deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
