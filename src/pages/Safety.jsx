import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ShieldAlert, ShieldCheck, MapPin, Search, UserX, RefreshCw, Siren, Eye, X } from 'lucide-react';
import { safetyAPI, estateAPI } from '../api';
import { useSafety } from '../context/SafetyContext';
import BottomSheet from '../components/payments/BottomSheet';
import SafetyDesktop from '../components/safety/SafetyDesktop';
import useIsDesktop from '../hooks/useIsDesktop';
import { useAuth } from '../context/AuthContext';

// Personal safety (anti-stalking):
//  • Block a resident — they're never told; you disappear from each other's
//    directories, their calls/buzzes are refused, and repeated attempts alert
//    security + the estate manager.
//  • "I'm being followed" — instant critical alarm to security + management.
//  • Live location — security and management can see where you are.
//  • Gate watch — security is told when a blocked person's guest arrives.

function Person({ p, size = 40 }) {
  return p?.profilePhoto
    ? <img src={p.profilePhoto} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
    : <div className="rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>
        {(p?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>;
}

export default function Safety() {
  const { sharing, startSharing, stopSharing, getFix } = useSafety() || {};
  const { user, estate: sessionEstate } = useAuth() || {};
  // The login session only carries the estate's name/code (and is empty after a
  // refresh), so load the full record for the map's address and location.
  const estateId = user?.estateId?._id || user?.estateId;
  const [estateFull, setEstateFull] = useState(null);
  useEffect(() => {
    if (!estateId) return;
    estateAPI.getOne(estateId).then(({ data }) => setEstateFull(data.data)).catch(() => {});
  }, [estateId]);
  const estate = estateFull || sessionEstate || (typeof user?.estateId === 'object' ? user.estateId : null);
  const isDesktop = useIsDesktop();
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  // panic
  const [panicOpen, setPanicOpen] = useState(false);
  const [panicWho, setPanicWho] = useState('');
  const [panicNote, setPanicNote] = useState('');
  const [panicking, setPanicking] = useState(false);
  // add block
  const [addOpen, setAddOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [pick, setPick] = useState(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try { const { data } = await safetyAPI.blocks(); setBlocks(data.data || []); }
    catch { toast.error('Could not load your safety settings'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!addOpen || q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => safetyAPI.searchResidents(q).then(({ data }) => setResults(data.data || [])).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, addOpen]);

  const sendPanic = async () => {
    setPanicking(true);
    try {
      const fix = await getFix();
      const { data } = await safetyAPI.followed({ blockedId: panicWho || undefined, note: panicNote, ...(fix || {}) });
      toast.success(data.message || 'Security has been alerted', { duration: 8000 });
      setPanicOpen(false);
      // Keep security updated while they respond.
      if (!sharing) startSharing();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not send — call security directly');
    } finally { setPanicking(false); }
  };

  const saveBlock = async () => {
    setSaving(true);
    try {
      const { data } = await safetyAPI.block(pick._id, reason);
      toast.success(data.message);
      setAddOpen(false); setPick(null); setQ(''); setReason('');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Could not block'); }
    finally { setSaving(false); }
  };

  const unblock = async (b) => {
    if (!confirm(`Unblock ${b.person?.name}? They'll be able to see you, call and buzz you again.`)) return;
    try { await safetyAPI.unblock(b._id); toast.success('Unblocked'); load(); }
    catch { toast.error('Could not unblock'); }
  };

  const toggleGate = async (b) => {
    try { await safetyAPI.setGateWatch(b._id, !b.gateWatch); setBlocks((xs) => xs.map((x) => (x._id === b._id ? { ...x, gateWatch: !b.gateWatch } : x))); }
    catch { toast.error('Could not update'); }
  };

  const openPanic = () => { setPanicWho(blocks[0]?.person?._id || ''); setPanicNote(''); setPanicOpen(true); };
  const openAddBlock = () => { setAddOpen(true); setPick(null); setQ(''); setReason(''); };

  // Panic + block sheets, shared by both layouts
  const sheets = (
    <>
      {/* ── Panic sheet ── */}
      <BottomSheet open={panicOpen} onClose={() => !panicking && setPanicOpen(false)} title="Alert security now"
        subtitle="Security + estate manager only — with your location"
        footer={<button onClick={sendPanic} disabled={panicking} className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-base inline-flex items-center justify-center gap-2 disabled:opacity-60">
          {panicking ? <><RefreshCw size={18} className="animate-spin" /> Alerting…</> : <><Siren size={20} /> Send alarm</>}
        </button>}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-2 block">Who is following you?</label>
            <div className="space-y-2">
              {blocks.map((b) => (
                <button key={b._id} type="button" onClick={() => setPanicWho(b.person?._id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left ${panicWho === b.person?._id ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
                  <Person p={b.person} size={36} />
                  <span className="flex-1 min-w-0 text-sm font-semibold text-slate-900 truncate">{b.person?.name}<span className="block text-xs font-normal text-slate-400">{b.person?.unit}</span></span>
                </button>
              ))}
              <button type="button" onClick={() => setPanicWho('')}
                className={`w-full p-3 rounded-2xl border text-left text-sm font-semibold ${!panicWho ? 'border-red-400 bg-red-50 text-red-800' : 'border-slate-200 text-slate-600'}`}>
                Someone else / I'm not sure
              </button>
            </div>
          </div>
          <input value={panicNote} onChange={(e) => setPanicNote(e.target.value.slice(0, 300))} placeholder="Where are you? (optional) e.g. Near Block C gym"
            className="input-field py-3" />
          <p className="text-xs text-slate-500">We'll also start sharing your live location with security until you stop it. In immediate danger, call 112.</p>
        </div>
      </BottomSheet>

      {/* ── Block sheet ── */}
      <BottomSheet open={addOpen} onClose={() => !saving && setAddOpen(false)} title="Block someone for your safety"
        subtitle="They won't be told"
        footer={pick && <button onClick={saveBlock} disabled={saving} className="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold disabled:opacity-60">
          {saving ? 'Blocking…' : `Block ${pick.name.split(' ')[0]}`}
        </button>}>
        {pick ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
              <Person p={pick} size={44} />
              <div className="flex-1 min-w-0"><div className="font-semibold text-slate-900 truncate">{pick.name}</div><div className="text-xs text-slate-400">{pick.unit}</div></div>
              <button onClick={() => setPick(null)} aria-label="Change" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200"><X size={15} /></button>
            </div>
            <textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 300))} rows={3}
              placeholder="What's been happening? (optional, only shared with security if an alarm is raised)" className="input-field resize-none" />
            <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
              <li>You'll disappear from each other's Neighbours list</li>
              <li>Their calls and buzzes to you won't go through</li>
              <li>Repeated attempts alert security and your estate manager</li>
              <li>Security is told when their guests check in at the gate</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type their name" className="input-field pl-10 py-3" />
            </div>
            <div className="divide-y divide-slate-100">
              {results.map((p) => (
                <button key={p._id} onClick={() => setPick(p)} className="w-full flex items-center gap-3 py-3 text-left hover:bg-slate-50 rounded-lg">
                  <Person p={p} size={38} />
                  <span className="flex-1 min-w-0"><span className="block text-sm font-semibold text-slate-900 truncate">{p.name}</span><span className="block text-xs text-slate-400">{p.unit}</span></span>
                </button>
              ))}
              {q.trim().length >= 2 && results.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No resident found</p>}
            </div>
          </div>
        )}
      </BottomSheet>
    </>
  );

  if (isDesktop) return (
    <>
      <SafetyDesktop
        sharing={sharing} onToggleShare={() => (sharing ? stopSharing() : startSharing())}
        blocks={blocks} loading={loading} estate={estate}
        onPanic={openPanic} onAddBlock={openAddBlock} onUnblock={unblock} onToggleGate={toggleGate}
      />
      {sheets}
    </>
  );

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      {/* ── Panic ── */}
      <div className="rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg,#7F1D1D 0%,#B91C1C 55%,#EF4444 100%)', boxShadow: '0 16px 40px rgba(185,28,28,0.3)' }}>
        <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 text-red-100 text-sm"><ShieldAlert size={15} /> Personal safety</div>
          <p className="text-lg font-bold mt-1">Feeling unsafe or being followed?</p>
          <p className="text-xs text-red-100/90 mt-1">Security and your estate manager are alerted instantly with your location. Nobody else is told.</p>
          <button onClick={openPanic}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-white text-red-700 font-black py-4 text-base hover:bg-red-50 active:scale-[0.99] transition">
            <Siren size={20} /> I'm being followed
          </button>
        </div>
      </div>

      {/* ── Live location ── */}
      <div className="glass-card p-5">
        <div className="flex items-start gap-3">
          <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${sharing ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}><MapPin size={20} /></span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-slate-900">Share live location with security</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {sharing
                ? `Sharing since ${format(new Date(sharing.startedAt), 'h:mm a')}${sharing.lastFix ? ` · updated ${format(new Date(sharing.lastFix.at), 'h:mm:ss a')}` : ''}. Stops automatically after 1 hour.`
                : 'Walking home late or feeling uneasy? Security and your estate manager can watch your location until you stop.'}
            </div>
          </div>
        </div>
        <button onClick={() => (sharing ? stopSharing() : startSharing())}
          className={`mt-4 w-full py-3 rounded-xl text-sm font-bold ${sharing ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}>
          {sharing ? 'Stop sharing' : 'Start sharing my location'}
        </button>
      </div>

      {/* ── Blocked ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Blocked for my safety</h3>
          <button onClick={openAddBlock} className="text-xs font-bold text-red-600 hover:underline inline-flex items-center gap-1">
            <UserX size={13} /> Block someone
          </button>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center"><RefreshCw size={20} className="animate-spin text-slate-400" /></div>
        ) : blocks.length === 0 ? (
          <div className="glass-card p-5 text-sm text-slate-500 flex gap-3">
            <ShieldCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>You haven't blocked anyone. If a resident is making you uncomfortable — calling, following or watching you — block them here. <strong>They're never told.</strong></span>
          </div>
        ) : (
          <div className="glass-card divide-y divide-slate-100 overflow-hidden">
            {blocks.map((b) => (
              <div key={b._id} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Person p={b.person} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{b.person?.name}</div>
                    <div className="text-xs text-slate-400 truncate">{b.person?.unit} · blocked {format(new Date(b.createdAt), 'MMM d')}</div>
                  </div>
                  <button onClick={() => unblock(b)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">Unblock</button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`px-2.5 py-1 rounded-full font-semibold ${b.contactAttempts ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                    {b.contactAttempts ? `${b.contactAttempts} blocked contact attempt${b.contactAttempts > 1 ? 's' : ''}` : 'No contact attempts'}
                  </span>
                  <button onClick={() => toggleGate(b)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold ${b.gateWatch ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-400'}`}>
                    <Eye size={12} /> Gate watch {b.gateWatch ? 'on' : 'off'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-400 px-1">
          Blocked people can't see you in Neighbours, call or buzz you. If they keep trying, security and your estate manager are alerted. Gate watch tells security when their guests arrive.
        </p>
      </div>

      {sheets}
    </div>
  );
}
