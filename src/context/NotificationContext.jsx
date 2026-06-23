import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Siren, AlertTriangle, UserCheck, UserMinus, Megaphone, Banknote,
  Clock, AlertCircle, UserPlus, Bell, BellRing, MessageSquare,
  Calendar, BarChart2, ShoppingBag, Scale, Users, Info,
} from 'lucide-react';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

const STORAGE_KEY = 'am_resident_notifications';
const MAX_STORED = 60;

export const TYPE_CONFIG = {
  // ── Security Alerts ──────────────────────────────────────
  new_alert:           { Icon: Siren,         label: 'Security Alert',  color: '#EF4444', isAlert: true  },
  alert_broadcast:     { Icon: Siren,         label: 'Broadcast Alert', color: '#EF4444', isAlert: true  },

  // ── Normal Notifications ─────────────────────────────────
  visitor_checkin:     { Icon: UserCheck,     label: 'Visitor In',      color: '#0EA5E9', isAlert: false },
  visitor_checkout:    { Icon: UserMinus,     label: 'Visitor Out',     color: '#F59E0B', isAlert: false },
  new_announcement:    { Icon: Megaphone,     label: 'Announcement',    color: '#8B5CF6', isAlert: false },
  payment_received:    { Icon: Banknote,      label: 'Payment',         color: '#10B981', isAlert: false },
  payment_due:         { Icon: Clock,         label: 'Payment Due',     color: '#F59E0B', isAlert: false },
  payment_overdue:     { Icon: AlertCircle,   label: 'Overdue',         color: '#EF4444', isAlert: false },
  new_message:         { Icon: MessageSquare, label: 'Message',         color: '#6366F1', isAlert: false },
  new_event:           { Icon: Calendar,      label: 'Event',           color: '#6366F1', isAlert: false },
  new_poll:            { Icon: BarChart2,     label: 'Poll',            color: '#8B5CF6', isAlert: false },
  marketplace_item:    { Icon: ShoppingBag,   label: 'Marketplace',     color: '#10B981', isAlert: false },
  court_update:        { Icon: Scale,         label: 'Courtroom',       color: '#D97706', isAlert: false },
  jury_summoned:       { Icon: Users,         label: 'Jury Duty',       color: '#7C3AED', isAlert: false },
  new_resident:        { Icon: UserPlus,      label: 'Neighbour',       color: '#6366F1', isAlert: false },
};

const DEFAULT_CFG = { Icon: Bell, label: 'Notification', color: '#6366F1', isAlert: false };

function loadStored() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export function NotificationProvider({ children }) {
  const { subscribe } = useSocket() || {};
  const [notifications, setNotifications] = useState(loadStored);
  const [unreadCount, setUnreadCount] = useState(() => loadStored().filter(n => !n.readAt).length);

  const addNotification = useCallback((notif) => {
    const entry = { ...notif, id: notif.id || String(Date.now()), createdAt: notif.createdAt || new Date().toISOString() };
    const cfg = TYPE_CONFIG[entry.type] || DEFAULT_CFG;

    setNotifications(prev => {
      const updated = [entry, ...prev].slice(0, MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(n => n + 1);

    const Icon = cfg.Icon;
    toast(
      () => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={15} color={cfg.color} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{entry.title}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{entry.body}</div>
          </div>
        </div>
      ),
      {
        duration: cfg.isAlert ? 8000 : 5000,
        style: cfg.isAlert ? { borderLeft: '3px solid #EF4444' } : {},
      }
    );
  }, []);

  useEffect(() => {
    if (!subscribe) return;
    const unsubs = [
      subscribe('notification', (n) => addNotification(n)),

      subscribe('visitor_update', (visitor) => {
        const out = !!visitor.checkOutTime;
        addNotification({
          type: out ? 'visitor_checkout' : 'visitor_checkin',
          title: out ? 'Visitor Checked Out' : 'Visitor Arrived',
          body: `${visitor.name || 'Your visitor'} ${out ? 'has left' : 'has checked in'}`,
          meta: { visitorId: visitor._id },
        });
      }),

      subscribe('new_alert', (alert) => {
        addNotification({
          type: 'new_alert',
          title: alert.title || 'Security Alert',
          body: alert.message || alert.note || 'A security alert was raised in your estate',
          meta: { alertId: alert._id },
        });
      }),

      subscribe('alert_broadcast', (alert) => {
        addNotification({
          type: 'alert_broadcast',
          title: alert.title || 'Estate Broadcast',
          body: alert.note || alert.message || 'Emergency broadcast from estate management',
          meta: { alertId: alert._id },
        });
      }),

      subscribe('new_announcement', (ann) => {
        addNotification({
          type: 'new_announcement',
          title: 'New Announcement',
          body: ann.title || ann.message || 'A new announcement was posted',
          meta: { announcementId: ann._id },
        });
      }),

      subscribe('payment_due', (p) => {
        addNotification({
          type: 'payment_due',
          title: 'Payment Due',
          body: p.message || `You have a payment due soon`,
          meta: { paymentId: p._id },
        });
      }),

      subscribe('court_update', (c) => {
        addNotification({
          type: 'court_update',
          title: c.title || 'Courtroom Update',
          body: c.message || 'There is an update in your court case',
          meta: { caseId: c._id },
        });
      }),

      subscribe('jury_summoned', (c) => {
        addNotification({
          type: 'jury_summoned',
          title: 'Jury Duty',
          body: `You have been selected as a juror in: ${c.caseTitle || 'a dispute case'}`,
          meta: { caseId: c._id },
        });
      }),
    ];
    return () => unsubs.forEach(fn => fn?.());
  }, [subscribe, addNotification]);

  const markAllRead = useCallback(() => {
    const ts = new Date().toISOString();
    setNotifications(prev => {
      const updated = prev.map(n => n.readAt ? n : { ...n, readAt: ts });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const alertCount = notifications.filter(n => !n.readAt && (TYPE_CONFIG[n.type]?.isAlert)).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, alertCount, markAllRead, clearAll, TYPE_CONFIG }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
