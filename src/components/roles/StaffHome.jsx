import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Radio, Siren, Search, UserCheck, Users, Phone, BedDouble, ChevronDown, ClipboardList, ArrowRight, Footprints, AlertTriangle } from 'lucide-react';
import { siteAPI, alertAPI } from '../../api';
import { useSite } from '../../context/SiteContext';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useRoles } from '../../context/RolesContext';
import { unitLabelOf, upsertAlert, raiserIdOf } from '../../utils/alertEvents';
import { Avatar, CARD, ContactButtons } from './shared';
import PassApprovals from './PassApprovals';
import { StartRollcallButton } from '../../pages/Rollcall';

const fmt = (d) => { try { return format(new Date(d), 'd MMM'); } catch { return ''; } };

/** On-call switch (roles with an on-call rota). */
export function OnCallSwitch() {
  const { team, setTeam } = useRoles();
  const [busy, setBusy] = useState(false);
  if (!team?.isStaff || !team.canOnCall) return null;
  const on = !!team.onCall;
  const toggle = async () => {
    setBusy(true);
    try {
      const { data } = await siteAPI.setOnCall(!on);
      setTeam((t) => ({ ...t, onCall: !!data.data?.onCall }));
      toast.success(data.message || (on ? "You're off call" : "You're on call"));
    } catch (e) { toast.error(e.response?.data?.message || 'Could not change on-call'); }
    finally { setBusy(false); }
  };
  return (
    <button onClick={toggle} disabled={busy} role="switch" aria-checked={on}
      className={`dash-rise w-full flex items-center gap-3 rounded-2xl px-4 py-3 border text-left transition-colors ${on ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200/70'}`}>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${on ? 'bg-emerald-500' : 'bg-slate-200'}`}>
        <Radio size={16} className={on ? 'text-white' : 'text-slate-500'} />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[14px] font-semibold ${on ? 'text-emerald-800' : 'text-slate-800'}`}>{on ? "You're on call" : "You're off call"}</span>
        <span className="block text-[12px] text-slate-500 truncate">{on ? 'Emergencies anywhere on site will reach you' : 'Turn on to get emergencies site-wide'}</span>
      </span>
      <span className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
      </span>
    </button>
  );
}

