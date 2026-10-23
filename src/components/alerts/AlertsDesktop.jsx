import { useEffect, useRef, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bell, Shield, Flame, Heart, Volume2, AlertTriangle, Megaphone, MapPin, Phone, ShieldAlert, ShieldCheck,
  Eye, CheckCircle2, Clock, ChevronLeft, ChevronRight, Loader2, Radio,
} from 'lucide-react';
import useFillHeight from '../../hooks/useFillHeight';
import { useAuth } from '../../context/AuthContext';
import { estateAPI } from '../../api';
import EstateMap from '../EstateMap';

const TYPE_META = {
  security: { label: 'Security threat',   Icon: Shield,        color: '#EF4444' },
  fire:     { label: 'Fire emergency',    Icon: Flame,         color: '#F97316' },
  medical:  { label: 'Medical emergency', Icon: Heart,         color: '#EC4899' },
  noise:    { label: 'Noise complaint',   Icon: Volume2,       color: '#F59E0B' },
  other:    { label: 'Other',             Icon: AlertTriangle, color: '#64748B' },
};
const STATUS_META = {
  open:         { label: 'Open',         color: '#EF4444', bg: '#FEF2F2' },
  acknowledged: { label: 'Acknowledged', color: '#D97706', bg: '#FFFBEB' },
  resolved:     { label: 'Resolved',     color: '#059669', bg: '#ECFDF5' },
};
const SEVERITY = {
  critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700',
};
const typeOf = (a) => TYPE_META[a.type] || TYPE_META.other;
const ago = (d) => formatDistanceToNow(new Date(d), { addSuffix: true });

// The estate (name + map pin) for the alert map card
function useEstate() {
  const { user, estate: authEstate } = useAuth() || {};
  const estateId = user?.estateId?._id || user?.estateId;
  const [estate, setEstate] = useState(authEstate || null);
  useEffect(() => {
    if (authEstate?.location?.lat || !estateId) return;
    estateAPI.getOne(estateId).then(({ data }) => setEstate(data.data)).catch(() => {});
  }, [estateId, authEstate]);
  return estate;
}

