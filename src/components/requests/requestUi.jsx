import {
  BellRing, HandHelping, Utensils, MessageCircle, Wrench, Stethoscope, HeartPulse, GraduationCap, Building2,
  Sparkles, ConciergeBell, UtensilsCrossed, AlertTriangle, TriangleAlert, Cog,
} from 'lucide-react';

export const KIND_ICON = {
  call_nurse: BellRing, call_doctor: Stethoscope, assistance: HandHelping, meal: Utensils, other: MessageCircle,
  management: Building2,
  hostel_repair: Wrench, clinic: Stethoscope, sick_bay: HeartPulse, teacher: GraduationCap,
  housekeeping: Sparkles, maintenance: Wrench, room_service: UtensilsCrossed, concierge: ConciergeBell,
  incident: AlertTriangle, hazard: TriangleAlert, equipment: Cog,
};
const KIND_COLOR = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899', '#14B8A6'];
const MANAGEMENT_COLOR = '#7C3AED';

/** A kind's accent colour: red when urgent, violet for management, else from the palette by position. */
export function kindColor(kinds, key) {
  const k = kinds.find((x) => x.key === key);
  if (k?.urgent) return '#DC2626';
  if (key === 'management' || k?.managers) return MANAGEMENT_COLOR;
  const rest = kinds.filter((x) => !x.urgent && !x.managers && x.key !== 'management');
  const i = Math.max(0, rest.findIndex((x) => x.key === key));
  return KIND_COLOR[i % KIND_COLOR.length];
}

export const STATUS = {
  open:      { label: 'Waiting',   color: '#F59E0B', bg: '#FFFBEB' },
  accepted:  { label: 'Accepted',  color: '#0EA5E9', bg: '#E0F2FE' },
  done:      { label: 'Done',      color: '#10B981', bg: '#ECFDF5' },
  cancelled: { label: 'Cancelled', color: '#94A3B8', bg: '#F1F5F9' },
};

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.open;
  return <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0" style={{ color: s.color, background: s.bg }}>{s.label}</span>;
}

// ── Member "call panel" helpers ─────────────────────────────────────────────

/** Gradient tones for the big call buttons, by kind (falls back by position). */
const BIG_TONE = {
  call_nurse:   { from: '#EF4444', to: '#B91C1C', glow: '#DC2626' },
  sick_bay:     { from: '#EF4444', to: '#B91C1C', glow: '#DC2626' },
  incident:     { from: '#EF4444', to: '#B91C1C', glow: '#DC2626' },
  call_doctor:  { from: '#6366F1', to: '#1D4ED8', glow: '#4F46E5' },
  clinic:       { from: '#0EA5E9', to: '#4F46E5', glow: '#0284C7' },
  room_service: { from: '#F59E0B', to: '#EA580C', glow: '#EA580C' },
  housekeeping: { from: '#14B8A6', to: '#0F766E', glow: '#0D9488' },
  hostel_repair:{ from: '#F59E0B', to: '#C2410C', glow: '#EA580C' },
};
const BIG_FALLBACK = [
  { from: '#EF4444', to: '#B91C1C', glow: '#DC2626' },
  { from: '#6366F1', to: '#1D4ED8', glow: '#4F46E5' },
];
const BIG_CALM = [
  { from: '#6366F1', to: '#1D4ED8', glow: '#4F46E5' },
  { from: '#14B8A6', to: '#0F766E', glow: '#0D9488' },
];
export const bigTone = (k, i) => BIG_TONE[k.key] || (k.urgent ? BIG_FALLBACK[0] : BIG_CALM[i % 2]);

/** Which kinds become the two big buttons when a site has fewer than two urgent kinds. */
const BIG_PREFER = {
  hospital: ['call_nurse', 'call_doctor'],
  hotel: ['room_service', 'housekeeping'],
  university: ['hostel_repair', 'clinic'],
  school: ['sick_bay', 'teacher'],
  industrial: ['incident', 'hazard'],
};
export function splitKinds(kinds, type) {
  const big = kinds.filter((k) => k.urgent).slice(0, 2);
  const prefer = BIG_PREFER[type] || [];
  for (const key of prefer) {
    if (big.length >= 2) break;
    const k = kinds.find((x) => x.key === key);
    if (k && !big.includes(k)) big.push(k);
  }
  for (const k of kinds) {
    if (big.length >= 2) break;
    if (!big.includes(k) && !k.managers && k.key !== 'management' && k.key !== 'other') big.push(k);
  }
  return { big, small: kinds.filter((k) => !big.includes(k)) };
}

/** Quick note chips for the send sheet. */
export const QUICK_NOTES = {
  call_nurse: ['Pain', 'Drip finished', 'Bathroom help', 'Feeling unwell'],
  call_doctor: ['Pain', 'Feeling unwell', 'Question about my treatment', 'Medication'],
  sick_bay: ['Feeling unwell', 'Injury', 'Headache', 'Need to go home'],
  assistance: ['Bathroom help', 'Change position', 'Blanket', 'Phone charger'],
  meal: ['Water', 'Hot drink', 'Meal', 'Snack'],
  room_service: ['Breakfast', 'Drinks', 'Dinner', 'See the menu'],
  housekeeping: ['Clean my room', 'Fresh towels', 'Extra pillows', 'Toiletries'],
  maintenance: ['Air conditioning', 'Plumbing', 'Lights', 'TV'],
  concierge: ['Taxi', 'Restaurant booking', 'Directions', 'Late checkout'],
  hostel_repair: ['Plumbing', 'Electrical', 'Door / lock', 'Furniture'],
  clinic: ['Feeling unwell', 'Appointment', 'Prescription', 'Injury'],
  incident: ['Injury', 'Near miss', 'Fire / smoke', 'Spill'],
  hazard: ['Slip hazard', 'Exposed wiring', 'Blocked exit', 'Gas smell'],
  equipment: ['Not starting', 'Strange noise', 'Leak', 'Broken guard'],
};

const TITLED = /^(dr|doctor|nurse|prof|sister|matron|mr|mrs|ms|miss)\.?\s/i;
/** "Ade Okafor" (doctor) → "Dr Ade"; (nurse) → "Nurse Ade"; others → first name. */
export function shortName(p) {
  const name = String(p?.name || '').trim();
  if (!name) return '';
  if (TITLED.test(name)) return name.split(/\s+/).slice(0, 2).join(' ');
  const first = name.split(/\s+/)[0];
  const role = `${p.role || p.siteRole || ''} ${p.roleLabel || ''}`;
  if (/doctor|consultant|surgeon|physician/i.test(role)) return `Dr ${first}`;
  if (/nurse|matron|midwife/i.test(role)) return `Nurse ${first}`;
  return first;
}
