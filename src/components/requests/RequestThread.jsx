import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNowStrict, isToday } from 'date-fns';
import {
  ArrowLeft, X, Send, Phone, Home, UserRound, CheckCircle2, Loader2, Building2, MessageCircle,
} from 'lucide-react';
import { requestAPI } from '../../api';
import Portal, { Z } from '../ui/Portal';
import useIsDesktop from '../../hooks/useIsDesktop';
import { Avatar, unitText } from '../roles/shared';
import { KIND_ICON, STATUS, StatusPill, kindColor } from './requestUi';

const idOf = (v) => (v && typeof v === 'object' ? String(v._id || '') : v ? String(v) : '');
const ago = (d) => { try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ''; } };
const clock = (d) => {
  try { const t = new Date(d); return isToday(t) ? format(t, 'HH:mm') : format(t, 'd MMM, HH:mm'); } catch { return ''; }
};

/** The request's conversation. Older requests (before messages) fall back to their note and reply. */
export function threadOf(r) {
  if (r?.messages?.length) return r.messages;
  const list = [];
  if (r?.note) list.push({ userId: idOf(r.requesterId), name: r.requesterId?.name || 'Requester', role: '', text: r.note, at: r.createdAt });
  if (r?.reply) list.push({ userId: idOf(r.assigneeId), name: r.assigneeId?.name || 'Staff', role: '', text: r.reply, at: r.doneAt || r.acceptedAt || r.updatedAt });
  return list;
}

/** Last message, whether it's unread-ish (last word isn't mine) and a one-line preview. */
export function lastMessage(r, myId) {
  const t = threadOf(r);
  const m = t[t.length - 1];
  if (!m) return null;
  const mine = idOf(m.userId) === String(myId);
  return { ...m, mine, preview: `${mine ? 'You' : (m.name || 'Someone').split(' ')[0]}: ${m.text}` };
}

export function isStaffSide(r, myId) {
  const me = String(myId);
  if (idOf(r.requesterId) === me) return false;
  return (r.routedTo || []).some((x) => idOf(x) === me) || idOf(r.assigneeId) === me;
}

