import { useRef, useState } from 'react';
import { formatDistanceToNowStrict, format } from 'date-fns';
import {
  ShieldAlert, ShieldCheck, Megaphone, MapPin, Phone, AlertTriangle, Check, ChevronDown, Bell, Radio, Loader2,
} from 'lucide-react';
import useCountUp from '../../hooks/useCountUp';
import Pagination from '../ui/Pagination';

// Phone layout for the residents' alerts page: status card, raise-an-alert
// composer, then the resident's alerts + estate broadcasts as cards.

const TYPE_COLOR = { security: '#DC2626', fire: '#F97316', medical: '#2563EB', noise: '#F59E0B', other: '#64748B' };
const SEVERITY = {
  critical: { color: '#DC2626', label: 'Critical' },
  high:     { color: '#F97316', label: 'High' },
  medium:   { color: '#EAB308', label: 'Medium' },
  low:      { color: '#3B82F6', label: 'Low' },
};
const STEPS = ['open', 'acknowledged', 'resolved'];

const ago = (d) => { try { return formatDistanceToNowStrict(new Date(d), { addSuffix: true }); } catch { return ''; } };

function Count({ value, label, color, delay }) {
  const n = useCountUp(value || 0);
  return (
    <div className="dash-rise rounded-2xl bg-white/[0.07] border border-white/10 px-3 py-2.5" style={{ animationDelay: `${delay}ms` }}>
      <div className="text-[20px] font-semibold tabular-nums leading-none" style={{ color }}>{n}</div>
      <div className="text-[11px] text-white/55 mt-1">{label}</div>
    </div>
  );
}

