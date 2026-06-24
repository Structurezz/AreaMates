import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, X, CheckCheck, Trash2, Siren } from 'lucide-react';
import { useNotifications, TYPE_CONFIG as TC } from '../../context/NotificationContext';

const PRIMARY = '#6366F1';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotifRow({ n }) {
  const cfg = TC[n.type] || { Icon: Bell, color: PRIMARY, isAlert: false };
  const { Icon } = cfg;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '11px 16px',
      borderBottom: '1px solid #F8FAFC',
      background: n.readAt ? 'transparent' : (cfg.isAlert ? '#FFF5F5' : '#F5F3FF'),
      borderLeft: cfg.isAlert ? '3px solid #EF4444' : `3px solid ${n.readAt ? 'transparent' : PRIMARY}`,
      transition: 'background 0.2s',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: cfg.color + '18',
        border: `1.5px solid ${cfg.color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={15} color={cfg.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{n.title}</span>
          {!n.readAt && <span style={{ width: 7, height: 7, borderRadius: 99, background: cfg.isAlert ? '#EF4444' : PRIMARY, flexShrink: 0 }} />}
        </div>
        <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 4px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {n.body}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
            background: cfg.color + '18', color: cfg.color,
          }}>
            {TC[n.type]?.label || 'Notification'}
          </span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{timeAgo(n.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, alertCount, markAllRead, clearAll, stopSiren } = useNotifications();
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 58, right: 12 });
  const buttonRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = useCallback(() => {
    stopSiren();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = Math.min(340, window.innerWidth - 24);
      let left = rect.left;
      if (left + panelWidth > window.innerWidth - 12) left = window.innerWidth - panelWidth - 12;
      setPanelPos({ top: rect.bottom + 8, left });
    }
    setOpen(o => !o);
  }, [open, stopSiren]);

  const alerts = notifications.filter(n => TC[n.type]?.isAlert);
  const normal = notifications.filter(n => !TC[n.type]?.isAlert);

  return (
    <div ref={wrapperRef}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        style={{
          position: 'relative', width: 36, height: 36, borderRadius: 10,
          border: 'none', background: open ? '#EEF2FF' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? PRIMARY : '#64748B', transition: 'background 0.15s', flexShrink: 0,
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = PRIMARY; } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B'; } }}
        aria-label="Notifications"
      >
        {/* show Siren when there are unread alerts, else Bell */}
        {alertCount > 0 ? <Siren size={19} color="#EF4444" /> : <Bell size={19} />}

        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            minWidth: 16, height: 16, borderRadius: 8,
            background: alertCount > 0 ? '#EF4444' : PRIMARY,
            color: '#fff', fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', border: '1.5px solid #fff',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: panelPos.top, left: panelPos.left,
          width: Math.min(340, window.innerWidth - 24),
          background: '#fff', borderRadius: 16,
          boxShadow: '0 16px 48px rgba(15,23,42,0.18)',
          border: '1px solid #E2E8F0', zIndex: 1000, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid #F1F5F9',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  background: alertCount > 0 ? '#EF4444' : PRIMARY,
                  color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 800, padding: '1px 7px',
                }}>
                  {unreadCount}
                </span>
              )}
              {alertCount > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  background: '#FEF2F2', color: '#EF4444', borderRadius: 99,
                  fontSize: 10, fontWeight: 700, padding: '2px 7px',
                  border: '1px solid #FECACA',
                }}>
                  <Siren size={9} /> {alertCount} alert{alertCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {unreadCount > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); markAllRead(); }}
                  title="Mark all read"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}
                >
                  <CheckCheck size={14} /> Read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); clearAll(); }}
                  title="Clear all"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, color: '#94A3B8', display: 'flex', alignItems: 'center' }}
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8, color: '#94A3B8', display: 'flex', alignItems: 'center' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                <Bell size={28} style={{ color: '#CBD5E1', margin: '0 auto 8px', display: 'block' }} />
                <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>No notifications yet</p>
                <p style={{ fontSize: 11, color: '#CBD5E1', marginTop: 4 }}>You'll see alerts and updates here</p>
              </div>
            ) : (
              <>
                {/* Security alerts section */}
                {alerts.length > 0 && (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px 5px',
                      background: '#FFF5F5',
                      borderBottom: '1px solid #FEE2E2',
                    }}>
                      <Siren size={11} color="#EF4444" />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Security Alerts
                      </span>
                    </div>
                    {alerts.map(n => <NotifRow key={n.id + n.createdAt} n={n} />)}
                  </>
                )}

                {/* Regular notifications section */}
                {normal.length > 0 && (
                  <>
                    {alerts.length > 0 && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 16px 5px',
                        background: '#F5F3FF',
                        borderBottom: '1px solid #EDE9FE',
                      }}>
                        <Bell size={11} color={PRIMARY} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: PRIMARY, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          Notifications
                        </span>
                      </div>
                    )}
                    {normal.map(n => <NotifRow key={n.id + n.createdAt} n={n} />)}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
