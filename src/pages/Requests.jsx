import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  MessageCircle, Building2, Send, CheckCircle2, Clock, Loader2, Home, Phone, UserRound, ChevronRight,
} from 'lucide-react';
import { requestAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSite } from '../context/SiteContext';
import { useSocket } from '../context/SocketContext';
import { PageLoader } from '../components/ui/Spinner';
import { Avatar, CARD, unitText } from '../components/roles/shared';
import { KIND_ICON, StatusPill, kindColor } from '../components/requests/requestUi';
import RequestThread, { lastMessage, isStaffSide, threadOf } from '../components/requests/RequestThread';
import MemberRequests from '../components/requests/MemberRequests';
import { useRoles } from '../context/RolesContext';

const ago = (d) => { try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ''; } };
const upsert = (list, r) => {
  const i = list.findIndex((x) => x._id === r._id);
  if (i === -1) return [r, ...list];
  const next = list.slice(); next[i] = { ...next[i], ...r }; return next;
};
const isActive = (r) => r.status === 'open' || r.status === 'accepted';

// Members: how many messages of each request they've seen (drives the unread dot)
const SEEN_KEY = 'areamates:requestsSeen';
const loadSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch { return {}; } };
const saveSeen = (m) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(m)); } catch { /* ignore */ } };

