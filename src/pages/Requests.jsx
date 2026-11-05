import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  BellRing, HandHelping, Utensils, MessageCircle, Wrench, Stethoscope, HeartPulse, GraduationCap, Building2,
  Sparkles, ConciergeBell, UtensilsCrossed, AlertTriangle, TriangleAlert, Cog, Send, X, CheckCircle2, Clock, Loader2, Home, Phone,
} from 'lucide-react';
import { requestAPI } from '../api';
import { useSite } from '../context/SiteContext';
import { useSocket } from '../context/SocketContext';
import { PageLoader } from '../components/ui/Spinner';
import { Avatar, CARD, unitText } from '../components/roles/shared';

const KIND_ICON = {
  call_nurse: BellRing, assistance: HandHelping, meal: Utensils, other: MessageCircle,
  hostel_repair: Wrench, clinic: Stethoscope, sick_bay: HeartPulse, teacher: GraduationCap,
  housekeeping: Sparkles, maintenance: Wrench, room_service: UtensilsCrossed, concierge: ConciergeBell,
  incident: AlertTriangle, hazard: TriangleAlert, equipment: Cog,
};
const KIND_COLOR = ['#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
const STATUS = {
  open:      { label: 'Waiting',   color: '#F59E0B', bg: '#FFFBEB' },
  accepted:  { label: 'Accepted',  color: '#0EA5E9', bg: '#E0F2FE' },
  done:      { label: 'Done',      color: '#10B981', bg: '#ECFDF5' },
  cancelled: { label: 'Cancelled', color: '#94A3B8', bg: '#F1F5F9' },
};
const ago = (d) => { try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ''; } };
const upsert = (list, r) => {
  const i = list.findIndex((x) => x._id === r._id);
  if (i === -1) return [r, ...list];
  const next = list.slice(); next[i] = { ...next[i], ...r }; return next;
};

function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.open;
  return <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0" style={{ color: s.color, background: s.bg }}>{s.label}</span>;
}

