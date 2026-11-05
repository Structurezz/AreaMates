import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ShieldQuestion, Check, X } from 'lucide-react';
import { visitorAPI } from '../../api';
import { useSite } from '../../context/SiteContext';
import { useSocket } from '../../context/SocketContext';
import { categoryLabel, detailsSummary } from '../../utils/siteTypes';
import { CARD, unitText } from './shared';

/**
 * Care-team approvals: passes to restricted units (e.g. ICU) wait for the
 * patient's care team. Staff only; renders nothing when the list is empty.
 */
export default function PassApprovals({ className = '' }) {
  const { isEstate, isStaff, terms } = useSite();
  const { subscribe } = useSocket() || {};
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState('');
  const on = !isEstate && isStaff;

  const load = useCallback(async () => {
    if (!on) return;
    try { const { data } = await visitorAPI.approvals(); setList(data.data || []); } catch { /* ignore */ }
  }, [on]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!on || !subscribe) return undefined;
    return subscribe('visitor_update', () => load());
  }, [on, subscribe, load]);

  if (!on || !list.length) return null;

  const act = async (v, approve) => {
    if (!approve && !window.confirm(`Decline ${v.visitorName}'s visit?`)) return;
    setBusy(v._id);
    try {
      if (approve) await visitorAPI.approvePass(v._id); else await visitorAPI.cancel(v._id);
      toast.success(approve ? 'Approved — the visitor gets their code' : 'Visit declined');
      setList((l) => l.filter((x) => x._id !== v._id));
    } catch (e) { toast.error(e.response?.data?.message || 'Could not update the pass'); }
    finally { setBusy(''); }
  };

  return (
    <section className={`dash-rise ${className}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center"><ShieldQuestion size={14} className="text-white" /></span>
        <h2 className="text-[15px] font-semibold text-slate-900">Visitors waiting for approval</h2>
        <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">{list.length}</span>
      </div>
      <div className={`${CARD} overflow-hidden`}>
        {list.map((v) => {
          const extra = detailsSummary(v.details);
          return (
            <div key={v._id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-t border-slate-100 first:border-0">
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold text-slate-900 truncate">{v.visitorName} <span className="text-[12px] font-medium text-slate-400">· {categoryLabel(v.category)}</span></div>
                <div className="text-[12px] text-slate-500 truncate">
                  To see {v.hostResidentId?.name || 'a patient'}{v.hostUnitId ? ` · ${terms.unit} ${unitText(v.hostUnitId, terms)}` : ''}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {v.expectedDate ? format(new Date(v.expectedDate), 'EEE d MMM, HH:mm') : ''}{v.purpose ? ` · ${v.purpose}` : ''}{extra ? ` · ${extra}` : ''}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button disabled={busy === v._id} onClick={() => act(v, false)} className="h-9 px-3 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-semibold flex items-center gap-1 disabled:opacity-50"><X size={14} /> Decline</button>
                <button disabled={busy === v._id} onClick={() => act(v, true)} className="h-9 px-3 rounded-xl bg-emerald-500 text-white text-[13px] font-semibold flex items-center gap-1 disabled:opacity-50"><Check size={14} /> Approve</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
