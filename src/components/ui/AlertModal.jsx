import { useEffect, useRef } from 'react';
import { Siren, X, Radio, Shield, UserRound, Briefcase, Home, Phone } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

const ROLE_CFG = {
  security:       { label: 'Security Guard',  Icon: Shield,    bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  resident:       { label: 'Resident',         Icon: UserRound, bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' },
  estate_manager: { label: 'Estate Manager',   Icon: Briefcase, bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  super_admin:    { label: 'Estate Manager',   Icon: Briefcase, bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
};

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
  const meta = activeAlert.meta || {};
  const role = meta.raisedByRole || (isBroadcast ? 'security' : 'resident');
  const roleCfg = ROLE_CFG[role] || ROLE_CFG.resident;
  const RoleIcon = roleCfg.Icon;

  const headerGradient = isBroadcast
    ? 'linear-gradient(135deg, #7C3AED 0%, #DC2626 100%)'
    : role === 'security'
      ? 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)'
      : role === 'estate_manager' || role === 'super_admin'
        ? 'linear-gradient(135deg, #C2410C 0%, #92400E 100%)'
        : 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)';

  const btnColor = role === 'security' ? '#1D4ED8'
    : role === 'estate_manager' || role === 'super_admin' ? '#C2410C'
    : '#EF4444';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      animation: 'am-fadeIn 0.2s ease',
    }}>
      <style>{`
        @keyframes am-fadeIn { from { opacity: 0; transform: scale(0.96) } to { opacity: 1; transform: scale(1) } }
        @keyframes am-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          50%       { box-shadow: 0 0 0 14px rgba(255,255,255,0); }
        }
      `}</style>

      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}>
        {/* Coloured header */}
        <div style={{ background: headerGradient, padding: '22px 20px 18px', textAlign: 'center', position: 'relative' }}>
          <button onClick={dismissAlert}
            style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={14} />
          </button>

          <div style={{ width: 60, height: 60, borderRadius: 99, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', animation: 'am-pulse 1.4s infinite' }}>
            {isBroadcast ? <Radio size={28} color="#fff" /> : <Siren size={28} color="#fff" />}
          </div>

          <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 99, marginBottom: 8 }}>
            {isBroadcast ? 'Estate Broadcast'
              : role === 'security' ? 'Security Guard Alert'
              : role === 'estate_manager' || role === 'super_admin' ? 'Management Alert'
              : 'Resident Alert'}
          </span>

          <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>
            {activeAlert.title}
          </h2>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px 22px' }}>

          {/* Source info card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, marginBottom: 14, background: roleCfg.bg, border: `1px solid ${roleCfg.border}` }}>
            <div style={{ width: 36, height: 36, borderRadius: 99, background: '#fff', border: `1.5px solid ${roleCfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RoleIcon size={16} style={{ color: roleCfg.color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: roleCfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isBroadcast ? `Broadcast by ${roleCfg.label}` : `Raised by ${roleCfg.label}`}
              </div>
              {meta.raisedByName && (
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 1 }}>{meta.raisedByName}</div>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                {meta.raisedByUnit && (
                  <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Home size={9} />{meta.raisedByUnit}
                  </span>
                )}
                {meta.raisedByPhone && (
                  <span style={{ fontSize: 11, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Phone size={9} />{meta.raisedByPhone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: '0 0 18px' }}>
            {activeAlert.body}
          </p>

          <button ref={btnRef} onClick={dismissAlert}
            style={{ width: '100%', padding: '13px', background: btnColor, color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Acknowledge &amp; Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
