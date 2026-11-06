import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { MessageCircle, X, Send, Loader2, ChevronDown, ChevronRight, Check, Users, BellRing, MapPin } from 'lucide-react';
import { requestAPI } from '../../api';
import Portal from '../ui/Portal';
import { PageLoader } from '../ui/Spinner';
import { CARD } from '../roles/shared';
import { KIND_ICON, QUICK_NOTES, bigTone, kindColor, shortName, splitKinds } from './requestUi';
import { lastMessage, threadOf } from './RequestThread';

const idOf = (v) => (v && typeof v === 'object' ? String(v._id || '') : v ? String(v) : '');
const agoShort = (d) => {
  try {
    return formatDistanceToNowStrict(new Date(d))
      .replace(/ seconds?/, 's').replace(/ minutes?/, 'm').replace(/ hours?/, 'h')
      .replace(/ days?/, 'd').replace(/ months?/, 'mo').replace(/ years?/, 'y');
  } catch { return ''; }
};
const isActive = (r) => r.status === 'open' || r.status === 'accepted';
const isCallKind = (k) => !!k && (k.urgent || /^call_/.test(k.key));
const isMgmt = (k) => !!k && (k.managers || k.key === 'management');
const article = (s) => (/^[aeiou]/i.test(s) ? `an ${s}` : `a ${s}`);

/** Who a kind reaches, from my team: "Dr Ade (yours)", "Nurse Bisi on duty", or a fallback. */
function reachFor(k, team, roles, w) {
  if (isMgmt(k)) return { text: `Goes to ${w.siteMgmtLc}` };
  const want = new Set(k.roles || []);
  const match = (p) => want.has(p.role);
  const assigned = (team?.assigned || []).filter(match);
  if (assigned.length) return { text: `${shortName(assigned[0])} (yours)`, live: !!(assigned[0].onCall || assigned[0].shift?.onShift) };
  const covering = (team?.covering || []).filter(match);
  const duty = covering.find((p) => p.shift?.onShift) || covering.find((p) => p.onCall);
  if (duty) return { text: `${shortName(duty)} ${duty.shift?.onShift ? 'on duty' : 'on call'}`, live: true };
  const onCall = (team?.onCall || []).find(match);
  if (onCall) return { text: `${shortName(onCall)} on call`, live: true };
  if (covering[0]) return { text: shortName(covering[0]) };
  if (k.key === 'call_nurse') return { text: `${w.unit} nurses` };
  if (k.key === 'call_doctor') return { text: 'On-call doctor' };
  const labels = (k.roles || []).map((key) => roles.find((r) => r.key === key)?.label).filter(Boolean);
  return { text: labels.length ? `Goes to ${labels.slice(0, 2).join(' & ').toLowerCase()}` : `Goes to ${w.siteLc} staff` };
}

/** "Waiting for a nurse" / "Nurse Bisi is coming" / "Done · Replaced drip". */
function statusText(r, k, roles, w, myId) {
  if (r.status === 'open') {
    if (isMgmt(k)) return `Waiting for ${w.siteMgmtLc}`;
    const keys = (k?.roles || []).filter((x) => x !== 'staff');
    const label = keys.length === 1 ? roles.find((x) => x.key === keys[0])?.label : '';
    return `Waiting for ${label ? article(label.toLowerCase()) : 'staff'}`;
  }
  if (r.status === 'accepted') {
    const who = shortName(r.assigneeId) || 'Someone';
    return `${who} ${isCallKind(k) ? 'is coming' : 'is on it'}`;
  }
  if (r.status === 'done') {
    const fromStaff = threadOf(r).filter((m) => idOf(m.userId) !== String(myId) && m.text);
    const note = fromStaff[fromStaff.length - 1]?.text;
    return note ? `Done · ${note}` : 'Done';
  }
  return 'Cancelled';
}

function StatusDot({ status }) {
  if (status === 'open') {
    return (
      <span className="relative flex w-3 h-3 flex-shrink-0" aria-label="Waiting">
        <span className="absolute inset-0 rounded-full bg-amber-400 opacity-75 animate-ping" />
        <span className="relative w-3 h-3 rounded-full bg-amber-500" />
      </span>
    );
  }
  if (status === 'accepted') return <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0 ring-4 ring-emerald-100" aria-label="Accepted" />;
  if (status === 'done') return <span className="w-4 h-4 -mx-0.5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0" aria-label="Done"><Check size={10} strokeWidth={3} /></span>;
  return <span className="w-3 h-3 rounded-full border-2 border-slate-300 flex-shrink-0" aria-label="Cancelled" />;
}

// ── Send sheet ──────────────────────────────────────────────────────────────

