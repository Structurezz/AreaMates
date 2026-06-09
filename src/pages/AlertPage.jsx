import { useState, useEffect } from 'react';
import { alertAPI } from '../api';
import Badge, { alertTypeBadge, alertStatusBadge } from '../components/ui/Badge';
import { Bell, Shield, Flame, Heart, Volume2, AlertTriangle, Megaphone, MapPin, Phone, Zap } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Spinner from '../components/ui/Spinner';

const SEVERITY_STYLE = {
  critical: { badge: 'bg-red-500/15 text-red-400 border border-red-500/25',    bar: 'bg-red-500' },
  high:     { badge: 'bg-orange-500/15 text-orange-400 border border-orange-500/25', bar: 'bg-orange-500' },
  medium:   { badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',   bar: 'bg-amber-500' },
  low:      { badge: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',       bar: 'bg-blue-500' },
};

const ALERT_TYPES = [
  { type: 'security', icon: Shield, label: 'Security Threat', color: 'text-red-400' },
  { type: 'fire', icon: Flame, label: 'Fire Emergency', color: 'text-orange-400' },
  { type: 'medical', icon: Heart, label: 'Medical Emergency', color: 'text-blue-400' },
  { type: 'noise', icon: Volume2, label: 'Noise Complaint', color: 'text-yellow-400' },
  { type: 'other', icon: AlertTriangle, label: 'Other', color: 'text-white/60' },
];

export default function AlertPage() {
  const [selectedType, setSelectedType] = useState('security');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [myAlerts, setMyAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  const loadAlerts = async () => {
    try {
      const { data } = await alertAPI.getAll();
      setMyAlerts(data.data);
    } catch { } finally { setLoadingAlerts(false); }
  };

  useEffect(() => { loadAlerts(); }, []);

  const handleAlert = async () => {
    setSending(true);
    try {
      await alertAPI.create({ type: selectedType, note });
      toast.success('🚨 Security alerted! Help is on the way.', { duration: 4000 });
      setNote('');
      loadAlerts();
    } catch {
      toast.error('Failed to send alert. Try again!');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-white mb-1">Alert Security</h1>
        <p className="text-white/50 text-sm">Send an immediate alert to estate security</p>
      </div>

      {/* Alert type selection */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Select Alert Type</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-4">
          {ALERT_TYPES.map(({ type, icon: Icon, label, color }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedType === type
                  ? 'border-gold/60 bg-gold/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/8'
              }`}
            >
              <Icon size={20} className={`mb-1.5 ${color}`} />
              <div className="text-xs font-medium text-white/80">{label}</div>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="text-sm text-white/60 mb-1.5 block">Add a note (optional)</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Describe the situation briefly..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button
          onClick={handleAlert}
          disabled={sending}
          className="panic-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '1.1rem' }}
        >
          {!sending && <div className="pulse-ring" />}
          <Bell size={24} />
          {sending ? 'Sending Alert...' : 'ALERT SECURITY NOW'}
        </button>

        <p className="text-center text-xs text-white/30 mt-3">
          Security personnel will be notified immediately with your name, unit, and location.
        </p>
      </div>

      {/* Alert history */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">Alerts &amp; Broadcasts</h2>
          <p className="text-white/35 text-xs mt-0.5">Your alerts and estate-wide announcements</p>
        </div>

        {loadingAlerts ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : myAlerts.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-8">No alerts or broadcasts yet</p>
        ) : (
          <div className="divide-y divide-white/5">
            {myAlerts.map((a) => {
              if (a.isEmergencyBroadcast) {
                const sev = a.severity || 'high';
                const style = SEVERITY_STYLE[sev] || SEVERITY_STYLE.high;
                return (
                  <div key={a._id} className="p-4 bg-white/2">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Megaphone size={14} className="text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">Estate Broadcast</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>{sev}</span>
                        </div>
                        <p className="text-sm font-semibold text-white leading-snug">
                          {a.title || a.type?.replace('_', ' ') || 'Broadcast'}
                        </p>
                        {a.note && <p className="text-xs text-white/55 mt-1 leading-relaxed">{a.note}</p>}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {a.location && (
                            <span className="flex items-center gap-1 text-xs text-white/35">
                              <MapPin size={10} />{a.location}
                            </span>
                          )}
                          {a.actionRequired && (
                            <span className="flex items-center gap-1 text-xs text-amber-400/70">
                              <Shield size={10} />{a.actionRequired}
                            </span>
                          )}
                          {a.contactNumber && (
                            <span className="flex items-center gap-1 text-xs text-white/35">
                              <Phone size={10} />{a.contactNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/25 mt-1.5">{format(new Date(a.createdAt), 'MMM d · HH:mm')}</div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={a._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/2 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    a.status === 'open' ? 'bg-red-500/15' : 'bg-emerald-500/15'}`}>
                    <Bell size={13} className={a.status === 'open' ? 'text-red-400' : 'text-emerald-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white capitalize">{a.type?.replace('_', ' ')}</div>
                    {a.note && <div className="text-xs text-white/40 truncate">{a.note}</div>}
                    <div className="text-xs text-white/25">{format(new Date(a.createdAt), 'MMM d · HH:mm')}</div>
                  </div>
                  <Badge variant={alertStatusBadge(a.status)}>{a.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