function StatusCard({ open, acknowledged, resolved, onRaise }) {
  const alarm = open > 0;
  return (
    <section className="dash-rise relative overflow-hidden rounded-[26px] p-5 text-white"
      style={{
        background: alarm
          ? 'linear-gradient(150deg, #2A0606 0%, #7F1D1D 50%, #DC2626 120%)'
          : 'linear-gradient(150deg, #022C22 0%, #064E3B 50%, #047857 115%)',
        boxShadow: alarm ? '0 24px 44px -24px rgba(127,29,29,0.95)' : '0 24px 44px -24px rgba(2,44,34,0.95)',
      }}>
      <div className="dash-blob absolute -top-20 -right-16 w-56 h-56 rounded-full blur-3xl pointer-events-none"
        style={{ background: alarm ? 'rgba(248,113,113,0.4)' : 'rgba(52,211,153,0.35)' }} />
      <div className="absolute -right-10 -top-10 w-48 h-48 pointer-events-none opacity-60">
        {[1, 0.7, 0.4].map((s) => (
          <span key={s} className="absolute rounded-full border border-white/15" style={{ inset: `${(1 - s) * 50}%` }} />
        ))}
        <span className="dash-radar absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(from 0deg, ${alarm ? 'rgba(254,202,202,0.45)' : 'rgba(167,243,208,0.4)'}, transparent 28%)` }} />
        {alarm && <span className="absolute left-[34%] top-[58%] w-2.5 h-2.5 rounded-full bg-red-200"><span className="dash-ripple absolute inset-0 rounded-full bg-red-200" /></span>}
      </div>

      <div className="relative">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 border border-white/15">
          <span className="relative flex w-1.5 h-1.5">
            <span className={`absolute inset-0 rounded-full animate-ping ${alarm ? 'bg-red-300' : 'bg-emerald-300'}`} />
            <span className={`relative w-1.5 h-1.5 rounded-full ${alarm ? 'bg-red-300' : 'bg-emerald-300'}`} />
          </span>
          {alarm ? 'Help requested' : 'Security on duty'}
        </span>
        <div className="mt-3 flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/12 border border-white/15 flex-shrink-0">
            {alarm ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
          </span>
          <div className="min-w-0">
            <div className="text-[18px] font-semibold leading-tight" style={{ letterSpacing: '-0.02em' }}>
              {alarm ? `${open} alert${open !== 1 ? 's' : ''} waiting for a response` : 'All secure'}
            </div>
            <div className="text-[12px] text-white/65">{alarm ? 'Security and management have been notified' : 'Raise an alert any time you need help'}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Count value={open} label="Open" color={alarm ? '#FECACA' : '#fff'} delay={120} />
          <Count value={acknowledged} label="Acknowledged" color="#FDE68A" delay={170} />
          <Count value={resolved} label="Resolved" color="#A7F3D0" delay={220} />
        </div>

        <button onClick={onRaise}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-white font-semibold text-[14px] active:scale-[0.99] transition-transform"
          style={{ color: alarm ? '#B91C1C' : '#047857', boxShadow: '0 10px 22px -12px rgba(0,0,0,0.5)' }}>
          <Bell size={16} /> Raise an alert
        </button>
        <a href="/safety" className="mt-2.5 block text-center text-[11px] font-medium text-white/70 underline-offset-2 underline">
          Being followed or harassed by a resident? Personal safety →
        </a>
      </div>
    </section>
  );
}

function Progress({ status, color }) {
  const at = Math.max(0, STEPS.indexOf(status));
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 flex-1 last:flex-none">
            <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: i <= at ? (i === 2 ? '#10B981' : color) : '#E2E8F0' }}>
              {i < at || at === 2 ? <Check size={10} className="text-white" strokeWidth={3} /> : i === at ? <span className="w-1.5 h-1.5 rounded-full bg-white" /> : null}
            </span>
            {i < 2 && <span className="h-0.5 flex-1 rounded-full" style={{ background: i < at ? color : '#E2E8F0' }} />}
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] font-medium">
        {['Raised', 'Acknowledged', 'Resolved'].map((l, i) => (
          <span key={l} style={{ color: i <= at ? '#475569' : '#CBD5E1' }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

function AlertCard({ a, i, alertTypes, targetLabel }) {
  const broadcast = a.isEmergencyBroadcast;
  const live = !broadcast && a.status === 'open';
  const [open, setOpen] = useState(live);
  const t = alertTypes.find((x) => x.type === a.type) || alertTypes[alertTypes.length - 1];
  const tColor = broadcast ? '#D97706' : (TYPE_COLOR[a.type] || '#64748B');
  const TIcon = broadcast ? Megaphone : t.icon;
  const sev = SEVERITY[a.severity] || (broadcast ? SEVERITY.high : null);
  const accent = a.status === 'open' ? '#EF4444' : a.status === 'acknowledged' ? '#F59E0B' : '#10B981';
  const title = broadcast ? (a.title || 'Estate broadcast') : (a.title || t.label);

  return (
    <article className="dash-rise relative overflow-hidden rounded-[22px] bg-white border"
      style={{ animationDelay: `${140 + i * 60}ms`, borderColor: live ? '#FECACA' : broadcast ? '#FDE68A' : '#E2E8F0', boxShadow: live ? '0 14px 30px -20px rgba(239,68,68,0.6)' : '0 1px 2px rgba(15,23,42,0.04)' }}>
      <span className="absolute left-0 top-0 bottom-0 w-1" style={{ background: sev?.color || accent }} />
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left p-4 pl-5">
        <div className="flex items-start gap-3">
          <span className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `${tColor}16` }}>
            {live && <span className="dash-ripple absolute inset-0 rounded-2xl" style={{ background: `${tColor}35` }} />}
            <TIcon size={19} className="relative" style={{ color: tColor }} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: tColor }}>{broadcast ? 'Estate broadcast' : 'Your alert'}</span>
              {sev && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: `${sev.color}18`, color: sev.color }}>{sev.label}</span>}
              <span className="ml-auto text-[11px] text-slate-400 flex-shrink-0">{ago(a.createdAt)}</span>
            </div>
            <div className="mt-1 text-[15px] font-semibold text-slate-900 leading-snug" style={{ letterSpacing: '-0.01em' }}>{title}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-500 min-w-0">
              {broadcast
                ? <span className="truncate flex items-center gap-1"><Radio size={11} className="flex-shrink-0" /> From estate management</span>
                : <span className="truncate">Sent to {targetLabel[a.audience] || a.audience || 'Security + Management'}</span>}
              {a.location && <span className="truncate flex items-center gap-0.5"><MapPin size={11} className="flex-shrink-0" />{a.location}</span>}
            </div>
          </div>
          <ChevronDown size={16} className={`text-slate-300 flex-shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
        {!broadcast && <div className="mt-3.5 pl-14"><Progress status={a.status} color={accent} /></div>}
      </button>

      {open && (
        <div className="px-4 pl-5 pb-4 -mt-1 animate-fade-in">
          {a.note && <p className="text-[13px] text-slate-600 leading-relaxed">{a.note}</p>}
          {a.actionRequired && (
            <div className="mt-2.5 flex items-start gap-2 rounded-xl px-3 py-2 bg-amber-50 border border-amber-100 text-[12px] text-amber-800">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> <span><span className="font-semibold">What to do:</span> {a.actionRequired}</span>
            </div>
          )}
          <div className="mt-2.5 text-[11px] text-slate-400">
            {format(new Date(a.createdAt), 'EEE d MMM · HH:mm')}{a.resolvedBy?.name ? ` · Resolved by ${a.resolvedBy.name}` : ''}
          </div>
          {a.contactNumber && (
            <a href={`tel:${a.contactNumber}`}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-[13px] text-white active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 10px 20px -12px rgba(5,150,105,0.9)' }}>
              <Phone size={15} /> Call {a.contactNumber}
            </a>
          )}
        </div>
      )}
    </article>
  );
}

export default function AlertsMobile({
  alertTypes, targets, targetLabel, targetCfg,
  selectedType, setSelectedType, target, setTarget, note, setNote, sending, onRaise,
  alerts, loading, page, pagination, pageSize, onPage,
}) {
  const composerRef = useRef(null);
  const [filter, setFilter] = useState('all');
  const mine = alerts.filter((a) => !a.isEmergencyBroadcast);
  const count = (s) => mine.filter((a) => a.status === s).length;
  const shown = filter === 'mine' ? mine : filter === 'broadcasts' ? alerts.filter((a) => a.isEmergencyBroadcast) : alerts;
  const FILTERS = [
    ['all', 'All', alerts.length],
    ['mine', 'My alerts', mine.length],
    ['broadcasts', 'Broadcasts', alerts.length - mine.length],
  ];
  const scrollToComposer = () => composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-5 pb-2">
      <header className="dash-rise">
        <div className="text-[12px] font-medium text-slate-400">Security</div>
        <h1 className="text-[22px] font-semibold text-slate-900 leading-tight" style={{ letterSpacing: '-0.03em' }}>Alerts</h1>
      </header>

      <StatusCard open={count('open')} acknowledged={count('acknowledged')} resolved={count('resolved')} onRaise={scrollToComposer} />

      {/* Raise an alert */}
      <section ref={composerRef} className="dash-rise rounded-[22px] bg-white border border-slate-200/70 p-4 scroll-mt-4" style={{ animationDelay: '100ms' }}>
        <h2 className="text-[15px] font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Raise an alert</h2>
        <p className="text-[12px] text-slate-500 mt-0.5">Pick what's happening and who should respond.</p>

        <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">What's happening</div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {alertTypes.map(({ type, icon: Icon, label }) => {
            const on = selectedType === type;
            const c = TYPE_COLOR[type] || '#64748B';
            return (
              <button key={type} type="button" onClick={() => setSelectedType(type)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border text-center transition-all active:scale-95"
                style={on ? { borderColor: c, background: `${c}10`, boxShadow: `0 0 0 3px ${c}1A` } : { borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={on ? { background: `linear-gradient(135deg, ${c}, ${c}CC)` } : { background: `${c}14` }}>
                  <Icon size={17} style={{ color: on ? '#fff' : c }} />
                </span>
                <span className="text-[11px] font-medium leading-tight" style={{ color: on ? c : '#475569' }}>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Send to</div>
        <div className="mt-2 space-y-2">
          {targets.map(({ value, label, sub, Icon }) => {
            const on = target === value;
            return (
              <button key={value} type="button" onClick={() => setTarget(value)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all"
                style={on ? { borderColor: 'rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.07)' } : { borderColor: '#E2E8F0', background: '#fff' }}>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: on ? '#6366F1' : '#F1F5F9' }}>
                  <Icon size={16} style={{ color: on ? '#fff' : '#64748B' }} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold" style={{ color: on ? '#3730A3' : '#0F172A' }}>{label}</span>
                  <span className="block text-[11px] text-slate-400">{sub}</span>
                </span>
                <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={on ? { borderColor: '#6366F1', background: '#6366F1' } : { borderColor: '#CBD5E1' }}>
                  {on && <Check size={11} className="text-white" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Note <span className="normal-case font-normal">(optional)</span></label>
        <textarea className="input-field resize-none mt-2" rows={3} placeholder="Describe the situation briefly..."
          value={note} onChange={(e) => setNote(e.target.value)} />

        <button onClick={onRaise} disabled={sending}
          className="relative mt-4 w-full inline-flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-bold text-[14px] tracking-wide active:scale-[0.99] transition-transform disabled:opacity-70 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #EF4444, #B91C1C)', boxShadow: '0 16px 30px -14px rgba(220,38,38,0.9)' }}>
          {!sending && <span className="dash-ripple absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/25" />}
          {sending ? <Loader2 size={20} className="animate-spin relative" /> : <Bell size={20} className="relative" />}
          <span className="relative">{sending ? 'Sending alert…' : targetCfg.button}</span>
        </button>
        <p className="text-center text-[11px] text-slate-400 mt-2.5 leading-relaxed">
          {targetLabel[target]} will be alerted immediately with your name, unit and phone number.
          {['security', 'fire', 'medical'].includes(selectedType) && ' They also get an email.'} In immediate danger, call 112.
        </p>
      </section>

      {/* History */}
      <div className="sticky -top-4 z-10 -mx-4 px-4 py-2 bg-[#F8FAFC]/90 backdrop-blur">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map(([key, label, n]) => {
            const on = filter === key;
            return (
              <button key={key} onClick={() => setFilter(key)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all flex-shrink-0"
                style={on ? { background: '#0F172A', color: '#fff' } : { background: '#fff', color: '#475569', border: '1px solid #E2E8F0' }}>
                {label}
                <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] leading-[18px] text-center tabular-nums"
                  style={on ? { background: 'rgba(255,255,255,0.18)' } : { background: '#F1F5F9', color: '#64748B' }}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((k) => <div key={k} className="skeleton h-[110px] rounded-[22px]" />)}</div>
      ) : shown.length === 0 ? (
        <div className="dash-rise rounded-[22px] bg-white border border-slate-200/70 px-6 py-10 text-center">
          <span className="relative mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-emerald-50">
            <span className="dash-ripple absolute inset-0 rounded-full bg-emerald-100" />
            <ShieldCheck size={24} className="relative text-emerald-600" />
          </span>
          <div className="mt-4 text-[15px] font-semibold text-slate-900">Nothing here</div>
          <div className="text-[13px] text-slate-500 mt-1">
            {filter === 'broadcasts' ? 'No estate broadcasts yet.' : filter === 'mine' ? "You haven't raised any alerts." : 'No alerts or broadcasts yet.'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((a, i) => <AlertCard key={a._id} a={a} i={i} alertTypes={alertTypes} targetLabel={targetLabel} />)}
        </div>
      )}

      {pagination.pages > 1 && (
        <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={pageSize} onPage={onPage} />
      )}
    </div>
  );
}