function SendSheet({ kind, color, gradient, reach, required, onClose, onSent }) {
  const [chips, setChips] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const Icon = KIND_ICON[kind.key] || MessageCircle;
  const quick = QUICK_NOTES[kind.key] || [];
  const note = [...chips, text.trim()].filter(Boolean).join(' · ');
  const call = isCallKind(kind);
  const canSend = !busy && (!required || note.length > 0);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = (c) => setChips((l) => (l.includes(c) ? l.filter((x) => x !== c) : [...l, c]));
  const send = async () => {
    if (!canSend) return;
    setBusy(true);
    try {
      const { data } = await requestAPI.create({ kind: kind.key, note });
      toast.success(data.message || (call ? 'Calling now' : 'Request sent'));
      onSent(data.data);
      onClose();
    } catch (e) { toast.error(e.response?.data?.message || 'Could not send the request'); }
    finally { setBusy(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
        <div role="dialog" aria-modal="true" aria-label={kind.label}
          className="sheet-panel w-full sm:max-w-[440px] bg-white rounded-t-[28px] sm:rounded-[26px] overflow-hidden max-h-[92dvh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}>
          <div className="sm:hidden flex justify-center pt-2.5"><span className="w-10 h-1 rounded-full bg-slate-200" /></div>
          <div className="px-5 pt-4 sm:pt-5 flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: gradient || color, boxShadow: `0 8px 18px -8px ${color}` }}>
              <Icon size={22} className="text-white" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[18px] font-bold text-slate-900 leading-tight truncate" style={{ letterSpacing: '-0.02em' }}>{kind.label}</div>
              {reach && <div className="text-[12px] text-slate-500 truncate">{reach.text}</div>}
            </div>
            <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 flex-shrink-0"><X size={18} /></button>
          </div>

          <div className="px-5 pt-4 pb-2 space-y-3">
            <label className="block text-[13px] font-semibold text-slate-700">
              What do you need?{' '}
              <span className="font-normal text-slate-400">{required ? '' : '(optional)'}</span>
            </label>
            {quick.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {quick.map((c) => {
                  const on = chips.includes(c);
                  return (
                    <button key={c} type="button" onClick={() => toggle(c)}
                      className={`h-9 px-3.5 rounded-full text-[13px] font-semibold border transition-colors ${on ? 'text-white border-transparent' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                      style={on ? { background: color } : undefined}>
                      {on && <Check size={12} strokeWidth={3} className="inline -mt-0.5 mr-1" />}{c}
                    </button>
                  );
                })}
              </div>
            )}
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={500}
              autoFocus={required && !quick.length}
              placeholder={required ? 'A few words so they know what to bring' : 'Anything else? (optional)'}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white resize-none" />
          </div>

          <div className="px-5 pt-1 space-y-2" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
            <button onClick={send} disabled={!canSend}
              className="w-full h-14 rounded-2xl text-white text-[16px] font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
              style={{ background: gradient || color, boxShadow: `0 12px 24px -12px ${color}` }}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : call ? <BellRing size={18} /> : <Send size={17} />}
              {busy ? 'Sending…' : call ? 'Call now' : 'Send request'}
            </button>
            <button onClick={onClose} className="w-full h-10 rounded-xl text-slate-500 text-[14px] font-semibold hover:bg-slate-50">Not now</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Big call button ─────────────────────────────────────────────────────────

function BigButton({ k, tone, reach, active, statusLine, onPress, i }) {
  const Icon = KIND_ICON[k.key] || MessageCircle;
  const coming = active?.status === 'accepted';
  return (
    <button onClick={onPress}
      className="dash-rise group relative overflow-hidden rounded-[26px] p-4 sm:p-5 min-h-[148px] sm:min-h-[172px] text-left text-white flex flex-col justify-between active:scale-[0.97] transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2"
      style={{ animationDelay: `${i * 60}ms`, background: `linear-gradient(150deg, ${tone.from} 0%, ${tone.to} 100%)`, boxShadow: `0 16px 32px -16px ${tone.glow}, inset 0 1px 0 rgba(255,255,255,0.25)` }}>
      <span className="pointer-events-none absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -left-6 -bottom-10 w-24 h-24 rounded-full bg-black/10" />
      {active && <span className="pointer-events-none absolute inset-0 rounded-[26px] border-[3px] border-white/60 animate-pulse" />}

      <span className="relative flex items-start justify-between gap-2">
        <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Icon size={24} className="text-white" />
        </span>
        {active && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white text-[10px] font-extrabold uppercase tracking-wider px-2 py-1" style={{ color: tone.to }}>
            {coming ? <Check size={10} strokeWidth={3} /> : <Loader2 size={10} className="animate-spin" />}
            {coming ? 'Coming' : 'Calling'}
          </span>
        )}
      </span>

      <span className="relative mt-3 block">
        <span className="block text-[17px] sm:text-[20px] font-extrabold uppercase leading-tight" style={{ letterSpacing: '0.01em' }}>
          {active ? (coming ? 'On the way' : 'Calling…') : k.label}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[12px] sm:text-[13px] text-white/90 min-w-0">
          {!active && reach?.live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 flex-shrink-0 ring-2 ring-white/30" />}
          <span className="truncate">{active ? statusLine : reach?.text}</span>
        </span>
      </span>
    </button>
  );
}

// ── My request row ──────────────────────────────────────────────────────────

function Row({ r, k, label, line, unread, onOpen }) {
  return (
    <button onClick={() => onOpen(r)}
      className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-slate-50 active:bg-slate-100/70 transition-colors border-t border-slate-100 first:border-0">
      <StatusDot status={r.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className={`text-[14px] font-semibold truncate ${isActive(r) && k?.urgent ? 'text-red-700' : isActive(r) ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
          <span className="text-[11px] text-slate-400 flex-shrink-0 ml-auto">{agoShort(r.updatedAt || r.createdAt)}</span>
        </div>
        <div className={`text-[12px] truncate ${r.status === 'accepted' ? 'text-emerald-700 font-medium' : r.status === 'open' ? 'text-amber-700' : 'text-slate-400'}`}>{line}</div>
      </div>
      {unread
        ? <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 flex-shrink-0" aria-label="New message" />
        : <ChevronRight size={15} className="text-slate-300 flex-shrink-0" />}
    </button>
  );
}

// ── Page body ───────────────────────────────────────────────────────────────

/**
 * The member's bedside call panel: two big call buttons (urgent kinds, or the
 * site's main two), smaller option chips for the rest, and a live list of
 * "Your requests". Staff keep the queue view in pages/Requests.jsx.
 */
export default function MemberRequests({ site, team, kinds, mine, myId, seen, initialKind, onOpen, onSent }) {
  const { type, terms, w, roles = [], name } = site;
  const [sheet, setSheet] = useState(null);
  const [showEarlier, setShowEarlier] = useState(false);
  const { big, small } = useMemo(() => splitKinds(kinds, type), [kinds, type]);
  const kindOf = (key) => kinds.find((k) => k.key === key);

  // ?kind=call_nurse opens the send sheet for that kind once the kinds are known
  const [preselect, setPreselect] = useState(initialKind);
  useEffect(() => {
    if (!preselect || !kinds.length) return;
    const k = kinds.find((x) => x.key === preselect);
    if (k) setSheet(k);
    setPreselect(null);
  }, [preselect, kinds]);

  const list = mine || [];
  const active = list.filter(isActive).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const earlier = list.filter((r) => !isActive(r)).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  const activeOf = (key) => active.find((r) => r.kind === key);
  const unreadOf = (r) => {
    const last = lastMessage(r, myId);
    return !!last && !last.mine && threadOf(r).length > (seen[r._id] || 0);
  };
  const line = (r) => statusText(r, kindOf(r.kind), roles, w, myId);
  const label = (key) => kindOf(key)?.label || 'Request';

  // Header: unit + care team names
  const people = [];
  const seenIds = new Set();
  for (const p of [...(team?.assigned || []), ...(team?.covering || [])]) {
    if (seenIds.has(String(p._id))) continue;
    seenIds.add(String(p._id)); people.push(p);
  }
  const names = people.slice(0, 3).map(shortName).filter(Boolean);
  const more = people.length - names.length;
  const teamWord = type === 'hospital' ? 'care team' : 'team';
  const teamTitle = team?.forName ? `${team.forName}'s ${teamWord}` : `Your ${teamWord}`;

  const toneFor = (k) => {
    const i = big.indexOf(k);
    if (i !== -1) return bigTone(k, i);
    return null;
  };
  const open = (k) => {
    const a = big.includes(k) && activeOf(k.key);
    if (a) onOpen(a); else setSheet(k);
  };
  const sheetTone = sheet && toneFor(sheet);
  const sheetColor = sheetTone?.glow || (sheet && kindColor(kinds, sheet.key));
  const unreadCount = list.filter(unreadOf).length;

  if (!kinds.length) {
    return <p className={`${CARD} p-5 text-[13px] text-slate-500 text-center`}>No requests are set up here yet.</p>;
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(360px,1fr)] lg:gap-8 lg:items-start space-y-5 lg:space-y-0">
      {/* ── Call panel ─────────────────────────────────── */}
      <div className="space-y-4">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5 sm:gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{team?.forName ? `Requests for ${team.forName}` : 'Requests'}</div>
            <h1 className="text-[24px] sm:text-[26px] font-bold text-slate-900 leading-tight truncate flex items-center gap-2" style={{ letterSpacing: '-0.03em' }}>
              {team?.unit ? <><MapPin size={20} className="text-slate-400 flex-shrink-0" /><span className="truncate">{team.unit}</span></> : `Get help from ${name || terms.site}`}
            </h1>
          </div>
          {names.length > 0 ? (
            <div className="flex items-center gap-1.5 text-[13px] text-slate-500 min-w-0 sm:pb-1">
              <Users size={14} className="text-slate-400 flex-shrink-0" />
              <span className="truncate"><span className="text-slate-400">{teamTitle}:</span> <span className="font-semibold text-slate-700">{names.join(', ')}{more > 0 ? ` +${more}` : ''}</span></span>
            </div>
          ) : (
            <p className="text-[13px] text-slate-500 sm:pb-1">Staff are told straight away.</p>
          )}
        </header>

        {big.length > 0 && (
          <div className={`grid gap-3 ${big.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {big.map((k, i) => {
              const a = activeOf(k.key);
              return (
                <BigButton key={k.key} k={k} i={i} tone={bigTone(k, i)} reach={reachFor(k, team, roles, w)}
                  active={a} statusLine={a ? line(a) : ''} onPress={() => open(k)} />
              );
            })}
          </div>
        )}

        {small.length > 0 && (
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-2">Something else?</div>
            <div className="flex flex-wrap gap-2">
              {small.map((k, i) => {
                const Icon = KIND_ICON[k.key] || MessageCircle;
                const color = kindColor(kinds, k.key);
                const busy = !!activeOf(k.key);
                return (
                  <button key={k.key} onClick={() => open(k)}
                    className="dash-rise relative h-12 pl-1.5 pr-4 rounded-full bg-white border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:border-slate-300 hover:shadow-sm active:scale-[0.97] transition-all inline-flex items-center gap-2"
                    style={{ animationDelay: `${(big.length + i) * 40}ms` }}>
                    <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${color}1A` }}>
                      <Icon size={17} style={{ color }} />
                    </span>
                    <span className="text-[14px] font-semibold text-slate-800 whitespace-nowrap">{k.label}</span>
                    {busy && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-white" aria-label="In progress" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Your requests ───────────────────────────────── */}
      <section className="lg:sticky lg:top-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Your requests{active.length ? <span className="ml-1.5 text-slate-500">· {active.length} active</span> : null}
          </h2>
          {unreadCount > 0 && <span className="text-[11px] font-semibold text-indigo-600">{unreadCount} new {unreadCount === 1 ? 'reply' : 'replies'}</span>}
        </div>
        {mine === null ? <PageLoader variant="section" /> : (
          <div className={`${CARD} overflow-hidden`}>
            {active.length === 0 && earlier.length === 0 && (
              <p className="px-4 py-7 text-[13px] text-slate-400 text-center">Nothing sent yet. Tap a button and staff are told straight away.</p>
            )}
            {active.length === 0 && earlier.length > 0 && (
              <p className="px-4 py-4 text-[13px] text-slate-400 text-center">Nothing in progress.</p>
            )}
            {active.map((r) => (
              <Row key={r._id} r={r} k={kindOf(r.kind)} label={label(r.kind)} line={line(r)} unread={unreadOf(r)} onOpen={onOpen} />
            ))}
            {earlier.length > 0 && (
              <>
                <button onClick={() => setShowEarlier((v) => !v)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 text-[12px] font-semibold text-slate-500 hover:bg-slate-50">
                  <ChevronDown size={14} className={`transition-transform ${showEarlier ? '' : '-rotate-90'}`} />
                  Earlier <span className="text-slate-400 font-normal">({earlier.length})</span>
                  {!showEarlier && earlier.some(unreadOf) && <span className="ml-auto w-2 h-2 rounded-full bg-indigo-600" />}
                </button>
                {showEarlier && earlier.map((r) => (
                  <Row key={r._id} r={r} k={kindOf(r.kind)} label={label(r.kind)} line={line(r)} unread={unreadOf(r)} onOpen={onOpen} />
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {sheet && (
        <SendSheet
          kind={sheet}
          color={sheetColor}
          gradient={sheetTone ? `linear-gradient(150deg, ${sheetTone.from}, ${sheetTone.to})` : null}
          reach={reachFor(sheet, team, roles, w)}
          required={!big.includes(sheet)}
          onClose={() => setSheet(null)}
          onSent={onSent}
        />
      )}
    </div>
  );
}
