import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import { Siren, ShieldCheck, LifeBuoy, UserX, Phone, CheckCircle2, X, Search } from 'lucide-react';
import { siteAPI } from '../api';
import { useSite } from '../context/SiteContext';
import { useRoles } from '../context/RolesContext';
import Portal from '../components/ui/Portal';
import { Avatar, CARD } from '../components/roles/shared';

/** "Start roll-call" — confirm with a reason. */
export function StartRollcallButton({ className = '', compact = false }) {
  const { myRole, isEstate, moduleOn } = useSite();
  const { rollcall, setRollcall, setRollcallHidden } = useRoles();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  if (isEstate || !moduleOn('rollcall') || !myRole?.rollcall || rollcall) return null;

  const start = async () => {
    if (!reason.trim()) return toast.error('Say why (e.g. "Fire alarm — Block B")');
    setBusy(true);
    try {
      const { data } = await siteAPI.startRollcall(reason.trim());
      toast.success(data.message || 'Roll-call started');
      setRollcallHidden(true);
      setRollcall(data.data);
      setOpen(false); setReason('');
    } catch (e) { toast.error(e.response?.data?.message || 'Could not start the roll-call'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors ${compact ? 'h-9 px-3 text-[13px]' : 'h-11 px-4 text-[14px]'} ${className}`}>
        <Siren size={15} /> Start roll-call
      </button>
      {open && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60" onClick={() => setOpen(false)}>
            <div className="w-full sm:max-w-sm bg-white rounded-t-[24px] sm:rounded-[22px] p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-bold text-slate-900 flex items-center gap-2"><Siren size={17} className="text-red-600" /> Start an emergency roll-call?</h3>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center"><X size={15} /></button>
              </div>
              <p className="text-[13px] text-slate-500">Everyone on site gets a full-screen alert asking if they're safe. You'll see who is safe, who needs help and who hasn't answered.</p>
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} autoFocus placeholder="Reason, e.g. Fire alarm — evacuate"
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-red-300" />
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-600 font-semibold text-[14px]">Cancel</button>
                <button disabled={busy} onClick={start} className="flex-[2] h-11 rounded-xl bg-red-600 text-white font-bold text-[14px] disabled:opacity-60">{busy ? 'Starting…' : 'Start roll-call'}</button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

function PersonRow({ p, tone, note }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 border-t border-slate-100 first:border-0">
      <Avatar person={p} size={36} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-slate-900 truncate">{p.name || 'Unknown'}</div>
        <div className="text-[11px] text-slate-500 truncate">{[p.roleLabel, p.unit].filter(Boolean).join(' · ')}{p.at ? ` · ${formatDistanceToNowStrict(new Date(p.at), { addSuffix: true })}` : ''}</div>
        {note && <div className={`text-[12px] mt-0.5 ${tone}`}>“{note}”</div>}
      </div>
      {p.phone && <a href={`tel:${p.phone}`} className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0" aria-label={`Call ${p.name}`}><Phone size={15} /></a>}
    </div>
  );
}

export default function Rollcall() {
  const { rollcall, refreshRollcall, setRollcall, setRollcallHidden } = useRoles();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { refreshRollcall(); }, [refreshRollcall]);

  const answer = async (status) => {
    setBusy(true);
    try {
      const { data } = await siteAPI.respondRollcall(rollcall._id, status, '');
      toast.success(data.message || 'Sent');
      setRollcall(data.data);
    } catch (e) { toast.error(e.response?.data?.message || 'Could not send'); }
    finally { setBusy(false); }
  };
  const end = async () => {
    if (!window.confirm('End the roll-call for everyone?')) return;
    try {
      const { data } = await siteAPI.endRollcall(rollcall._id);
      toast.success(data.message || 'Roll-call ended');
      setRollcall(null);
    } catch (e) { toast.error(e.response?.data?.message || 'Could not end it'); }
  };

  if (!rollcall) {
    return (
      <div className="max-w-xl mx-auto space-y-4 animate-fade-in">
        <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.03em' }}>Emergency roll-call</h1>
        <div className={`${CARD} p-6 text-center`}>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 mx-auto flex items-center justify-center"><ShieldCheck size={24} className="text-emerald-600" /></div>
          <p className="mt-3 text-[15px] font-semibold text-slate-800">No roll-call is running</p>
          <p className="mt-1 text-[13px] text-slate-500">If there's an evacuation, you'll get a full-screen alert asking if you're safe.</p>
          <StartRollcallButton className="mt-4" />
        </div>
      </div>
    );
  }

  const term = q.trim().toLowerCase();
  const match = (p) => !term || `${p.name} ${p.unit} ${p.roleLabel}`.toLowerCase().includes(term);
  const mine = rollcall.myResponse?.status;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      <div className="rounded-[22px] p-5 text-white" style={{ background: 'linear-gradient(140deg,#7F1D1D,#DC2626)' }}>
        <div className="flex items-start gap-3">
          <Siren size={22} className="flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1 min-w-0">
            <h1 className="text-[20px] font-extrabold leading-tight">Emergency roll-call</h1>
            {rollcall.reason && <p className="text-[14px] text-red-100 font-semibold">{rollcall.reason}</p>}
            {rollcall.startedAt && <p className="text-[12px] text-white/70 mt-0.5">Started {formatDistanceToNowStrict(new Date(rollcall.startedAt), { addSuffix: true })}</p>}
          </div>
          {rollcall.canManage && <button onClick={end} className="h-9 px-3 rounded-xl bg-white text-red-700 text-[13px] font-bold flex-shrink-0">End</button>}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[['Safe', rollcall.safe, 'bg-emerald-500/30'], ['Need help', rollcall.help, 'bg-white/20'], ['Missing', rollcall.missing, 'bg-black/20']].map(([l, n, bg]) => (
            <div key={l} className={`${bg} rounded-xl px-3 py-2`}>
              <div className="text-[22px] font-extrabold tabular-nums leading-none">{n}</div>
              <div className="text-[11px] text-white/80 mt-1">{l}</div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-white/70">{rollcall.expected} expected</p>
      </div>

      <div className={`${CARD} p-4`}>
        <div className="text-[13px] font-semibold text-slate-700">
          {mine === 'safe' ? "You're marked safe." : mine === 'help' ? 'Help is on the way to you.' : "You haven't answered yet."}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button disabled={busy || mine === 'safe'} onClick={() => answer('safe')} className="h-12 rounded-xl bg-emerald-500 text-white font-bold text-[14px] flex items-center justify-center gap-1.5 disabled:opacity-50"><CheckCircle2 size={16} /> I'm safe</button>
          <button disabled={busy} onClick={() => { if (mine) answer('help'); else setRollcallHidden(false); }} className="h-12 rounded-xl bg-red-600 text-white font-bold text-[14px] flex items-center justify-center gap-1.5 disabled:opacity-50"><LifeBuoy size={16} /> I need help</button>
        </div>
      </div>

      {rollcall.canManage && (
        <>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people" className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          {[
            ['Need help', rollcall.needHelp || [], LifeBuoy, 'text-red-600', 'text-red-700'],
            ['Missing — not answered', rollcall.missingPeople || [], UserX, 'text-amber-600', ''],
            ['Safe', rollcall.safePeople || [], ShieldCheck, 'text-emerald-600', ''],
          ].map(([title, list, Icon, color, tone]) => {
            const rows = list.filter(match);
            return (
              <section key={title}>
                <h2 className={`text-[14px] font-semibold mb-2 flex items-center gap-1.5 ${color}`}><Icon size={15} /> {title} <span className="text-slate-400 font-medium">({list.length})</span></h2>
                <div className={`${CARD} overflow-hidden`}>
                  {rows.length === 0 ? <p className="px-4 py-3 text-[12px] text-slate-400">Nobody{term ? ' matches' : ''}</p>
                    : rows.slice(0, 200).map((p) => <PersonRow key={p._id} p={p} tone={tone} note={p.note} />)}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
