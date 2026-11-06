import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  X, Calendar, Clock, Timer, Phone, Mail, StickyNote, QrCode, Copy, Check, XCircle,
  MapPin, Navigation, Zap, Image as ImageIcon, ShieldCheck, Hourglass, DoorOpen,
} from 'lucide-react';
import { visitorAPI } from '../../../api';
import { useSite } from '../../../context/SiteContext';
import { useSocket } from '../../../context/SocketContext';
import { directionsFor } from '../../../utils/googleMaps';
import { passKindLabel } from '../../../utils/passText';
import { CategoryBadge, DetailsList } from '../PassCategory';
import { VISITOR_STATUS, purposeIcon } from '../MobileVisitors';
import Portal, { Z } from '../../ui/Portal';

// Desktop visitor pass drawer — same visual language as the estate manager's
// visitor detail drawer (tinted header, countdown ring, ticket, fact tiles,
// timeline), with the resident's actions: share, cancel, allow early entry.

const ACCENT = '#6366F1';
const ACCENT_DARK = '#4F46E5';
const RISE = (ms) => ({ animation: `dashRise 0.45s cubic-bezier(0.16,1,0.3,1) ${ms}ms both` });

const STATUS_TONE = {
  active:        { color: '#6366F1', tint: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 55%, #FFFFFF 100%)' },
  'checked-in':  { color: '#10B981', tint: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 55%, #FFFFFF 100%)' },
  'checked-out': { color: '#64748B', tint: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 55%, #FFFFFF 100%)' },
  expired:       { color: '#D97706', tint: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 55%, #FFFFFF 100%)' },
  blacklisted:   { color: '#DC2626', tint: 'linear-gradient(135deg, #FEF2F2 0%, #FFE4E6 55%, #FFFFFF 100%)' },
  cancelled:     { color: '#94A3B8', tint: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 55%, #FFFFFF 100%)' },
  pending:       { color: '#8B5CF6', tint: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 55%, #FFFFFF 100%)' },
};

const fmtLeft = (ms) => {
  if (ms <= 0) return null;
  const t = Math.floor(ms / 1000);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s` : `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
};

function QRCanvas({ value, size = 112 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!value || !ref.current) return;
    QRCode.toCanvas(ref.current, value, { width: size, margin: 1, color: { dark: '#0B1C3D', light: '#FFFFFF' } });
  }, [value, size]);
  return <canvas ref={ref} className="rounded-lg" />;
}

/** Live pass state: countdown ring until arrival / expiry, "inside now", or held for approval. */
function PassStatus({ visitor: v, heldText }) {
  const site = useSite();
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (['checked-out', 'blacklisted', 'expired', 'cancelled'].includes(v.status)) return null;

  if (v.status === 'pending' && v.awaitingApproval) {
    const color = STATUS_TONE.pending.color;
    return (
      <div className="rounded-2xl p-4 flex items-center gap-4 border"
           style={{ background: `linear-gradient(135deg, ${color}10, ${color}03)`, borderColor: `${color}33` }}>
        <span className="relative w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center" style={{ background: `${color}14` }}>
          <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: color }} />
          <Hourglass size={20} style={{ color }} />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>Awaiting approval</div>
          <div className="text-[15px] font-semibold text-slate-900 leading-snug">{heldText}</div>
          <div className="text-xs text-slate-500 mt-0.5">Your visitor gets the code once it is approved.</div>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const start = new Date(v.expectedDate).getTime();
  const duration = (v.expectedDuration || 720) * 60 * 1000;
  const expiry = start + duration;
  const entry = v.entryTime || v.checkInTime;

  let label, value, sub, pct, color;
  if (v.status === 'checked-in') {
    const inside = entry ? fmtLeft(now - new Date(entry).getTime()) : null;
    label = `Inside the ${site.w.siteLc}`; value = inside || 'Checked in';
    sub = entry ? `Arrived at ${format(new Date(entry), 'h:mm a')}` : 'Arrival time not recorded';
    pct = 100; color = '#10B981';
  } else if (now < start) {
    label = 'Arrives in'; value = fmtLeft(start - now);
    sub = `Expected ${format(new Date(start), 'EEE d MMM · h:mm a')}${v.earlyEntryApproved ? ' · early entry allowed' : ''}`;
    pct = Math.max(4, 100 - ((start - now) / (24 * 3600 * 1000)) * 100); color = '#0EA5E9';
  } else {
    const left = fmtLeft(expiry - now);
    if (!left) {
      label = 'Pass window'; value = 'Expired'; sub = `Ended ${format(new Date(expiry), 'h:mm a')}`; pct = 0; color = '#DC2626';
    } else {
      pct = Math.max(0, Math.min(100, ((expiry - now) / duration) * 100));
      color = pct < 20 ? '#DC2626' : ACCENT;
      label = 'Pass expires in'; value = left; sub = `Valid until ${format(new Date(expiry), 'h:mm a')} · ${Math.round(pct)}% left`;
    }
  }

  const R = 24, C = 2 * Math.PI * R;
  return (
    <div className="rounded-2xl p-4 flex items-center gap-4 border"
         style={{ background: `linear-gradient(135deg, ${color}10, ${color}03)`, borderColor: `${color}33` }}>
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
          <circle cx="28" cy="28" r={R} fill="none" stroke={`${color}22`} strokeWidth="5" />
          <circle cx="28" cy="28" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center">
          {v.status === 'checked-in'
            ? <span className="relative flex w-3 h-3"><span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: color }} /><span className="relative w-3 h-3 rounded-full" style={{ background: color }} /></span>
            : <Clock size={17} style={{ color }} />}
        </span>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</div>
        <div className="text-[22px] font-semibold tabular-nums text-slate-900 leading-tight" style={{ letterSpacing: '-0.02em' }}>{value}</div>
        <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

/** "Where they're going": the host's hall / building, with a directions link. */
function PlaceCard({ place, delay = 140 }) {
  if (!place?.name) return null;
  const url = directionsFor(place);
  const color = ACCENT;
  return (
    <div className="rounded-2xl border p-3.5 flex items-center gap-3"
      style={{ borderColor: `${color}33`, background: `linear-gradient(135deg, ${color}12, #FFFFFF 70%)`, ...RISE(delay) }}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${color}, ${ACCENT_DARK})`, boxShadow: `0 6px 14px -6px ${color}` }}>
        <MapPin size={17} className="text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Where they're going</div>
        <div className="text-[13.5px] font-semibold text-slate-900 truncate">{place.name}</div>
        {place.address && <div className="text-[11.5px] text-slate-500 truncate">{place.address}</div>}
      </div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-xl text-white flex-shrink-0 transition-transform hover:-translate-y-0.5"
          style={{ background: `linear-gradient(135deg, ${color}, ${ACCENT_DARK})`, textDecoration: 'none' }}>
          <Navigation size={12} /> Directions
        </a>
      )}
    </div>
  );
}

export default function VisitorPassDrawer({ visitor, onClose, onCancelPass, onShare, onSaveImage, ShareIcon }) {
  const site = useSite();
  const { subscribe } = useSocket() || {};
  // Full pass + the host's hall / building (only GET /visitors/:id returns the place)
  const [full, setFull] = useState(null);
  const [place, setPlace] = useState(null);
  const [copied, setCopied] = useState(false);
  const [earlyAsk, setEarlyAsk] = useState(null);
  const [approving, setApproving] = useState(false);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    setFull(null); setPlace(null); setEarlyAsk(null);
    if (!visitor?._id) return;
    let alive = true;
    visitorAPI.getOne(visitor._id).then(({ data }) => {
      if (!alive) return;
      if (data.data) setFull(data.data);
      setPlace(data.place || data.data?.place || null);
    }).catch(() => {});
    return () => { alive = false; };
  }, [visitor?._id]);

  // Live: gate check-in / check-out, and the guard asking to let them in early
  useEffect(() => {
    if (!subscribe || !visitor?._id) return;
    const id = String(visitor._id);
    const offUpdate = subscribe('visitor_update', (incoming) => {
      if (String(incoming?._id) !== id) return;
      setFull((prev) => ({ ...(prev || visitor), ...incoming }));
    });
    const offEarly = subscribe('visitor_early_arrival', (p) => {
      if (String(p?.visitorId) === id) setEarlyAsk(p);
    });
    return () => { offUpdate?.(); offEarly?.(); };
  }, [subscribe, visitor?._id]);

  useEffect(() => {
    if (!visitor) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visitor, onClose]);

  if (!visitor) return null;

  const v = { ...visitor, ...(full || {}), place };
  const initials = (v.visitorName || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const st = VISITOR_STATUS[v.status] || VISITOR_STATUS['checked-out'];
  const tone = STATUS_TONE[v.status] || STATUS_TONE['checked-out'];
  const [PIcon, pColor, pBg] = purposeIcon(v.purpose);
  const entry = v.entryTime || v.checkInTime;
  const exit = v.exitTime || v.checkOutTime;
  const dt = (d) => format(new Date(d), 'EEE d MMM · h:mm a');
  const expectedAt = new Date(v.expectedDate);
  const validUntil = new Date(expectedAt.getTime() + (v.expectedDuration || 720) * 60000);

  const isHeld = v.status === 'pending' && v.awaitingApproval;
  const isCareTeam = isHeld && v.approvalBy === 'care_team';
  const heldText = isCareTeam
    ? `Sent to the ${(site.assignLabel || 'care team').toLowerCase()}`
    : site.isEstate ? 'Waiting for estate management' : `Waiting for ${site.w.siteMgmtLc}`;
  const isDone = v.status === 'checked-out';
  const isBlocked = ['blacklisted', 'expired', 'cancelled'].includes(v.status);
  const canShare = !isDone && !isBlocked && !isHeld;
  const canCancel = (v.status === 'active' || isHeld) && !!onCancelPass;
  const isCategory = v.category && v.category !== 'guest';
  const beforeStart = Date.now() < expectedAt.getTime();
  const canAllowEarly = v.status === 'active' && beforeStart && !v.earlyEntryApproved;

  const copyCode = () => {
    navigator.clipboard?.writeText(v.visitorCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('Access code copied!');
  };

  const allowEarly = async () => {
    if (approving) return;
    setApproving(true);
    try {
      const { data } = await visitorAPI.approveEarly(v._id);
      setFull((prev) => ({ ...(prev || visitor), ...(data.data || {}), earlyEntryApproved: true, earlyEntryApprovedAt: data.data?.earlyEntryApprovedAt || new Date().toISOString() }));
      setEarlyAsk(null);
      toast.success(`${v.visitorName} can come in now.`, { duration: 5000 });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Couldn\'t allow early entry');
    } finally { setApproving(false); }
  };

  const run = async (key, fn) => {
    if (busy) return;
    setBusy(key);
    try { await fn(); } finally { setBusy(''); }
  };

  const journey = [
    { label: 'Pass created', time: v.createdAt, done: !!v.createdAt, color: '#6366F1' },
  ];
  if (isHeld || v.approvedAt) {
    journey.push(v.approvedAt
      ? { label: 'Approved', time: v.approvedAt, done: true, color: '#8B5CF6' }
      : { label: isCareTeam ? 'Care team approval' : 'Approval', done: false, color: '#8B5CF6', note: heldText });
  }
  if (v.earlyEntryApproved) journey.push({ label: 'Early entry allowed', time: v.earlyEntryApprovedAt, done: true, color: '#F59E0B' });
  journey.push(
    { label: 'Expected', time: v.expectedDate, done: true, color: '#0EA5E9', note: v.expectedDuration ? `${v.expectedDuration >= 60 ? `${Math.round(v.expectedDuration / 60 * 10) / 10}h` : `${v.expectedDuration} min`} window` : '' },
    { label: 'Checked in', time: entry, done: !!entry, color: '#10B981' },
    { label: 'Checked out', time: exit, done: !!exit, color: '#64748B' },
  );
  if (v.status === 'blacklisted') journey.push({ label: 'Blocked', done: true, color: '#DC2626' });
  if (v.status === 'cancelled') journey.push({ label: 'Cancelled', time: v.cancelledAt, done: true, color: '#94A3B8' });
  if (v.status === 'expired') journey.push({ label: 'Expired', time: validUntil, done: true, color: '#D97706' });

  const sameDay = format(validUntil, 'yyyy-MM-dd') === format(expectedAt, 'yyyy-MM-dd');
  const facts = [
    { icon: Calendar, label: 'Date', value: format(expectedAt, 'EEE, d MMM yyyy'), color: '#6366F1' },
    { icon: Clock, label: v.instant ? 'Valid from' : 'Expected at', value: format(expectedAt, 'h:mm a'), color: '#F59E0B' },
    { icon: Timer, label: 'Valid until', value: format(validUntil, 'h:mm a') + (sameDay ? '' : ` · ${format(validUntil, 'd MMM')}`), color: '#10B981' },
    { icon: PIcon, label: 'Purpose', value: v.purpose, color: pColor },
    { icon: Phone, label: 'Phone', value: v.visitorPhone, href: v.visitorPhone && `tel:${v.visitorPhone}`, color: '#0EA5E9' },
    { icon: Mail, label: 'Email', value: v.visitorEmail, href: v.visitorEmail && `mailto:${v.visitorEmail}`, color: '#8B5CF6' },
  ].filter((f) => f.value);

  const ticketMuted = isBlocked || isDone;
  const ticketBg = ticketMuted
    ? 'linear-gradient(160deg, #94A3B8, #64748B)'
    : isHeld ? 'linear-gradient(160deg, #A78BFA, #7C3AED)' : `linear-gradient(160deg, ${ACCENT}, ${ACCENT_DARK})`;

  return (
    <Portal>
    <div className={`fixed inset-0 ${Z.drawer} flex justify-end`} onClick={onClose}>
      <div className="overlay-backdrop" aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-label={`Visitor pass for ${v.visitorName}`}
             className="animate-slide-in-right relative h-full w-full sm:w-[440px] bg-white flex flex-col"
             style={{ boxShadow: '-8px 0 40px rgba(15,23,42,0.18)' }}
             onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="relative overflow-hidden px-5 pt-4 pb-5 flex-shrink-0 border-b border-slate-100" style={{ background: tone.tint }}>
          <div className="pointer-events-none absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-30"
               style={{ background: `radial-gradient(circle, ${tone.color}, transparent 70%)`, animation: 'dashFloat 14s ease-in-out infinite' }} />
          <div className="relative flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {isCategory ? passKindLabel(v).toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : 'Visitor pass'}
            </span>
            <button onClick={onClose} aria-label="Close"
                    className="w-8 h-8 -mr-1 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors">
              <X size={17} />
            </button>
          </div>
          <div className="relative flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white"
                   style={{ background: `linear-gradient(135deg, ${tone.color}, ${tone.color}BB)`, boxShadow: `0 10px 22px -10px ${tone.color}` }}>
                {initials}
              </div>
              <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white"
                    style={{ background: pBg, color: pColor }} title={v.purpose}>
                <PIcon size={12} />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-semibold text-slate-900 truncate">{v.visitorName}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.text }}>
                  <span className={`w-1.5 h-1.5 rounded-full ${v.status === 'checked-in' ? 'animate-pulse' : ''}`} style={{ background: st.dot }} /> {st.label}
                </span>
                <CategoryBadge visitor={v} />
                {v.instant && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800">
                    <Zap size={10} /> Instant
                  </span>
                )}
                {v.expectedDate && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar size={11} /> {format(expectedAt, 'd MMM, h:mm a')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* The guard has this visitor at the gate early */}
          {earlyAsk && canAllowEarly && (
            <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50 flex items-center gap-3" style={RISE(0)}>
              <span className="relative w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <span className="absolute inset-0 rounded-xl animate-ping opacity-30 bg-amber-300" />
                <DoorOpen size={18} className="text-amber-700" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">At the gate early</div>
                <div className="text-[13px] font-semibold text-amber-950">Security is asking to let {v.visitorName.split(' ')[0]} in now</div>
              </div>
              <button onClick={allowEarly} disabled={approving}
                      className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-xl text-white flex-shrink-0 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 14px -8px #D97706' }}>
                <ShieldCheck size={13} /> {approving ? 'Allowing…' : 'Allow entry'}
              </button>
            </div>
          )}

          <PassStatus visitor={v} heldText={heldText} />

          {/* Access pass */}
          {v.visitorCode && (
            <div className={`rounded-2xl border border-slate-200 overflow-hidden flex ${ticketMuted ? 'grayscale-[0.4]' : ''}`} style={RISE(60)}>
              <div className="flex-1 p-4 flex flex-col justify-between min-w-0" style={{ background: ticketBg }}>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 flex items-center gap-1.5">
                  <QrCode size={11} /> {canShare ? 'Access code' : isHeld ? 'Held for approval' : 'Gate pass'}
                </div>
                <button onClick={copyCode} className="text-left group mt-2" title="Copy code">
                  <div className={`visitor-code text-[26px] font-bold tracking-[0.12em] text-white leading-none ${v.status === 'cancelled' ? 'line-through decoration-white/60' : ''}`}>{v.visitorCode}</div>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 group-hover:text-white">
                    {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy code</>}
                  </div>
                </button>
                <div className="text-[11px] text-white/75 mt-3">
                  {canShare ? 'Scan or read out at the security gate'
                    : isHeld ? 'Your visitor gets the code once it is approved'
                    : v.status === 'cancelled' ? 'This pass was cancelled'
                    : isDone ? 'Pass already used' : 'The gate will refuse this code'}
                </div>
              </div>
              <div className="relative p-3 bg-white flex items-center" style={{ borderLeft: '2px dashed #E0E7FF' }}>
                <span className="absolute -left-[9px] -top-2 w-4 h-4 rounded-full bg-white border border-slate-200" />
                <span className="absolute -left-[9px] -bottom-2 w-4 h-4 rounded-full bg-white border border-slate-200" />
                {canShare ? <QRCanvas value={v.visitorCode} size={112} /> : (
                  <div className="w-[112px] h-[112px] rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center px-2">
                    {isHeld ? <Hourglass size={24} className="text-violet-400" /> : <XCircle size={24} className={v.status === 'cancelled' || isDone ? 'text-slate-400' : 'text-red-400'} />}
                    <span className="text-[10.5px] text-slate-500 mt-1.5 leading-tight">{isHeld ? 'QR unlocks on approval' : 'No longer valid'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <PlaceCard place={place} delay={100} />

          {/* Pass type details (contractor company, pickup student, patient…) */}
          {isCategory && (
            <div className="rounded-2xl border border-slate-200 p-4 space-y-3" style={RISE(120)}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pass details</div>
                <CategoryBadge visitor={v} size="md" />
              </div>
              <DetailsList visitor={v} />
              {(v.category === 'contractor' || v.category === 'supplier') && site.inductionText && (
                <p className="text-[12px] rounded-xl px-3 py-2" style={{ background: '#FFF7ED', color: '#9A3412' }}>
                  {v.inductionAcceptedAt
                    ? `Safety induction accepted ${format(new Date(v.inductionAcceptedAt), 'd MMM, h:mm a')}`
                    : "They'll accept the site safety induction at the gate."}
                </p>
              )}
            </div>
          )}

          {/* Facts */}
          {facts.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5">
              {facts.map(({ icon: I, label, value, href, color }, i) => {
                const inner = (
                  <>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: `${color}14`, color }}>
                      <I size={13} />
                    </span>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                    <div className="text-[13px] font-semibold text-slate-900 truncate mt-0.5">{value}</div>
                  </>
                );
                const cls = 'block rounded-xl border border-slate-200 p-3 min-w-0 transition-all hover:-translate-y-0.5 hover:shadow-md';
                const style = RISE(140 + i * 40);
                return href
                  ? <a key={label} href={href} className={cls} style={style}>{inner}</a>
                  : <div key={label} className={cls} style={style}>{inner}</div>;
              })}
            </div>
          )}

          {/* Notes */}
          {v.notes && (
            <div className="rounded-xl p-3.5 bg-amber-50 border border-amber-200 flex gap-2.5">
              <StickyNote size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Note for security</div>
                <p className="text-[13px] text-amber-950 mt-0.5 leading-relaxed whitespace-pre-wrap">{v.notes}</p>
              </div>
            </div>
          )}

          {/* Journey */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Visit timeline</div>
            <ol className="relative">
              {journey.map((s, i) => {
                const last = i === journey.length - 1;
                return (
                  <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
                    {!last && <span className="absolute left-[9px] top-5 bottom-0 w-px" style={{ background: s.done && journey[i + 1].done ? `${s.color}55` : '#E2E8F0' }} />}
                    <span className="relative w-[19px] h-[19px] rounded-full flex items-center justify-center flex-shrink-0 mt-px"
                          style={s.done ? { background: s.color, boxShadow: `0 0 0 4px ${s.color}1F` } : { background: '#fff', border: '2px dashed #CBD5E1' }}>
                      {s.done && <Check size={11} className="text-white" strokeWidth={3} />}
                    </span>
                    <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
                      <span className={`text-[13px] font-semibold ${s.done ? 'text-slate-900' : 'text-slate-400'}`}>
                        {s.label}{s.note && <span className="ml-1.5 text-[11px] font-normal text-slate-400">{s.note}</span>}
                      </span>
                      <span className="text-[11px] text-slate-500 tabular-nums flex-shrink-0">{s.time ? dt(s.time) : s.done ? '' : 'Pending'}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pt-3 pb-4 flex-shrink-0 border-t border-slate-100 space-y-2 bg-white">
          {canAllowEarly && !earlyAsk && (
            <button onClick={allowEarly} disabled={approving}
                    className="w-full flex items-center justify-center gap-2 rounded-[9px] px-3 py-2 text-sm font-semibold border border-amber-200 text-amber-800 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-60">
              <ShieldCheck size={14} /> {approving ? 'Allowing…' : 'Allow early entry'}
            </button>
          )}
          {canShare && (
            <button onClick={() => run('share', () => onShare(v))} disabled={!!busy}
                    className="w-full flex items-center justify-center gap-2 rounded-[9px] px-3 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-70"
                    style={{ background: '#25D366', boxShadow: '0 6px 14px -8px #25D366' }}>
              {ShareIcon ? <ShareIcon /> : null} {busy === 'share' ? 'Preparing pass…' : 'Share pass on WhatsApp'}
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={copyCode}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-sm font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors">
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} style={{ color: ACCENT }} />} Copy code
            </button>
            {canShare && onSaveImage && (
              <button onClick={() => run('image', () => onSaveImage(v))} disabled={!!busy}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-sm font-semibold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-60">
                <ImageIcon size={14} style={{ color: ACCENT }} /> {busy === 'image' ? 'Saving…' : 'Pass image'}
              </button>
            )}
            {canCancel && (
              <button onClick={() => onCancelPass(v)} title="Cancel this pass"
                      className="flex items-center justify-center gap-1.5 rounded-[9px] px-3 py-2 text-sm font-semibold border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                <XCircle size={14} /> Cancel
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
    </Portal>
  );
}
