import { useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { Siren, X, Phone, MapPin, Home, Footprints, CheckCircle2, Ban, Clock, AlertTriangle } from 'lucide-react';
import Portal from '../ui/Portal';
import { alertAPI } from '../../api';
import { stopSiren } from '../../utils/siren';
import { unitLabelOf } from '../../utils/alertEvents';
import { useSite } from '../../context/SiteContext';
import { Avatar } from './shared';

const idOf = (x) => String(x?._id || x || '');
const STATUS_TEXT = { on_my_way: 'is on the way', arrived: 'has arrived', cannot: "can't come" };
const TYPE_TONE = {
  medical: 'linear-gradient(135deg, #DC2626 0%, #9F1239 100%)',
  fire:    'linear-gradient(135deg, #EA580C 0%, #B91C1C 100%)',
  security:'linear-gradient(135deg, #B91C1C 0%, #7F1D1D 100%)',
};

export const responderLine = (r) => `${r.name}${r.role ? ` (${r.role})` : ''} ${STATUS_TEXT[r.status] || ''}`.trim();

/**
 * Full-screen urgent alert for site staff the alert was routed to (doctor,
 * nurse, warden, supervisor…). "On my way" / "Arrived" / "Can't come".
 */
export default function RoutedAlertModal({ alert, meId, more = 0, onUpdate, onClose }) {
  const { terms } = useSite();
  const [busy, setBusy] = useState('');
  const person = alert.residentId && typeof alert.residentId === 'object' ? alert.residentId : null;
  const unit = unitLabelOf(alert, terms);
  const mine = (alert.responders || []).find((r) => idOf(r.userId) === meId);
  const others = (alert.responders || []).filter((r) => idOf(r.userId) !== meId);
  const coming = others.filter((r) => r.status !== 'cannot');
  const escalated = !!alert.escalatedAt && !coming.length;
  const when = alert.createdAt ? new Date(alert.createdAt) : null;

  const respond = async (status) => {
    setBusy(status);
    stopSiren();
    try {
      const { data } = await alertAPI.respond(alert._id, status);
      toast.success(data.message || 'Sent');
      onUpdate?.(data.data);
      window.dispatchEvent(new CustomEvent('roles:alerts'));
      if (status !== 'on_my_way') onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not send that');
      if (e.response?.status === 409) onClose();
    } finally { setBusy(''); }
  };

  const dismiss = () => { stopSiren(); onClose(); };

  return (
    <Portal>
      <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4" style={{ background: 'rgba(15,0,0,0.82)', backdropFilter: 'blur(6px)' }}>
        <style>{`@keyframes ra-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,.45) } 50% { box-shadow: 0 0 0 16px rgba(255,255,255,0) } }`}</style>
        <div className="w-full sm:max-w-[420px] bg-white sm:rounded-[24px] rounded-t-[26px] overflow-hidden shadow-2xl max-h-[100dvh] overflow-y-auto">
          <div className="relative px-5 pt-6 pb-5 text-center text-white" style={{ background: TYPE_TONE[alert.type] || TYPE_TONE.security }}>
            <button onClick={dismiss} aria-label="Close" className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><X size={15} /></button>
            <div className="w-16 h-16 rounded-full bg-white/20 mx-auto flex items-center justify-center" style={{ animation: 'ra-pulse 1.4s infinite' }}>
              <Siren size={30} />
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] bg-white/20 rounded-full px-2.5 py-1">
              {escalated ? <><AlertTriangle size={11} /> No response yet</> : 'Sent to you'}
            </div>
            <h2 className="mt-2 text-[20px] font-extrabold leading-tight">{alert.title || 'Emergency'}</h2>
            {when && <p className="mt-1 text-[12px] text-white/80 flex items-center justify-center gap-1"><Clock size={11} /> {format(when, 'HH:mm')} · {formatDistanceToNowStrict(when, { addSuffix: true })}</p>}
          </div>

          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 p-3">
              <Avatar person={person} size={48} />
              <div className="flex-1 min-w-0">
                <div className="text-[16px] font-bold text-slate-900 truncate">{person?.name || 'Someone'}</div>
                {unit && <div className="text-[13px] text-slate-600 flex items-center gap-1 truncate"><Home size={12} /> {unit}</div>}
                {alert.location && <div className="text-[12px] text-slate-500 flex items-center gap-1 truncate"><MapPin size={11} /> {alert.location}</div>}
              </div>
              {person?.phone && (
                <a href={`tel:${person.phone}`} className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0" aria-label="Call"><Phone size={18} /></a>
              )}
            </div>

            {alert.note && <p className="text-[14px] text-slate-700 leading-relaxed bg-slate-50 rounded-xl px-3 py-2.5">“{alert.note}”</p>}

            {others.length > 0 && (
              <div className="space-y-1">
                {others.map((r) => (
                  <div key={idOf(r.userId)} className={`text-[12px] font-medium flex items-center gap-1.5 ${r.status === 'cannot' ? 'text-slate-400' : 'text-emerald-700'}`}>
                    {r.status === 'arrived' ? <CheckCircle2 size={12} /> : r.status === 'cannot' ? <Ban size={12} /> : <Footprints size={12} />}
                    {responderLine(r)}
                  </div>
                ))}
              </div>
            )}

            {mine && mine.status === 'on_my_way' ? (
              <>
                <p className="text-[13px] font-semibold text-emerald-700 text-center">They know you're on your way.</p>
                <button disabled={!!busy} onClick={() => respond('arrived')} className="w-full h-14 rounded-2xl bg-emerald-600 text-white text-[16px] font-bold flex items-center justify-center gap-2 disabled:opacity-60">
                  <CheckCircle2 size={18} /> {busy === 'arrived' ? 'Sending…' : 'Arrived'}
                </button>
                <button onClick={dismiss} className="w-full h-11 rounded-2xl bg-slate-100 text-slate-600 text-[14px] font-semibold">Close</button>
              </>
            ) : (
              <>
                <button disabled={!!busy} onClick={() => respond('on_my_way')} className="w-full h-14 rounded-2xl bg-red-600 text-white text-[17px] font-extrabold flex items-center justify-center gap-2 disabled:opacity-60" style={{ boxShadow: '0 12px 24px -12px rgba(220,38,38,.9)' }}>
                  <Footprints size={19} /> {busy === 'on_my_way' ? 'Sending…' : 'On my way'}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={!!busy} onClick={() => respond('arrived')} className="h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[14px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
                    <CheckCircle2 size={15} /> Arrived
                  </button>
                  <button disabled={!!busy} onClick={() => respond('cannot')} className="h-12 rounded-2xl bg-slate-100 text-slate-600 text-[14px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                    <Ban size={15} /> Can't come
                  </button>
                </div>
              </>
            )}
            {more > 0 && <p className="text-[12px] text-center text-red-600 font-semibold">{more} more emergenc{more === 1 ? 'y' : 'ies'} waiting</p>}
          </div>
        </div>
      </div>
    </Portal>
  );
}
