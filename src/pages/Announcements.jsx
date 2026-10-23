import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { announcementAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';
import AnnouncementsDesktop from '../components/announcements/AnnouncementsDesktop';
import AnnouncementsMobile from '../components/announcements/AnnouncementsMobile';
import useIsDesktop from '../hooks/useIsDesktop';

export default function Announcements() {
  const { subscribe } = useSocket() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDesktop = useIsDesktop();

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

  if (!isDesktop) return <AnnouncementsMobile items={items} loading={loading} />;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <RefreshCw size={20} className="animate-spin" style={{ color: '#6366F1' }} />
    </div>
  );

  return <AnnouncementsDesktop items={items} />;
}
