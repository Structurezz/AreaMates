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