export default function RequestThread({ request: r, myId, kindLabel, kinds, terms, onClose, onChange, onCancel }) {
  const isDesktop = useIsDesktop();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState('');
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const staffSide = isStaffSide(r, myId);
  const mineReq = idOf(r.requesterId) === String(myId);
  const kind = kinds.find((k) => k.key === r.kind);
  const Icon = KIND_ICON[r.kind] || MessageCircle;
  const color = r.urgent ? '#DC2626' : kindColor(kinds, r.kind);
  const closed = r.status === 'done' || r.status === 'cancelled';
  const requester = r.requesterId || {};
  const unit = r.unitId ? `${terms.unit} ${unitText(r.unitId, terms)}` : '';
  const subject = r.subjectId && typeof r.subjectId === 'object' ? r.subjectId : null;

  // Messages plus status events, in time order
  const items = useMemo(() => {
    const list = threadOf(r).map((m, i) => ({ type: 'msg', key: `m${i}`, at: m.at, m }));
    if (r.acceptedAt) list.push({ type: 'event', key: 'acc', at: r.acceptedAt, text: `${r.assigneeId?.name || 'Staff'} accepted` });
    if (r.status === 'done') list.push({ type: 'event', key: 'done', at: r.doneAt || r.updatedAt, text: 'Marked done' });
    if (r.status === 'cancelled') list.push({ type: 'event', key: 'can', at: r.updatedAt, text: 'Request cancelled' });
    return list.sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
  }, [r]);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [items.length]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { data } = await requestAPI.message(r._id, body);
      setText('');
      onChange(data.data);
      inputRef.current?.focus();
    } catch (e) { toast.error(e.response?.data?.message || 'Could not send'); }
    finally { setSending(false); }
  };
  const act = async (status) => {
    setBusy(status);
    try {
      const { data } = await requestAPI.update(r._id, { status });
      toast.success(data.message || 'Updated');
      onChange(data.data);
    } catch (e) { toast.error(e.response?.data?.message || 'Could not update'); }
    finally { setBusy(''); }
  };

  const statusLine = r.status === 'open'
    ? <span className="inline-flex items-center gap-1 text-amber-600"><Loader2 size={11} className="animate-spin" /> Waiting for someone to accept</span>
    : r.assigneeId?.name
      ? <span className="inline-flex items-center gap-1" style={{ color: STATUS[r.status]?.color }}><CheckCircle2 size={11} /> {r.status === 'cancelled' ? 'Cancelled' : `Accepted by ${r.assigneeId.name}`}{r.acceptedAt ? ` · ${ago(r.acceptedAt)}` : ''}</span>
      : <span style={{ color: STATUS[r.status]?.color }}>{STATUS[r.status]?.label}</span>;

  const panel = (
    <div
      role="dialog" aria-modal="true" aria-label={kindLabel(r.kind)}
      className={`relative bg-white flex flex-col ${isDesktop ? 'h-full w-[440px] max-w-full ml-auto animate-slide-in-right border-l border-slate-200' : 'h-[100dvh] w-full sheet-panel'}`}
      style={{ boxShadow: isDesktop ? '-24px 0 64px rgba(15,23,42,0.18)' : undefined }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-100" style={{ paddingTop: isDesktop ? 0 : 'env(safe-area-inset-top)' }}>
        <div className="flex items-center gap-3 px-3 py-3">
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 flex-shrink-0">
            {isDesktop ? <X size={18} /> : <ArrowLeft size={19} />}
          </button>
          <span className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: color }}>
            <Icon size={18} className="text-white" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[15px] font-bold truncate ${r.urgent ? 'text-red-700' : 'text-slate-900'}`}>{kind?.label || kindLabel(r.kind)}</span>
              <StatusPill status={r.status} />
            </div>
            <div className="text-[11px] mt-0.5 truncate">{statusLine}</div>
          </div>
        </div>

        {(staffSide || subject || r.fromManager) && (
          <div className="px-4 pb-3 space-y-2">
            {r.fromManager && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 bg-violet-100 text-violet-700"><Building2 size={11} /> From management</span>
                {subject && <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-700"><UserRound size={12} className="text-slate-400" /> About {subject.name}</span>}
              </div>
            )}
            {staffSide && (
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2">
                <Avatar person={requester} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-900 truncate">{r.fromManager ? `${requester.name || 'Management'} · Management` : (requester.name || 'Someone')}</div>
                  <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                    {unit ? <><Home size={10} /> {unit}</> : null}
                    {unit && <span className="text-slate-300">·</span>}
                    Sent {ago(r.createdAt)}
                  </div>
                </div>
                {requester.phone && (
                  <a href={`tel:${requester.phone}`} aria-label="Call" className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0" style={{ textDecoration: 'none' }}>
                    <Phone size={14} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/60">
        {items.length === 0 && (
          <p className="text-center text-[12px] text-slate-400 py-8">No messages yet. {staffSide ? 'Let them know you are on it.' : 'Add any details below.'}</p>
        )}
        {items.map((it) => {
          if (it.type === 'event') {
            return (
              <div key={it.key} className="flex justify-center">
                <span className="text-[11px] text-slate-500 bg-white border border-slate-200/70 rounded-full px-2.5 py-0.5">{it.text} · {clock(it.at)}</span>
              </div>
            );
          }
          const m = it.m;
          const mine = idOf(m.userId) === String(myId);
          return (
            <div key={it.key} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              {!mine && (
                <span className="text-[11px] font-semibold text-slate-500 mb-0.5 px-1">
                  {m.name || 'Someone'}{m.role ? <span className="font-normal text-slate-400"> · {m.role}</span> : null}
                </span>
              )}
              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug whitespace-pre-wrap break-words ${mine ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white border border-slate-200/70 text-slate-800 rounded-bl-md'}`}>
                {m.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 px-1">{clock(m.at)}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Actions + reply */}
      <div className="flex-shrink-0 border-t border-slate-100 bg-white px-3 pt-2.5" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        {!closed && (staffSide || (mineReq && r.status === 'open')) && (
          <div className="flex gap-2 mb-2.5">
            {staffSide && r.status === 'open' && (
              <button disabled={!!busy} onClick={() => act('accepted')} className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-[13px] font-bold disabled:opacity-60">{busy === 'accepted' ? '…' : 'Accept'}</button>
            )}
            {staffSide && (
              <button disabled={!!busy} onClick={() => act('done')} className="flex-1 h-10 rounded-xl bg-emerald-500 text-white text-[13px] font-bold disabled:opacity-60">{busy === 'done' ? '…' : 'Done'}</button>
            )}
            {mineReq && r.status === 'open' && (
              <button onClick={() => onCancel(r)} className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-600 text-[13px] font-semibold inline-flex items-center justify-center gap-1"><X size={13} /> Cancel request</button>
            )}
          </div>
        )}
        {r.status === 'cancelled' ? (
          <p className="text-center text-[12px] text-slate-400 pb-1">This request was cancelled.</p>
        ) : (
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={1000}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && isDesktop) { e.preventDefault(); send(); } }}
              placeholder="Write a message…"
              className="flex-1 resize-none max-h-32 min-h-[44px] rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:bg-white"
            />
            <button onClick={send} disabled={!text.trim() || sending} aria-label="Send"
              className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-40">
              {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Portal>
      <div className={`fixed inset-0 ${Z.drawer} flex`} onClick={onClose}>
        {isDesktop && <div className="overlay-backdrop" aria-hidden="true" />}
        {panel}
      </div>
    </Portal>
  );
}
