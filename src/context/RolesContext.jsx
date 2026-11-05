import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { siteAPI, alertAPI } from '../api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useSite } from './SiteContext';
import { playSiren, stopSiren } from '../utils/siren';
import { isOwnAlert } from '../utils/alertEvents';
import RoutedAlertModal from '../components/roles/RoutedAlertModal';
import AlertStatusSheet from '../components/roles/AlertStatusSheet';
import RollcallTakeover from '../components/roles/RollcallTakeover';

// Site roles at non-estate sites (hospital, school, university, hotel,
// industrial). App-wide state for:
//   team       — GET /api/site/my-team (my care team, or the people I look after)
//   routed     — alerts routed to me as staff → full-screen urgent alert
//   tracked    — the alert I just raised → live "who's coming" sheet
//   rollcall   — a running emergency roll-call → full-screen takeover
// Estates: everything is off and nothing renders.

const RolesContext = createContext(null);
const NOOP = { active: false, team: null, refreshTeam: () => {}, setTeam: () => {}, trackAlert: () => {}, openRouted: () => {}, rollcall: null, refreshRollcall: () => {}, setRollcall: () => {}, rollcallHidden: false, setRollcallHidden: () => {} };
export const useRoles = () => useContext(RolesContext) || NOOP;

const idOf = (x) => String(x?._id || x || '');
const myResponseOf = (alert, meId) => (alert?.responders || []).find((r) => idOf(r.userId) === meId);
export const isRoutedTo = (alert, meId) => !!meId && (!!alert?.routed || (alert?.routedTo || []).some((x) => idOf(x) === meId));

