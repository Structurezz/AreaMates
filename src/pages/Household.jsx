import { useEffect, useMemo, useState } from 'react';
import {
  Users, UserPlus, Home, Crown, Mail, Phone, X, Check, Send, Trash2, PauseCircle, PlayCircle, Pencil,
  UserCheck, CreditCard, MessageSquare, Music, ShoppingBag, PhoneCall, Megaphone, ShieldAlert, User as UserIcon,
  Sparkles, Clock, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { householdAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Portal, { Z } from '../components/ui/Portal';
import { PageLoader } from '../components/ui/Spinner';
import useIsDesktop from '../hooks/useIsDesktop';

const PERM_META = {
  visitors:    { Icon: UserCheck,     color: '#6366F1' },
  payments:    { Icon: CreditCard,    color: '#10B981' },
  chat:        { Icon: MessageSquare, color: '#3B82F6' },
  community:   { Icon: Music,         color: '#8B5CF6' },
  marketplace: { Icon: ShoppingBag,   color: '#F59E0B' },
  neighbours:  { Icon: PhoneCall,     color: '#EC4899' },
};

const BASICS = [
  { Icon: Megaphone,   label: 'Estate announcements' },
  { Icon: ShieldAlert, label: 'Security alerts & personal safety' },
  { Icon: UserIcon,    label: 'Their own profile & password' },
];

const REL_EMOJI = { Spouse: '💍', Child: '🧒🏾', Parent: '👵🏾', Sibling: '🧑🏾‍🤝‍🧑🏾', Relative: '👨🏾‍👩🏾‍👧🏾', 'Domestic staff': '🧹', Other: '🏠' };
const GRADS = [
  ['#6366F1', '#8B5CF6'], ['#EC4899', '#F43F5E'], ['#0EA5E9', '#6366F1'],
  ['#10B981', '#0D9488'], ['#F59E0B', '#F97316'], ['#8B5CF6', '#C026D3'],
];
const grad = (id = '') => GRADS[[...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0) % GRADS.length];

function Avatar({ person, size = 44, ring = false }) {
  const [a, b] = grad(person?._id);
  return (
    <span className="relative block flex-shrink-0 rounded-full overflow-hidden"
      style={{ width: size, height: size, boxShadow: ring ? '0 0 0 3px #fff' : undefined }}>
      {person?.profilePhoto
        ? <img src={person.profilePhoto} alt="" className="w-full h-full object-cover" />
        : <span className="w-full h-full flex items-center justify-center text-white font-bold"
            style={{ background: `linear-gradient(135deg, ${a}, ${b})`, fontSize: size * 0.38 }}>
            {person?.name?.[0]?.toUpperCase() || '?'}
          </span>}
    </span>
  );
}

function Toggle({ on }) {
  return (
    <span className="relative inline-flex w-10 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? '#6366F1' : '#E2E8F0' }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 18 : 2 }} />
    </span>
  );
}

function statusOf(m) {
  if (m.status === 'pending') return { label: 'Awaiting approval', bg: '#FEF3C7', fg: '#B45309' };
  if (!m.isActive) return { label: 'Paused', bg: '#F1F5F9', fg: '#64748B' };
  if (m.pendingFirstLogin) return { label: 'Invite sent', bg: '#E0E7FF', fg: '#4338CA' };
  return { label: 'Active', bg: '#DCFCE7', fg: '#15803D' };
}

/* ── Add / edit panel ─────────────────────────────────────────────── */

function MemberPanel({ options, member, onClose, onSaved }) {
  const editing = !!member;
  const [form, setForm] = useState({
    name: member?.name || '', email: member?.email || '', phone: member?.phone || '',
    relationship: member?.relationship || '',
    permissions: member?.permissions || options.presets.adult.permissions,
  });
  const [saving, setSaving] = useState(false);
  const isDesktop = useIsDesktop();
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePerm = (p) => set('permissions', form.permissions.includes(p) ? form.permissions.filter(x => x !== p) : [...form.permissions, p]);
  const presetActive = (preset) => preset.permissions.length === form.permissions.length && preset.permissions.every(p => form.permissions.includes(p));

  // Picking a relationship suggests a sensible starting point
  const pickRelationship = (r) => {
    set('relationship', r);
    if (editing) return;
    const preset = { Spouse: 'adult', Parent: 'adult', Sibling: 'adult', Child: 'child', 'Domestic staff': 'staff' }[r];
    if (preset) set('permissions', options.presets[preset].permissions);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = editing
        ? await householdAPI.update(member._id, { name: form.name, relationship: form.relationship, permissions: form.permissions })
        : await householdAPI.invite(form);
      toast.success(editing ? `${form.name.split(' ')[0]}'s access updated` : data.message);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      {/* Desktop: right-hand side bar · Mobile: bottom sheet */}
      <div className={`fixed inset-0 ${Z.drawer} flex ${isDesktop ? 'justify-end' : 'items-end justify-center'}`}>
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} />
        <form onSubmit={save} role="dialog" aria-modal="true" aria-label={editing ? `Edit ${member.name}` : 'Add family member'}
          className={`relative w-full bg-white flex flex-col overflow-hidden ${isDesktop
            ? 'h-full max-w-[440px] animate-slide-in-right'
            : 'rounded-t-3xl max-h-[92dvh] dash-rise'}`}
          style={{ boxShadow: isDesktop ? '-8px 0 40px rgba(15,23,42,0.18)' : '0 -10px 40px rgba(15,23,42,0.18)' }}>
          <div className="relative px-6 pt-6 pb-5 text-white overflow-hidden flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#6366F1 0%,#4F46E5 55%,#7C3AED 100%)' }}>
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 dash-blob" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">{editing ? 'Family member' : 'New family member'}</p>
                <h2 className="text-lg font-bold !text-white mt-0.5">{editing ? member.name : 'Add someone to your home'}</h2>
                <p className="text-[12.5px] text-white/75 mt-1">{options.requiresApproval && !editing
                  ? 'Your estate manager approves new family members, then their AreaMates invite goes out.'
                  : "They'll get their own AreaMates login. Bills stay with you."}</p>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25"><X size={16} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <div className="grid gap-3">
              <input className="input-field" placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} required />
              {!editing && <>
                <input className="input-field" type="email" placeholder="Email address (their login)" value={form.email} onChange={e => set('email', e.target.value)} required />
                <input className="input-field" type="tel" placeholder="Phone (optional)" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </>}
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Relationship</p>
              <div className="flex flex-wrap gap-2">
                {options.relationships.map(r => {
                  const on = form.relationship === r;
                  return (
                    <button type="button" key={r} onClick={() => pickRelationship(r)}
                      className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all"
                      style={on ? { background: '#EEF2FF', borderColor: '#818CF8', color: '#4338CA' } : { borderColor: '#E2E8F0', color: '#475569' }}>
                      <span className="mr-1">{REL_EMOJI[r]}</span>{r}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">What they can use</p>
                <span className="text-[11px] text-slate-400">{form.permissions.length} of {Object.keys(options.permissions).length} on</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(options.presets).map(([key, p]) => (
                  <button type="button" key={key} onClick={() => set('permissions', p.permissions)}
                    className="px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all"
                    style={presetActive(p) ? { background: '#4F46E5', color: '#fff' } : { background: '#F1F5F9', color: '#475569' }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                {Object.entries(options.permissions).map(([key, p]) => {
                  const { Icon, color } = PERM_META[key] || PERM_META.visitors;
                  const on = form.permissions.includes(key);
                  return (
                    <button type="button" key={key} onClick={() => togglePerm(key)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80 transition-colors">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ background: on ? `${color}18` : '#F8FAFC', color: on ? color : '#CBD5E1' }}>
                        <Icon size={16} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] font-semibold" style={{ color: on ? '#0F172A' : '#64748B' }}>{p.label}</span>
                        <span className="block text-[12px] text-slate-400 leading-snug">{p.description}</span>
                      </span>
                      <Toggle on={on} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl p-4" style={{ background: '#F8FAFC' }}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">Always included</p>
              <div className="space-y-1.5">
                {BASICS.map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-[12.5px] text-slate-600">
                    <Check size={13} className="text-indigo-500" /><Icon size={13} className="text-slate-400" />{label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex gap-2 flex-shrink-0 bg-white" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-[2] justify-center !py-2.5 inline-flex items-center gap-2">
              {editing ? <><Check size={15} /> Save access</> : <><Send size={15} /> {saving ? 'Sending…' : options.requiresApproval ? 'Send for approval' : 'Send invite'}</>}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}

/* ── Member card ──────────────────────────────────────────────────── */

function MemberCard({ m, i, options, isHead, onEdit, onChanged }) {
  const [busy, setBusy] = useState(false);
  const st = statusOf(m);
  const first = m.name.split(' ')[0];

  const run = async (fn, okMsg) => {
    setBusy(true);
    try { const { data } = await fn(); toast.success(okMsg || data.message); onChanged(); }
    catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
    finally { setBusy(false); }
  };

  return (
    <div className="dash-rise group bg-white rounded-3xl border border-slate-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
      style={{ animationDelay: `${80 + i * 60}ms`, opacity: m.isActive || m.status === 'pending' ? 1 : 0.7 }}>
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar person={m} size={48} />
          {m.relationship && <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center text-[12px]">{REL_EMOJI[m.relationship] || '🏠'}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-bold text-slate-900 truncate">{m.name}</p>
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.fg }}>{st.label}</span>
          </div>
          <p className="text-[12.5px] text-slate-500 truncate">{m.relationship || 'Family member'} · {m.email}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {Object.entries(options.permissions).map(([key, p]) => {
          const { Icon, color } = PERM_META[key] || PERM_META.visitors;
          const on = m.permissions.includes(key);
          return (
            <span key={key} title={`${p.label}: ${on ? 'on' : 'off'}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold"
              style={on ? { background: `${color}14`, color } : { background: '#F8FAFC', color: '#CBD5E1', textDecoration: 'line-through' }}>
              <Icon size={11} /> {p.label}
            </span>
          );
        })}
      </div>

      {m.status === 'pending' && (
        <p className="mt-3 text-[12px] text-amber-700 bg-amber-50 rounded-xl px-3 py-2 flex items-center gap-2">
          <Clock size={13} className="flex-shrink-0" /> Waiting for your estate manager. Their invite goes out once approved.
        </p>
      )}

      {isHead && (
        <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100">
          <button onClick={() => onEdit(m)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100">
            <Pencil size={12} /> Edit access
          </button>
          {m.pendingFirstLogin && m.isActive && (
            <button disabled={busy} onClick={() => run(() => householdAPI.resendInvite(m._id))}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12.5px] font-semibold text-slate-600 hover:bg-slate-100">
              <Send size={12} /> Resend
            </button>
          )}
          <div className="flex-1" />
          {m.status !== 'pending' && <button disabled={busy} title={m.isActive ? 'Pause access' : 'Resume access'}
            onClick={() => run(() => householdAPI.update(m._id, { isActive: !m.isActive }), m.isActive ? `${first} is paused` : `${first} can sign in again`)}
            className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50">
            {m.isActive ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
          </button>}
          <button disabled={busy} title={m.status === 'pending' ? 'Cancel request' : 'Remove from household'}
            onClick={() => {
              const ask = m.status === 'pending' ? `Cancel the request to add ${m.name}?` : `Remove ${m.name} from your household? They won't be able to sign in any more.`;
              if (window.confirm(ask)) run(() => householdAPI.remove(m._id));
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50">
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default function Household() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [options, setOptions] = useState(null);
  const [panel, setPanel] = useState(null); // null | 'new' | member

  const load = () => householdAPI.get().then(({ data }) => setData(data.data)).catch(() => setData({ error: true }));
  useEffect(() => {
    load();
    householdAPI.options().then(({ data }) => setOptions(data.data)).catch(() => {});
  }, []);

  const everyone = useMemo(() => data?.head ? [data.head, ...(data.members || [])] : [], [data]);

  if (!data || !options) return <PageLoader />;
  if (data.error) return <p className="text-center text-sm text-slate-500 py-20">Couldn't load your household. Try again shortly.</p>;

  const { isHead, head, members, unit, myPermissions } = data;
  const activeCount = members.filter(m => m.isActive && m.status !== 'pending').length;
  const roomLeft = unit ? Math.max(0, unit.maxOccupants - unit.occupants) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 flex-wrap dash-rise">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-500">Your home</p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Household</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {isHead ? 'Add the people who live with you and choose what each of them can use.' : `You're part of ${head?.name?.split(' ')[0] || 'your'}'s household.`}
          </p>
        </div>
        {isHead && (
          <button onClick={() => setPanel('new')} disabled={!roomLeft || members.length >= options.maxMembers}
            className="btn-primary inline-flex items-center gap-2">
            <UserPlus size={15} /> Add family member
          </button>
        )}
      </div>

      {/* Home strip */}
      <div className="relative rounded-3xl p-5 sm:p-6 text-white overflow-hidden dash-rise" style={{ animationDelay: '60ms', background: 'linear-gradient(135deg,#4F46E5 0%,#6366F1 50%,#8B5CF6 100%)' }}>
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10 dash-blob" />
        <div className="absolute right-24 -bottom-20 w-40 h-40 rounded-full bg-fuchsia-300/20 dash-blob" style={{ animationDelay: '-5s' }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0"><Home size={22} /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">{user?.estateId?.name || 'Your estate'}</p>
              <p className="text-lg font-bold truncate">{unit?.label || 'Your unit'}</p>
              <p className="text-[12.5px] text-white/75">{everyone.length} {everyone.length === 1 ? 'person' : 'people'} on AreaMates · {unit ? `${unit.occupants}/${unit.maxOccupants} occupants` : ''}</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex -space-x-3">
              {everyone.slice(0, 6).map(p => <Avatar key={p._id} person={p} size={40} ring />)}
            </div>
            {everyone.length > 6 && <span className="ml-2 text-[12px] font-semibold text-white/80">+{everyone.length - 6}</span>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* People */}
        <div className="lg:col-span-2 space-y-4">
          {/* Head */}
          <div className="dash-rise bg-white rounded-3xl border border-slate-100 p-5 flex items-center gap-3" style={{ animationDelay: '100ms' }}>
            <Avatar person={head} size={48} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-bold text-slate-900 truncate">{head?.name}{isHead && ' (you)'}</p>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"><Crown size={10} /> Head of household</span>
              </div>
              <p className="text-[12.5px] text-slate-500 truncate flex items-center gap-3">
                {head?.email && <span className="inline-flex items-center gap-1"><Mail size={11} />{head.email}</span>}
                {head?.phone && <span className="hidden sm:inline-flex items-center gap-1"><Phone size={11} />{head.phone}</span>}
              </p>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="dash-rise rounded-3xl border-2 border-dashed border-indigo-100 bg-indigo-50/30 p-8 text-center" style={{ animationDelay: '140ms' }}>
              <div className="text-4xl mb-3">👨🏾‍👩🏾‍👧🏾‍👦🏾</div>
              <p className="text-[15px] font-bold text-slate-800">{isHead ? 'Bring your household onto AreaMates' : 'No other family members yet'}</p>
              {isHead && <>
                <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">Your spouse can invite guests, your kids can join the lounge, your house help can open the gate for deliveries. You decide.</p>
                <button onClick={() => setPanel('new')} disabled={!roomLeft} className="btn-primary inline-flex items-center gap-2 mt-4"><UserPlus size={15} /> Add your first family member</button>
              </>}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {members.map((m, i) => (
                <MemberCard key={m._id} m={m} i={i} options={options} isHead={isHead}
                  onEdit={setPanel} onChanged={load} />
              ))}
            </div>
          )}
        </div>

        {/* Side rail */}
        <div className="space-y-4">
          {isHead ? (
            <div className="dash-rise bg-white rounded-3xl border border-slate-100 p-5" style={{ animationDelay: '160ms' }}>
              <p className="text-[13px] font-bold text-slate-900 flex items-center gap-2"><Sparkles size={14} className="text-indigo-500" /> How it works</p>
              <ul className="mt-3 space-y-3 text-[12.5px] text-slate-600">
                <li className="flex gap-2.5"><UserPlus size={14} className="text-indigo-500 mt-0.5 flex-shrink-0" />Each person gets their own login by email and sets their own password.</li>
                {options.requiresApproval && <li className="flex gap-2.5"><Clock size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />Your estate approves new family members before their invite is sent.</li>}
                <li className="flex gap-2.5"><Receipt size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />Estate bills are only sent to you. Family members are never billed.</li>
                <li className="flex gap-2.5"><ShieldAlert size={14} className="text-red-500 mt-0.5 flex-shrink-0" />Everyone can always raise a security alert and get estate notices.</li>
                <li className="flex gap-2.5"><PauseCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />Pause or remove someone any time, e.g. when house help leaves.</li>
              </ul>
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                <div><p className="text-xl font-bold text-slate-900">{activeCount}</p><p className="text-[11px] text-slate-400">Active members</p></div>
                <div><p className="text-xl font-bold text-slate-900">{roomLeft}</p><p className="text-[11px] text-slate-400">Spaces left in unit</p></div>
              </div>
            </div>
          ) : (
            <div className="dash-rise bg-white rounded-3xl border border-slate-100 p-5" style={{ animationDelay: '160ms' }}>
              <p className="text-[13px] font-bold text-slate-900">Your access</p>
              <p className="text-[12px] text-slate-500 mt-0.5">Set by {head?.name?.split(' ')[0] || 'your household head'}.</p>
              <div className="mt-3 space-y-2">
                {BASICS.map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 text-[12.5px] text-slate-700">
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center"><Icon size={13} /></span>{label}
                  </div>
                ))}
                {Object.entries(options.permissions).map(([key, p]) => {
                  const { Icon, color } = PERM_META[key] || PERM_META.visitors;
                  const on = myPermissions.includes(key);
                  return (
                    <div key={key} className="flex items-center gap-2.5 text-[12.5px]" style={{ color: on ? '#334155' : '#CBD5E1' }}>
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: on ? `${color}14` : '#F8FAFC', color: on ? color : '#CBD5E1' }}><Icon size={13} /></span>
                      <span className="flex-1">{p.label}</span>
                      {on ? <Check size={14} className="text-emerald-500" /> : <Clock size={13} />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {panel && (
        <MemberPanel options={options} member={panel === 'new' ? null : panel}
          onClose={() => setPanel(null)} onSaved={() => { setPanel(null); load(); }} />
      )}
    </div>
  );
}
