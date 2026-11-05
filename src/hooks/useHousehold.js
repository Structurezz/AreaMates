import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';

// Household access (server: utils/householdAccess). Heads — the residents the
// estate manager onboards — have everything; family members get the basics
// plus whatever their head switched on.
export const PERMISSION_LABELS = {
  visitors:    'Invite visitors',
  payments:    'Estate bills',
  chat:        'Community chat',
  community:   'Lounge & events',
  marketplace: 'Marketplace',
  neighbours:  'Call neighbours',
};

// Site module a household permission belongs to (server: utils/siteTypes).
// A feature shows only when its module is on for the site AND the household
// permission allows it. Pass an explicit module to override (events → 'events').
export const PERM_MODULE = {
  payments:    'payments',
  marketplace: 'marketplace',
  community:   'community',
  neighbours:  'neighbours',
};

export function useHousehold() {
  const { moduleOn } = useSite();
  const { user } = useAuth();
  const isMember = user?.householdRole === 'member';
  const perms = user?.householdPermissions || [];
  const head = isMember && user?.householdHead && typeof user.householdHead === 'object' ? user.householdHead : null;
  return {
    isMember,
    isHead: !!user && !isMember,
    head,
    // Household permission only (HouseholdGate)
    householdAllows: (perm) => !perm || !isMember || perms.includes(perm),
    // Site module on AND household permission allows it
    allowed: (perm, module) => moduleOn(module ?? PERM_MODULE[perm]) && (!perm || !isMember || perms.includes(perm)),
    moduleOn,
  };
}
