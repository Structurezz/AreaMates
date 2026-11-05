import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { siteAPI } from '../api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { siteConfigFrom, siteWords, rememberSiteType, roleOfUser, preAuthSiteType } from '../utils/siteTypes';

// The member's site (estate / school / hotel / industrial / hospital): the words
// the app uses, which modules are on and the visitor pass categories. Renders
// from the estate's `site` on the signed-in user straight away (estate defaults
// otherwise), then from GET /api/site; refreshed on the `site_update` socket
// event and when a call comes back 403 MODULE_OFF (axios fires `site:refresh`).

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const { user } = useAuth();
  const socketCtx = useSocket();
  const subscribe = socketCtx?.subscribe;
  const estate = user?.estateId && typeof user.estateId === 'object' ? user.estateId : null;
  // Before the user (and their estate) has loaded, render with the type this
  // device last signed in to (or ?site=), so loaders don't say "estate" at a hospital.
  const fallback = useMemo(() => siteConfigFrom(estate?.site?.type ? estate.site : { ...(estate?.site || {}), type: preAuthSiteType() }), [estate?.site]);
  const [remote, setRemote] = useState(null);
  const userId = user?._id || null;
  const lastFetch = useRef(0);

  const refresh = useCallback(async (force = false) => {
    if (!localStorage.getItem('accessToken')) return;
    if (!force && Date.now() - lastFetch.current < 3000) return;
    lastFetch.current = Date.now();
    try {
      const { data } = await siteAPI.get();
      if (data?.data) { setRemote(data.data); rememberSiteType(data.data.type); }
    } catch { /* keep what we have */ }
  }, []);

  useEffect(() => {
    if (!userId) { setRemote(null); return; }
    refresh(true);
  }, [userId, refresh]);

  // A feature was switched off under us — re-read the config
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener('site:refresh', h);
    return () => window.removeEventListener('site:refresh', h);
  }, [refresh]);

  useEffect(() => {
    if (!userId || !subscribe) return undefined;
    return subscribe('site_update', (payload) => {
      if (payload && payload.type) setRemote((prev) => ({ ...(prev || {}), ...payload }));
      else refresh(true);
    });
  }, [userId, subscribe, refresh]);

  const value = useMemo(() => {
    const cfg = remote ? { ...fallback, ...remote } : fallback;
    const modules = { ...fallback.modules, ...(remote?.modules || {}) };
    const terms = { ...fallback.terms, ...(remote?.terms || {}) };
    const isEstate = cfg.type === 'estate';
    // Site roles (patient / doctor / nurse / guest / housekeeping…). Estates have none.
    const roles = Array.isArray(remote?.roles) && remote.roles.length ? remote.roles : fallback.roles;
    const requestKinds = Array.isArray(remote?.requestKinds) ? remote.requestKinds : fallback.requestKinds;
    const myRole = roleOfUser(roles, user);
    const defaultRoleDef = roles?.find((r) => r.key === (remote?.defaultRole || fallback.defaultRole)) || roles?.[0] || null;
    return {
      ...cfg,
      terms,
      w: siteWords(terms),
      modules,
      name: remote?.name || estate?.name || terms.site,
      isEstate,
      roles,
      requestKinds,
      assignLabel: remote?.assignLabel ?? fallback.assignLabel,
      defaultRole: defaultRoleDef?.key || '',
      defaultRoleDef,
      myRole,
      // Staff (doctor, nurse, warden, housekeeping…) vs members — never for estates
      isStaff: !isEstate && !!myRole?.staff,
      loaded: !!remote,
      refresh,
      moduleOn: (key) => !key || modules[key] !== false,
    };
  }, [remote, fallback, estate?.name, refresh, user]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

const ESTATE_FALLBACK = (() => {
  const cfg = siteConfigFrom({ type: preAuthSiteType() });
  return { ...cfg, w: siteWords(cfg.terms), name: cfg.terms.site, isEstate: cfg.type === 'estate', myRole: cfg.roles[0], defaultRoleDef: cfg.roles[0], isStaff: false, loaded: false, refresh: () => {}, moduleOn: (k) => !k || cfg.modules[k] !== false };
})();

export const useSite = () => useContext(SiteContext) || ESTATE_FALLBACK;
