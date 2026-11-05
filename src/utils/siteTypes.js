// Client copy of the server's site types (server/utils/siteTypes.js). The app
// renders with these before GET /api/site answers; keep TERMS / DEFAULT_MODULES
// / PASS_CATEGORIES in step with the server. Estate is the default.

export const TYPES = ['estate', 'school', 'university', 'hotel', 'industrial', 'hospital'];

export const TERMS = {
  estate: {
    site: 'Estate', sites: 'Estates',
    member: 'Resident', members: 'Residents',
    unit: 'Unit', units: 'Units',
    family: 'Family member', familyPlural: 'Family members', household: 'Household',
    manager: 'Estate manager', dues: 'Estate bills',
    idLabel: 'ID number', classLabel: 'Group', idCheck: 'Staff check',
  },
  school: {
    site: 'Campus', sites: 'Campuses',
    member: 'Student', members: 'Students & staff',
    unit: 'Class', units: 'Classes',
    family: 'Parent / guardian', familyPlural: 'Parents & guardians', household: 'Family',
    manager: 'Administrator', dues: 'School fees',
    idLabel: 'Admission / staff no.', classLabel: 'Class', idCheck: 'Staff check',
  },
  // Universities / polytechnics / colleges: adult students; units are hostel rooms, block = hall
  university: {
    site: 'Campus', sites: 'Campuses',
    member: 'Student', members: 'Students & staff',
    unit: 'Room', units: 'Hostel rooms',
    family: 'Parent / guardian', familyPlural: 'Parents & guardians', household: 'Family',
    manager: 'Administrator', dues: 'Hostel & fees',
    idLabel: 'Matric / staff no.', classLabel: 'Department & level', idCheck: 'ID check',
    block: 'Hall',
  },
  hotel: {
    site: 'Property', sites: 'Properties',
    member: 'Guest', members: 'Guests',
    unit: 'Room', units: 'Rooms',
    family: 'Companion', familyPlural: 'Companions', household: 'Party',
    manager: 'Front desk', dues: 'Bills',
    idLabel: 'Staff ID', classLabel: 'Team', idCheck: 'Staff check',
  },
  industrial: {
    site: 'Site', sites: 'Sites',
    member: 'Employee', members: 'Employees',
    unit: 'Department', units: 'Departments',
    family: 'Dependant', familyPlural: 'Dependants', household: 'Team',
    manager: 'Facility manager', dues: 'Charges',
    idLabel: 'Staff ID', classLabel: 'Team', idCheck: 'Staff check',
  },
  hospital: {
    site: 'Hospital', sites: 'Hospitals',
    member: 'Patient / staff', members: 'Patients & staff',
    unit: 'Ward', units: 'Wards',
    family: 'Next of kin', familyPlural: 'Next of kin', household: 'Next of kin',
    manager: 'Administrator', dues: 'Bills',
    idLabel: 'Staff / patient no.', classLabel: 'Department', idCheck: 'Staff check',
  },
};

export const MODULE_KEYS = ['payments', 'marketplace', 'community', 'events', 'neighbours', 'household', 'gatelog', 'shifts', 'stays', 'visiting'];

const ALL_ON = { payments: true, marketplace: true, community: true, events: true, neighbours: true, household: true };
export const DEFAULT_MODULES = {
  estate:     { ...ALL_ON, gatelog: false, shifts: false, stays: false, visiting: false },
  school:     { ...ALL_ON, marketplace: false, neighbours: false, gatelog: true, shifts: true, stays: false, visiting: false },
  university: { ...ALL_ON, household: false, gatelog: true, shifts: true, stays: false, visiting: true },
  hotel:      { ...ALL_ON, payments: false, marketplace: false, community: false, neighbours: false, gatelog: true, shifts: true, stays: true, visiting: false },
  industrial: { ...ALL_ON, payments: false, marketplace: false, household: false, gatelog: true, shifts: true, stays: false, visiting: false },
  hospital:   { ...ALL_ON, payments: false, marketplace: false, community: false, events: false, neighbours: false, gatelog: true, shifts: true, stays: false, visiting: true },
};

export const CATEGORY_INFO = {
  guest:         { label: 'Visitor' },
  pickup:        { label: 'Authorised pickup', fields: ['studentName', 'studentClass'] },
  contractor:    { label: 'Contractor',        fields: ['company', 'job', 'vehiclePlate'], induction: true },
  supplier:      { label: 'Supplier',          fields: ['company', 'goods', 'vehiclePlate'], induction: true },
  delivery:      { label: 'Delivery',          fields: ['company', 'goods', 'vehiclePlate'] },
  patient_visit: { label: 'Patient visit',     fields: ['patientName', 'ward'] },
};
export const PASS_CATEGORIES = {
  estate:     ['guest', 'delivery', 'contractor'],
  school:     ['guest', 'pickup', 'contractor', 'supplier'],
  university: ['guest', 'delivery', 'contractor', 'supplier'],
  hotel:      ['guest', 'delivery'],
  industrial: ['guest', 'contractor', 'supplier', 'delivery'],
  hospital:   ['guest', 'patient_visit', 'contractor', 'supplier', 'delivery'],
};

