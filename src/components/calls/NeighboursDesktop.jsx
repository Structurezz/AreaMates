import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, RefreshCw, ShieldCheck, Hand, Users, Shield, Clock, Send, Loader2,
  Coins, Plus, Gift, Minus, Download,
} from 'lucide-react';
import { callAPI } from '../../api';
import useFillHeight from '../../hooks/useFillHeight';

// Desktop Calls page for residents — same layout as the estate manager's
// CallsDesktop (directory · selected contact · recent), in AreaMates indigo,
// plus call credits and buzzes.

const ROLE_LABEL = { security: 'Security', estate_manager: 'Estate Manager', super_admin: 'Estate Manager', resident: 'Resident' };
const BUZZES = [
  { kind: 'checkin',         emoji: '👋', label: 'Check in',        past: 'checked in on you' },
  { kind: 'greeting',        emoji: '😊', label: 'Say hello',       past: 'said hello' },
  { kind: 'thinking_of_you', emoji: '💛', label: 'Thinking of you', past: 'is thinking of you' },
];
const MISSED = ['missed', 'declined', 'cancelled', 'failed'];
const dayLabel = (d) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, d MMM'));
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const initials = (n = '?') => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const hue = (s = '') => [...s].reduce((t, c) => t + c.charCodeAt(0), 0) % 360;
const isStaff = (p) => p && p.role && p.role !== 'resident';

