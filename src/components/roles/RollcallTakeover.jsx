import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, LifeBuoy, ShieldCheck, Siren, ArrowRight } from 'lucide-react';
import Portal from '../ui/Portal';
import { siteAPI } from '../../api';
import { useRoles } from '../../context/RolesContext';

/** Full-screen "Emergency roll-call" — I'm safe / I need help. */
export default function RollcallTakeover({ rollcall, onAnswered, onHide }) {
  const [busy, setBusy] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [note, setNote] = useState('');

  const send = async (status) => {
    setBusy(status);
    try {
      const { data } = await siteAPI.respondRollcall(rollcall._id, status, status === 'help' ? note.trim() : '');
      toast.success(data.message || 'Sent');
      onAnswered(data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not send — try again');
    } finally { setBusy(''); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[300] flex flex-col text-white overflow-y-auto" style={{ background: 'linear-gradient(170deg, #450A0A 0%, #7F1D1D 45%, #B91C1C 100%)' }}>
        <div className="flex-1 w-full max-w-md mx-auto px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-white/15 mx-auto flex items-center justify-center animate-pulse"><Siren size={30} /></div>
            <h1 className="mt-4 text-[24px] font-extrabold leading-tight">🚨 Emergency roll-call</h1>
            {rollcall.reason && <p className="mt-1 text-[16px] font-semibold text-red-100">{rollcall.reason}</p>}
            <p className="mt-3 text-[13px] text-white/75">Tell us you're OK, or that you need help. Follow staff instructions.</p>
          </div>

          <div className="mt-8 flex-1 flex flex-col gap-4 justify-center">
            <button disabled={!!busy} onClick={() => send('safe')}
              className="w-full min-h-[120px] rounded-[28px] bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] transition flex flex-col items-center justify-center gap-2 text-[24px] font-extrabold disabled:opacity-70"
              style={{ boxShadow: '0 20px 40px -18px rgba(16,185,129,.9)' }}>
              <CheckCircle2 size={36} /> {busy === 'safe' ? 'Sending…' : "I'm safe"}
            </button>

            {!helpOpen ? (
              <button disabled={!!busy} onClick={() => setHelpOpen(true)}
                className="w-full min-h-[120px] rounded-[28px] bg-white text-red-700 active:scale-[0.99] transition flex flex-col items-center justify-center gap-2 text-[24px] font-extrabold disabled:opacity-70">
                <LifeBuoy size={36} /> I need help
              </button>
            ) : (
              <div className="rounded-[28px] bg-white text-slate-900 p-4 space-y-3">
                <div className="text-[16px] font-bold text-red-700 flex items-center gap-2"><LifeBuoy size={18} /> I need help</div>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} autoFocus
                  placeholder="Optional: where you are, what's wrong"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-red-300" />
                <button disabled={!!busy} onClick={() => send('help')} className="w-full h-14 rounded-2xl bg-red-600 text-white text-[17px] font-extrabold disabled:opacity-70">
                  {busy === 'help' ? 'Sending…' : 'Send — I need help'}
                </button>
                <button onClick={() => setHelpOpen(false)} className="w-full text-[13px] text-slate-500 font-semibold">Back</button>
              </div>
            )}
          </div>

          {onHide && (
            <div className="mt-6 text-center space-y-2">
              <Link to="/rollcall" onClick={onHide} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white bg-white/15 rounded-full px-4 py-2" style={{ textDecoration: 'none' }}>
                I'm running the roll-call — see who's safe <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

/** Small persistent strip while a roll-call runs (after answering, or for the people running it). */
export function RollcallBanner() {
  const { rollcall, setRollcallHidden } = useRoles();
  if (!rollcall) return null;
  const mine = rollcall.myResponse?.status;
  const counts = rollcall.canManage ? ` · ${rollcall.safe} safe · ${rollcall.help} need help · ${rollcall.missing} missing` : '';
  const tone = mine === 'help' ? 'bg-red-600' : mine === 'safe' ? 'bg-emerald-600' : 'bg-red-700';
  const text = mine === 'help' ? 'Help is on the way' : mine === 'safe' ? "You're marked safe" : 'Emergency roll-call running';
  return (
    <div className={`${tone} text-white px-4 py-2 flex items-center gap-2 text-[13px] font-semibold flex-shrink-0`}>
      {mine === 'safe' ? <ShieldCheck size={15} /> : <Siren size={15} className="animate-pulse" />}
      <span className="flex-1 min-w-0 truncate">{text}{rollcall.reason ? ` — ${rollcall.reason}` : ''}{counts}</span>
      {rollcall.canManage
        ? <Link to="/rollcall" className="text-white underline underline-offset-2 flex-shrink-0">Open</Link>
        : !mine && <button onClick={() => setRollcallHidden(false)} className="underline underline-offset-2 flex-shrink-0">Answer</button>}
      {mine && !rollcall.canManage && <Link to="/rollcall" className="text-white/90 underline underline-offset-2 flex-shrink-0">Change</Link>}
    </div>
  );
}