function SendPanel({ kinds, onSent, initialKind = null }) {
  const [kind, setKind] = useState(null);
  // ?kind=call_nurse (dashboard quick buttons) preselects that kind once the kinds are known
  const [preselect, setPreselect] = useState(initialKind);
  useEffect(() => {
    if (!preselect) return;
    const k = kinds.find((x) => x.key === preselect);
    if (k) { setKind(k); setPreselect(null); }
  }, [preselect, kinds]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const { data } = await requestAPI.create({ kind: kind.key, note: note.trim() });
      toast.success(data.message || 'Request sent');
      onSent(data.data, kind);
      setKind(null); setNote('');
    } catch (e) { toast.error(e.response?.data?.message || 'Could not send the request'); }
    finally { setBusy(false); }
  };
  const urgent = kinds.filter((k) => k.urgent);
  const rest = kinds.filter((k) => !k.urgent);
  const tile = (k, i, big) => {
    const Icon = KIND_ICON[k.key] || MessageCircle;
    const color = kindColor(kinds, k.key);
    const sel = kind?.key === k.key;
    return (
      <button key={k.key} onClick={() => setKind(sel ? null : k)}
        className={`dash-rise relative rounded-[22px] border-2 text-left flex flex-col justify-between transition-all active:scale-[0.98] ${big ? 'min-h-[150px] p-5' : 'min-h-[112px] p-4'} ${sel ? 'shadow-lg' : ''} ${sel && k.urgent ? 'ring-4 ring-red-200' : ''}`}
        style={{ animationDelay: `${i * 40}ms`, borderColor: sel ? color : `${color}30`, background: k.urgent ? `linear-gradient(145deg, ${color}, #991B1B)` : `linear-gradient(145deg, ${color}1A, #FFFFFF 70%)` }}>
        <span className={`${big ? 'w-12 h-12' : 'w-10 h-10'} rounded-2xl flex items-center justify-center`} style={{ background: k.urgent ? 'rgba(255,255,255,0.2)' : color }}>
          <Icon size={big ? 23 : 19} className="text-white" />
        </span>
        <span className={`mt-3 ${big ? 'text-[18px]' : 'text-[15px]'} font-bold leading-tight ${k.urgent ? 'text-white' : 'text-slate-900'}`}>{k.label}</span>
        {k.urgent && <span className="absolute top-3 right-3 text-[9px] font-extrabold uppercase tracking-wider bg-white text-red-700 rounded-full px-1.5 py-0.5">Urgent</span>}
        {sel && !k.urgent && <CheckCircle2 size={18} className="absolute top-3 right-3" style={{ color }} />}
      </button>
    );
  };
  if (!kinds.length) return <p className={`${CARD} p-5 text-[13px] text-slate-500 text-center`}>No requests are set up here yet.</p>;
  return (
    <div className="space-y-3">
      {urgent.length > 0 && (
        <div className={`grid gap-3 ${urgent.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {urgent.map((k, i) => tile(k, i, true))}
        </div>
      )}
      {rest.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {rest.map((k, i) => tile(k, urgent.length + i, false))}
        </div>
      )}
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

function UnreadDot() {
  return <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 flex-shrink-0" aria-label="New message" />;
}

function Preview({ last }) {
  if (!last) return null;
  return (
    <p className={`text-[12px] truncate mt-0.5 ${last.mine ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>{last.preview}</p>
  );
}

function MyRequestRow({ r, kinds, kindLabel, myId, onOpen }) {
  const Icon = KIND_ICON[r.kind] || MessageCircle;
  const color = kindColor(kinds, r.kind);
  const last = lastMessage(r, myId);
  const unread = last && !last.mine;
  const sub = r.status === 'open' ? 'Waiting for staff'
    : r.status === 'accepted' ? `Accepted by ${r.assigneeId?.name || 'staff'}`
      : r.status === 'done' ? `Done${r.assigneeId?.name ? ` · ${r.assigneeId.name}` : ''}` : 'Cancelled';
  return (
    <button onClick={() => onOpen(r)} className="w-full text-left px-4 py-3 border-t border-slate-100 first:border-0 flex items-center gap-3 hover:bg-slate-50 active:bg-slate-50 transition-colors">
      <span className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: color }}>
        <Icon size={17} className="text-white" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[14px] font-semibold flex-1 min-w-0 truncate ${r.urgent ? 'text-red-700' : 'text-slate-900'}`}>{kindLabel(r.kind)}</span>
          <StatusPill status={r.status} />
        </div>
        <Preview last={last} />
        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
          {r.status === 'open' ? <Loader2 size={10} className="animate-spin text-amber-500" /> : <Clock size={10} />}
          <span className="truncate">{sub} · {ago(last?.at || r.updatedAt || r.createdAt)}</span>
        </div>
      </div>
      {unread ? <UnreadDot /> : <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />}
    </button>
  );
}

function QueueRow({ r, kindLabel, terms, myId, onOpen, onUpdate }) {
  const [busy, setBusy] = useState('');
  const act = async (e, status) => {
    e.stopPropagation();
    setBusy(status);
    try {
      const { data } = await requestAPI.update(r._id, { status });
      toast.success(data.message || 'Updated');
      onUpdate(data.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Could not update'); }
    finally { setBusy(''); }
  };
  const p = r.requesterId || {};
  const unit = r.unitId ? `${terms.unit} ${unitText(r.unitId, terms)}` : '';
  const done = r.status === 'done' || r.status === 'cancelled';
  const subject = r.subjectId && typeof r.subjectId === 'object' ? r.subjectId : null;
  const last = lastMessage(r, myId);
  const unread = last && !last.mine;
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(r)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(r); }}
      className={`px-4 py-3 border-t border-slate-100 first:border-0 cursor-pointer hover:bg-slate-50/80 transition-colors ${r.urgent && !done ? 'bg-red-50/50' : ''}`}>
      <div className="flex items-start gap-3">
        {r.fromManager
          ? <span className="w-[38px] h-[38px] rounded-full bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0"><Building2 size={17} /></span>
          : <Avatar person={p} size={38} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[14px] font-semibold flex-1 min-w-0 truncate ${r.urgent ? 'text-red-700' : 'text-slate-900'}`}>{r.urgent && '⚠️ '}{kindLabel(r.kind)}</span>
            {unread && <UnreadDot />}
            <StatusPill status={r.status} />
          </div>
          {r.fromManager && (
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 bg-violet-100 text-violet-700"><Building2 size={10} /> From management</span>
              {subject && <span className="text-[12px] text-slate-600 inline-flex items-center gap-1"><UserRound size={11} className="text-slate-400" /> About {subject.name}</span>}
            </div>
          )}
          <div className="text-[12px] text-slate-500 truncate flex items-center gap-1 mt-0.5">{r.fromManager ? (p.name || 'Management') : (p.name || 'Someone')}{unit && <><span className="text-slate-300">·</span><Home size={10} /> {unit}</>}</div>
          <Preview last={last} />
          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><Clock size={10} /> {ago(r.createdAt)}{r.assigneeId?.name && r.status !== 'open' ? ` · ${r.assigneeId.name}` : ''}</div>
          {!done && (
            <div className="mt-2 flex flex-wrap gap-2">
              {r.status === 'open' && <button disabled={!!busy} onClick={(e) => act(e, 'accepted')} className="h-9 px-3 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold disabled:opacity-60">{busy === 'accepted' ? '…' : 'Accept'}</button>}
              <button disabled={!!busy} onClick={(e) => act(e, 'done')} className="h-9 px-3 rounded-xl bg-emerald-500 text-white text-[13px] font-semibold disabled:opacity-60">{busy === 'done' ? '…' : 'Done'}</button>
              <button onClick={(e) => { e.stopPropagation(); onOpen(r); }} className="h-9 px-3 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-semibold inline-flex items-center gap-1"><MessageCircle size={13} /> Reply</button>
              {p.phone && <a href={`tel:${p.phone}`} onClick={(e) => e.stopPropagation()} className="h-9 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[13px] font-semibold inline-flex items-center gap-1" style={{ textDecoration: 'none' }}><Phone size={12} /> Call</a>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Requests() {
  const site = useSite();
  const { requestKinds, isStaff, terms } = site;
  const { team } = useRoles();
  const { user } = useAuth();
  const myId = String(user?._id || '');
  const { subscribe } = useSocket() || {};
  const [params] = useSearchParams();
  const initialKind = params.get('kind');
  const [tab, setTab] = useState(initialKind ? 'send' : isStaff ? 'queue' : 'send');
  const [mine, setMine] = useState(null);
  const [queue, setQueue] = useState(null);
  const [done, setDone] = useState(null);
  const [open, setOpen] = useState(null);
  const kinds = requestKinds || [];
  const kindLabel = (key) => kinds.find((k) => k.key === key)?.label || 'Request';

  const loadMine = useCallback(() => requestAPI.getAll({ scope: 'mine' }).then(({ data }) => setMine(data.data || [])).catch(() => setMine([])), []);
  const loadQueue = useCallback(() => {
    if (!isStaff) return;
    requestAPI.getAll({ scope: 'queue', status: 'active' }).then(({ data }) => setQueue(data.data || [])).catch(() => setQueue([]));
    requestAPI.getAll({ scope: 'queue', status: 'done' }).then(({ data }) => setDone(data.data || [])).catch(() => setDone([]));
  }, [isStaff]);
  useEffect(() => { loadMine(); loadQueue(); }, [loadMine, loadQueue]);

  // Fold an updated request (from an action, a reply or the socket) into every list it belongs to
  const apply = useCallback((r) => {
    if (!r?._id) return;
    setOpen((o) => (o && o._id === r._id ? { ...o, ...r } : o));
    const requesterId = String(r.requesterId?._id || r.requesterId || '');
    if (requesterId === myId) setMine((l) => upsert(l || [], r));
    if (isStaff && isStaffSide(r, myId)) {
      if (isActive(r)) {
        setQueue((l) => upsert(l || [], r));
        setDone((l) => (l || []).filter((x) => x._id !== r._id));
      } else {
        setQueue((l) => (l || []).filter((x) => x._id !== r._id));
        setDone((l) => upsert(l || [], r));
      }
    }
  }, [myId, isStaff]);

  useEffect(() => {
    if (!subscribe) return undefined;
    return subscribe('request_update', apply);
  }, [subscribe, apply]);

  // Members: mark the open conversation as read (also as new messages arrive while it's open)
  const [seen, setSeen] = useState(loadSeen);
  const openId = open?._id;
  const openCount = open ? threadOf(open).length : 0;
  useEffect(() => {
    if (isStaff || !openId) return;
    setSeen((m) => {
      if ((m[openId] || 0) >= openCount) return m;
      const next = { ...m, [openId]: openCount };
      saveSeen(next);
      return next;
    });
  }, [isStaff, openId, openCount]);

  const cancel = async (r) => {
    if (!window.confirm(`Cancel your ${kindLabel(r.kind).toLowerCase()} request?`)) return;
    try {
      const { data } = await requestAPI.update(r._id, { status: 'cancelled' });
      toast.success(data.message || 'Cancelled');
      apply(data.data);
    } catch (e) { toast.error(e.response?.data?.message || 'Could not cancel'); }
  };
  const sorted = (l) => [...(l || [])].sort((a, b) => (b.urgent - a.urgent) || (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1) || new Date(a.createdAt) - new Date(b.createdAt));

  const activeMine = (mine || []).filter(isActive);
  const unreadQueue = (queue || []).filter((r) => { const m = lastMessage(r, myId); return m && !m.mine; }).length;
  const tabs = isStaff
    ? [['queue', `Queue${queue?.length ? ` (${queue.length})` : ''}${unreadQueue ? ' •' : ''}`], ['done', 'Done'], ['send', 'Send'], ['mine', 'My requests']]
    : [['send', 'New request'], ['mine', `My requests${activeMine.length ? ` (${activeMine.length})` : ''}`]];

  const myRows = (list) => list.map((r) => <MyRequestRow key={r._id} r={r} kinds={kinds} kindLabel={kindLabel} myId={myId} onOpen={setOpen} />);
  const queueRows = (list) => list.map((r) => <QueueRow key={r._id} r={r} kindLabel={kindLabel} terms={terms} myId={myId} onOpen={setOpen} onUpdate={apply} />);

  const thread = open && (
    <RequestThread
      request={open} myId={myId} kinds={kinds} kindLabel={kindLabel} terms={terms}
      onClose={() => setOpen(null)} onChange={apply} onCancel={cancel}
    />
  );

  // Members: the bedside call panel + "Your requests"
  if (!isStaff) {
    return (
      <div className="w-full animate-fade-in">
        <MemberRequests
          site={site} team={team} kinds={kinds} mine={mine} myId={myId} seen={seen}
          initialKind={initialKind} onOpen={setOpen} onSent={apply}
        />
        {thread}
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-fade-in">
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
          <SendPanel kinds={kinds} initialKind={initialKind} onSent={(r) => { apply(r); setOpen(r); }} />
          {!isStaff && activeMine.length > 0 && (
            <section>
              <h2 className="text-[15px] font-semibold text-slate-900 mb-2">In progress</h2>
              <div className={`${CARD} overflow-hidden`}>{myRows(activeMine)}</div>
            </section>
          )}
        </>
      )}

      {tab === 'mine' && (mine === null ? <PageLoader variant="section" /> : (
        <div className={`${CARD} overflow-hidden`}>
          {mine.length === 0 ? <p className="px-4 py-6 text-[13px] text-slate-400 text-center">You haven't sent any requests yet.</p> : myRows(mine)}
        </div>
      ))}

      {tab === 'queue' && (queue === null ? <PageLoader variant="section" /> : (
        <div className={`${CARD} overflow-hidden`}>
          {queue.length === 0 ? (
            <div className="px-4 py-8 text-center"><Building2 size={22} className="mx-auto text-slate-300" /><p className="text-[13px] text-slate-400 mt-2">Nothing waiting. New requests appear here live.</p></div>
          ) : queueRows(sorted(queue))}
        </div>
      ))}

      {tab === 'done' && (done === null ? <PageLoader variant="section" /> : (
        <div className={`${CARD} overflow-hidden`}>
          {done.length === 0 ? <p className="px-4 py-6 text-[13px] text-slate-400 text-center">No finished requests yet.</p> : queueRows(done)}
        </div>
      ))}

      {thread}
    </div>
  );
}
