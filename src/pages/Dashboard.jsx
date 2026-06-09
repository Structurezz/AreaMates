import { useEffect, useState } from 'react';
import { visitorAPI, announcementAPI, alertAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  UserCheck, Bell, Megaphone, Plus, Pin,
  ShoppingBag, MessageSquare, Home, AlertTriangle,
  ChevronRight, Shield, Clock
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import { visitorStatusBadge } from '../components/ui/Badge';
import { format } from 'date-fns';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

const CATEGORY_COLORS = {
  general: 'text-blue-400', urgent: 'text-red-400',
  event: 'text-gold', maintenance: 'text-yellow-400',
};

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [myVisitors, setMyVisitors] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerting, setAlerting] = useState(false);

  useEffect(() => {
    Promise.all([
      visitorAPI.getAll({ limit: 4 }),
      announcementAPI.getAll({ limit: 5 }),
    ]).then(([v, a]) => {
      setMyVisitors(v.data.data);
      setAnnouncements(a.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleAlert = async () => {
    if (!confirm('Send security alert to the gate? Security will be notified immediately.')) return;
    setAlerting(true);
    try {
      await alertAPI.create({ type: 'security', note: 'Resident triggered alert from dashboard' });
      toast.success('Security alerted! Help is on the way.', { duration: 5000 });
    } catch {
      toast.error('Failed to send alert. Try again.');
    } finally {
      setAlerting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Spinner /></div>;

  const unitLabel = user?.unitId
    ? `Unit ${user.unitId.unitNumber}${user.unitId.block ? ` · Block ${user.unitId.block}` : ''}`
    : null;

  const activeVisitors = myVisitors.filter((v) => v.status === 'active' || v.status === 'checked-in');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome card */}
      <div className="glass-card-gold p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white mb-1">
              Welcome, {user?.name?.split(' ')[0]}
            </h1>
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <Home size={13} />
              {unitLabel || <span className="italic text-white/30">No unit assigned</span>}
            </div>
          </div>
          {/* Panic button — compact in header */}
          <button
            onClick={handleAlert}
            disabled={alerting}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-red-900/30 relative overflow-hidden"
          >
            <div className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-30" />
            <Shield size={16} />
            {alerting ? 'Alerting...' : 'ALERT SECURITY'}
          </button>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: 'Active Passes', value: activeVisitors.length, color: 'text-emerald-400' },
            { label: 'Total Visitors', value: myVisitors.length, color: 'text-blue-400' },
            { label: 'Notices', value: announcements.length, color: 'text-gold' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
              <div className={`text-xl font-bold font-display ${color}`}>{value}</div>
              <div className="text-white/40 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick nav links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/resident/visitors/new', icon: UserCheck, label: 'Invite Visitor', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
          { to: '/resident/marketplace', icon: ShoppingBag, label: 'Marketplace', color: 'text-gold bg-gold/10 border-gold/20' },
          { to: '/resident/chat', icon: MessageSquare, label: 'Community Chat', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
          { to: '/resident/alerts', icon: Bell, label: 'Alert Center', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
        ].map(({ to, icon: Icon, label, color }) => (
          <Link key={to} to={to}
            className="glass-card p-4 hover:border-gold/30 transition-all flex flex-col items-center text-center gap-2 group">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${color}`}>
              <Icon size={18} />
            </div>
            <span className="text-white/65 group-hover:text-white text-xs font-medium transition-colors leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My Visitor Passes */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
            <h2 className="font-display font-semibold text-white flex items-center gap-2">
              <UserCheck size={17} className="text-gold" /> My Visitor Passes
            </h2>
            <Link to="/visitors/new" className="btn-primary text-xs px-3 py-1.5 gap-1">
              <Plus size={12} /> New Pass
            </Link>
          </div>

          {myVisitors.length === 0 ? (
            <div className="p-8 text-center">
              <UserCheck size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-white/35 text-sm mb-3">No visitors registered yet</p>
              <Link to="/visitors/new" className="btn-primary text-sm gap-1.5">
                <Plus size={14} /> Invite Your First Visitor
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {myVisitors.map((v) => (
                <div key={v._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-semibold text-sm flex-shrink-0">
                    {v.visitorName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">{v.visitorName}</div>
                    <div className="flex items-center gap-1.5 text-white/35 text-xs">
                      <Clock size={10} />
                      {format(new Date(v.expectedDate), 'MMM d, p')}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
                    <span className="font-mono text-gold/60 text-xs">{v.visitorCode}</span>
                  </div>
                </div>
              ))}
              <div className="px-5 py-3">
                <Link to="/visitors" className="text-gold text-xs hover:underline flex items-center gap-1">
                  View all passes <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Estate Announcements */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10">
            <h2 className="font-display font-semibold text-white flex items-center gap-2">
              <Megaphone size={17} className="text-gold" /> Estate Notices
            </h2>
          </div>

          {announcements.length === 0 ? (
            <div className="p-8 text-center">
              <Megaphone size={32} className="text-white/15 mx-auto mb-2" />
              <p className="text-white/35 text-sm">No announcements yet</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {announcements.map((a) => (
                <div key={a._id} className="px-5 py-4 hover:bg-white/3 transition-colors">
                  <div className="flex items-start gap-2 mb-1.5">
                    {a.isPinned && <Pin size={12} className="text-gold mt-0.5 flex-shrink-0" />}
                    <div>
                      <div className="font-medium text-white text-sm leading-tight">{a.title}</div>
                      <div className={`text-xs font-medium capitalize ${CATEGORY_COLORS[a.category] || 'text-white/40'}`}>
                        {a.category}
                      </div>
                    </div>
                  </div>
                  <p className="text-white/45 text-xs line-clamp-2 mb-2">{a.body}</p>
                  <div className="text-white/25 text-xs">
                    {format(new Date(a.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full-width panic */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-400" /> Emergency
        </h2>
        <button
          onClick={handleAlert}
          disabled={alerting}
          className="panic-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
        >
          <div className="pulse-ring" />
          <Bell size={22} />
          {alerting ? 'SENDING ALERT...' : 'ALERT SECURITY NOW'}
        </button>
        <p className="text-center text-xs text-white/25 mt-2">
          Instantly notifies all security personnel with your name and unit number
        </p>
      </div>
    </div>
  );
}
