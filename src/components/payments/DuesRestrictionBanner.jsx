import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Lock, ShieldCheck, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { paymentAPI } from '../../api';
import Modal from '../ui/Modal';
import { useSite } from '../../context/SiteContext';

// Shown across the app while the resident has a dues notice or paused
// services (server: utils/duesEnforcement). Paying clears it automatically.

const NGN = (n) => `₦${Math.round(n || 0).toLocaleString()}`;
const day = (d) => (d ? format(new Date(d), 'd MMM yyyy') : '');

export default function DuesRestrictionBanner() {
  const { pathname } = useLocation();
  const { isEstate, w } = useSite();
  const mgmt = isEstate ? 'estate management' : w.siteMgmtLc;
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);
  const [dispute, setDispute] = useState('');
  const [sending, setSending] = useState(false);

  // Re-check on navigation so it disappears right after paying
  useEffect(() => {
    paymentAPI.getRestriction()
      .then(({ data }) => setInfo(data.data?.status && data.data.status !== 'none' ? data.data : null))
      .catch(() => setInfo(null));
  }, [pathname]);

  if (!info) return null;
  const active = info.status === 'active';
  const names = info.services.map((s) => s.label).join(', ');

  const sendDispute = async () => {
    setSending(true);
    try {
      const { data } = await paymentAPI.disputeRestriction(dispute);
      toast.success(data.message);
      setInfo((i) => ({ ...i, dispute: { message: dispute, at: new Date().toISOString() } }));
      setDispute('');
    } catch (err) { toast.error(err.response?.data?.message || 'Could not send'); }
    finally { setSending(false); }
  };

  return (
    <>
      <div className={`mb-4 rounded-2xl border px-4 py-3 flex flex-wrap items-center gap-3 ${active ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${active ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
          {active ? <Lock size={17} /> : <AlertTriangle size={17} />}
        </span>
        <div className="flex-1 min-w-[200px]">
          <p className={`text-[13.5px] font-semibold ${active ? 'text-red-800' : 'text-amber-900'}`}>
            {active ? `Paused for overdue bills: ${names}` : `${NGN(info.overdue)} in ${isEstate ? 'estate bills' : w.duesLc} is overdue`}
          </p>
          <p className={`text-[12px] ${active ? 'text-red-700/80' : 'text-amber-800/80'}`}>
            {active
              ? `Pay ${NGN(info.overdue)} to restore everything instantly.`
              : `Please pay by ${day(info.effectiveAt)} — after that, ${mgmt} may pause: ${names}.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(true)} className="h-9 px-3 rounded-xl text-[12.5px] font-semibold bg-white border border-slate-200 text-slate-700">Details</button>
          {pathname !== '/payments' && (
            <Link to="/payments" className="h-9 px-3.5 rounded-xl text-[12.5px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1">
              Pay now <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={active ? 'Services paused' : 'Notice of overdue bills'}>
        <div className="space-y-4">
          <p className="text-[13px] text-slate-600">
            {active
              ? <>Since {day(info.appliedAt)}, under <b>{info.clause}</b>, these are paused until your overdue bills are paid:</>
              : <>Under <b>{info.clause}</b>, if your overdue bills are not paid by <b>{day(info.effectiveAt)}</b>, {mgmt} may pause:</>}
          </p>
          <div className="space-y-2">
            {info.services.map((s) => (
              <div key={s.key} className="rounded-xl border border-slate-200 p-3">
                <p className="text-[13px] font-semibold text-slate-900">{s.label}</p>
                <p className="text-[12px] text-slate-500">{s.effect}</p>
              </div>
            ))}
          </div>

          {info.bills.length > 0 && (
            <div>
              <p className="text-[12px] font-semibold text-slate-600 mb-1">Overdue bills</p>
              {info.bills.map((b) => (
                <div key={b._id} className="flex justify-between text-[13px] py-0.5">
                  <span className="text-slate-700">{b.title}<span className="text-slate-400"> · due {day(b.dueDate)}</span></span>
                  <span className="font-semibold tabular-nums">{NGN(b.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-200">
            <p className="text-[12px] font-semibold text-emerald-800 flex items-center gap-1.5"><ShieldCheck size={14} /> Never affected</p>
            <ul className="mt-1 text-[12px] text-emerald-900/80 list-disc pl-5">
              {info.protected.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>

          <div>
            <p className="text-[12px] font-semibold text-slate-600 mb-1">Think this is a mistake?</p>
            {info.dispute ? (
              <p className="text-[12.5px] text-slate-500 rounded-xl bg-slate-50 border border-slate-100 p-3">
                You told {mgmt} on {day(info.dispute.at)}: “{info.dispute.message}”. They'll get back to you.
              </p>
            ) : (
              <>
                <textarea className="input-field" rows={3} value={dispute} onChange={(e) => setDispute(e.target.value)}
                  placeholder="e.g. I paid in cash on 2 Oct — receipt no. 1043. Or ask for a payment plan." />
                <button onClick={sendDispute} disabled={sending || dispute.trim().length < 10}
                  className="mt-2 w-full h-10 rounded-xl text-sm font-semibold border border-slate-200 text-slate-700 disabled:opacity-50">
                  {sending ? 'Sending…' : `Send to ${mgmt}`}
                </button>
              </>
            )}
          </div>

          <Link to="/payments" onClick={() => setOpen(false)} className="block w-full text-center h-11 leading-[44px] rounded-xl text-sm font-semibold text-white bg-emerald-600">
            Pay {NGN(info.overdue)} now
          </Link>
        </div>
      </Modal>
    </>
  );
}
