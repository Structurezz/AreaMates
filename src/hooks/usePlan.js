import { useEffect, useState } from 'react';
import api from '../api/axios';

let cached = null;

export function usePlan() {
  const [sub, setSub] = useState(cached);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    api.get('/plans/my-subscription')
      .then(({ data }) => {
        cached = data.data;
        setSub(data.data);
      })
      .catch(() => setSub(null))
      .finally(() => setLoading(false));
  }, []);

  const features = sub?.planId?.features || {};
  const planName = sub?.planId?.name || 'Free';
  const planColor = sub?.planId?.color || '#6B7280';
  const status = sub?.status || 'trial';

  const can = (featureKey) => {
    if (features[featureKey] === undefined) return true;
    if (typeof features[featureKey] === 'boolean') return features[featureKey];
    if (typeof features[featureKey] === 'number') return features[featureKey] !== 0;
    return features[featureKey] !== 'none';
  };

  return { sub, loading, features, planName, planColor, status, can };
}
