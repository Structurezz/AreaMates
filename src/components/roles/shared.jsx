import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Phone, PhoneCall, MessageSquare } from 'lucide-react';
import { useCall } from '../../context/CallContext';
import { useHousehold } from '../../hooks/useHousehold';
import { blockName } from '../../utils/siteTypes';

// Building blocks for the site-role screens (care team, my people, routed
// alerts, requests, roll-call). Never used for estates.

export const initials = (name) => (name || '?').split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export function Avatar({ person, size = 40, ring }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.36) };
  return (
    <span className="relative flex-shrink-0 inline-flex">
      {person?.profilePhoto
        ? <img src={person.profilePhoto} alt="" className="rounded-full object-cover border-2 border-white" style={style} />
        : <span className="rounded-full flex items-center justify-center font-semibold text-indigo-700 bg-indigo-50 border-2 border-white" style={style}>{initials(person?.name)}</span>}
      {ring && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: ring }} />}
    </span>
  );
}

export function OnCallDot({ on, label = true }) {
  if (!on) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
      <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-60" /><span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" /></span>
      {label && 'On call'}
    </span>
  );
}

/** "Doctor · Cardiology" */
export const staffLine = (p) => [p?.roleLabel, p?.specialty].filter(Boolean).join(' · ');

/** "Ward B · Bed 4" from a populated unit (or the server's unit text) */
export const unitText = (unit, terms) => {
  if (!unit) return '';
  if (typeof unit === 'string') return unit;
  const block = unit.block ? (terms?.block ? blockName(unit.block, terms) : unit.block) : '';
  return [block, unit.unitNumber].filter(Boolean).join(' · ');
};

/** "Nurse · Ward B" / "Doctor · Cardiology" for the signed-in staff member */
export const myRoleLine = (myRole, user, terms) => {
  if (!myRole) return '';
  const unit = user?.unitId && typeof user.unitId === 'object' ? unitText(user.unitId, terms) : '';
  return [myRole.label, user?.roleInfo?.specialty, unit].filter(Boolean).join(' · ');
};

export function RoleBadge({ myRole, user, terms, light = false, className = '' }) {
  if (!myRole) return null;
  const line = myRoleLine(myRole, user, terms);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2 py-0.5 max-w-full ${light ? 'bg-white/15 border border-white/25 text-white' : 'bg-indigo-50 border border-indigo-100 text-indigo-700'} ${className}`}>
      <span className="truncate">{line}</span>
      {user?.roleInfo?.onCall && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" title="On call" />}
    </span>
  );
}

/**
 * Call (phone), in-app call (when the site allows calls) and Message buttons
 * for a person card.
 */
export function ContactButtons({ person, size = 'md', message = true }) {
  const { allowed, householdAllows } = useHousehold();
  const { startCall } = useCall() || {};
  // Calls with site staff are open even where neighbour calling is off
  // (server: utils/staffCall) — only a family member's permission applies.
  const canInApp = !!startCall && (householdAllows ? householdAllows('neighbours') : allowed('neighbours'));
  const canChat = message && allowed('chat');
  const pad = size === 'sm' ? 'h-8 px-2.5 text-[12px]' : 'h-9 px-3 text-[13px]';
  const inApp = async () => {
    const r = await startCall({ _id: person._id, name: person.name, profilePhoto: person.profilePhoto });
    if (r?.needCredits) toast('You need call credits for an in-app call. Use the phone button instead.', { icon: '🪙' });
  };
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {person?.phone && (
        <a href={`tel:${person.phone}`} className={`inline-flex items-center gap-1.5 rounded-xl font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors ${pad}`} style={{ textDecoration: 'none' }}>
          <Phone size={13} /> Call
        </a>
      )}
      {canInApp && person?._id && (
        <button type="button" onClick={inApp} className={`inline-flex items-center gap-1.5 rounded-xl font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors ${pad}`}>
          <PhoneCall size={13} /> App call
        </button>
      )}
      {canChat && person?._id && (
        <Link to={`/chat?dm=${person._id}`} className={`inline-flex items-center gap-1.5 rounded-xl font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors ${pad}`} style={{ textDecoration: 'none' }}>
          <MessageSquare size={13} /> Message
        </Link>
      )}
    </div>
  );
}

export function SectionTitle({ children, sub, right }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="text-[16px] font-semibold text-slate-900 truncate" style={{ letterSpacing: '-0.02em' }}>{children}</h2>
        {sub && <p className="text-[12px] text-slate-400 truncate">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export const CARD = 'rounded-[22px] bg-white border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)]';
