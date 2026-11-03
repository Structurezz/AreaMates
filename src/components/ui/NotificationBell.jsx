import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCheck, Trash2, Siren, ChevronRight, Sparkles } from 'lucide-react';
import { isToday, isYesterday } from 'date-fns';
import { useNotifications, TYPE_CONFIG as TC } from '../../context/NotificationContext';
import { linkFor } from '../../utils/notificationLinks';

const PRIMARY = '#6366F1';

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const dayOf = (iso) => { const d = new Date(iso); return isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : 'Earlier'; };

function NotifRow({ n, i, onGo }) {
  const cfg = TC[n.type] || { Icon: Bell, color: PRIMARY, isAlert: false };
  const { Icon, color } = cfg;
  const link = linkFor(n);
  const url = link.to || link.action;
  const unread = !n.readAt;
  return (
    <div onClick={() => onGo(n)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onGo(n); }}
      className="notif-row group relative flex items-start gap-3 mx-2 my-1 px-3 py-2.5 rounded-xl transition-all cursor-pointer hover:bg-slate-50 hover:-translate-y-px"
      style={{ animationDelay: `${Math.min(i, 12) * 35}ms`, background: unread ? (cfg.isAlert ? '#FEF2F2' : '#F5F3FF') : undefined }}>
      {unread && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full" style={{ background: cfg.isAlert ? '#EF4444' : PRIMARY }} />}
      <span className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -8px ${color}` }}>
        <Icon size={15} className="text-white" />
        {cfg.isAlert && unread && <span className="absolute inset-0 rounded-xl animate-ping opacity-40" style={{ background: color }} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-[13px] leading-snug ${unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</span>
          <span className="text-[10.5px] text-slate-400 whitespace-nowrap mt-0.5">{timeAgo(n.createdAt)}</span>
        </div>
        {n.body && <p className="text-[12px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>}
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${color}14`, color }}>{cfg.label || 'Notification'}</span>
          {unread && <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.isAlert ? '#EF4444' : PRIMARY }} />}
        </div>
      </div>
      {url && <ChevronRight size={15} className="self-center text-slate-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />}
    </div>
  );
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, alertCount, markAllRead, markRead, openAlert, openLive, clearAll, stopSiren } = useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('all');
  const [ring, setRing] = useState(0);
  const [panelPos, setPanelPos] = useState({ top: 58, left: 12, width: 380 });
  const buttonRef = useRef(null);
  const wrapperRef = useRef(null);
  const lastCount = useRef(unreadCount);

  // Open the exact page/item the notification is about, and mark it read
  const go = (n) => {
    markRead(n.id);
    setOpen(false);
    const { to, action } = linkFor(n);
    if (action === 'alert') return openAlert(n);
    if (action === 'live') return openLive(n);
    if (!to) return;
    if (/^https?:/.test(to)) window.open(to, '_blank', 'noreferrer');
    else navigate(to);
  };

  // Ring the bell when something new arrives, and nudge it now and then while unread
  useEffect(() => {
    if (unreadCount > lastCount.current) setRing((r) => r + 1);
    lastCount.current = unreadCount;
  }, [unreadCount]);
  useEffect(() => {
    if (!unreadCount || open) return undefined;
    const id = setInterval(() => setRing((r) => r + 1), 12000);
    return () => clearInterval(id);
  }, [unreadCount, open]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    window.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', handler); window.removeEventListener('keydown', onKey); };
  }, [open]);

  const handleOpen = useCallback(() => {
    stopSiren();
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = Math.min(380, window.innerWidth - 24);
      let left = rect.left;
      if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
      setPanelPos({ top: rect.bottom + 8, left: Math.max(12, left), width });
      setTab(alertCount > 0 ? 'alerts' : 'all');
    }
    setOpen((o) => !o);
  }, [open, stopSiren, alertCount]);

  const shown = useMemo(() => notifications.filter((n) => (
    tab === 'unread' ? !n.readAt : tab === 'alerts' ? TC[n.type]?.isAlert : true
  )), [notifications, tab]);

  const groups = useMemo(() => {
    const order = ['Today', 'Yesterday', 'Earlier'];
    const m = new Map(order.map((k) => [k, []]));
    shown.forEach((n) => m.get(dayOf(n.createdAt)).push(n));
    return order.map((k) => [k, m.get(k)]).filter(([, l]) => l.length);
  }, [shown]);

  const tabs = [
    ['all', 'All', notifications.length],
    ['unread', 'Unread', unreadCount],
    ['alerts', 'Alerts', notifications.filter((n) => TC[n.type]?.isAlert).length],
  ];
  const hot = alertCount > 0;
  let idx = 0;

  return (
    <div ref={wrapperRef}>
      {/* Bell button */}
      <button ref={buttonRef} onClick={handleOpen} aria-label="Notifications"
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${open ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
        {hot && <span className="absolute inset-0 rounded-xl bg-red-400/30 animate-ping" />}
        <span key={ring} className={ring ? 'bell-ring' : ''}>
          {hot ? <Siren size={19} className="text-red-500" /> : <Bell size={19} />}
        </span>
        {unreadCount > 0 && (
          <span key={`b${unreadCount}`} className="badge-pop absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[9.5px] font-bold flex items-center justify-center border-2 border-white"
            style={{ background: hot ? 'linear-gradient(135deg, #F87171, #DC2626)' : 'linear-gradient(135deg, #818CF8, #4F46E5)', boxShadow: `0 4px 10px -3px ${hot ? '#DC2626' : '#4F46E5'}` }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel fixed z-[1000] bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col"
          style={{ top: panelPos.top, left: panelPos.left, width: panelPos.width, maxHeight: `min(560px, calc(100dvh - ${panelPos.top + 16}px))`, boxShadow: '0 24px 60px -18px rgba(15,23,42,0.35)' }}>
          {/* Header */}
          <div className="relative px-4 pt-4 pb-3 flex-shrink-0" style={{ background: hot ? 'linear-gradient(135deg, #FEF2F2, #FFFFFF 70%)' : 'linear-gradient(135deg, #EEF2FF, #F5F3FF 45%, #FFFFFF 80%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ background: hot ? 'linear-gradient(135deg, #F87171, #DC2626)' : 'linear-gradient(135deg, #818CF8, #4F46E5)', boxShadow: `0 6px 14px -6px ${hot ? '#DC2626' : '#4F46E5'}` }}>
                  {hot ? <Siren size={15} /> : <Bell size={15} />}
                </span>
                <div>
                  <div className="text-[14.5px] font-semibold text-slate-900 leading-tight">Notifications</div>
                  <div className="text-[11px] text-slate-500">
                    {hot ? <span className="text-red-600 font-semibold">{alertCount} security alert{alertCount > 1 ? 's' : ''}</span> : unreadCount ? `${unreadCount} unread` : "You're all caught up"}
                  </div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white" aria-label="Close"><X size={15} /></button>
            </div>
            {/* Tabs */}
            <div className="mt-3 flex items-center gap-1 p-1 rounded-xl bg-white/80 border border-slate-200/70">
              {tabs.map(([k, label, n]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold py-1.5 rounded-lg transition-all ${tab === k ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  style={tab === k ? { background: k === 'alerts' ? 'linear-gradient(135deg, #F87171, #DC2626)' : 'linear-gradient(135deg, #6366F1, #4F46E5)' } : undefined}>
                  {label}
                  {n > 0 && <span className={`text-[10px] font-bold px-1.5 rounded-md tabular-nums ${tab === k ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{n}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain pb-1">
            {shown.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="relative mx-auto w-16 h-16">
                  <span className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-40" />
                  <span className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)' }}>
                    <Bell size={26} className="bell-swing text-indigo-500" />
                  </span>
                  <Sparkles size={14} className="absolute -top-1 -right-1 text-amber-400 animate-pulse" />
                </div>
                <p className="mt-4 text-[14px] font-semibold text-slate-900">
                  {tab === 'unread' ? 'Nothing unread' : tab === 'alerts' ? 'No security alerts' : 'No notifications yet'}
                </p>
                <p className="mt-1 text-[12px] text-slate-400">
                  {tab === 'alerts' ? 'The estate is calm. We’ll ring if anything happens.' : 'Visitors, payments, events and messages will show up here.'}
                </p>
              </div>
            ) : groups.map(([day, list]) => (
              <div key={day}>
                <div className="sticky top-0 z-10 px-4 pt-2.5 pb-1 bg-white/95 backdrop-blur text-[10.5px] font-bold uppercase tracking-wider text-slate-400">{day}</div>
                {list.map((n) => <NotifRow key={n.id + n.createdAt} n={n} i={idx++} onGo={go} />)}
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-t border-slate-100 bg-slate-50/60">
              <button onClick={(e) => { e.stopPropagation(); markAllRead(); }} disabled={!unreadCount}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:text-slate-300 disabled:hover:bg-transparent transition-colors">
                <CheckCheck size={14} /> Mark all as read
              </button>
              <button onClick={(e) => { e.stopPropagation(); clearAll(); }}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
