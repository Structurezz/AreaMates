import { HeartPulse, Users, Radio } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { useRoles } from '../../context/RolesContext';
import { Avatar, OnCallDot, ContactButtons, staffLine, CARD } from './shared';

function StaffRow({ p, compact }) {
  return (
    <div className="flex items-start gap-3 px-3 py-3 border-t border-slate-100 first:border-0">
      <Avatar person={p} size={compact ? 38 : 44} ring={p.onCall ? '#10B981' : undefined} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[14px] font-semibold text-slate-900 truncate">{p.name}</span>
          <OnCallDot on={p.onCall} />
        </div>
        <div className="text-[12px] text-slate-500 truncate">{[staffLine(p), p.unit].filter(Boolean).join(' · ')}</div>
        {p.shift?.start && <div className={`text-[11px] truncate ${p.shift.onShift ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>{p.shift.onShift ? 'On shift now' : 'Off shift'} · {p.shift.start}–{p.shift.end}</div>}
        <div className="mt-2"><ContactButtons person={p} size="sm" /></div>
      </div>
    </div>
  );
}

function Group({ title, Icon, color, people, compact }) {
  if (!people?.length) return null;
  return (
    <div>
      <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color }}>
        <Icon size={12} /> {title}
      </div>
      <div className="px-1">{people.map((p) => <StaffRow key={p._id} p={p} compact={compact} />)}</div>
    </div>
  );
}

/**
 * Member home: "My care team" / "My adviser & warden" / "My supervisor",
 * who covers their ward / class / hall, and who is on call now.
 */
export default function MyTeamCard({ compact = false }) {
  const { isEstate, isStaff, assignLabel, terms, w } = useSite();
  const { team } = useRoles();
  if (isEstate || isStaff || !team || team.isStaff) return null;
  const assigned = team.assigned || [];
  const covering = team.covering || [];
  const coveringIds = new Set([...assigned, ...covering].map((p) => String(p._id)));
  const onCall = (team.onCall || []).filter((p) => !coveringIds.has(String(p._id))).slice(0, 4);
  if (!assigned.length && !covering.length && !onCall.length) return null;

  const label = assignLabel || 'Staff';
  const title = team.forName ? `${team.forName}'s ${label.toLowerCase()}` : `My ${label.toLowerCase()}`;

  return (
    <section className={`dash-rise ${CARD} overflow-hidden`} style={{ animationDelay: '50ms' }}>
      <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: 'linear-gradient(135deg, #EC489914 0%, #FFFFFF 70%)' }}>
        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#EC4899,#DB2777)', boxShadow: '0 6px 14px -6px #EC4899' }}>
          <HeartPulse size={17} className="text-white" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900 truncate" style={{ letterSpacing: '-0.02em' }}>{title}</h2>
          <p className="text-[12px] text-slate-400 truncate">{team.unit ? `${terms.unit} ${team.unit}` : `People looking after ${team.forName ? 'them' : 'you'}`}</p>
        </div>
      </div>
      <div className="pb-2">
        <Group title={label} Icon={HeartPulse} color="#DB2777" people={assigned} compact={compact} />
        <Group title={`Covering ${team.forName ? 'their' : 'your'} ${w.unitLc}`} Icon={Users} color="#6366F1" people={covering} compact={compact} />
        <Group title="On call now" Icon={Radio} color="#059669" people={onCall} compact={compact} />
      </div>
    </section>
  );
}