/** Emergencies routed to me that are still open. */
export function ActiveEmergencies() {
  const { user } = useAuth();
  const { terms } = useSite();
  const { openRouted } = useRoles();
  const { subscribe } = useSocket() || {};
  const meId = String(user?._id || '');
  const [list, setList] = useState([]);
  const load = useCallback(async () => {
    try {
      const { data } = await alertAPI.getAll({ status: 'active', limit: 20 });
      setList((data.data || []).filter((a) => !a.isEmergencyBroadcast && raiserIdOf(a) !== meId));
    } catch { /* ignore */ }
  }, [meId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const h = () => load();
    window.addEventListener('roles:alerts', h);
    return () => window.removeEventListener('roles:alerts', h);
  }, [load]);
  useEffect(() => {
    if (!subscribe) return undefined;
    return subscribe('new_alert', (a) => {
      if (!a?._id || a.isEmergencyBroadcast || raiserIdOf(a) === meId) return;
      setList((prev) => {
        const known = prev.some((x) => x._id === a._id);
        if (!known && !(a.routed || (a.routedTo || []).some((x) => String(x?._id || x) === meId))) return prev;
        return upsertAlert(prev, a).filter((x) => x.status !== 'resolved');
      });
    });
  }, [subscribe, meId]);

  if (!list.length) return null;
  return (
    <section className="dash-rise">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="relative w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
          <span className="dash-ripple absolute inset-0 rounded-lg bg-red-500" />
          <Siren size={14} className="relative text-white" />
        </span>
        <h2 className="text-[15px] font-semibold text-slate-900">Active emergencies</h2>
        <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">{list.length}</span>
      </div>
      <div className={`${CARD} overflow-hidden border-red-200`}>
        {list.map((a) => {
          const p = typeof a.residentId === 'object' ? a.residentId : null;
          const coming = (a.responders || []).filter((r) => r.status !== 'cannot');
          const mine = (a.responders || []).find((r) => String(r.userId?._id || r.userId) === meId);
          return (
            <button key={a._id} onClick={() => openRouted(a)} className="w-full text-left flex items-center gap-3 px-4 py-3 border-t border-slate-100 first:border-0 hover:bg-red-50/40">
              <Avatar person={p} size={38} />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold text-slate-900 truncate">{a.title || 'Emergency'} · {p?.name || 'Someone'}</span>
                <span className="block text-[12px] text-slate-500 truncate">{[unitLabelOf(a, terms), a.note].filter(Boolean).join(' · ')}</span>
                <span className={`block text-[11px] font-medium truncate ${coming.length ? 'text-emerald-600' : 'text-red-600'}`}>
                  {coming.length ? <><Footprints size={10} className="inline -mt-0.5" /> {coming.map((r) => r.name).join(', ')} responding</> : <><AlertTriangle size={10} className="inline -mt-0.5" /> No response yet</>}
                  {a.createdAt ? ` · ${formatDistanceToNowStrict(new Date(a.createdAt), { addSuffix: true })}` : ''}
                </span>
              </span>
              <span className={`text-[12px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${mine ? 'bg-emerald-50 text-emerald-700' : 'bg-red-600 text-white'}`}>
                {mine ? (mine.status === 'arrived' ? 'Arrived' : mine.status === 'cannot' ? "Can't" : 'On way') : 'Respond'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function PersonCard({ p, form, terms }) {
  const [open, setOpen] = useState(false);
  const stay = p.stay;
  const idLabel = form?.id;
  const groupLabel = form?.group;
  return (
    <div className="border-t border-slate-100 first:border-0">
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70">
        <Avatar person={p} size={40} />
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-[14px] font-semibold text-slate-900 truncate">{p.name}</span>
            {p.assignedToMe && <span className="text-[10px] font-semibold text-pink-700 bg-pink-50 border border-pink-200 rounded-full px-1.5 py-0.5 flex-shrink-0">Assigned to you</span>}
          </span>
          <span className="block text-[12px] text-slate-500 truncate">
            {[p.unit && `${terms.unit} ${p.unit}`, p.memberProfile?.className].filter(Boolean).join(' · ') || `No ${terms.unit.toLowerCase()}`}
          </span>
          <span className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
            {stay?.checkIn && <span className="inline-flex items-center gap-1"><BedDouble size={10} /> {terms.stayIn || 'In'} {fmt(stay.checkIn)}{stay.checkOut ? ` → ${fmt(stay.checkOut)}` : ''}</span>}
            {p.visitorsInside > 0 && <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><UserCheck size={10} /> {p.visitorsInside} visitor{p.visitorsInside === 1 ? '' : 's'} inside</span>}
          </span>
        </span>
        <ChevronDown size={15} className={`text-slate-300 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 pl-[68px] space-y-2.5">
          {(idLabel && p.memberProfile?.idNumber) || (groupLabel && p.memberProfile?.className) ? (
            <div className="text-[12px] text-slate-500 space-y-0.5">
              {idLabel && p.memberProfile?.idNumber && <div>{idLabel}: <span className="font-semibold text-slate-700">{p.memberProfile.idNumber}</span></div>}
              {groupLabel && p.memberProfile?.className && <div>{groupLabel}: <span className="font-semibold text-slate-700">{p.memberProfile.className}</span></div>}
            </div>
          ) : null}
          {stay?.checkIn && (
            <div className="text-[12px] text-slate-500">
              {terms.stayIn}: <span className="font-semibold text-slate-700">{format(new Date(stay.checkIn), 'EEE d MMM, HH:mm')}</span>
              {stay.checkOut && <> · {terms.stayOut}: <span className="font-semibold text-slate-700">{format(new Date(stay.checkOut), 'EEE d MMM, HH:mm')}</span></>}
            </div>
          )}
          <ContactButtons person={p} size="sm" />
          {p.kin?.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">{form?.kinLabel || terms.family}</div>
              <div className="space-y-1">
                {p.kin.map((k) => (
                  <div key={k._id || k.name} className="flex items-center gap-2 text-[13px]">
                    <span className="flex-1 min-w-0 truncate text-slate-700">{k.name}{k.relationship ? <span className="text-slate-400"> · {k.relationship}</span> : null}</span>
                    {k.phone && <a href={`tel:${k.phone}`} className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1" style={{ textDecoration: 'none' }}><Phone size={11} /> Call</a>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** "My patients" / "My students" / "My guests" / "My employees" */
export function MyPeople() {
  const { team } = useRoles();
  const { defaultRoleDef, terms } = useSite();
  const [q, setQ] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const people = team?.people || [];
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return people
      .filter((p) => !mineOnly || p.assignedToMe)
      .filter((p) => !t || `${p.name} ${p.unit} ${p.memberProfile?.idNumber || ''} ${p.memberProfile?.className || ''}`.toLowerCase().includes(t))
      .sort((a, b) => (b.assignedToMe - a.assignedToMe) || a.name.localeCompare(b.name));
  }, [people, q, mineOnly]);
  if (!team?.isStaff) return null;
  const plural = defaultRoleDef?.plural || terms.members;
  const mineCount = people.filter((p) => p.assignedToMe).length;

  return (
    <section className="dash-rise">
      <div className="flex items-end justify-between gap-3 mb-2.5">
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-slate-900 flex items-center gap-2" style={{ letterSpacing: '-0.02em' }}><Users size={16} className="text-indigo-500" /> My {plural.toLowerCase()}</h2>
          <p className="text-[12px] text-slate-400 truncate">{people.length} {people.length === 1 ? (defaultRoleDef?.label || terms.member).toLowerCase() : plural.toLowerCase()}{team.unit ? ` · ${team.unit}` : ''}{mineCount ? ` · ${mineCount} assigned to you` : ''}</p>
        </div>
      </div>
      {people.length > 0 && (
        <div className="flex gap-2 mb-2.5">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${plural.toLowerCase()}${defaultRoleDef?.form?.id ? ` or ${defaultRoleDef.form.id.toLowerCase()}` : ''}`}
              className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          {mineCount > 0 && (
            <button onClick={() => setMineOnly((m) => !m)} className={`h-10 px-3 rounded-xl text-[12px] font-semibold border flex-shrink-0 ${mineOnly ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-slate-200 text-slate-600'}`}>
              Assigned to me
            </button>
          )}
        </div>
      )}
      <div className={`${CARD} overflow-hidden`}>
        {people.length === 0 ? (
          <p className="px-4 py-5 text-[13px] text-slate-500 text-center">No {plural.toLowerCase()} assigned to you yet. The {terms.manager.toLowerCase()} assigns them.</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-slate-400 text-center">Nobody matches “{q}”</p>
        ) : filtered.slice(0, 150).map((p) => <PersonCard key={p._id} p={p} form={defaultRoleDef?.form} terms={terms} />)}
      </div>
    </section>
  );
}

/** Staff dashboard block: on-call, emergencies, approvals, roll-call, my people. */
export default function StaffHome() {
  const { isEstate, isStaff, moduleOn } = useSite();
  const { team } = useRoles();
  if (isEstate || !isStaff) return null;
  return (
    <div className="space-y-5">
      <OnCallSwitch />
      <ActiveEmergencies />
      <PassApprovals />
      <div className="flex flex-wrap gap-2">
        {moduleOn('requests') && (
          <Link to="/requests" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-[13px] font-semibold" style={{ textDecoration: 'none' }}>
            <ClipboardList size={14} /> Request queue <ArrowRight size={13} />
          </Link>
        )}
        <StartRollcallButton compact />
      </div>
      {team ? <MyPeople /> : <div className="skeleton h-24 rounded-2xl" />}
    </div>
  );
}