// Labels for the per-category detail fields (visitor.details).
export const DETAIL_LABELS = {
  studentName: 'Student', studentClass: 'Class', company: 'Company', job: 'Job',
  goods: 'Goods', vehiclePlate: 'Vehicle', patientName: 'Patient', ward: 'Ward',
};

// Badge colours per pass category.
export const CATEGORY_STYLE = {
  guest:         { color: '#6366F1', bg: '#EEF2FF' },
  pickup:        { color: '#0EA5E9', bg: '#E0F2FE' },
  contractor:    { color: '#F97316', bg: '#FFF7ED' },
  supplier:      { color: '#8B5CF6', bg: '#F5F3FF' },
  delivery:      { color: '#F59E0B', bg: '#FFFBEB' },
  patient_visit: { color: '#EF4444', bg: '#FEF2F2' },
};

/** "Hostel visiting hours" at universities, "Visiting hours" elsewhere. */
export const visitingLabel = (type) => (type === 'university' ? 'Hostel visiting hours' : 'Visiting hours');

/** Units' block field: "Hall" at universities, "Block" elsewhere. */
export const blockTerm = (terms) => terms?.block || 'Block';

/** "Moremi Hall" from block "Moremi" (or "Moremi Hall") at universities; the raw block elsewhere. */
export const blockName = (block, terms) => {
  if (!block) return '';
  if (!terms?.block || /\b(hall|hostel|house|block|wing)\b/i.test(block)) return block;
  return `${block} ${terms.block}`;
};

export const normType = (t) => (TYPES.includes(t) ? t : 'estate');

/** Resolved config from an estate's `site` sub-document (same as the server's siteConfig). */
export function siteConfigFrom(site) {
  const type = normType(site?.type);
  const overrides = site?.modules || {};
  const modules = { ...DEFAULT_MODULES[type] };
  for (const k of MODULE_KEYS) if (typeof overrides[k] === 'boolean') modules[k] = overrides[k];
  return {
    type,
    terms: TERMS[type],
    modules,
    passCategories: PASS_CATEGORIES[type].map((k) => ({ key: k, ...CATEGORY_INFO[k] })),
    relationships: null,
    inductionText: site?.inductionText || '',
    visitingHours: {
      start: site?.visitingHours?.start || '10:00',
      end: site?.visitingHours?.end || '20:00',
      maxPerPatient: site?.visitingHours?.maxPerPatient || 0,
    },
  };
}

/** "Contractor · Acme Ltd · ABC-123-XY" style one-liner for a pass's details. */
export function detailsSummary(details) {
  if (!details) return '';
  return ['studentName', 'studentClass', 'patientName', 'ward', 'company', 'job', 'goods', 'vehiclePlate']
    .map((k) => details[k]).filter((v) => v && String(v).trim()).join(' · ');
}

export const categoryLabel = (key) => CATEGORY_INFO[key]?.label || 'Visitor';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** "Mon–Fri", "Sat, Sun", "Every day" for shift days (0 = Sunday). */
export function formatShiftDays(days) {
  if (!Array.isArray(days) || !days.length) return '';
  const set = [...new Set(days.map(Number))].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  if (set.length === 7) return 'Every day';
  // Monday-first order so Mon–Fri reads naturally
  const order = set.map((d) => (d + 6) % 7).sort((a, b) => a - b);
  const runs = [];
  for (const d of order) {
    const last = runs[runs.length - 1];
    if (last && d === last[1] + 1) last[1] = d; else runs.push([d, d]);
  }
  const name = (m) => DAY_NAMES[(m + 1) % 7];
  return runs.map(([a, b]) => (a === b ? name(a) : b === a + 1 ? `${name(a)}, ${name(b)}` : `${name(a)}–${name(b)}`)).join(', ');
}

/** "Your shift: 08:00–16:00 · Mon–Fri" (null when there's no shift). */
export function shiftLine(shift) {
  if (!shift?.start) return null;
  const days = formatShiftDays(shift.days);
  return `${shift.start}${shift.end ? `–${shift.end}` : ''}${days ? ` · ${days}` : ''}`;
}