function SendPanel({ kinds, onSent }) {
  const [kind, setKind] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const { data } = await requestAPI.create({ kind: kind.key, note: note.trim() });
      toast.success(data.message || 'Request sent');
      onSent(data.data);
      setKind(null); setNote('');
    } catch (e) { toast.error(e.response?.data?.message || 'Could not send the request'); }
    finally { setBusy(false); }
  };
  if (!kinds.length) return <p className={`${CARD} p-5 text-[13px] text-slate-500 text-center`}>No requests are set up here yet.</p>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {kinds.map((k, i) => {
          const Icon = KIND_ICON[k.key] || MessageCircle;
          const color = k.urgent ? '#DC2626' : KIND_COLOR[i % KIND_COLOR.length];
          const sel = kind?.key === k.key;
          return (
            <button key={k.key} onClick={() => setKind(sel ? null : k)}
              className={`dash-rise relative min-h-[112px] rounded-[22px] p-4 border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98] ${sel ? 'shadow-lg' : ''}`}
              style={{ animationDelay: `${i * 40}ms`, borderColor: sel ? color : `${color}30`, background: k.urgent ? `linear-gradient(145deg, ${color}, #991B1B)` : `linear-gradient(145deg, ${color}1A, #FFFFFF 70%)` }}>
              <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: k.urgent ? 'rgba(255,255,255,0.2)' : color }}>
                <Icon size={19} className="text-white" />
              </span>
              <span className={`mt-3 text-[15px] font-bold leading-tight ${k.urgent ? 'text-white' : 'text-slate-900'}`}>{k.label}</span>
              {k.urgent && <span className="absolute top-3 right-3 text-[9px] font-extrabold uppercase tracking-wider bg-white text-red-700 rounded-full px-1.5 py-0.5">Urgent</span>}
              {sel && !k.urgent && <CheckCircle2 size={18} className="absolute top-3 right-3" style={{ color }} />}
            </button>
          );
        })}
      </div>
      {kind && (
        <div className={`${CARD} p-4 space-y-3 dash-rise`}>
          <div className="text-[14px] font-semibold text-slate-900">{kind.label}</div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={1000} placeholder="Add a note (optional)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          <div className="flex gap-2">
            <button onClick={() => setKind(null)} className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-600 text-[14px] font-semibold">Cancel</button>
            <button disabled={busy} onClick={send} className={`flex-[2] h-11 rounded-xl text-white text-[14px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-60 ${kind.urgent ? 'bg-red-600' : 'bg-indigo-600'}`}>
              <Send size={15} /> {busy ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MyRequestRow({ r, kindLabel, onCancel }) {
  const steps = [
    { on: true, text: `Sent ${ago(r.createdAt)}` },
    r.status === 'accepted' || r.status === 'done' ? { on: true, text: `Accepted by ${r.assigneeId?.name || 'staff'}${r.acceptedAt ? ` · ${ago(r.acceptedAt)}` : ''}` } : null,
    r.status === 'done' ? { on: true, text: `Done${r.doneAt ? ` · ${ago(r.doneAt)}` : ''}` } : null,
  ].filter(Boolean);
  return (
    <div className="px-4 py-3 border-t border-slate-100 first:border-0">
      <div className="flex items-center gap-2">
        <span className={`text-[14px] font-semibold flex-1 min-w-0 truncate ${r.urgent ? 'text-red-700' : 'text-slate-900'}`}>{kindLabel(r.kind)}</span>
        <StatusPill status={r.status} />
      </div>
      {r.note && <p className="text-[12px] text-slate-500 mt-0.5">{r.note}</p>}
      <div className="mt-1.5 space-y-0.5">
        {steps.map((s, i) => <div key={i} className="text-[11px] text-slate-500 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> {s.text}</div>)}
        {r.status === 'open' && <div className="text-[11px] text-amber-600 flex items-center gap-1.5"><Loader2 size={10} className="animate-spin" /> Waiting for staff</div>}
      </div>
      {r.reply && <p className="mt-2 text-[13px] text-slate-700 bg-indigo-50/70 border border-indigo-100 rounded-xl px-3 py-2">“{r.reply}”{r.assigneeId?.name ? <span className="text-slate-400"> — {r.assigneeId.name}</span> : null}</p>}
      {r.status === 'open' && <button onClick={() => onCancel(r)} className="mt-2 text-[12px] font-semibold text-slate-500 hover:text-red-600 inline-flex items-center gap-1"><X size={12} /> Cancel request</button>}
    </div>
  );
}

function QueueRow({ r, kindLabel, terms, onUpdate }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState('');
  const act = async (status) => {
    setBusy(status);
    try {
      const { data } = await requestAPI.update(r._id, { status, ...(reply.trim() ? { reply: reply.trim() } : {}) });
      toast.success(data.message || 'Updated');
      onUpdate(data.data); setReplyOpen(false); setReply('');
    } catch (e) { toast.error(e.response?.data?.message || 'Could not update'); }
    finally { setBusy(''); }
  };
  const p = r.requesterId || {};
  const unit = r.unitId ? `${terms.unit} ${unitText(r.unitId, terms)}` : '';
  const done = r.status === 'done' || r.status === 'cancelled';
  return (
    <div className={`px-4 py-3 border-t border-slate-100 first:border-0 ${r.urgent && !done ? 'bg-red-50/50' : ''}`}>
      <div className="flex items-start gap-3">
        <Avatar person={p} size={38} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[14px] font-semibold flex-1 min-w-0 truncate ${r.urgent ? 'text-red-700' : 'text-slate-900'}`}>{r.urgent && '⚠️ '}{kindLabel(r.kind)}</span>
            <StatusPill status={r.status} />
          </div>
          <div className="text-[12px] text-slate-500 truncate flex items-center gap-1">{p.name || 'Someone'}{unit && <><span className="text-slate-300">·</span><Home size={10} /> {unit}</>}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1"><Clock size={10} /> {ago(r.createdAt)}{r.assigneeId?.name && r.status !== 'open' ? ` · ${r.assigneeId.name}` : ''}</div>
          {r.note && <p className="mt-1 text-[13px] text-slate-700">{r.note}</p>}
          {r.reply && <p className="mt-1 text-[12px] text-indigo-700">Reply: {r.reply}</p>}
          {!done && (
            <div className="mt-2 space-y-2">
              {replyOpen && (
                <input value={reply} onChange={(e) => setReply(e.target.value)} maxLength={500} placeholder="Reply (optional), e.g. Coming in 5 minutes" autoFocus
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200" />
              )}
              <div className="flex flex-wrap gap-2">
                {r.status === 'open' && <button disabled={!!busy} onClick={() => act('accepted')} className="h-9 px-3 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold disabled:opacity-60">{busy === 'accepted' ? '…' : 'Accept'}</button>}
                <button disabled={!!busy} onClick={() => act('done')} className="h-9 px-3 rounded-xl bg-emerald-500 text-white text-[13px] font-semibold disabled:opacity-60">{busy === 'done' ? '…' : 'Done'}</button>
                {!replyOpen && <button onClick={() => setReplyOpen(true)} className="h-9 px-3 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-semibold">Add reply</button>}
                {p.phone && <a href={`tel:${p.phone}`} className="h-9 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-semibold inline-flex items-center gap-1" style={{ textDecoration: 'none' }}><Phone size={12} /> Call</a>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Requests() {
  const { requestKinds, isStaff, terms } = useSite();
  const { subscribe } = useSocket() || {};
  const [tab, setTab] = useState(isStaff ? 'queue' : 'send');
  const [mine, setMine] = useState(null);
  const [queue, setQueue] = useState(null);
  const [done, setDone] = useState(null);
  const kinds = requestKinds || [];
  const kindLabel = (key) => kinds.find((k) => k.key === key)?.label || 'Request';

  const loadMine = useCallback(() => requestAPI.getAll({ scope: 'mine' }).then(({ data }) => setMine(data.data || [])).catch(() => setMine([])), []);
  const loadQueue = useCallback(() => {
    if (!isStaff) return;
    requestAPI.getAll({ scope: 'queue', status: 'active' }).then(({ data }) => setQueue(data.data || [])).catch(() => setQueue([]));
    requestAPI.getAll({ scope: 'queue', status: 'done' }).then(({ data }) => setDone(data.data || [])).catch(() => setDone([]));
  }, [isStaff]);
  useEffect(() => { loadMine(); loadQueue(); }, [loadMine, loadQueue]);

  useEffect(() => {
    if (!subscribe) return undefined;
    return subscribe('request_update', () => { loadMine(); loadQueue(); });
  }, [subscribe, loadMine, loadQueue]);

  const cancel = async (r) => {
    if (!window.confirm(`Cancel your ${kindLabel(r.kind).toLowerCase()} request?`)) return;
    try {
      const { data } = await requestAPI.update(r._id, { status: 'cancelled' });
      toast.success(data.message || 'Cancelled');
      setMine((l) => upsert(l || [], data.data));
    } catch (e) { toast.error(e.response?.data?.message || 'Could not cancel'); }
  };
  const onQueueUpdate = (r) => {
    if (r.status === 'done' || r.status === 'cancelled') { setQueue((l) => (l || []).filter((x) => x._id !== r._id)); setDone((l) => upsert(l || [], r)); }
    else setQueue((l) => upsert(l || [], r));
  };
  const sorted = (l) => [...(l || [])].sort((a, b) => (b.urgent - a.urgent) || (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1) || new Date(a.createdAt) - new Date(b.createdAt));

  const tabs = isStaff
    ? [['queue', `Queue${queue?.length ? ` (${queue.length})` : ''}`], ['done', 'Done'], ['send', 'Send'], ['mine', 'My requests']]
    : [['send', 'New request'], ['mine', `My requests${mine?.filter((r) => r.status === 'open' || r.status === 'accepted').length ? ` (${mine.filter((r) => r.status === 'open' || r.status === 'accepted').length})` : ''}`]];

  const activeMine = (mine || []).filter((r) => r.status === 'open' || r.status === 'accepted');

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-semibold text-slate-900" style={{ letterSpacing: '-0.03em' }}>Requests</h1>
        <p className="text-[13px] text-slate-500">{isStaff ? 'Requests sent to you, most urgent first' : `Ask ${terms.site.toLowerCase()} staff for help — they're told straight away`}</p>
      </div>

      <div className="flex gap-1 p-1 rounded-2xl bg-slate-100 overflow-x-auto">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 whitespace-nowrap h-9 px-3 rounded-xl text-[13px] font-semibold transition-colors ${tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{l}</button>
        ))}
      </div>

      {tab === 'send' && (
        <>
          <SendPanel kinds={kinds} onSent={(r) => { setMine((l) => upsert(l || [], r)); }} />
          {!isStaff && activeMine.length > 0 && (
            <section>
              <h2 className="text-[15px] font-semibold text-slate-900 mb-2">In progress</h2>
              <div className={`${CARD} overflow-hidden`}>{activeMine.map((r) => <MyRequestRow key={r._id} r={r} kindLabel={kindLabel} onCancel={cancel} />)}</div>
            </section>
          )}
        </>
      )}

      {tab === 'mine' && (mine === null ? <PageLoader variant="section" /> : (
        <div className={`${CARD} overflow-hidden`}>
          {mine.length === 0 ? <p className="px-4 py-6 text-[13px] text-slate-400 text-center">You haven't sent any requests yet.</p>
            : mine.map((r) => <MyRequestRow key={r._id} r={r} kindLabel={kindLabel} onCancel={cancel} />)}
        </div>
      ))}

      {tab === 'queue' && (queue === null ? <PageLoader variant="section" /> : (
        <div className={`${CARD} overflow-hidden`}>
          {queue.length === 0 ? (
            <div className="px-4 py-8 text-center"><Building2 size={22} className="mx-auto text-slate-300" /><p className="text-[13px] text-slate-400 mt-2">Nothing waiting. New requests appear here live.</p></div>
          ) : sorted(queue).map((r) => <QueueRow key={r._id} r={r} kindLabel={kindLabel} terms={terms} onUpdate={onQueueUpdate} />)}
        </div>
      ))}

      {tab === 'done' && (done === null ? <PageLoader variant="section" /> : (
        <div className={`${CARD} overflow-hidden`}>
          {done.length === 0 ? <p className="px-4 py-6 text-[13px] text-slate-400 text-center">No finished requests yet.</p>
            : done.map((r) => <QueueRow key={r._id} r={r} kindLabel={kindLabel} terms={terms} onUpdate={onQueueUpdate} />)}
        </div>
      ))}
    </div>
  );
}