function Timeline({ a }) {
  const steps = [
    { key: 'raised', label: 'Raised', at: a.createdAt, done: true, color: '#EF4444', Icon: Bell },
    { key: 'ack', label: 'Acknowledged', at: a.acknowledgedAt, done: a.status !== 'open', color: '#D97706', Icon: Eye },
    { key: 'resolved', label: 'Resolved', at: a.resolvedAt, done: a.status === 'resolved', color: '#059669', Icon: CheckCircle2, by: a.resolvedBy?.name },
  ];
  return (
    <div className="flex items-start">
      {steps.map((s, i) => (
        <div key={s.key} className={`flex items-start ${i < steps.length - 1 ? 'flex-1' : ''}`}>
          <div className="flex flex-col items-center text-center w-24">
            <span className="w-9 h-9 rounded-full flex items-center justify-center" style={s.done ? { background: s.color, color: '#fff' } : { background: '#F1F5F9', color: '#94A3B8' }}>
              <s.Icon size={15} />
            </span>
            <span className={`mt-1.5 text-[12px] font-semibold ${s.done ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
            <span className="text-[11px] text-slate-400">{s.done && s.at ? format(new Date(s.at), 'MMM d, HH:mm') : s.done ? 'Done' : 'Waiting'}</span>
            {s.by && <span className="text-[11px] text-slate-400">by {s.by}</span>}
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 h-[3px] mt-4 rounded-full overflow-hidden bg-slate-100">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: steps[i + 1].done ? '100%' : '0%', background: steps[i + 1].color }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AlertDetail({ a, estate, targetLabel }) {
  const t = typeOf(a);
  const st = STATUS_META[a.status] || STATUS_META.open;
  const broadcast = a.isEmergencyBroadcast;
  return (
    <div key={a._id} className="animate-fade-in">
      <div className="relative overflow-hidden px-6 py-5 text-white"
        style={{ background: broadcast ? 'linear-gradient(120deg, #451A03, #92400E 60%, #D97706 140%)' : a.status === 'resolved' ? 'linear-gradient(120deg, #0F172A, #1E293B)' : `linear-gradient(120deg, #1F0A0A 0%, #450A0A 45%, ${t.color} 160%)` }}>
        {a.status === 'open' && <div className="dash-blob absolute -top-16 right-10 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: `${t.color}55` }} />}
        <div className="relative flex items-start gap-4">
          <div className="relative w-12 h-12 flex-shrink-0">
            {a.status === 'open' && !broadcast && <span className="dash-ripple absolute inset-0 rounded-2xl border-2" style={{ borderColor: t.color }} />}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: broadcast ? '#F59E0B' : t.color }}>
              {broadcast ? <Megaphone size={22} /> : <t.Icon size={22} />}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold">
              {broadcast
                ? <span className="px-2 py-0.5 rounded-full bg-white/15 inline-flex items-center gap-1"><Radio size={11} /> Estate broadcast</span>
                : <span className="px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>{st.label}</span>}
              <span className="px-2 py-0.5 rounded-full bg-white/10">{t.label}</span>
              {a.severity && broadcast && <span className={`px-2 py-0.5 rounded-full ${SEVERITY[a.severity] || ''}`}>{a.severity.toUpperCase()}</span>}
              {!broadcast && a.audience && <span className="px-2 py-0.5 rounded-full bg-white/10">To {targetLabel[a.audience] || a.audience}</span>}
            </div>
            <h2 className="mt-2 text-[19px] font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>{a.title || (broadcast ? 'Broadcast' : `Your ${t.label.toLowerCase()} alert`)}</h2>
            <p className="text-[13px] text-white/70 mt-0.5">{format(new Date(a.createdAt), 'EEEE d MMMM · HH:mm')} · {ago(a.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {!broadcast && <Timeline a={a} />}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
          <div className="space-y-4 min-w-0">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5"><MapPin size={12} /> Location</div>
              <div className="mt-1 text-[14px] font-medium text-slate-900">
                {a.location || (a.unitId?.unitNumber ? `Unit ${a.unitId.unitNumber}` : 'Not specified')}
              </div>
            </div>
            {a.contactNumber && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5"><Phone size={12} /> Emergency contact</div>
                <a href={`tel:${a.contactNumber}`} className="mt-1 block text-[14px] font-medium text-slate-900 hover:text-indigo-600">{a.contactNumber}</a>
              </div>
            )}
            {a.note && (
              <div>
                <div className="text-[11px] font-medium text-slate-400 mb-1.5">Details</div>
                <p className="text-[14px] text-slate-700 leading-relaxed whitespace-pre-line">{a.note}</p>
              </div>
            )}
            {a.actionRequired && (
              <div className="flex items-start gap-2.5 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-[12px] font-semibold text-amber-800">What to do</div>
                  <div className="text-[14px] text-amber-900">{a.actionRequired}</div>
                </div>
              </div>
            )}
            {!broadcast && a.status === 'open' && (
              <p className="text-[12px] text-slate-500">Security and management have your name, unit and phone number. In immediate danger, call <b>112</b>.</p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="p-1.5">
              <EstateMap name={a.location || estate?.name || 'Estate'} address={estate?.address} location={estate?.location} height={200} variant="plain" />
            </div>
            <div className="px-3 py-2 border-t border-slate-100 text-[11px] text-slate-400 truncate">Pin marks {estate?.name || 'the estate'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsDesktop({
  alertTypes, targets, targetLabel, selectedType, setSelectedType, target, setTarget, note, setNote,
  sending, onRaise, targetCfg, alerts, loading, page, pagination, onPage,
}) {
  const shellRef = useRef(null);
  const height = useFillHeight(shellRef, true, { min: 600 });
  const estate = useEstate();
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (alerts.some((a) => a._id === selectedId)) return;
    setSelectedId((alerts.find((a) => a.status === 'open' && !a.isEmergencyBroadcast) || alerts[0])?._id || null);
  }, [alerts, selectedId]);
  const selected = alerts.find((a) => a._id === selectedId);
  const myOpen = alerts.filter((a) => !a.isEmergencyBroadcast && a.status !== 'resolved').length;
  const broadcastsLive = alerts.filter((a) => a.isEmergencyBroadcast && Date.now() - new Date(a.createdAt) < 86400000).length;

  return (
    <div ref={shellRef} className="max-w-[1500px] mx-auto flex flex-col gap-4" style={{ height: height ?? 'calc(100vh - 4rem)' }}>
      {/* ── Banner ── */}
      <div className="dash-rise flex-none relative overflow-hidden rounded-2xl px-6 py-4"
        style={{ background: myOpen > 0 ? 'linear-gradient(120deg, #1F0A0A 0%, #450A0A 55%, #7F1D1D 100%)' : 'linear-gradient(120deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)',
          boxShadow: myOpen > 0 ? '0 16px 32px -18px rgba(127,29,29,0.8)' : '0 16px 32px -18px rgba(49,46,129,0.8)' }}>
        <div className="dash-blob absolute -top-20 right-56 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: myOpen > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(129,140,248,0.3)' }} />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-12 h-12 flex-shrink-0">
              <span className="dash-ripple absolute inset-0 rounded-xl border-2" style={{ borderColor: myOpen > 0 ? '#F87171' : '#A5B4FC' }} />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 border border-white/15">
                {myOpen > 0 ? <ShieldAlert size={22} className="text-red-300" /> : <ShieldCheck size={22} className="text-indigo-200" />}
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Alerts</h1>
              <p className="text-[13px] text-white/70">
                {myOpen > 0
                  ? <><span className="font-semibold text-red-200">{myOpen} of your alerts {myOpen === 1 ? 'is' : 'are'} active</span>. Help has been notified.</>
                  : 'Raise an alert and security or management respond straight away.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {[['Your active alerts', myOpen, '#FCA5A5'], ['Broadcasts today', broadcastsLive, '#FCD34D'], ['All', pagination.total, '#C7D2FE']].map(([label, n, color]) => (
              <div key={label} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 min-w-[90px]">
                <div className="text-[16px] font-semibold tabular-nums leading-none" style={{ color }}>{n}</div>
                <div className="text-[10px] text-white/55 mt-1">{label}</div>
              </div>
            ))}
            <a href="/safety" className="ml-1 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[12px] font-semibold text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-colors">
              Being followed? Personal safety →
            </a>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[380px_340px_minmax(0,1fr)] gap-4">
        {/* ── Raise an alert ── */}
        <div className="dash-rise h-full min-h-0 overflow-y-auto no-scrollbar rounded-2xl bg-white border border-slate-200/70 p-5 space-y-4" style={{ animationDelay: '60ms' }}>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">Raise an alert</h2>
            <p className="text-[12px] text-slate-500">Choose what's happening and who should respond.</p>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">What's happening</div>
            <div className="grid grid-cols-2 gap-2">
              {alertTypes.map(({ type, icon: Icon, label }) => {
                const on = selectedType === type;
                const c = TYPE_META[type]?.color || '#64748B';
                return (
                  <button key={type} onClick={() => setSelectedType(type)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all hover:-translate-y-0.5"
                    style={on ? { borderColor: c, background: `${c}10`, boxShadow: `0 0 0 3px ${c}1A` } : { borderColor: '#E2E8F0' }}>
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: on ? c : `${c}14` }}>
                      <Icon size={15} style={{ color: on ? '#fff' : c }} />
                    </span>
                    <span className="text-[12px] font-medium text-slate-700 leading-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Send to</div>
            <div className="space-y-1.5">
              {targets.map(({ value, label, sub, Icon }) => {
                const on = target === value;
                return (
                  <button key={value} type="button" onClick={() => setTarget(value)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all"
                    style={on ? { borderColor: 'rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.08)' } : { borderColor: '#E2E8F0' }}>
                    <Icon size={16} style={{ color: on ? '#4F46E5' : '#64748B', flexShrink: 0 }} />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-semibold" style={{ color: on ? '#3730A3' : '#334155' }}>{label}</span>
                      <span className="block text-[11px] text-slate-400">{sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <textarea className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] outline-none resize-none focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all"
            rows={3} placeholder="Add a note (optional): describe the situation briefly…" value={note} onChange={(e) => setNote(e.target.value)} />
          <button onClick={onRaise} disabled={sending}
            className="relative w-full inline-flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white text-[14px] font-bold tracking-wide transition-all hover:-translate-y-0.5 disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg, #EF4444, #B91C1C)', boxShadow: '0 16px 32px -14px rgba(220,38,38,0.85)' }}>
            {!sending && <span className="dash-ripple absolute inset-0 rounded-2xl border-2 border-red-300 pointer-events-none" />}
            {sending ? <Loader2 size={20} className="animate-spin" /> : <Bell size={20} />}
            {sending ? 'Sending alert…' : targetCfg.button}
          </button>
          <p className="text-[11px] text-slate-400 text-center">
            {targetLabel[target]} will be alerted immediately with your name, unit and phone number.
            {['security', 'fire', 'medical'].includes(selectedType) && ' They also get an email.'} In immediate danger, call 112.
          </p>
        </div>

        {/* ── Inbox ── */}
        <div className="dash-rise h-full min-h-0 flex flex-col rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '120ms' }}>
          <div className="flex-none px-4 h-12 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-[14px] font-semibold text-slate-900">Alerts & broadcasts</h3>
            <span className="text-[12px] text-slate-400">{pagination.total}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">{[0, 1, 2, 3].map((k) => <div key={k} className="skeleton h-16 rounded-xl" />)}</div>
            ) : alerts.length === 0 ? (
              <div className="py-16 text-center px-6">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center"><ShieldCheck size={22} className="text-indigo-500" /></div>
                <p className="mt-3 text-[14px] font-semibold text-slate-800">No alerts yet</p>
                <p className="mt-0.5 text-[12px] text-slate-400">Your alerts and estate broadcasts appear here.</p>
              </div>
            ) : alerts.map((a, i) => {
              const t = typeOf(a);
              const st = STATUS_META[a.status] || STATUS_META.open;
              const on = a._id === selectedId;
              const bc = a.isEmergencyBroadcast;
              return (
                <button key={a._id} onClick={() => setSelectedId(a._id)}
                  className={`dash-rise relative w-full flex items-start gap-3 px-4 py-3 text-left border-b border-slate-50 transition-colors ${on ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}
                  style={{ animationDelay: `${140 + i * 30}ms` }}>
                  <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: on ? (bc ? '#F59E0B' : st.color) : 'transparent' }} />
                  <span className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bc ? '#FEF3C7' : `${t.color}14` }}>
                    {bc ? <Megaphone size={15} className="text-amber-600" /> : <t.Icon size={15} style={{ color: t.color }} />}
                    {!bc && a.status === 'open' && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium text-slate-900 truncate">{a.title || (bc ? 'Estate broadcast' : t.label)}</span>
                    {a.note && <span className="block text-[12px] text-slate-500 truncate">{a.note}</span>}
                    <span className="mt-1 flex items-center gap-2 text-[11px]">
                      <span className="font-semibold" style={{ color: bc ? '#D97706' : st.color }}>{bc ? 'Broadcast' : st.label}</span>
                      <span className="text-slate-400 flex items-center gap-1"><Clock size={10} /> {ago(a.createdAt)}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {pagination.pages > 1 && (
            <div className="flex-none flex items-center justify-between px-3 py-2 border-t border-slate-100 text-[12px] text-slate-500">
              <span>Page {page} of {pagination.pages}</span>
              <span className="flex gap-1">
                <button onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page" className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={14} /></button>
                <button onClick={() => onPage(page + 1)} disabled={page >= pagination.pages} aria-label="Next page" className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={14} /></button>
              </span>
            </div>
          )}
        </div>

        {/* ── Detail ── */}
        <div className="dash-rise hidden xl:block h-full min-h-0 overflow-y-auto rounded-2xl bg-white border border-slate-200/70" style={{ animationDelay: '180ms' }}>
          {selected ? <AlertDetail a={selected} estate={estate} targetLabel={targetLabel} /> : (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #818CF8, #4F46E5)' }}><ShieldCheck size={28} /></div>
              <h2 className="mt-4 text-[16px] font-semibold text-slate-900">Nothing selected</h2>
              <p className="mt-1 text-[13px] text-slate-500 max-w-xs">Pick an alert to see its status and details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
