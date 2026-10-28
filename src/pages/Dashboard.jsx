import { useEffect, useState } from 'react';
import { visitorAPI, announcementAPI, alertAPI, estateAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Siren, X } from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import { CampaignModal, CampaignBanner } from '../components/campaigns/CampaignSlots';
import toast from 'react-hot-toast';
import Portal from '../components/ui/Portal';
import DesktopDashboard from '../components/dashboard/DesktopDashboard';
import MobileDashboard from '../components/dashboard/MobileDashboard';
import useIsDesktop from '../hooks/useIsDesktop';

export default function ResidentDashboard() {
  const { user } = useAuth();
  const [myVisitors, setMyVisitors] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [estate, setEstate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerting, setAlerting] = useState(false);
  const [showAlertConfirm, setShowAlertConfirm] = useState(false);
  const isDesktop = useIsDesktop();

  const estateId = user?.estateId?._id || user?.estateId;

  useEffect(() => {
    const calls = [
      visitorAPI.getAll({ limit: 4 }),
      announcementAPI.getAll({ limit: 4 }),
    ];
    if (estateId) calls.push(estateAPI.getOne(estateId));

    Promise.all(calls).then((results) => {
      const [v, a, e] = results;
      setMyVisitors(v.data.data);
      setAnnouncements(a.data.data);
      if (e) setEstate(e.data.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [estateId]);

  const handleAlert = async () => {
    setAlerting(true);
    setShowAlertConfirm(false);
    try {
      // One-tap panic: goes to everyone on duty (security + management).
      const { data } = await alertAPI.create({ type: 'security', audience: 'staff', note: 'Panic button pressed from the AreaMates dashboard' });
      toast.success(data?.message || 'Help is on the way.', { duration: 5000 });
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
  const firstName = user?.name?.split(' ')[0] || 'there';
  const estateName = estate?.name || (typeof user?.estateId === 'object' ? user.estateId.name : null) || 'Your Estate';
  const activeVisitors = myVisitors.filter((v) => v.status === 'active' || v.status === 'checked-in');

  // Confirm step for the SOS button (shared by phone and desktop layouts)
  const alertConfirm = showAlertConfirm && (
        <Portal>
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
          background: 'rgba(0,0,0,0.70)',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 360,
            overflow: 'hidden', boxShadow: '0 24px 64px rgba(239,68,68,0.25)',
            border: '2px solid #EF4444',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              padding: '22px 20px 18px', textAlign: 'center', position: 'relative',
            }}>
              <button
                onClick={() => setShowAlertConfirm(false)}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(255,255,255,0.2)', border: 'none',
                  borderRadius: 8, width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}
              ><X size={14} /></button>
              <div style={{
                width: 56, height: 56, borderRadius: 99,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px',
              }}>
                <Siren size={26} color="#fff" />
              </div>
              <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>Send Emergency Alert?</h2>
            </div>

            <div style={{ padding: '18px 20px 22px' }}>
              <p style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6, margin: '0 0 18px', textAlign: 'center' }}>
                Security and estate management will be alerted immediately with your name, unit and phone number.
              </p>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: '-8px 0 16px', textAlign: 'center' }}>
                Fire, medical or want to choose who's alerted?{' '}
                <Link to="/alerts" onClick={() => setShowAlertConfirm(false)} style={{ color: '#4F46E5', fontWeight: 600 }}>Use the full alert page</Link>
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowAlertConfirm(false)}
                  style={{
                    flex: 1, padding: '12px', background: '#F1F5F9',
                    color: '#64748B', border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}
                >Cancel</button>
                <button
                  onClick={handleAlert}
                  disabled={alerting}
                  style={{
                    flex: 2, padding: '12px', background: '#EF4444',
                    color: '#fff', border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {alerting ? 'Sending...' : 'Yes, send alert'}
                </button>
              </div>
            </div>
          </div>
        </div>
        </Portal>
  );

  if (isDesktop) return (
    <>
      <CampaignModal />
      <DesktopDashboard
        myVisitors={myVisitors} announcements={announcements} estate={estate}
        estateName={estateName} firstName={firstName} unitLabel={unitLabel}
        activeVisitors={activeVisitors} alerting={alerting} onSOS={() => setShowAlertConfirm(true)}
      />
      {alertConfirm}
    </>
  );

  return (
    <>
      <CampaignModal />
      <MobileDashboard
        user={user} myVisitors={myVisitors} announcements={announcements} estate={estate}
        estateName={estateName} firstName={firstName} unitLabel={unitLabel}
        activeVisitors={activeVisitors} alerting={alerting} onSOS={() => setShowAlertConfirm(true)}
      />
      {alertConfirm}
    </>
  );
}
