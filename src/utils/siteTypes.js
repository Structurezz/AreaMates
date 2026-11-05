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
    idLabel: 'ID number', classLabel: 'Group', idCheck: 'Staff check', stayIn: 'Move-in', stayOut: 'Move-out',
  },
  school: {
    site: 'Campus', sites: 'Campuses',
    member: 'Student', members: 'Students & staff',
    unit: 'Class', units: 'Classes',
    family: 'Parent / guardian', familyPlural: 'Parents & guardians', household: 'Family',
    manager: 'Administrator', dues: 'School fees',
    idLabel: 'Admission / staff no.', classLabel: 'Class', idCheck: 'Staff check', stayIn: 'Term start', stayOut: 'Term end',
  },
  // Universities / polytechnics / colleges: adult students; units are hostel rooms, block = hall
  university: {
    site: 'Campus', sites: 'Campuses',
    member: 'Student', members: 'Students & staff',
    unit: 'Room', units: 'Hostel rooms',
    family: 'Parent / guardian', familyPlural: 'Parents & guardians', household: 'Family',
    manager: 'Administrator', dues: 'Hostel & fees',
    idLabel: 'Matric / staff no.', classLabel: 'Department & level', idCheck: 'ID check', stayIn: 'Session start', stayOut: 'Session end',
    block: 'Hall',
  },
  hotel: {
    site: 'Property', sites: 'Properties',
    member: 'Guest', members: 'Guests',
    unit: 'Room', units: 'Rooms',
    family: 'Companion', familyPlural: 'Companions', household: 'Party',
    manager: 'Front desk', dues: 'Bills',
    idLabel: 'Staff ID', classLabel: 'Team', idCheck: 'Staff check', stayIn: 'Check-in', stayOut: 'Check-out',
  },
  industrial: {
    site: 'Site', sites: 'Sites',
    member: 'Employee', members: 'Employees',
    unit: 'Department', units: 'Departments',
    family: 'Dependant', familyPlural: 'Dependants', household: 'Team',
    manager: 'Facility manager', dues: 'Charges',
    idLabel: 'Staff ID', classLabel: 'Team', idCheck: 'Staff check', stayIn: 'Start date', stayOut: 'End date',
  },
  hospital: {
    site: 'Hospital', sites: 'Hospitals',
    member: 'Patient or staff member', members: 'Patients & staff',
    unit: 'Ward', units: 'Wards',
    family: 'Next of kin', familyPlural: 'Next of kin', household: 'Next of kin',
    manager: 'Administrator', dues: 'Bills',
    idLabel: 'Staff / patient no.', classLabel: 'Department', idCheck: 'Staff check', stayIn: 'Admission', stayOut: 'Discharge',
  },
};

export const MODULE_KEYS = ['payments', 'marketplace', 'community', 'events', 'neighbours', 'household', 'gatelog', 'shifts', 'stays', 'visiting', 'requests', 'rollcall'];

