import { useState, useEffect } from 'react';
import { alertAPI } from '../api';
import Badge, { alertTypeBadge, alertStatusBadge } from '../components/ui/Badge';
import { Bell, Shield, Flame, Heart, Volume2, AlertTriangle, Megaphone, MapPin, Phone, Users, Briefcase } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { upsertAlert } from '../utils/alertEvents';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';

const SEVERITY_STYLE = {
  critical: { badge: 'bg-red-50 text-red-600 border border-red-200',    bar: 'bg-red-500' },
  high:     { badge: 'bg-orange-50 text-orange-600 border border-orange-200', bar: 'bg-orange-500' },
  medium:   { badge: 'bg-amber-50 text-amber-600 border border-amber-200',   bar: 'bg-amber-500' },
  low:      { badge: 'bg-blue-50 text-blue-600 border border-blue-200',       bar: 'bg-blue-500' },
};

const ALERT_TYPES = [
  { type: 'security', icon: Shield,        label: 'Security Threat',   color: 'text-red-600' },
  { type: 'fire',     icon: Flame,         label: 'Fire Emergency',    color: 'text-orange-600' },
  { type: 'medical',  icon: Heart,         label: 'Medical Emergency', color: 'text-blue-600' },
  { type: 'noise',    icon: Volume2,       label: 'Noise Complaint',   color: 'text-amber-600' },
  { type: 'other',    icon: AlertTriangle, label: 'Other',             color: 'text-slate-500' },
];

// Who a resident's alert goes to. Residents can't alert other residents —
// estate-wide broadcasts are for security / management only.
const TARGETS = [
  { value: 'staff',          label: 'Security + Management', sub: 'Everyone on duty',  Icon: Users,     button: 'ALERT SECURITY + MANAGEMENT' },
  { value: 'security',       label: 'Security only',         sub: 'Gate & patrol team', Icon: Shield,    button: 'ALERT SECURITY NOW' },
  { value: 'estate_manager', label: 'Management only',       sub: 'Estate manager',     Icon: Briefcase, button: 'ALERT MANAGEMENT' },
];
const TARGET_LABEL = { staff: 'Security + Management', security: 'Security', estate_manager: 'Management', all: 'Everyone' };

const PAGE_SIZE = 10;

