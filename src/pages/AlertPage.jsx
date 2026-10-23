import { useState, useEffect } from 'react';
import { alertAPI } from '../api';
import { Shield, Flame, Heart, Volume2, AlertTriangle, Users, Briefcase } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { upsertAlert } from '../utils/alertEvents';
import toast from 'react-hot-toast';
import AlertsDesktop from '../components/alerts/AlertsDesktop';
import AlertsMobile from '../components/alerts/AlertsMobile';
import useIsDesktop from '../hooks/useIsDesktop';

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
  const isDesktop = useIsDesktop();

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

  if (isDesktop) return (
    <AlertsDesktop
      alertTypes={ALERT_TYPES} targets={TARGETS} targetLabel={TARGET_LABEL} targetCfg={targetCfg}
      selectedType={selectedType} setSelectedType={setSelectedType} target={target} setTarget={setTarget}
      note={note} setNote={setNote} sending={sending} onRaise={handleAlert}
      alerts={myAlerts} loading={loadingAlerts} page={page} pagination={pagination} onPage={handlePage}
    />
  );

  return (
    <AlertsMobile
      alertTypes={ALERT_TYPES} targets={TARGETS} targetLabel={TARGET_LABEL} targetCfg={targetCfg}
      selectedType={selectedType} setSelectedType={setSelectedType} target={target} setTarget={setTarget}
      note={note} setNote={setNote} sending={sending} onRaise={handleAlert}
      alerts={myAlerts} loading={loadingAlerts} page={page} pagination={pagination} pageSize={PAGE_SIZE} onPage={handlePage}
    />
  );
}
