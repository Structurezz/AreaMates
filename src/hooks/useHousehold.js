import { useAuth } from '../context/AuthContext';

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

export function useHousehold() {
  const { user } = useAuth();
  const isMember = user?.householdRole === 'member';
  const perms = user?.householdPermissions || [];
  const head = isMember && user?.householdHead && typeof user.householdHead === 'object' ? user.householdHead : null;
  return {
    isMember,
    isHead: !!user && !isMember,
    head,
    allowed: (perm) => !perm || !isMember || perms.includes(perm),
  };
}
