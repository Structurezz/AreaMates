import { useEffect, useState } from 'react';
import api from '../api/axios';

// The estate's plan, shared across the app. Kept per estate for 5 minutes so
// an upgrade (or a comp plan given by AreaConnect) reaches residents without
// a full reload, and one resident's plan never leaks into another's session.
const TTL = 5 * 60 * 1000;
let cached = null; // { key, at, data }
// The access token carries the user and estate ids — key the cache on them
const keyOf = () => {
  try {
    const t = localStorage.getItem('accessToken');
    if (!t) return null;
    const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return `${p.userId || ''}:${p.estateId || ''}`;
  } catch { return 'me'; }
};

export function usePlan() {
  const fresh = cached && cached.key === keyOf() && Date.now() - cached.at < TTL ? cached.data : null;
  const [sub, setSub] = useState(fresh);
  const [loading, setLoading] = useState(!fresh);

  useEffect(() => {
    if (fresh) return;
    api.get('/plans/my-subscription')
      .then(({ data }) => {
        cached = { key: keyOf(), at: Date.now(), data: data.data };
        setSub(data.data);
      })
      .catch(() => setSub(null))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A live comp plan (promo / VIP / gift from AreaConnect) overrides the
  // billed plan, same as the manager app — residents get what their estate has.
  const activePlan = sub?.effectivePlan || sub?.planId || null;
  const features = activePlan?.features || {};
  const planName = activePlan?.name || 'Free';
  const planColor = activePlan?.color || '#6B7280';
  const status = sub?.status || 'trial';

  const can = (featureKey) => {
    if (features[featureKey] === undefined) return true;
    if (typeof features[featureKey] === 'boolean') return features[featureKey];
    if (typeof features[featureKey] === 'number') return features[featureKey] !== 0;
    return features[featureKey] !== 'none';
  };

  return { sub, loading, features, planName, planColor, status, can };
}