export function RolesProvider({ children }) {
  const { user } = useAuth();
  const { subscribe } = useSocket() || {};
  const site = useSite();
  const meId = user?._id ? String(user._id) : '';
  const active = !!user && user.role === 'resident' && !site.isEstate;
  const rollcallOn = active && site.moduleOn('rollcall');

  // ── My team ────────────────────────────────────────────────────────────
  const [team, setTeam] = useState(null);
  const refreshTeam = useCallback(async () => {
    if (!active) return;
    try { const { data } = await siteAPI.myTeam(); setTeam(data.data || null); } catch { /* keep */ }
  }, [active]);
  useEffect(() => { if (active) refreshTeam(); else setTeam(null); }, [active, meId, refreshTeam]);

  // ── Routed alerts (staff) ──────────────────────────────────────────────
  const [routed, setRouted] = useState([]); // queue, first is shown
  const seen = useRef(new Set());
  const openRouted = useCallback((alert) => {
    if (!alert?._id) return;
    setRouted((q) => [alert, ...q.filter((a) => a._id !== alert._id)]);
  }, []);
  const closeRouted = useCallback((id) => {
    setRouted((q) => {
      const next = q.filter((a) => a._id !== id);
      if (!next.length) stopSiren();
      return next;
    });
  }, []);
  const patchRouted = useCallback((alert) => {
    setRouted((q) => q.map((a) => (a._id === alert._id ? { ...a, ...alert } : a)));
  }, []);

  // ── My raised alert (members) ──────────────────────────────────────────
  const [tracked, setTracked] = useState(null);
  const trackAlert = useCallback((alert) => { if (active && alert?._id) setTracked(alert); }, [active]);

  // While the sheet is open, re-read the alert (escalation isn't pushed to the raiser)
  useEffect(() => {
    if (!tracked?._id || tracked.status === 'resolved') return undefined;
    const t = setInterval(async () => {
      try {
        const { data } = await alertAPI.getAll({ limit: 10 });
        const a = (data.data || []).find((x) => x._id === tracked._id);
        if (a) setTracked((prev) => (prev && prev._id === a._id ? { ...prev, ...a } : prev));
      } catch { /* ignore */ }
    }, 20000);
    return () => clearInterval(t);
  }, [tracked?._id, tracked?.status]);

  // ── Socket: alerts ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !subscribe) return undefined;
    return subscribe('new_alert', (alert) => {
      if (!alert?._id) return;
      // The raiser's live status sheet
      setTracked((prev) => (prev && prev._id === alert._id ? { ...prev, ...alert } : prev));
      if (isOwnAlert(alert, meId)) {
        if (alert.action === 'responded') {
          const r = (alert.responders || []).find((x) => idOf(x.userId) === idOf(alert.actedBy?._id));
          if (r?.status === 'on_my_way') toast.success(`${r.name}${r.role ? ` (${r.role})` : ''} is on the way`, { duration: 7000 });
          else if (r?.status === 'arrived') toast.success(`${r.name} has arrived`, { duration: 6000 });
        }
        return;
      }
      if (!isRoutedTo(alert, meId)) return;
      if (alert.action || alert.status === 'resolved') {
        if (alert.status === 'resolved') closeRouted(alert._id); else patchRouted(alert);
        return;
      }
      const mine = myResponseOf(alert, meId);
      if (mine && mine.status !== 'cannot') return; // already on it
      const key = `${alert._id}:${alert.escalatedAt ? 'e' : ''}`;
      if (seen.current.has(key)) { patchRouted(alert); return; }
      seen.current.add(key);
      openRouted(alert);
      playSiren({ durationMs: 60000 });
      window.dispatchEvent(new CustomEvent('roles:alerts'));
    });
  }, [active, subscribe, meId, openRouted, closeRouted, patchRouted]);

  // ── Roll-call ──────────────────────────────────────────────────────────
  const [rollcall, setRollcall] = useState(null);
  const [rollcallHidden, setRollcallHidden] = useState(false); // managers can step out of the takeover
  const rcRef = useRef(null);
  rcRef.current = rollcall;
  const refreshRollcall = useCallback(async () => {
    if (!rollcallOn) return;
    try {
      const { data } = await siteAPI.activeRollcall();
      setRollcall(data.data || null);
    } catch { /* keep */ }
  }, [rollcallOn]);
  useEffect(() => { if (rollcallOn) refreshRollcall(); else setRollcall(null); }, [rollcallOn, meId, refreshRollcall]);
  useEffect(() => {
    if (!rollcallOn || !subscribe) return undefined;
    return subscribe('rollcall_update', (p) => {
      if (p?.action === 'ended') { setRollcall((rc) => (rc && (!p._id || rc._id === p._id) ? null : rc)); setRollcallHidden(false); return; }
      if (p?.action === 'started' && (!rcRef.current || idOf(rcRef.current._id) !== idOf(p._id))) setRollcallHidden(false);
      // Others' answers only matter to the people running it (live counts)
      if (p?.action === 'response' && rcRef.current && !rcRef.current.canManage && idOf(p.userId) !== meId) return;
      refreshRollcall();
    });
  }, [rollcallOn, subscribe, refreshRollcall, meId]);
  const running = !!rollcall && !rollcall.endedAt;
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(refreshRollcall, 30000);
    return () => clearInterval(t);
  }, [running, refreshRollcall]);

  const value = useMemo(() => ({
    active, team, refreshTeam, setTeam, trackAlert, openRouted,
    rollcall: running ? rollcall : null, refreshRollcall, setRollcall, rollcallHidden, setRollcallHidden,
  }), [active, team, refreshTeam, trackAlert, openRouted, running, rollcall, refreshRollcall, rollcallHidden]);

  return (
    <RolesContext.Provider value={value}>
      {children}
      {active && (
        <>
          {tracked && <AlertStatusSheet alert={tracked} team={team} onClose={() => setTracked(null)} />}
          {running && !rollcall.myResponse && !rollcallHidden && (
            <RollcallTakeover rollcall={rollcall} onAnswered={setRollcall} onHide={rollcall.canManage ? () => setRollcallHidden(true) : null} />
          )}
          {routed[0] && (
            <RoutedAlertModal key={routed[0]._id} alert={routed[0]} meId={meId} more={routed.length - 1}
              onUpdate={patchRouted} onClose={() => closeRouted(routed[0]._id)} />
          )}
        </>
      )}
    </RolesContext.Provider>
  );
}
