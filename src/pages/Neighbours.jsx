import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, Hand, ShieldCheck, Briefcase,
  Coins, Plus, RefreshCw, Lock, Sparkles,
} from 'lucide-react';
import { callAPI } from '../api';
import { useCall } from '../context/CallContext';
import { useAuth } from '../context/AuthContext';
import BottomSheet from '../components/payments/BottomSheet';
import { PersonAvatar } from '../components/calls/CallOverlay';

const BUZZES = [
  { kind: 'checkin',         emoji: '👋', label: 'Check in',        sub: '“Just checking up on you”' },
  { kind: 'greeting',        emoji: '😊', label: 'Say hello',       sub: 'A friendly hello' },
  { kind: 'thinking_of_you', emoji: '💛', label: 'Thinking of you', sub: 'Let them know you care' },
];

const dayLabel = (d) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, MMM d'));
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function Avatar({ person, size = 44 }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {person.profilePhoto ? (
        <img src={person.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-indigo-700 bg-indigo-100" style={{ fontSize: size * 0.36 }}>
          {(person.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
      )}
      {person.online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Online now" />}
    </div>
  );
}

export default function Neighbours() {
  const { user } = useAuth();
  const { call, startCall } = useCall() || {};
  const location = useLocation();
  const navigate = useNavigate();

  const [dir, setDir] = useState({ neighbours: [], staff: [] });
  const [credits, setCredits] = useState(null); // { balance, ratePerMinute, packs }
  const [history, setHistory] = useState([]);
  const [buzzes, setBuzzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('people');
  const [q, setQ] = useState('');
  const [buzzFor, setBuzzFor] = useState(null);
  const [buzzKind, setBuzzKind] = useState('checkin');
  const [buzzNote, setBuzzNote] = useState('');
  const [sending, setSending] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [buying, setBuying] = useState(null);

  const load = useCallback(async () => {
    try {
      const [d, c, h, b] = await Promise.all([callAPI.directory(), callAPI.credits(), callAPI.history(), callAPI.buzzes()]);
      setDir(d.data.data);
      setCredits(c.data.data);
      setHistory(h.data.data);
      setBuzzes(b.data.data);
    } catch {
      toast.error('Could not load neighbours');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  // After a call finishes, the balance and history have changed.
  useEffect(() => { if (!call) load(); }, [call]); // eslint-disable-line react-hooks/exhaustive-deps

  // Returning from Paystack (?topup=REF) or from a buzz email (?buzzback=ID).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('topup');
    if (ref) {
      callAPI.verifyTopup(ref)
        .then(({ data }) => {
          toast.success(data.data.alreadyApplied ? 'Credits already added' : `${data.data.credits} credits added!`);
          setCredits((c) => (c ? { ...c, balance: data.data.balance } : c));
        })
        .catch((e) => toast.error(e.response?.data?.message || 'Could not confirm your payment'))
        .finally(() => navigate('/neighbours', { replace: true }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('buzzback');
    if (!id || !dir.neighbours.length) return;
    const n = dir.neighbours.find((x) => String(x._id) === id);
    if (n) openBuzz(n);
    navigate('/neighbours', { replace: true });
  }, [dir.neighbours]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term
      ? dir.neighbours.filter((n) => `${n.name} ${n.unit}`.toLowerCase().includes(term))
      : dir.neighbours;
    return [...list].sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
  }, [dir.neighbours, q]);

  const minutes = credits ? Math.floor(credits.balance / (credits.ratePerMinute || 1)) : 0;

  const callPerson = async (person) => {
    const r = await startCall(person);
    if (r?.needCredits) {
      toast('You need call credits to call a neighbour', { icon: '🪙' });
      setShowTopup(true);
    }
  };

  const openBuzz = (person) => { setBuzzFor(person); setBuzzKind('checkin'); setBuzzNote(''); };

  const sendBuzz = async () => {
    setSending(true);
    try {
      const { data } = await callAPI.buzz(buzzFor._id, buzzKind, buzzNote);
      toast.success(data.message || 'Buzz sent');
      setBuzzFor(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not send buzz');
    } finally { setSending(false); }
  };

  const buy = async (pack) => {
    setBuying(pack.id);
    try {
      const { data } = await callAPI.topup(pack.id);
      window.location.href = data.data.authorizationUrl;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not start payment');
      setBuying(null);
    }
  };

  const staffIcon = (role) => (role === 'security' ? ShieldCheck : Briefcase);
  const staffLabel = (role) => (role === 'security' ? 'Security' : 'Estate Manager');

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="space-y-5 xl:space-y-0 xl:grid xl:grid-cols-[minmax(340px,400px)_1fr] xl:gap-6 xl:items-start">
        <aside className="space-y-5 xl:sticky xl:top-0">
          {/* ── Credits card ── */}
          <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 text-white"
            style={{ background: 'linear-gradient(135deg,#312E81 0%,#4F46E5 55%,#818CF8 100%)', boxShadow: '0 16px 40px rgba(79,70,229,0.28)' }}>
            <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 text-sm text-indigo-100/90">
                <Coins size={15} /> Call credits
                <button onClick={load} aria-label="Refresh" className="ml-auto -mr-1 w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20">
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              <div className="mt-1 text-[2.5rem] font-black tracking-tight leading-none">
                {credits ? credits.balance : <span className="inline-block w-20 h-10 rounded-lg bg-white/15 animate-pulse" />}
              </div>
              <p className="text-xs text-indigo-50/80 mt-2">
                {credits ? `≈ ${minutes} min of neighbour calls · ${credits.ratePerMinute} credit/min` : ' '}
              </p>
              <button onClick={() => setShowTopup(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-indigo-700 font-bold py-3 hover:bg-indigo-50 transition-colors">
                <Plus size={17} /> Top up credits
              </button>
              <p className="text-[11px] text-indigo-100/80 mt-3 flex items-center gap-1.5">
                <ShieldCheck size={12} /> Calls to security & management are always free
              </p>
            </div>
          </div>

          {/* ── Emergency / staff ── */}
          {dir.staff.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Emergency · free</h3>
              <div className="space-y-2">
                {dir.staff.map((s) => {
                  const Icon = staffIcon(s.role);
                  return (
                    <div key={s._id} className="flex items-center gap-3">
                      <Avatar person={s} size={40} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{s.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1"><Icon size={11} /> {staffLabel(s.role)}{s.online ? ' · online' : ''}</div>
                      </div>
                      <button onClick={() => callPerson(s)} disabled={!!call}
                        className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-40">
                        <Phone size={13} /> Call
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        <section className="space-y-4 min-w-0">
          <div className="flex p-1 rounded-2xl bg-slate-100">
            {[['people', 'Neighbours'], ['recent', 'Recent']].map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                {label}
                {id === 'recent' && buzzes.some((b) => !b.seenAt && Date.now() - new Date(b.createdAt) < 86400000) && (
                  <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-indigo-500 align-middle" />
                )}
              </button>
            ))}
          </div>

          {tab === 'people' ? (
            <>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or unit"
                  className="input-field pl-10 py-3" />
              </div>
              {loading ? (
                <div className="py-16 flex justify-center"><RefreshCw size={22} className="animate-spin text-indigo-500" /></div>
              ) : filtered.length === 0 ? (
                <div className="glass-card py-12 text-center text-sm text-slate-400">
                  {q ? `No neighbour matches “${q}”` : 'No neighbours to show yet'}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3">
                  {filtered.map((n) => (
                    <div key={n._id} className="glass-card p-4 flex items-center gap-3">
                      <Avatar person={n} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{n.name}</div>
                        <div className="text-xs text-slate-400 truncate">{n.unit || 'Resident'}{n.online ? ' · online' : ''}</div>
                      </div>
                      <button onClick={() => openBuzz(n)} aria-label={`Buzz ${n.name}`}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100">
                        <Hand size={17} />
                      </button>
                      <button onClick={() => callPerson(n)} aria-label={`Call ${n.name}`} disabled={!!call}
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40">
                        <Phone size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-slate-400 text-center">
                Don't want to be listed? Turn off “Discoverable” in Settings → Privacy.
              </p>
            </>
          ) : (
            <div className="space-y-5">
              {buzzes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="px-1 text-xs font-bold uppercase tracking-widest text-slate-400">Buzzes</h3>
                  <div className="glass-card divide-y divide-slate-100 overflow-hidden">
                    {buzzes.map((b) => {
                      const meta = BUZZES.find((x) => x.kind === b.kind) || BUZZES[0];
                      const from = b.fromId || {};
                      const n = dir.neighbours.find((x) => String(x._id) === String(from._id));
                      return (
                        <div key={b._id} className="flex items-center gap-3 p-4">
                          <Avatar person={{ ...from, online: n?.online }} size={40} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-900 truncate"><strong>{from.name}</strong> {meta.emoji} {meta.label.toLowerCase()}</div>
                            <div className="text-xs text-slate-400 truncate">{b.message ? `“${b.message}” · ` : ''}{dayLabel(new Date(b.createdAt))} {format(new Date(b.createdAt), 'h:mm a')}</div>
                          </div>
                          {n && (
                            <button onClick={() => openBuzz(n)} className="text-xs font-bold px-3 py-2 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 shrink-0">
                              Buzz back
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <h3 className="px-1 text-xs font-bold uppercase tracking-widest text-slate-400">Calls</h3>
                {history.length === 0 ? (
                  <div className="glass-card py-10 text-center text-sm text-slate-400">No calls yet</div>
                ) : (
                  <div className="glass-card divide-y divide-slate-100 overflow-hidden">
                    {history.map((c) => {
                      const out = c.direction === 'outgoing';
                      const other = (out ? c.calleeId : c.callerId) || {};
                      const missed = ['missed', 'declined', 'cancelled', 'failed'].includes(c.status);
                      const Icon = missed && !out ? PhoneMissed : out ? PhoneOutgoing : PhoneIncoming;
                      const n = dir.neighbours.find((x) => String(x._id) === String(other._id)) || dir.staff.find((x) => String(x._id) === String(other._id));
                      return (
                        <div key={c._id} className="flex items-center gap-3 p-4">
                          <Icon size={17} className={missed ? 'text-red-500' : 'text-slate-400'} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate ${missed && !out ? 'text-red-600' : 'text-slate-900'}`}>{other.name || 'Unknown'}</div>
                            <div className="text-xs text-slate-400 truncate">
                              {dayLabel(new Date(c.createdAt))} {format(new Date(c.createdAt), 'h:mm a')}
                              {c.durationSec ? ` · ${mmss(c.durationSec)}` : ` · ${c.status}`}
                              {c.kind !== 'standard' ? ' · free' : c.creditsCharged && out ? ` · ${c.creditsCharged} credits` : ''}
                            </div>
                          </div>
                          {n && (
                            <button onClick={() => callPerson(n)} disabled={!!call} aria-label="Call back"
                              className="w-9 h-9 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-40">
                              <Phone size={15} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Buzz sheet ── */}
      <BottomSheet open={!!buzzFor} onClose={() => !sending && setBuzzFor(null)} title={buzzFor ? `Buzz ${buzzFor.name.split(' ')[0]}` : ''}
        subtitle="They'll get a notification and an email with your profile"
        footer={<button onClick={sendBuzz} disabled={sending} className="btn-primary w-full py-3.5 text-base gap-2">
          {sending ? 'Sending…' : <><Hand size={17} /> Send buzz</>}
        </button>}>
        {buzzFor && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
              <PersonAvatar person={buzzFor} size={48} />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">{buzzFor.name}</div>
                <div className="text-xs text-slate-400">{buzzFor.unit || 'Resident'}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {BUZZES.map((b) => (
                <button key={b.kind} type="button" onClick={() => setBuzzKind(b.kind)}
                  className={`p-3 rounded-2xl border text-center transition-all ${buzzKind === b.kind ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
                  <div className="text-2xl">{b.emoji}</div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">{b.label}</div>
                </button>
              ))}
            </div>
            <textarea value={buzzNote} onChange={(e) => setBuzzNote(e.target.value.slice(0, 200))} rows={2}
              placeholder="Add a short note (optional)" className="input-field resize-none" />
            <p className="text-[11px] text-slate-400">Sent as {user?.name}. You can buzz each neighbour once every 2 hours.</p>
          </div>
        )}
      </BottomSheet>

      {/* ── Top-up sheet ── */}
      <BottomSheet open={showTopup} onClose={() => !buying && setShowTopup(false)} title="Top up call credits"
        subtitle={credits ? `Balance: ${credits.balance} credits · ${credits.ratePerMinute} credit per minute` : ''}>
        <div className="space-y-3">
          {(credits?.packs || []).map((p) => (
            <button key={p.id} onClick={() => buy(p)} disabled={!!buying}
              className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 text-left transition-colors disabled:opacity-60">
              <span className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Coins size={20} /></span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-slate-900">{p.label}</span>
                <span className="block text-xs text-slate-400">≈ {Math.floor(p.credits / (credits.ratePerMinute || 1))} minutes of calls</span>
              </span>
              {p.badge && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1"><Sparkles size={10} /> {p.badge}</span>}
              <span className="font-black text-indigo-700 shrink-0">{buying === p.id ? '…' : `₦${p.price.toLocaleString('en-NG')}`}</span>
            </button>
          ))}
          <p className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-1">
            <Lock size={12} className="shrink-0 mt-0.5" /> Paid securely with Paystack. Credits don't expire and are only used for calls to neighbours — calls to security and management are free.
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}
