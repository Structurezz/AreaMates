import {
  Building, Building2, GraduationCap, DoorOpen, Stethoscope, Library, Trophy, ParkingCircle,
  ShieldCheck, Church, UtensilsCrossed, Briefcase, MapPin, BedDouble,
} from 'lucide-react';

// Kinds of places on the site map (server: SitePlace.kind)
export const PLACE_KINDS = {
  hall:     { label: 'Hall',      color: '#6366F1', Icon: BedDouble },
  building: { label: 'Building',  color: '#0EA5E9', Icon: Building2 },
  faculty:  { label: 'Faculty',   color: '#8B5CF6', Icon: GraduationCap },
  gate:     { label: 'Gate',      color: '#F97316', Icon: DoorOpen },
  clinic:   { label: 'Clinic',    color: '#EF4444', Icon: Stethoscope },
  library:  { label: 'Library',   color: '#14B8A6', Icon: Library },
  sports:   { label: 'Sports',    color: '#22C55E', Icon: Trophy },
  parking:  { label: 'Parking',   color: '#64748B', Icon: ParkingCircle },
  security: { label: 'Security',  color: '#DC2626', Icon: ShieldCheck },
  chapel:   { label: 'Worship',   color: '#A855F7', Icon: Church },
  food:     { label: 'Food',      color: '#F59E0B', Icon: UtensilsCrossed },
  office:   { label: 'Office',    color: '#3B82F6', Icon: Briefcase },
  other:    { label: 'Other',     color: '#94A3B8', Icon: MapPin },
};

// "hall" means a hall / hostel at universities, a block of flats on estates,
// a wing in hotels and hospitals.
const HALL_WORD = {
  estate: 'Block', school: 'Hostel', university: 'Hall / hostel', hotel: 'Wing', industrial: 'Block', hospital: 'Wing',
};
const BUILDING_WORD = { hospital: 'Building', industrial: 'Building' };

export function kindMeta(kind, type) {
  const base = PLACE_KINDS[kind] || PLACE_KINDS.other;
  if (kind === 'hall') return { ...base, label: HALL_WORD[type] || base.label, Icon: type === 'estate' || type === 'industrial' ? Building : base.Icon };
  if (kind === 'building' && BUILDING_WORD[type]) return { ...base, label: BUILDING_WORD[type] };
  return base;
}

/** Short word for the dashboard card: "Your hall", "Your block", "Your building". */
export function myPlaceWord(kind, type) {
  if (kind === 'hall') return type === 'university' ? 'hall' : (HALL_WORD[type] || 'block').toLowerCase();
  return (PLACE_KINDS[kind]?.label || 'place').toLowerCase();
}
