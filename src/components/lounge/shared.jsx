// Shared bits for the Lounge feed (Instagram-style social hub).

const SERVER_URL = (import.meta.env.VITE_API_URL || 'https://areaconnectapi-production.up.railway.app/api').replace('/api', '');
export const imgUrl = (path) => {
  if (!path) return path;
  if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) return path;
  return `${SERVER_URL}${path}`;
};

export function timeAgo(iso, long = false) {
  const s = (Date.now() - new Date(iso)) / 1000;
  const fmt = (n, unit) => (long ? `${n} ${unit}${n === 1 ? '' : 's'} ago` : `${n}${unit[0]}`);
  if (s < 60) return 'just now';
  if (s < 3600) return fmt(Math.floor(s / 60), 'minute');
  if (s < 86400) return fmt(Math.floor(s / 3600), 'hour');
  if (s < 604800) return fmt(Math.floor(s / 86400), 'day');
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

// Story ring — AreaMates indigo theme
export const RING = 'linear-gradient(45deg,#818CF8 0%,#6366F1 45%,#4F46E5 75%,#7C3AED 100%)';
export const BRAND_GRADIENT = 'linear-gradient(90deg,#6366F1,#4F46E5)';
const AVATAR_COLORS = ['#6366F1', '#10B981', '#EC4899', '#F59E0B', '#0EA5E9', '#8B5CF6'];

/** ring: 'story' (gradient) | 'seen' (grey) | null */
export function Avatar({ person, size = 36, ring = null }) {
  const name = person?.name || '?';
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const inner = person?.profilePhoto ? (
    <img src={imgUrl(person.profilePhoto)} alt="" className="w-full h-full rounded-full object-cover" />
  ) : (
    <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-white"
      style={{ background: AVATAR_COLORS[initials.charCodeAt(0) % AVATAR_COLORS.length], fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
  if (!ring) return <div className="shrink-0" style={{ width: size, height: size }}>{inner}</div>;
  return (
    <div className="shrink-0 rounded-full p-[2.5px]" style={{ width: size + 7, height: size + 7, background: ring === 'story' ? RING : '#CBD5E1' }}>
      <div className="w-full h-full rounded-full bg-white p-[2px]">{inner}</div>
    </div>
  );
}

export const isManagerRole = (role) => role === 'estate_manager' || role === 'super_admin';

/** Blue "verified" tick for estate management posts. */
export function VerifiedTick({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Estate management" className="shrink-0">
      <path fill="#3897F0" d="M12 1l2.6 2.1 3.3-.4.9 3.2 3 1.5-1.1 3.1 1.1 3.1-3 1.5-.9 3.2-3.3-.4L12 23l-2.6-2.1-3.3.4-.9-3.2-3-1.5L3.3 13.5 2.2 10.4l3-1.5.9-3.2 3.3.4z" />
      <path fill="#fff" d="M10.4 15.6l-3-3 1.4-1.4 1.6 1.6 4.8-4.8 1.4 1.4z" />
    </svg>
  );
}
