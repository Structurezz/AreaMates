import { useEffect, useState } from 'react';
import { siteAPI } from '../api';
import { useAuth } from '../context/AuthContext';

// GET /api/site/places, shared between the map page and the dashboard card.
// Cached per user for a few minutes so moving between pages doesn't refetch.
let cache = null; // { userId, at, data }
const TTL = 5 * 60 * 1000;
const EMPTY = { places: [], center: null, site: null, myPlace: null, kinds: [] };

export default function useSitePlaces() {
  const { user } = useAuth();
  const userId = user?._id || null;
  const fresh = cache && cache.userId === userId && Date.now() - cache.at < TTL ? cache.data : null;
  const [data, setData] = useState(fresh);
  const [error, setError] = useState(false);

  const load = () => siteAPI.places()
    .then(({ data: res }) => {
      const next = {
        places: res.data || [], center: res.center || null, site: res.site || null,
        myPlace: res.myPlace || null, kinds: res.kinds || [],
      };
      cache = { userId, at: Date.now(), data: next };
      setData(next);
      setError(false);
    })
    .catch(() => { setError(true); setData((d) => d || EMPTY); });

  useEffect(() => {
    if (!userId || fresh) return;
    load();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...(data || EMPTY), loading: !data, error, reload: load };
}
