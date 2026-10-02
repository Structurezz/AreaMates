import { useEffect, useState } from 'react';
import { Megaphone, Pin, Clock, Users, RefreshCw, AlertTriangle, Zap, Hammer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { announcementAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import DJLive from '../components/DJLive';

const CAT_META = {
  general:     { Icon: Megaphone,     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'General' },
  urgent:      { Icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Urgent' },
  event:       { Icon: Zap,           color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Event' },
  maintenance: { Icon: Hammer,        color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', label: 'Maintenance' },
};

export default function Announcements() {
  const { subscribe } = useSocket() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data } = await announcementAPI.getAll({ limit: 30 });
      setItems(data.data || []);
    } catch { toast.error('Failed to load announcements'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!subscribe) return;
    const u = subscribe('new_announcement', (a) => {
      setItems(prev => [a, ...prev]);
    });
    return () => { u && u(); };
  }, [subscribe]);

  // Mark newest unread as read
  useEffect(() => {
    items.filter(a => !a._readMarked).slice(0, 3).forEach(a => {
      announcementAPI.markRead(a._id).catch(() => {});
    });
  }, [items]);

  const pinned = items.filter(a => a.isPinned);
  const rest   = items.filter(a => !a.isPinned);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <RefreshCw size={20} className="animate-spin" style={{ color: '#6366F1' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 4px 40px' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #4338CA 0%, #6366F1 55%, #818CF8 100%)',
        borderRadius: 20, padding: '22px 20px', color: '#fff', marginBottom: 18,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Megaphone size={22}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.85 }}>FROM YOUR ESTATE MANAGER</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '2px 0 0', lineHeight: 1.2 }}>Announcements</h1>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>Notices, events, and updates for your community.</div>
          </div>
        </div>
      </div>

      {/* Live announcement banner (if a manager is on air right now) */}
      <DJLive only="announcement" />

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: '#EEF2FF', color: '#4F46E5', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Megaphone size={24}/>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>No announcements yet</div>
          <div style={{ fontSize: 13 }}>When management posts a notice, you'll see it here.</div>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Pin size={11}/> Pinned
              </div>
              {pinned.map(a => <AnnouncementCard key={a._id} a={a} pinned />)}
            </div>
          )}
          {rest.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Recent</div>
              )}
              {rest.map(a => <AnnouncementCard key={a._id} a={a} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AnnouncementCard({ a, pinned }) {
  const meta = CAT_META[a.category] || CAT_META.general;
  const Icon = meta.Icon;
  return (
    <div style={{
      background: '#fff', border: `1px solid ${pinned ? meta.border : '#E2E8F0'}`,
      borderRadius: 14, padding: '16px 18px', marginBottom: 10,
      boxShadow: pinned ? `0 2px 12px ${meta.color}18` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: meta.bg, border: `1px solid ${meta.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: meta.color }}>
          <Icon size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>{a.title}</h3>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: meta.color, background: meta.bg, border: `1px solid ${meta.border}`, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {meta.label}
            </span>
            {pinned && <Pin size={12} style={{ color: meta.color }}/>}
          </div>
          <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.6, margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{a.body}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94A3B8' }}>
            <Clock size={11}/> {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
            {a.authorId?.name && (<>· {a.authorId.name}</>)}
            {typeof a.readBy?.length === 'number' && (<>· <Users size={11}/> {a.readBy.length} read</>)}
          </div>
        </div>
      </div>
    </div>
  );
}
