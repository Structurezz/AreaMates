import { UserCheck, GraduationCap, HardHat, Truck, Package, Stethoscope } from 'lucide-react';
import { CATEGORY_STYLE, DETAIL_LABELS, categoryLabel, detailsSummary } from '../../utils/siteTypes';

export const CATEGORY_ICON = {
  guest: UserCheck,
  pickup: GraduationCap,
  contractor: HardHat,
  supplier: Truck,
  delivery: Package,
  patient_visit: Stethoscope,
};

const hasCategory = (v) => v?.category && v.category !== 'guest';

/** Small coloured badge for a pass's category. Renders nothing for plain visitor passes. */
export function CategoryBadge({ visitor, className = '', size = 'sm' }) {
  if (!hasCategory(visitor)) return null;
  const st = CATEGORY_STYLE[visitor.category] || CATEGORY_STYLE.guest;
  const Icon = CATEGORY_ICON[visitor.category] || UserCheck;
  const sm = size === 'sm';
  return (
    <span className={`inline-flex items-center gap-1 font-semibold rounded-md flex-shrink-0 ${sm ? 'text-[10.5px] px-1.5 py-px' : 'text-[12px] px-2 py-0.5'} ${className}`}
      style={{ background: st.bg, color: st.color }}>
      <Icon size={sm ? 10 : 12} /> {categoryLabel(visitor.category)}
    </span>
  );
}

/** One-line summary of a pass's details ("Acme Ltd · Fix pump · LND-123-XY"). */
export function DetailsLine({ visitor, className = '' }) {
  if (!hasCategory(visitor)) return null;
  const text = detailsSummary(visitor.details);
  if (!text) return null;
  return <span className={`block truncate ${className}`}>{text}</span>;
}

/** Labelled list of a pass's details for the visitor detail page. */
export function DetailsList({ visitor }) {
  if (!hasCategory(visitor)) return null;
  const rows = Object.entries(DETAIL_LABELS)
    .map(([k, label]) => [label, visitor.details?.[k]])
    .filter(([, v]) => v && String(v).trim());
  if (!rows.length) return null;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {rows.map(([label, v]) => (
        <div key={label} className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-[14px] font-semibold text-slate-800 truncate">{v}</p>
        </div>
      ))}
    </div>
  );
}