const ALL_ON = { payments: true, marketplace: true, community: true, events: true, neighbours: true, household: true };
export const DEFAULT_MODULES = {
  estate:     { ...ALL_ON, gatelog: false, shifts: false, stays: false, visiting: false, requests: false, rollcall: false },
  school:     { ...ALL_ON, marketplace: false, neighbours: false, gatelog: false, shifts: true, stays: false, visiting: false, requests: true, rollcall: true },
  university: { ...ALL_ON, household: false, gatelog: false, shifts: true, stays: false, visiting: true, requests: true, rollcall: true },
  hotel:      { ...ALL_ON, payments: false, marketplace: false, community: false, neighbours: false, gatelog: false, shifts: true, stays: true, visiting: false, requests: true, rollcall: true },
  industrial: { ...ALL_ON, payments: false, marketplace: false, household: false, gatelog: true, shifts: true, stays: false, visiting: false, requests: true, rollcall: true },
  hospital:   { ...ALL_ON, payments: false, marketplace: false, community: false, events: false, neighbours: false, gatelog: false, shifts: true, stays: true, visiting: true, requests: true, rollcall: true },
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
    roles: ROLES[type].map((r) => ({ ...r, form: (FORMS[type] || {})[r.key] || F({ unit: 'Unit' }) })),
    defaultRole: ROLES[type][0].key,
    assignLabel: ASSIGN_LABEL[type] || '',
    requestKinds: REQUEST_KINDS[type] || [],
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

// ── Derived words for copy ──────────────────────────────────────────────────
// Lowercase / article / possessive forms of the site's TERMS so sentences read
// naturally ("your ward", "a campus", "the hospital's rules"). Components keep
// the original estate wording verbatim (`isEstate ? '…' : …w…`) and use these
// for every other site type.

/** First letter lowercased ("Estate manager" → "estate manager"), keeping acronyms ("ID number"). */
export const lc = (s) => {
  if (!s) return '';
  if (/^[A-Z]{2}/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
};

/** "a" / "an" for a word ("an estate", "a ward"). */
export const article = (word) => (/^[aeiou]/i.test(String(word || '').trim()) ? 'an' : 'a');

/** Word with its article ("an employee", "a campus"). */
export const withArticle = (word) => `${article(word)} ${word}`;

/** Every derived form components need, from a TERMS object. */
export function siteWords(terms) {
  const t = { ...TERMS.estate, ...(terms || {}) };
  const isNok = /next of kin/i.test(t.household);
  return {
    // site
    site: t.site, sites: t.sites, siteLc: lc(t.site), sitesLc: lc(t.sites),
    aSite: withArticle(lc(t.site)),
    siteMgmt: `${t.site} management`, siteMgmtLc: `${lc(t.site)} management`,
    // members (the people who use the app)
    member: t.member, members: t.members, memberLc: lc(t.member), membersLc: lc(t.members),
    aMember: withArticle(lc(t.member)),
    // "neighbours" are the other members of the site
    neighbour: t.member, neighbours: t.members, neighbourLc: lc(t.member), neighboursLc: lc(t.members),
    // units
    unit: t.unit, units: t.units, unitLc: lc(t.unit), unitsLc: lc(t.units),
    aUnit: withArticle(lc(t.unit)),
    block: blockTerm(t), blockLc: lc(blockTerm(t)),
    // household / family
    household: t.household, householdLc: isNok ? 'next of kin' : lc(t.household),
    family: t.family, familyLc: isNok ? 'next of kin' : lc(t.family),
    familyPlural: t.familyPlural, familyPluralLc: isNok ? 'next of kin' : lc(t.familyPlural),
    // management & money
    manager: t.manager, managerLc: lc(t.manager), aManager: withArticle(lc(t.manager)),
    dues: t.dues, duesLc: lc(t.dues),
  };
}

// Stored unit types (Unit.type) and bill types (PaymentSchedule.type) are
// fixed values; these are their names per site type. Estates keep each
// screen's existing labels (null = use the screen's own label).
export const UNIT_TYPE_LABELS = {
  estate:     null,
  school:     { apartment: 'Classroom',   house: 'Boarding house', shop: 'Tuck shop', office: 'Office' },
  university: { apartment: 'Hostel room', house: 'Self-contained', shop: 'Shop',      office: 'Office' },
  hotel:      { apartment: 'Room',        house: 'Suite',          shop: 'Shop',      office: 'Office' },
  industrial: { apartment: 'Department',  house: 'Staff quarters', shop: 'Store',     office: 'Office' },
  hospital:   { apartment: 'Ward',        house: 'Private room',   shop: 'Pharmacy',  office: 'Office' },
};
export const BILL_TYPE_LABELS = {
  estate:     null,
  school:     { security_dues: 'Security fee', maintenance: 'Maintenance', levy: 'School levy',       contribution: 'PTA contribution', other: 'Other' },
  university: { security_dues: 'Security fee', maintenance: 'Hostel maintenance', levy: 'Departmental levy', contribution: 'Contribution', other: 'Other' },
  hotel:      { security_dues: 'Security fee', maintenance: 'Maintenance', levy: 'Service charge',    contribution: 'Contribution', other: 'Other' },
  industrial: { security_dues: 'Security fee', maintenance: 'Maintenance', levy: 'Levy',              contribution: 'Contribution', other: 'Other' },
  hospital:   { security_dues: 'Security fee', maintenance: 'Maintenance', levy: 'Hospital levy',     contribution: 'Contribution', other: 'Other' },
};
// unitTypeLabel('house', 'hospital', 'House') → 'Private room'; estates get the fallback
export const unitTypeLabel = (value, type, fallback) => UNIT_TYPE_LABELS[type]?.[value] || fallback;
export const billTypeLabel = (value, type, fallback) => BILL_TYPE_LABELS[type]?.[value] || fallback;

// Before sign-in we don't know the member's site. Use ?site= from an invite
// link, else the last site this device signed in to (remembered by
// SiteContext), else estate.
const LAST_SITE_KEY = 'am:lastSiteType';
export function rememberSiteType(type) {
  try { if (type) localStorage.setItem(LAST_SITE_KEY, type); } catch { /* storage off */ }
}
export function preAuthSiteType() {
  try {
    const q = new URLSearchParams(window.location.search).get('site');
    if (q && TYPES.includes(q)) { rememberSiteType(q); return q; }
    const saved = localStorage.getItem(LAST_SITE_KEY);
    if (saved && TYPES.includes(saved)) return saved;
  } catch { /* storage off */ }
  return 'estate';
}

// ── Site roles (client copy of server/utils/siteRoles.js) ───────────────────
// Who a member is on the site (patient, doctor, nurse, student, warden, guest,
// housekeeping, employee, supervisor…). GET /api/site sends the same `roles`,
// `defaultRole`, `assignLabel` and `requestKinds`; these render before it answers.
const R = (key, label, plural, extra = {}) => ({ key, label, plural, staff: false, responds: [], scoped: false, onCall: false, assignable: false, specialty: false, rollcall: false, ...extra });
const ALL_ALERTS = ['medical', 'security', 'fire', 'other'];

export const ROLES = {
  estate: [R('resident', 'Resident', 'Residents')],
  hospital: [
    R('patient', 'Patient', 'Patients'),
    R('doctor', 'Doctor', 'Doctors', { staff: true, responds: ['medical'], onCall: true, assignable: true, specialty: true }),
    R('nurse', 'Nurse', 'Nurses', { staff: true, responds: ['medical'], scoped: true, onCall: true, assignable: true }),
    R('staff', 'Hospital staff', 'Hospital staff', { staff: true, rollcall: true }),
  ],
  university: [
    R('student', 'Student', 'Students'),
    R('lecturer', 'Lecturer', 'Lecturers', { staff: true, assignable: true, specialty: true }),
    R('warden', 'Hall warden / porter', 'Hall wardens & porters', { staff: true, responds: ALL_ALERTS, scoped: true, assignable: true, rollcall: true }),
    R('clinic', 'Clinic staff', 'Clinic staff', { staff: true, responds: ['medical'], onCall: true }),
    R('staff', 'University staff', 'University staff', { staff: true, rollcall: true }),
  ],
  school: [
    R('student', 'Student', 'Students'),
    R('teacher', 'Teacher', 'Teachers', { staff: true, responds: ['medical', 'security', 'other'], scoped: true, assignable: true, specialty: true, rollcall: true }),
    R('nurse', 'School nurse', 'School nurses', { staff: true, responds: ['medical'], onCall: true }),
    R('staff', 'School staff', 'School staff', { staff: true, rollcall: true }),
  ],
  hotel: [
    R('guest', 'Guest', 'Guests'),
    R('front_desk', 'Front desk', 'Front desk', { staff: true, responds: ['security', 'other'] }),
    R('housekeeping', 'Housekeeping', 'Housekeeping', { staff: true }),
    R('maintenance', 'Maintenance', 'Maintenance', { staff: true }),
    R('duty_manager', 'Duty manager', 'Duty managers', { staff: true, responds: ALL_ALERTS, onCall: true, rollcall: true }),
  ],
  industrial: [
    R('employee', 'Employee', 'Employees'),
    R('supervisor', 'Supervisor', 'Supervisors', { staff: true, responds: ALL_ALERTS, scoped: true, assignable: true, rollcall: true }),
    R('safety_officer', 'Safety officer', 'Safety officers', { staff: true, responds: ALL_ALERTS, onCall: true, rollcall: true }),
    R('first_aider', 'First aider', 'First aiders', { staff: true, responds: ['medical'], onCall: true }),
  ],
};

// What the onboarding form asks for each role (the apps render it):
//   unit        — label of the unit picker ('' = no unit needed)
//   stay        — ask for stay / admission dates
//   id / group  — labels for memberProfile.idNumber / className ('' = hide)
//   specialty   — label for roleInfo.specialty ('' = hide)
//   shift, onCall, assign (assigned staff), kin (next of kin / parent / companion)
//   emailOptional — can be added without an app login (e.g. a patient whose
//                   next of kin uses the app; a young pupil whose parents do)
const F = (o) => ({ unit: '', stay: false, id: '', group: '', specialty: '', shift: false, onCall: false, assign: false, kin: false, kinLabel: '', emailOptional: false, ...o });
export const FORMS = {
  estate:     { resident: F({ unit: 'Apartment', kin: true, kinLabel: 'Family member' }) },
  hospital: {
    patient: F({ unit: 'Ward & bed', stay: true, id: 'Patient / hospital no.', assign: true, kin: true, kinLabel: 'Next of kin', emailOptional: true }),
    doctor:  F({ unit: 'Ward or department they work in', id: 'Staff ID', specialty: 'Specialty', shift: true, onCall: true }),
    nurse:   F({ unit: 'Ward they work in', id: 'Staff ID', shift: true, onCall: true }),
    staff:   F({ unit: 'Department', id: 'Staff ID', specialty: 'Job title', shift: true }),
  },
  university: {
    student:  F({ unit: 'Hall & room', stay: true, id: 'Matric number', group: 'Department & level', assign: true, kin: true, kinLabel: 'Parent / guardian' }),
    lecturer: F({ unit: 'Department / office', id: 'Staff ID', specialty: 'Department / course' }),
    warden:   F({ unit: 'Hall they cover', id: 'Staff ID', shift: true }),
    clinic:   F({ unit: 'Clinic', id: 'Staff ID', specialty: 'Role (doctor, nurse…)', shift: true, onCall: true }),
    staff:    F({ unit: 'Office', id: 'Staff ID', specialty: 'Job title', shift: true }),
  },
  school: {
    student: F({ unit: 'Class', id: 'Admission number', group: 'Arm / house', assign: true, kin: true, kinLabel: 'Parent / guardian', emailOptional: true }),
    teacher: F({ unit: 'Class they teach (form class)', id: 'Staff ID', specialty: 'Subject' }),
    nurse:   F({ unit: 'Sick bay', id: 'Staff ID', shift: true, onCall: true }),
    staff:   F({ unit: 'Office', id: 'Staff ID', specialty: 'Job title', shift: true }),
  },
  hotel: {
    guest:        F({ unit: 'Room', stay: true, kin: true, kinLabel: 'Companion' }),
    front_desk:   F({ unit: 'Desk / post', id: 'Staff ID', shift: true }),
    housekeeping: F({ unit: 'Floor / section', id: 'Staff ID', shift: true }),
    maintenance:  F({ unit: 'Workshop', id: 'Staff ID', specialty: 'Trade (electrical, plumbing…)', shift: true }),
    duty_manager: F({ unit: 'Office', id: 'Staff ID', shift: true, onCall: true }),
  },
  industrial: {
    employee:       F({ unit: 'Department', id: 'Staff ID', specialty: 'Job title', shift: true, assign: true }),
    supervisor:     F({ unit: 'Department they supervise', id: 'Staff ID', shift: true }),
    safety_officer: F({ unit: 'Office', id: 'Staff ID', shift: true, onCall: true }),
    first_aider:    F({ unit: 'Department', id: 'Staff ID', shift: true, onCall: true }),
  },
};

// What a member's assigned people are called
export const ASSIGN_LABEL = {
  estate: '', hospital: 'Care team', university: 'Adviser & warden', school: 'Class teacher',
  hotel: '', industrial: 'Supervisor',
};

// Requests members can send, per type, and which roles receive them.
export const REQUEST_KINDS = {
  estate: [],
  hospital: [
    { key: 'call_nurse',  label: 'Call a nurse',        roles: ['nurse'],  urgent: true },
    { key: 'call_doctor', label: 'Call a doctor',       roles: ['doctor'], urgent: true },
    { key: 'assistance',  label: 'Help with something', roles: ['nurse'] },
    { key: 'meal',        label: 'Food & drink',        roles: ['staff'] },
    { key: 'management',  label: 'Hospital management', roles: [], managers: true },
    { key: 'other',       label: 'Something else',      roles: ['staff', 'nurse'] },
  ],
  university: [
    { key: 'hostel_repair', label: 'Hostel repair',      roles: ['warden'] },
    { key: 'clinic',        label: 'See the clinic',     roles: ['clinic'] },
    { key: 'other',         label: 'Ask the hall office', roles: ['warden'] },
    { key: 'management',    label: 'Student affairs',     roles: [], managers: true },
  ],
  school: [
    { key: 'sick_bay', label: 'Sick bay',             roles: ['nurse'], urgent: true },
    { key: 'teacher',  label: 'Message the teacher',  roles: ['teacher'] },
    { key: 'other',    label: 'School office',        roles: ['staff'] },
    { key: 'management', label: 'School management',  roles: [], managers: true },
  ],
  hotel: [
    { key: 'housekeeping', label: 'Housekeeping',  roles: ['housekeeping'] },
    { key: 'maintenance',  label: 'Repairs',       roles: ['maintenance'] },
    { key: 'room_service', label: 'Room service',  roles: ['front_desk'] },
    { key: 'concierge',    label: 'Concierge',     roles: ['front_desk'] },
    { key: 'other',        label: 'Something else', roles: ['front_desk', 'duty_manager'] },
    { key: 'management',   label: 'Hotel management', roles: [], managers: true },
  ],
  industrial: [
    { key: 'incident',  label: 'Report an injury or incident', roles: ['supervisor', 'safety_officer', 'first_aider'], urgent: true },
    { key: 'hazard',    label: 'Report a hazard',               roles: ['safety_officer', 'supervisor'] },
    { key: 'equipment', label: 'Equipment fault',               roles: ['supervisor'] },
    { key: 'management', label: 'Site management',              roles: [], managers: true },
  ],
};


export const rolesFor = (type) => ROLES[normType(type)] || ROLES.estate;
/** A user's role on the site (unknown / unset → the type's default member role). */
export const roleOfUser = (roles, user) => (roles || []).find((r) => r.key === user?.siteRole) || (roles || [])[0] || null;