export default function AlertPage() {
  const [selectedType, setSelectedType] = useState('security');
  const [target, setTarget] = useState('staff');
  const { subscribe } = useSocket() || {};
  const targetCfg = TARGETS.find((t) => t.value === target) || TARGETS[0];
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [myAlerts, setMyAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const loadAlerts = async (p = 1) => {
    setLoadingAlerts(true);
    try {
      const { data } = await alertAPI.getAll({ page: p, limit: PAGE_SIZE });
      setMyAlerts(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
    } catch { } finally { setLoadingAlerts(false); }
  };

  const handlePage = (p) => { setPage(p); loadAlerts(p); };

  useEffect(() => { loadAlerts(1); }, []);

  // Live status on the resident's own alerts (acknowledged / resolved) and
  // new estate broadcasts.
  useEffect(() => {
    if (!subscribe) return;
    return subscribe('new_alert', (alert) => setMyAlerts((prev) => upsertAlert(prev, alert)));
  }, [subscribe]);

  const handleAlert = async () => {
    setSending(true);
    try {
      const { data } = await alertAPI.create({ type: selectedType, note, audience: target });
      toast.success(data?.message || 'Alert sent. Help is on the way.', { duration: 5000 });
      setNote('');
      setPage(1);
      loadAlerts(1);
    } catch {
      toast.error('Failed to send alert. Try again!');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold mb-1" style={{ color: '#0F172A', letterSpacing: '-0.03em' }}>
          Raise an Alert
        </h1>
        <p className="text-sm" style={{ color: '#64748B' }}>Choose what's happening and who should respond</p>
      </div>

      {/* Alert type selection */}
      <div className="glass-card p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#94A3B8' }}>
          Select Alert Type
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-4">
          {ALERT_TYPES.map(({ type, icon: Icon, label, color }) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className="p-3 rounded-xl border text-left transition-all"
              style={selectedType === type
                ? { borderColor: 'rgba(16,185,129,0.40)', background: 'rgba(16,185,129,0.08)' }
                : { borderColor: '#E2E8F0', background: '#F8FAFC' }
              }
              onMouseEnter={e => { if (selectedType !== type) e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={e => { if (selectedType !== type) e.currentTarget.style.background = '#F8FAFC'; }}
            >
              <Icon size={20} className={`mb-1.5 ${color}`} />
              <div className="text-xs font-medium" style={{ color: '#475569' }}>{label}</div>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>
            Send to
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {TARGETS.map(({ value, label, sub, Icon }) => {
              const active = target === value;
              return (
                <button key={value} type="button" onClick={() => setTarget(value)}
                  className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1.5 p-3 rounded-xl border text-left transition-all"
                  style={active
                    ? { borderColor: 'rgba(99,102,241,0.45)', background: 'rgba(99,102,241,0.08)' }
                    : { borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                  <Icon size={18} style={{ color: active ? '#4F46E5' : '#64748B', flexShrink: 0 }} />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold" style={{ color: active ? '#3730A3' : '#334155' }}>{label}</span>
                    <span className="block text-[11px]" style={{ color: '#94A3B8' }}>{sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>
            Add a note (optional)
          </label>
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
          {sending ? 'Sending Alert...' : targetCfg.button}
        </button>

        <p className="text-center text-xs mt-3" style={{ color: '#CBD5E1' }}>
          {TARGET_LABEL[target]} will be alerted immediately with your name, unit and phone number.
          {['security', 'fire', 'medical'].includes(selectedType) && ' They also get an email.'} In immediate danger, call 112.
        </p>
      </div>

      {/* Alert history */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
          <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>Alerts &amp; Broadcasts</h2>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Your alerts (with live status) and estate-wide broadcasts</p>
        </div>

        {loadingAlerts ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : myAlerts.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: '#94A3B8' }}>No alerts or broadcasts yet</p>
        ) : (
          <div>
            {myAlerts.map((a) => {
              if (a.isEmergencyBroadcast) {
                const sev = a.severity || 'high';
                const style = SEVERITY_STYLE[sev] || SEVERITY_STYLE.high;
                return (
                  <div key={a._id} className="p-4" style={{ borderBottom: '1px solid rgba(15,23,42,0.05)', background: '#FFFBEB' }}>
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
                      >
                        <Megaphone size={14} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#D97706' }}>
                            Estate Broadcast
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${style.badge}`}>{sev}</span>
                        </div>
                        <p className="text-sm font-semibold leading-snug" style={{ color: '#0F172A' }}>
                          {a.title || a.type?.replace('_', ' ') || 'Broadcast'}
                        </p>
                        {a.note && <p className="text-xs mt-1 leading-relaxed" style={{ color: '#64748B' }}>{a.note}</p>}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {a.location && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}>
                              <MapPin size={10} />{a.location}
                            </span>
                          )}
                          {a.actionRequired && (
                            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: '#D97706' }}>
                              <Shield size={10} />{a.actionRequired}
                            </span>
                          )}
                          {a.contactNumber && (
                            <span className="flex items-center gap-1 text-xs" style={{ color: '#94A3B8' }}>
                              <Phone size={10} />{a.contactNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-xs mt-1.5" style={{ color: '#CBD5E1' }}>
                          {format(new Date(a.createdAt), 'MMM d · HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={a._id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                  style={{ borderBottom: '1px solid rgba(15,23,42,0.05)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={a.status === 'open'
                      ? { background: '#FEF2F2' }
                      : { background: '#ECFDF5' }
                    }
                  >
                    <Bell size={13} className={a.status === 'open' ? 'text-red-500' : 'text-emerald-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium capitalize" style={{ color: '#0F172A' }}>
                      {a.type?.replace('_', ' ')}
                    </div>
                    {a.note && <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{a.note}</div>}
                    <div className="text-xs" style={{ color: '#CBD5E1' }}>
                      {format(new Date(a.createdAt), 'MMM d · HH:mm')}
                      {a.audience && ` · to ${TARGET_LABEL[a.audience] || a.audience}`}
                    </div>
                  </div>
                  <Badge variant={alertStatusBadge(a.status)}>{a.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
            <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={PAGE_SIZE} onPage={handlePage} />
          </div>
        )}
      </div>
    </div>
  );
}
