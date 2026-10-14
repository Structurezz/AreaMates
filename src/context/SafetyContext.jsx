import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { safetyAPI } from '../api';
import { useSocket } from './SocketContext';

// Live location sharing with estate security + management. Lives app-wide so
// the share keeps running while the resident moves around the app; a banner
// (see SafetyShareBanner) shows whenever it's on. The server stops relaying
// after 60 minutes; we stop locally at the same point.

const SafetyContext = createContext(null);
export const useSafety = () => useContext(SafetyContext);

const MAX_MS = 60 * 60_000;
const MIN_SEND_GAP_MS = 4000;

export function SafetyProvider({ children }) {
  const { emit } = useSocket() || {};
  const [sharing, setSharing] = useState(null); // { startedAt, lastFix }
  const watchRef = useRef(null);
  const lastSentRef = useRef(0);
  const stopTimer = useRef(null);

  const clearWatch = () => {
    if (watchRef.current != null) navigator.geolocation?.clearWatch(watchRef.current);
    watchRef.current = null;
    clearTimeout(stopTimer.current);
  };

  const stopSharing = useCallback(async (silent = false) => {
    clearWatch();
    setSharing(null);
    try { await safetyAPI.stopLocation(); } catch {}
    if (!silent) toast('Stopped sharing your location', { icon: '📍' });
  }, []);

  /** Ask for location, start a share and stream fixes to staff. */
  const startSharing = useCallback(async () => {
    if (!navigator.geolocation) { toast.error('Location isn\'t available on this device'); return false; }
    // Permission prompt happens on the first fix.
    const first = await new Promise((resolve) => navigator.geolocation.getCurrentPosition(
      (p) => resolve(p), () => resolve(null), { enableHighAccuracy: true, timeout: 10000 }));
    if (!first) { toast.error('Allow location access to share it with security'); return false; }
    try { await safetyAPI.startLocation(); } catch { toast.error('Could not start sharing'); return false; }

    const send = (p) => {
      const now = Date.now();
      if (now - lastSentRef.current < MIN_SEND_GAP_MS) return;
      lastSentRef.current = now;
      const fix = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
      emit?.('safety:location', fix);
      setSharing((s) => (s ? { ...s, lastFix: { ...fix, at: now } } : s));
    };
    setSharing({ startedAt: Date.now(), lastFix: null });
    lastSentRef.current = 0;
    send(first);
    watchRef.current = navigator.geolocation.watchPosition(send, () => {}, { enableHighAccuracy: true, maximumAge: 5000 });
    stopTimer.current = setTimeout(() => stopSharing(), MAX_MS);
    toast.success('Security and estate management can now see your live location');
    return true;
  }, [emit, stopSharing]);

  /** One-off position for the panic alert (null if unavailable). */
  const getFix = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 });
  });

  useEffect(() => () => clearWatch(), []);

  return (
    <SafetyContext.Provider value={{ sharing, startSharing, stopSharing, getFix }}>
      {children}
    </SafetyContext.Provider>
  );
}
