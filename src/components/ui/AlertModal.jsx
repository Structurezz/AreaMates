import { useEffect, useRef } from 'react';
import { Siren, X, Radio } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

export default function AlertModal() {
  const { activeAlert, dismissAlert } = useNotifications();
  const btnRef = useRef(null);

  useEffect(() => {
    if (activeAlert) btnRef.current?.focus();
  }, [activeAlert]);

  useEffect(() => {
    if (!activeAlert) return;
    const handler = (e) => { if (e.key === 'Escape') dismissAlert(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeAlert, dismissAlert]);

  if (!activeAlert) return null;

  const isBroadcast = activeAlert.type === 'alert_broadcast';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      animation: 'fadeIn 0.2s ease',
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pulseRed {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
          50%       { box-shadow: 0 0 0 18px rgba(239,68,68,0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        background: '#fff',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(239,68,68,0.3)',
        border: '2px solid #EF4444',
      }}>
        {/* Red header */}
        <div style={{
          background: isBroadcast
            ? 'linear-gradient(135deg, #7C3AED 0%, #DC2626 100%)'
            : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          padding: '24px 20px 20px',
          textAlign: 'center',
          position: 'relative',
        }}>
          {/* Dismiss X */}
          <button
            onClick={dismissAlert}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: 8, width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={14} />
          </button>

          {/* Pulsing icon */}
          <div style={{
            width: 64, height: 64, borderRadius: 99,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
            animation: 'pulseRed 1.4s infinite',
          }}>
            {isBroadcast
              ? <Radio size={30} color="#fff" />
              : <Siren size={30} color="#fff" />}
          </div>

          <div style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.2)',
            color: '#fff', fontSize: 10, fontWeight: 800,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '3px 10px', borderRadius: 99, marginBottom: 8,
          }}>
            {isBroadcast ? 'Estate Broadcast' : 'Security Alert'}
          </div>

          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
            {activeAlert.title}
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 20px 24px' }}>
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 20px', textAlign: 'center' }}>
            {activeAlert.body}
          </p>

          <button
            ref={btnRef}
            onClick={dismissAlert}
            style={{
              width: '100%',
              padding: '13px',
              background: '#EF4444',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            Acknowledge &amp; Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
