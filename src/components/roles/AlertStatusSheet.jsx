import { formatDistanceToNowStrict } from 'date-fns';
import { X, Siren, Footprints, CheckCircle2, Ban, Users, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import Portal from '../ui/Portal';
import { useSite } from '../../context/SiteContext';
import { Avatar, staffLine } from './shared';

const idOf = (x) => String(x?._id || x || '');

/**
 * Live status for the alert a member just raised: who it went to, who's
 * coming ("Dr Ade (Doctor) is on the way" → "Arrived") and whether it was
 * escalated to all staff. Updated from `new_alert` in RolesContext.
 */
export default function AlertStatusSheet({ alert, team, onClose }) {
  const { assignLabel } = useSite();
  const sentTo = (alert.routedTo || []).length;
  const routedIds = new Set((alert.routedTo || []).map(idOf));
  const named = [...(team?.assigned || []), ...(team?.covering || [])].filter((p) => !sentTo || routedIds.has(idOf(p._id)));
  const responders = alert.responders || [];
  const coming = responders.filter((r) => r.status !== 'cannot');
  const resolved = alert.status === 'resolved';
  const at = alert.createdAt ? new Date(alert.createdAt) : null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4" style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
        <div className="w-full sm:max-w-[420px] bg-white rounded-t-[26px] sm:rounded-[24px] overflow-hidden max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="relative px-5 pt-5 pb-4 text-white" style={{ background: resolved ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#DC2626,#991B1B)' }}>
            <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center"><X size={15} /></button>
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">{resolved ? <ShieldCheck size={20} /> : <Siren size={20} />}</span>
              <div className="min-w-0">
                <div className="text-[17px] font-bold leading-tight">{resolved ? 'Alert resolved' : coming.length ? 'Help is on the way' : 'Alert sent'}</div>
                <div className="text-[12px] text-white/80">{alert.title || 'Emergency'}{at ? ` · ${formatDistanceToNowStrict(at, { addSuffix: true })}` : ''}</div>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <div className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><Users size={12} /> Sent to</div>
              <p className="text-[14px] text-slate-700">
                {sentTo ? `${sentTo} staff member${sentTo === 1 ? '' : 's'}` : 'Security and management'}
                {sentTo ? ' plus security and management' : ''}
              </p>
              {named.length > 0 && (
                <div className="mt-2 space-y-2">
                  {named.slice(0, 5).map((p) => (
                    <div key={p._id} className="flex items-center gap-2.5">
                      <Avatar person={p} size={32} ring={p.onCall ? '#10B981' : undefined} />
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{staffLine(p) || assignLabel}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="text-[12px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Responding</div>
              {responders.length === 0 ? (
                <p className="text-[13px] text-slate-500 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Waiting for someone to respond…</p>
              ) : (
                <div className="space-y-2">
                  {responders.map((r) => (
                    <div key={idOf(r.userId)} className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${r.status === 'arrived' ? 'bg-emerald-50 text-emerald-800' : r.status === 'cannot' ? 'bg-slate-50 text-slate-400' : 'bg-amber-50 text-amber-800'}`}>
                      {r.status === 'arrived' ? <CheckCircle2 size={16} /> : r.status === 'cannot' ? <Ban size={16} /> : <Footprints size={16} />}
                      <span className="text-[13px] font-semibold flex-1 min-w-0 truncate">
                        {r.name}{r.role ? ` (${r.role})` : ''} {r.status === 'arrived' ? 'arrived' : r.status === 'cannot' ? "can't come" : 'is on the way'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {alert.escalatedAt && !resolved && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-[13px] font-semibold text-red-700">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" /> Escalated to all staff
              </div>
            )}

            <button onClick={onClose} className="w-full h-12 rounded-2xl bg-slate-900 text-white text-[14px] font-semibold">
              {resolved ? 'Done' : 'Hide — keep me updated'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