function Avatar({ person, size = 40, ring = false }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {person?.profilePhoto ? (
        <img src={person.profilePhoto} alt="" className={`w-full h-full rounded-full object-cover ${ring ? 'ring-4 ring-white shadow-lg' : ''}`} />
      ) : (
        <div className={`w-full h-full rounded-full flex items-center justify-center font-semibold text-white ${ring ? 'ring-4 ring-white shadow-lg' : ''}`}
          style={{ fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hue(person?.name)} 65% 58%), hsl(${(hue(person?.name) + 40) % 360} 65% 45%))` }}>
          {initials(person?.name)}
        </div>
      )}
      {person?.online && (
        <span className="absolute bottom-0 right-0 rounded-full bg-emerald-500 ring-2 ring-white" style={{ width: Math.max(10, size * 0.24), height: Math.max(10, size * 0.24) }} title="Online now" />
      )}
    </div>
  );
}

function PanelHead({ Icon, color, title, right }) {
  return (
    <div className="flex-none flex items-center justify-between px-4 h-12 border-b border-slate-100">
      <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: color }}>
          <Icon size={12} className="text-white" />
        </span>
        {title}
      </h3>
      {right}
    </div>
  );
}

function CallRow({ c, person, onCall, disabled, compact }) {
  const out = c.direction === 'outgoing';
  const other = (out ? c.calleeId : c.callerId) || {};
  const missed = MISSED.includes(c.status);
  const Icon = missed && !out ? PhoneMissed : out ? PhoneOutgoing : PhoneIncoming;
  const tint = missed && !out ? '#EF4444' : out ? '#6366F1' : '#10B981';
  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 transition-colors">
      {compact ? (
        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${tint}14` }}>
          <Icon size={14} style={{ color: tint }} />
        </span>
      ) : (
        <div className="relative">
          <Avatar person={person || other} size={36} />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white" style={{ background: tint }}>
            <Icon size={10} className="text-white" />
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-medium truncate ${missed && !out ? 'text-red-600' : 'text-slate-900'}`}>
          {compact ? (out ? 'Outgoing call' : missed ? 'Missed call' : 'Incoming call') : (other.name || 'Unknown')}
          {c.kind === 'emergency' && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 align-middle">EMERGENCY</span>}
        </div>
        <div className="text-[11px] text-slate-400 truncate">
          {compact ? dayLabel(new Date(c.createdAt)) + ' · ' : ''}{format(new Date(c.createdAt), 'h:mm a')}
          {c.durationSec ? ` · ${mmss(c.durationSec)}` : ` · ${c.status}`}
          {c.kind !== 'standard' ? ' · free' : c.creditsCharged && out ? ` · ${c.creditsCharged} credits` : ''}
        </div>
      </div>
      {!compact && person && (
        <button onClick={() => onCall(person)} disabled={disabled} aria-label={`Call ${person.name} back`}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30">
          <Phone size={14} />
        </button>
      )}
    </div>
  );
}

export default function NeighboursDesktop({
  dir, credits, history, buzzes, loading, call, minutes, onRefresh, onTopup, onCall, onReceipt, downloading,
}) {
  const shellRef = useRef(null);
  const height = useFillHeight(shellRef, true, { min: 560 });
  const [tab, setTab] = useState('residents');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [histFilter, setHistFilter] = useState('all');
  const [buzzKind, setBuzzKind] = useState('checkin');
  const [buzzNote, setBuzzNote] = useState('');
  const [sending, setSending] = useState(false);

  const everyone = useMemo(() => [...dir.neighbours, ...dir.staff], [dir]);
  const findPerson = (id) => everyone.find((x) => String(x._id) === String(id));
  const selected = selectedId ? findPerson(selectedId) : null;

  const people = tab === 'staff' ? dir.staff : dir.neighbours;
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term ? people.filter((p) => `${p.name} ${p.unit || ''} ${ROLE_LABEL[p.role] || ''}`.toLowerCase().includes(term)) : people;
    return [...list].sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
  }, [people, q]);
  const online = filtered.filter((p) => p.online);
  const offline = filtered.filter((p) => !p.online);

  const onlineCount = everyone.filter((p) => p.online).length;
  const missedToday = history.filter((c) => c.direction === 'incoming' && MISSED.includes(c.status) && isToday(new Date(c.createdAt))).length;
  const newBuzzes = buzzes.filter((b) => !b.seenAt && Date.now() - new Date(b.createdAt) < 86400000).length;

  const shownHistory = histFilter === 'missed'
    ? history.filter((c) => c.direction === 'incoming' && MISSED.includes(c.status))
    : histFilter === 'emergency' ? history.filter((c) => c.kind === 'emergency') : history;
  const grouped = useMemo(() => {
    const out = [];
    shownHistory.forEach((c) => {
      const label = dayLabel(new Date(c.createdAt));
      const g = out.find((x) => x.label === label);
      if (g) g.items.push(c); else out.push({ label, items: [c] });
    });
    return out;
  }, [shownHistory]);

  const withSelected = selected
    ? history.filter((c) => String(((c.direction === 'outgoing' ? c.calleeId : c.callerId) || {})._id) === String(selected._id))
    : [];

  const pick = (p) => { setSelectedId(p._id); setBuzzKind('checkin'); setBuzzNote(''); };
  const sendBuzz = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const { data } = await callAPI.buzz(selected._id, buzzKind, buzzNote);
      toast.success(data.message || 'Buzz sent');
      setBuzzNote('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not send buzz');
    } finally { setSending(false); }
  };

  return (
    <div ref={shellRef} className="max-w-[1500px] mx-auto flex flex-col gap-4" style={{ height: height ?? 'calc(100vh - 4rem)' }}>
      {/* ── Banner ── */}
      <div className="dash-rise flex-none relative overflow-hidden rounded-2xl px-6 py-4"
        style={{ background: 'linear-gradient(120deg, #1E1B4B 0%, #312E81 50%, #6366F1 100%)', boxShadow: '0 16px 32px -18px rgba(49,46,129,0.75)' }}>
        <div className="dash-blob absolute -top-20 right-48 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(199,210,254,0.35)' }} />
        <div className="relative flex items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-[22px] font-semibold text-white flex items-center gap-2" style={{ letterSpacing: '-0.025em' }}>
              <Phone size={20} /> Calls
            </h1>
            <p className="mt-0.5 text-[13px] text-white/75 flex items-center gap-1.5"><ShieldCheck size={13} /> Call any neighbour in your estate. Calls to security and management are always free.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {[
              ['Online now', onlineCount, true],
              ['Missed today', missedToday],
              ['Call credits', credits ? credits.balance : '—', false, credits ? `≈ ${minutes} min` : null],
            ].map(([label, n, live, sub]) => (
              <div key={label} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur min-w-[84px]">
                <div className="flex items-center gap-1.5 text-[16px] font-semibold text-white tabular-nums leading-none">
                  {live && <span className="relative flex w-1.5 h-1.5"><span className="absolute inset-0 rounded-full bg-emerald-300 animate-ping" /><span className="relative w-1.5 h-1.5 rounded-full bg-emerald-300" /></span>}
                  {n}
                </div>
                <div className="text-[10px] text-white/65 mt-1">{label}{sub ? ` · ${sub}` : ''}</div>
              </div>
            ))}
            <button onClick={onTopup}
              className="h-10 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-white text-indigo-700 text-[13px] font-semibold hover:-translate-y-0.5 transition-transform">
              <Plus size={14} /> Top up
            </button>
            <button onClick={onRefresh} aria-label="Refresh" className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_340px] gap-4">
        {/* ── Directory ── */}
        <div className="dash-rise h-full min-h-0 flex flex-col rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '60ms' }}>
          <div className="flex-none p-3 space-y-2 border-b border-slate-100">
            <div className="flex p-1 rounded-xl bg-slate-100">
              {[['residents', 'Neighbours', dir.neighbours.length, Users], ['staff', 'Staff · free', dir.staff.length, Shield]].map(([id, label, n, Icon]) => (
                <button key={id} onClick={() => { setTab(id); setQ(''); }}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Icon size={13} /> {label} <span className="text-slate-400 font-normal tabular-nums">{n}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'staff' ? 'Search staff' : 'Search name or unit'}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-[13px] outline-none focus:bg-white focus:border-slate-300" />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">{[0, 1, 2, 3, 4].map((k) => <div key={k} className="skeleton h-11 rounded-lg" />)}</div>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-6 text-[12px] text-slate-400 text-center">{q ? `No match for “${q}”` : tab === 'staff' ? 'No estate staff listed yet' : 'No neighbours to show yet'}</p>
            ) : (
              [['Online now', online], ['Everyone else', offline]].map(([label, list]) => list.length > 0 && (
                <div key={label}>
                  <div className="sticky top-0 z-10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-white/95 backdrop-blur">{label} · {list.length}</div>
                  {list.map((p) => {
                    const on = selectedId === p._id;
                    return (
                      <div key={p._id} onClick={() => pick(p)}
                        className={`group relative flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${on ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}>
                        {on && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-indigo-500" />}
                        <Avatar person={p} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-slate-900 truncate">{p.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">{isStaff(p) ? `${ROLE_LABEL[p.role]} · free` : (p.unit || 'Resident')}</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onCall(p); }} disabled={!!call} aria-label={`Call ${p.name}`}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30 ${isStaff(p) ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                          <Phone size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          <p className="flex-none px-4 py-2 text-[10.5px] text-slate-400 border-t border-slate-100">Not listed? Turn on “Discoverable” in Settings → Privacy.</p>
        </div>

        {/* ── Selected contact ── */}
        <div className="dash-rise h-full min-h-0 overflow-y-auto no-scrollbar rounded-2xl bg-white border border-slate-200/70" style={{ animationDelay: '120ms' }}>
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8 py-10">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <span className="dash-ripple absolute inset-0 rounded-full border-2 border-indigo-200" />
                <span className="dash-ripple absolute inset-0 rounded-full border-2 border-indigo-200" style={{ animationDelay: '1s' }} />
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #818CF8, #4F46E5)' }}>
                  <Phone size={26} />
                </div>
              </div>
              <h2 className="mt-5 text-[16px] font-semibold text-slate-900">Who would you like to call?</h2>
              <p className="mt-1 text-[13px] text-slate-500 max-w-sm">Pick a neighbour to call them, send a quick buzz, or see your calls together. Calls to estate staff are free.</p>
              {online.length > 0 && (
                <div className="mt-6 w-full max-w-lg">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Online now</div>
                  <div className="flex flex-wrap justify-center gap-3">
                    {online.slice(0, 8).map((p) => (
                      <button key={p._id} onClick={() => pick(p)} className="group flex flex-col items-center gap-1.5 w-20">
                        <span className="transition-transform group-hover:-translate-y-0.5"><Avatar person={p} size={48} /></span>
                        <span className="text-[11px] text-slate-600 truncate w-full">{p.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {history.length > 0 && (
                <div className="xl:hidden mt-8 w-full max-w-md text-left rounded-2xl border border-slate-200/70 overflow-hidden">
                  <PanelHead Icon={Clock} color="#6366F1" title="Recent calls" />
                  {history.slice(0, 5).map((c) => {
                    const other = (c.direction === 'outgoing' ? c.calleeId : c.callerId) || {};
                    return <CallRow key={c._id} c={c} person={findPerson(other._id)} onCall={onCall} disabled={!!call} />;
                  })}
                </div>
              )}
            </div>
          ) : (
            <div key={selected._id} className="animate-fade-in">
              <div className="relative h-28 overflow-hidden" style={{ background: `linear-gradient(120deg, hsl(${hue(selected.name)} 60% 45%), hsl(${(hue(selected.name) + 50) % 360} 60% 55%))` }}>
                <div className="dash-blob absolute -top-10 right-20 w-48 h-48 rounded-full blur-2xl" style={{ background: 'rgba(255,255,255,0.25)' }} />
              </div>
              <div className="px-8 -mt-12 relative">
                <Avatar person={selected} size={96} ring />
                <div className="mt-3 flex items-end justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-[20px] font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>{selected.name}</h2>
                    <div className="mt-0.5 text-[13px] text-slate-500 flex items-center gap-2">
                      {isStaff(selected) ? ROLE_LABEL[selected.role] : (selected.unit || 'Resident')}
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${selected.online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selected.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        {selected.online ? 'Online now' : 'Offline'}
                      </span>
                      {isStaff(selected) && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600">Free call</span>}
                    </div>
                  </div>
                  <button onClick={() => onCall(selected)} disabled={!!call}
                    className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[14px] font-semibold transition-all hover:-translate-y-0.5 disabled:opacity-40"
                    style={isStaff(selected)
                      ? { background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 12px 24px -12px rgba(220,38,38,0.8)' }
                      : { background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 12px 24px -12px rgba(79,70,229,0.8)' }}>
                    <Phone size={16} className="transition-transform group-hover:rotate-12" /> {call ? 'On a call' : `Call ${selected.name.split(' ')[0]}`}
                  </button>
                </div>
                {!selected.online && <p className="mt-2 text-[12px] text-slate-400">They're offline; the call will ring their phone if notifications are on.</p>}
                {!isStaff(selected) && credits && (
                  <p className="mt-2 text-[12px] text-slate-400 flex items-center gap-1.5">
                    <Coins size={12} className="text-amber-500" /> Uses {credits.ratePerMinute} credit/min · you have {credits.balance} (≈ {minutes} min).
                    <button onClick={onTopup} className="font-semibold text-indigo-600 hover:underline">Top up</button>
                  </p>
                )}
              </div>

              <div className="px-8 py-6 grid grid-cols-1 2xl:grid-cols-2 gap-5">
                {!isStaff(selected) && (
                  <div className="rounded-2xl border border-amber-200/70 p-4" style={{ background: 'linear-gradient(140deg, #FFFBEB, #fff 60%)' }}>
                    <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500"><Hand size={12} className="text-white" /></span>
                      Buzz {selected.name.split(' ')[0]}
                    </h3>
                    <p className="text-[12px] text-slate-500 mt-1">They'll get a notification and an email with your profile.</p>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {BUZZES.map((b) => (
                        <button key={b.kind} type="button" onClick={() => setBuzzKind(b.kind)}
                          className={`p-2.5 rounded-xl border text-center transition-all hover:-translate-y-0.5 ${buzzKind === b.kind ? 'border-amber-400 bg-amber-50 shadow-sm' : 'border-slate-200 bg-white'}`}>
                          <div className="text-[20px]">{b.emoji}</div>
                          <div className="text-[11px] font-medium text-slate-700 mt-0.5">{b.label}</div>
                        </button>
                      ))}
                    </div>
                    <textarea value={buzzNote} onChange={(e) => setBuzzNote(e.target.value.slice(0, 200))} rows={2}
                      placeholder="Add a short note (optional)"
                      className="mt-2 w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-[13px] outline-none resize-none focus:border-amber-300" />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">One buzz per neighbour every 2 hours.</span>
                      <button onClick={sendBuzz} disabled={sending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold transition-colors disabled:opacity-60">
                        {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200/70 overflow-hidden">
                  <PanelHead Icon={Clock} color="#6366F1" title={`Calls with ${selected.name.split(' ')[0]}`}
                    right={<span className="text-[12px] text-slate-400">{withSelected.length}</span>} />
                  {withSelected.length === 0 ? (
                    <p className="px-4 py-4 text-[12px] text-slate-400">No calls together yet.</p>
                  ) : (
                    <div className="py-1">
                      {withSelected.slice(0, 8).map((c) => <CallRow key={c._id} c={c} compact />)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Recent: calls · buzzes · credits ── */}
        <div className="dash-rise hidden xl:flex h-full min-h-0 flex-col rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '180ms' }}>
          <PanelHead Icon={Clock} color="#6366F1" title="Recent"
            right={missedToday > 0 && <span className="text-[11px] font-semibold text-white bg-red-500 px-1.5 py-0.5 rounded-full">{missedToday} missed</span>} />
          <div className="flex-none flex gap-1 px-3 py-2 border-b border-slate-100">
            {[['all', 'All calls'], ['missed', 'Missed'], ['buzzes', 'Buzzes'], ['credits', 'Credits']].map(([id, label]) => (
              <button key={id} onClick={() => setHistFilter(id)}
                className={`relative text-[12px] font-medium px-2.5 py-1 rounded-lg transition-colors ${histFilter === id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                {label}
                {id === 'buzzes' && newBuzzes > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500" />}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {histFilter === 'buzzes' ? (
              buzzes.length === 0 ? <p className="px-4 py-6 text-[12px] text-slate-400 text-center">No buzzes yet</p> : buzzes.map((b) => {
                const meta = BUZZES.find((x) => x.kind === b.kind) || BUZZES[0];
                const from = b.fromId || {};
                const person = findPerson(from._id);
                return (
                  <div key={b._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80">
                    <Avatar person={person || from} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-slate-900 truncate"><span className="font-medium">{from.name || 'A neighbour'}</span> {meta.past} {meta.emoji}</div>
                      <div className="text-[11px] text-slate-400 truncate">{b.message ? `“${b.message}” · ` : ''}{dayLabel(new Date(b.createdAt))} {format(new Date(b.createdAt), 'h:mm a')}</div>
                    </div>
                    {person && <button onClick={() => pick(person)} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 flex-shrink-0">{isStaff(person) ? 'Open' : 'Buzz back'}</button>}
                  </div>
                );
              })
            ) : histFilter === 'credits' ? (
              !credits?.ledger?.length ? <p className="px-4 py-6 text-[12px] text-slate-400 text-center">No credit activity yet</p> : credits.ledger.map((t) => {
                const meta = {
                  topup: { Icon: Coins, tint: 'bg-indigo-50 text-indigo-600', label: t.description || 'Credits bought' },
                  grant: { Icon: Gift, tint: 'bg-amber-50 text-amber-600', label: 'Gift from AreaConnect' },
                  call: { Icon: Minus, tint: 'bg-slate-100 text-slate-500', label: t.description || 'Call' },
                  refund: { Icon: Coins, tint: 'bg-emerald-50 text-emerald-600', label: t.description || 'Refund' },
                }[t.type] || { Icon: Coins, tint: 'bg-slate-100 text-slate-500', label: t.description };
                return (
                  <div key={t._id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.tint}`}><meta.Icon size={14} /></span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-slate-900 truncate">{meta.label}</div>
                      <div className="text-[11px] text-slate-400 truncate">{dayLabel(new Date(t.createdAt))} {format(new Date(t.createdAt), 'h:mm a')}{t.type === 'topup' && t.amountPaid ? ` · ₦${t.amountPaid.toLocaleString('en-NG')}` : ''} · bal {t.balanceAfter}</div>
                    </div>
                    <span className={`text-[13px] font-semibold tabular-nums ${t.amount > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>{t.amount > 0 ? '+' : ''}{t.amount}</span>
                    {['topup', 'grant'].includes(t.type) && (
                      <button onClick={() => onReceipt(t)} disabled={downloading === t._id} aria-label="Download receipt"
                        className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 disabled:opacity-50">
                        {downloading === t._id ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                      </button>
                    )}
                  </div>
                );
              })
            ) : grouped.length === 0 ? (
              <p className="px-4 py-6 text-[12px] text-slate-400 text-center">{histFilter === 'all' ? 'No calls yet' : 'No missed calls'}</p>
            ) : grouped.map((g) => (
              <div key={g.label}>
                <div className="sticky top-0 z-10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-white/95 backdrop-blur">{g.label}</div>
                {g.items.map((c) => {
                  const other = (c.direction === 'outgoing' ? c.calleeId : c.callerId) || {};
                  return <CallRow key={c._id} c={c} person={findPerson(other._id)} onCall={onCall} disabled={!!call} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
