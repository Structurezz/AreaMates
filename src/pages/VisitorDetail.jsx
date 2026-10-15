import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { visitorAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import {
  ArrowLeft, UserCheck, Share2, CheckCircle, MessageCircle, LogIn, Copy, XCircle, Calendar, Clock, Timer,
  Phone, Mail, StickyNote, ChevronRight, Zap, Users, Package, Wrench, Heart, MoreHorizontal,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACCENT      = '#6366F1';
const ACCENT_DARK = '#4F46E5';
const BRAND_URL   = 'areaconnect.pro';

const WhatsAppIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Truncate a string to maxLen with a trailing ellipsis
const truncate = (s, maxLen) => {
  if (!s) return '';
  const str = String(s);
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
};

const drawShieldLogo = (ctx, x, y, size, text, opts = {}) => {
  const { outerStroke = 'rgba(255,255,255,0.5)', innerFill = 'rgba(255,255,255,0.18)', textColor = '#FFFFFF', bgGrad = null } = opts;
  const s = size / 40;
  ctx.save();
  ctx.translate(x, y);
  if (bgGrad) {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, bgGrad[0]); g.addColorStop(1, bgGrad[1]);
    ctx.fillStyle = g;
    const r = size * 0.22;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.arcTo(size, 0, size, r, r);
    ctx.arcTo(size, size, size - r, size, r);
    ctx.arcTo(0, size, 0, size - r, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = outerStroke;
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(20 * s, 4 * s);
  ctx.lineTo(6 * s, 12 * s);
  ctx.lineTo(6 * s, 28 * s);
  ctx.lineTo(20 * s, 36 * s);
  ctx.lineTo(34 * s, 28 * s);
  ctx.lineTo(34 * s, 12 * s);
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = innerFill;
  ctx.beginPath();
  ctx.moveTo(20 * s, 9 * s);
  ctx.lineTo(9 * s, 15.5 * s);
  ctx.lineTo(9 * s, 28.5 * s);
  ctx.lineTo(20 * s, 35 * s);
  ctx.lineTo(31 * s, 28.5 * s);
  ctx.lineTo(31 * s, 15.5 * s);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = textColor;
  ctx.font = `bold ${13 * s}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 20 * s, 22 * s);
  ctx.restore();
};

const generatePassCanvas = async (v, estate) => {
  const W = 580, H = 820;
  const estateName    = truncate(estate?.name || 'Your Estate', 36);
  const estateAddress = truncate(estate?.address || '', 60);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // ── Hero (0-230) ──
  const grad = ctx.createLinearGradient(0, 0, W, 230);
  grad.addColorStop(0, ACCENT); grad.addColorStop(1, ACCENT_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 230);

  // Decorative blobs
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.arc(W - 40, 30, 110, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath(); ctx.arc(40, 220, 80, 0, Math.PI * 2); ctx.fill();

  // Top-right AreaMates app logo
  drawShieldLogo(ctx, W - 100, 32, 64, 'AM');

  // Estate name (small cap)
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText(estateName.toUpperCase(), 36, 46);
  // Divider pill
  ctx.fillStyle = 'rgba(255,255,255,0.70)'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText('·', 36 + ctx.measureText(estateName.toUpperCase()).width + 6, 46);
  ctx.fillText('GUEST PASS', 36 + ctx.measureText(estateName.toUpperCase()).width + 18, 46);

  // Visitor name (big)
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 28px sans-serif';
  ctx.fillText(truncate(v.visitorName, 24), 36, 100);

  // Purpose
  ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.font = '15px sans-serif';
  ctx.fillText(truncate(v.purpose, 36), 36, 132);

  // Date
  ctx.fillStyle = 'rgba(255,255,255,0.70)'; ctx.font = '13px sans-serif';
  ctx.fillText(format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a'), 36, 162);

  // Estate address inside hero (secondary)
  if (estateAddress) {
    ctx.fillStyle = 'rgba(255,255,255,0.60)'; ctx.font = '11px sans-serif';
    ctx.fillText(estateAddress, 36, 195);
  }

  // ── Ticket perforation (y=250) ──
  // Side notches
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath(); ctx.arc(0, 250, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W, 250, 10, 0, Math.PI * 2); ctx.fill();
  ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(15,23,42,0.14)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(16, 250); ctx.lineTo(W - 16, 250); ctx.stroke();
  ctx.setLineDash([]);

  // ── Access code ──
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText('ACCESS CODE', W / 2, 288);
  ctx.fillStyle = ACCENT; ctx.font = 'bold 42px monospace';
  ctx.fillText(v.visitorCode, W / 2, 340);

  // ── QR ──
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, v.visitorCode, {
    width: 200, margin: 2,
    color: { dark: '#0B1C3D', light: '#FFFFFF' },
  });
  ctx.drawImage(qrCanvas, (W - 200) / 2, 365);

  // Scan hint
  ctx.fillStyle = '#94A3B8'; ctx.font = '11px sans-serif';
  ctx.fillText('Scan at the security gate', W / 2, 590);

  // ── Meta row ──
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 10px sans-serif';
  ctx.fillText('DURATION', 40, 625);
  ctx.fillStyle = '#0F172A'; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${v.expectedDuration || 720} min`, 40, 646);

  if (v.visitorPhone) {
    ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 10px sans-serif';
    ctx.fillText('PHONE', W / 2, 625);
    ctx.fillStyle = '#0F172A'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText(v.visitorPhone, W / 2, 646);
  }

  // Secondary address line (in white area, in case it was clipped above)
  if (estateAddress) {
    ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 10px sans-serif';
    ctx.fillText('LOCATION', 40, 685);
    ctx.fillStyle = '#334155'; ctx.font = '12px sans-serif';
    ctx.fillText(estateAddress, 40, 705);
  }

  // ── Brand footer (y=740-820) ──
  const fgrad = ctx.createLinearGradient(0, 740, W, 820);
  fgrad.addColorStop(0, '#0F172A');
  fgrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = fgrad;
  ctx.fillRect(0, 740, W, 80);

  // AreaConnect brand mark (always green, regardless of app accent)
  drawShieldLogo(ctx, 32, 758, 44, 'AC', { bgGrad: ['#10B981', '#059669'] });

  // POWERED BY
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.50)'; ctx.font = 'bold 9px sans-serif';
  ctx.fillText('POWERED BY', 88, 772);

  // AreaConnect — split for brand coloring
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#FFFFFF'; ctx.fillText('Area ', 88, 795);
  const areaW = ctx.measureText('Area ').width;
  ctx.fillStyle = '#34D399'; ctx.fillText('Connector Technologies', 88 + areaW, 795);

  // Website + tagline (right-aligned)
  ctx.textAlign = 'right';
  ctx.fillStyle = ACCENT; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(BRAND_URL, W - 40, 775);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '10px sans-serif';
  ctx.fillText('RC 9607864', W - 40, 795);

  ctx.textAlign = 'left';
  return canvas;
};

const shareVisitorPass = async (v, estate) => {
  const date = format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a');
  const estateLine = estate?.name ? `\n*Estate:* ${estate.name}` : '';
  const waText = `🏠 *Visitor Pass — ${v.visitorName}*${estateLine}\n\n*Code:* ${v.visitorCode}\n*Purpose:* ${v.purpose}\n*Expected:* ${date}\n\n_Powered by Area Connector Technologies · RC 9607864_\n${BRAND_URL}`;

  let file = null;
  try {
    const canvas = await generatePassCanvas(v, estate);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (blob) file = new File([blob], `visitor-pass-${v.visitorCode}.png`, { type: 'image/png' });
  } catch { /* image generation failed — we'll still share text */ }

  // Preferred path: native share sheet with the file attached (WhatsApp, iMessage, etc).
  // Works on mobile Chrome/Safari and modern desktop browsers.
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: waText,
        title: `Visitor Pass — ${v.visitorName}`,
      });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return; // user cancelled, no fallback needed
    }
  }

  // Legacy fallback: open WhatsApp Web with pre-filled text + download the image
  window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
  if (file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
    toast('Pass image downloaded — attach it in the WhatsApp chat.', { icon: '📎', duration: 5000 });
  }
};

function QRCanvas({ value, size = 180 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: size, margin: 2,
      color: { dark: '#0B1C3D', light: '#FFFFFF' },
    });
  }, [value, size]);
  return <canvas ref={canvasRef} className="rounded-xl mx-auto" style={{ border: '1px solid #E2E8F0' }} />;
}

function PassTimer({ visitor }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now      = new Date();
  const start    = new Date(visitor.expectedDate);
  const duration = visitor.expectedDuration || 720;
  const expiry   = new Date(start.getTime() + duration * 60 * 1000);

  const fmt = (ms) => {
    if (ms <= 0) return null;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
    return `${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  };

  if (['checked-out', 'blacklisted', 'expired', 'cancelled'].includes(visitor.status)) return null;

  // Arrived & checked in — replace the countdown with a success card
  if (visitor.status === 'checked-in') {
    const entryTime = visitor.entryTime ? new Date(visitor.entryTime) : null;
    return (
      <div className="rounded-xl p-4"
        style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.14)' }}>
            <LogIn size={20} style={{ color: '#059669' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#059669' }}>
              Arrived
            </div>
            <div className="text-sm font-bold mt-0.5" style={{ color: '#0F172A' }}>
              Checked in{entryTime ? ` at ${entryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </div>
          </div>
          <span className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: '#10B981' }} />
        </div>
      </div>
    );
  }

  if (now < start) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.14)' }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#94A3B8' }}>Arrives in</div>
        <div className="text-2xl font-bold tabular-nums" style={{ color: ACCENT, letterSpacing: '-0.02em' }}>{fmt(start - now)}</div>
        <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>
          Expected at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  }

  const left = fmt(expiry - now);
  if (!left) return (
    <div className="rounded-xl p-4 text-center" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
      <div className="text-sm font-semibold" style={{ color: '#DC2626' }}>Pass Expired</div>
    </div>
  );

  const pct      = Math.max(0, Math.min(100, ((expiry - now) / (duration * 60 * 1000)) * 100));
  const isUrgent = pct < 20;
  return (
    <div className="rounded-xl p-4" style={{ background: isUrgent ? '#FEF2F2' : 'rgba(99,102,241,0.06)', border: `1px solid ${isUrgent ? '#FECACA' : 'rgba(99,102,241,0.14)'}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Pass expires in</div>
        <div className="text-xs font-medium" style={{ color: isUrgent ? '#DC2626' : '#64748B' }}>{Math.round(pct)}% remaining</div>
      </div>
      <div className="text-2xl font-bold tabular-nums mb-3" style={{ color: isUrgent ? '#DC2626' : ACCENT, letterSpacing: '-0.02em' }}>{left}</div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isUrgent ? '#EF4444' : ACCENT }} />
      </div>
    </div>
  );
}

export default function VisitorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribe } = useSocket() || {};
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    visitorAPI.getOne(id)
      .then(({ data }) => setVisitor(data.data))
      .catch(() => { toast.error('Visitor not found'); navigate('/visitors'); })
      .finally(() => setLoading(false));
  }, [id]);

  // Live refresh when the guard checks the visitor in/out — timer flips to
  // the "arrived" card without a reload.
  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('visitor_update', (incoming) => {
      if (!incoming?._id || incoming._id?.toString() !== id?.toString()) return;
      setVisitor((prev) => (prev ? { ...prev, ...incoming } : incoming));
      if (incoming.status === 'checked-in') {
        toast.success(`${incoming.visitorName || 'Visitor'} has arrived — checked in`, { icon: '🎉', duration: 5000 });
      } else if (incoming.status === 'checked-out') {
        toast(`${incoming.visitorName || 'Visitor'} has left the estate.`, { icon: '👋' });
      }
    });
    return unsub;
  }, [subscribe, id]);

  const copyCode = () => {
    navigator.clipboard?.writeText(visitor.visitorCode);
    toast.success('Access code copied!');
  };

  if (loading) return <div className="flex justify-center p-16"><Spinner /></div>;
  if (!visitor) return null;

  const statusColor = {
    active:        { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
    'checked-in':  { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    'checked-out': { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
    expired:       { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
    blacklisted:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
    cancelled:     { bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' },
  }[visitor.status] || { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };

  const isDone     = visitor.status === 'checked-out';
  const isIn       = visitor.status === 'checked-in';
  const isBlocked  = ['blacklisted', 'expired', 'cancelled'].includes(visitor.status);
  const canCancel  = visitor.status === 'active';
  const cancelPass = async () => {
    if (!window.confirm(`Cancel ${visitor.visitorName}'s pass? The code will stop working at the gate.`)) return;
    try { const { data } = await visitorAPI.cancel(visitor._id); setVisitor((v) => ({ ...v, ...data.data })); toast.success('Pass cancelled'); }
    catch (e) { toast.error(e.response?.data?.message || 'Couldn\'t cancel the pass'); }
  };
  const canShare   = !isDone && !isBlocked;
  const expectedAt = new Date(visitor.expectedDate);

  const PURPOSE = {
    family: ['#EC4899', Users], friend: ['#6366F1', UserCheck], delivery: ['#F59E0B', Package],
    contractor: ['#F97316', Wrench], medical: ['#EF4444', Heart],
  }[String(visitor.purpose || '').toLowerCase()] || ['#64748B', MoreHorizontal];
  const [pColor, PIcon] = PURPOSE;
  const STATUS_LABEL = { active: 'Expected', 'checked-in': 'Inside now', 'checked-out': 'Left', expired: 'Expired', blacklisted: 'Blocked', cancelled: 'Cancelled' };
  const initials = (visitor.visitorName || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const validUntil = new Date(expectedAt.getTime() + (visitor.expectedDuration || 60) * 60000);
  const steps = [
    { label: 'Pass created', at: visitor.createdAt, done: true, color: '#6366F1' },
    visitor.status === 'cancelled'
      ? { label: 'Cancelled', at: visitor.cancelledAt, done: true, color: '#64748B' }
      : { label: 'Arrived at the gate', at: visitor.entryTime, done: !!visitor.entryTime, color: '#10B981' },
    ...(visitor.status === 'cancelled' ? [] : [{ label: 'Left the estate', at: visitor.exitTime, done: !!visitor.exitTime, color: '#3B82F6' }]),
  ];
  const rows = [
    { Icon: Calendar, color: '#6366F1', label: 'Date', value: format(expectedAt, 'EEEE, d MMMM yyyy') },
    { Icon: Clock, color: '#F59E0B', label: visitor.instant ? 'Valid from' : 'Expected at', value: format(expectedAt, 'h:mm a') },
    { Icon: Timer, color: '#10B981', label: 'Valid until', value: format(validUntil, 'h:mm a') + (format(validUntil, 'yyyy-MM-dd') !== format(expectedAt, 'yyyy-MM-dd') ? ` · ${format(validUntil, 'd MMM')}` : '') },
    ...(visitor.visitorPhone ? [{ Icon: Phone, color: '#0EA5E9', label: 'Phone', value: visitor.visitorPhone, href: `tel:${visitor.visitorPhone}` }] : []),
    ...(visitor.visitorEmail ? [{ Icon: Mail, color: '#8B5CF6', label: 'Email', value: visitor.visitorEmail, href: `mailto:${visitor.visitorEmail}` }] : []),
    ...(visitor.notes ? [{ Icon: StickyNote, color: '#A855F7', label: 'Note for security', value: visitor.notes }] : []),
  ];

  return (
    <div className="animate-fade-in -mx-4 -mt-4 md:mx-auto md:mt-0 max-w-xl pb-44">
      {/* Header */}
      <div className="relative px-4 pt-3 pb-20 text-white overflow-hidden md:rounded-b-3xl" style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#6366F1 55%,#7C3AED 100%)' }}>
        <div className="absolute -top-16 -right-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative flex items-center justify-between">
          <button onClick={() => navigate('/visitors')} aria-label="Back" className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center hover:bg-white/10"><ArrowLeft size={20} /></button>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/15">
            <span className={`w-1.5 h-1.5 rounded-full ${isIn ? 'bg-emerald-300 animate-pulse' : isBlocked ? 'bg-red-300' : isDone ? 'bg-slate-300' : 'bg-amber-300'}`} />
            {STATUS_LABEL[visitor.status] || visitor.status}
          </span>
        </div>
        <div className="relative flex items-center gap-3.5 mt-3">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-xl font-extrabold">{initials}</div>
            <span className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center ring-[3px] ring-indigo-500" style={{ background: pColor }}>
              <PIcon size={14} className="text-white" />
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold tracking-tight truncate">{visitor.visitorName}</h1>
            <p className="text-[13px] text-white/80 truncate">{visitor.purpose} · {format(expectedAt, 'EEE d MMM, h:mm a')}</p>
            {visitor.instant && <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-300 text-amber-950"><Zap size={10} /> Instant pass</span>}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-14 relative space-y-4">
        {/* Gate pass */}
        <div className={`rounded-3xl bg-white shadow-xl shadow-indigo-900/10 border border-slate-100 overflow-hidden ${isBlocked || isDone ? 'grayscale' : ''}`}>
          <div className="px-5 pt-4 pb-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{canShare ? 'Show this at the gate' : 'Gate pass'}</p>
            <button onClick={copyCode} className="mt-1.5 inline-flex items-center gap-2 group" title="Tap to copy">
              <span className={`visitor-code text-[38px] font-extrabold tracking-[0.18em] ${visitor.status === 'cancelled' ? 'line-through' : ''}`} style={{ color: ACCENT }}>{visitor.visitorCode}</span>
              <Copy size={16} className="text-indigo-300 group-hover:text-indigo-500" />
            </button>
          </div>
          <div className="relative border-t-2 border-dashed border-slate-200 mx-4">
            <span className="absolute -left-7 -top-3 w-6 h-6 rounded-full bg-[#F8FAFC]" />
            <span className="absolute -right-7 -top-3 w-6 h-6 rounded-full bg-[#F8FAFC]" />
          </div>
          <div className="p-5 pt-4 flex flex-col items-center">
            {canShare ? <QRCanvas value={visitor.visitorCode} size={176} /> : (
              <div className="w-44 h-44 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center px-4">
                <XCircle size={30} className={visitor.status === 'cancelled' ? 'text-slate-400' : 'text-red-400'} />
                <p className="text-xs text-slate-500 mt-2">{visitor.status === 'cancelled' ? 'This pass was cancelled' : isDone ? 'Pass already used' : `Pass ${visitor.status}`}</p>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-2">{canShare ? 'Guards scan the QR or type the code' : 'The gate will refuse this code'}</p>
          </div>
        </div>

        <PassTimer visitor={visitor} />

        {/* Timeline */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Activity</h2>
          <ol className="space-y-0">
            {steps.map((st, k) => (
              <li key={st.label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-3.5 h-3.5 rounded-full border-2 mt-0.5" style={st.done ? { background: st.color, borderColor: st.color } : { borderColor: '#CBD5E1', background: '#fff' }} />
                  {k < steps.length - 1 && <span className="w-0.5 flex-1 my-1 rounded" style={{ background: steps[k + 1].done ? steps[k + 1].color : '#E2E8F0', minHeight: 18 }} />}
                </div>
                <div className="pb-3">
                  <p className={`text-sm font-semibold ${st.done ? 'text-slate-900' : 'text-slate-400'}`}>{st.label}</p>
                  <p className="text-xs text-slate-400">{st.at ? format(new Date(st.at), 'EEE d MMM · h:mm a') : 'Not yet'}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Details */}
        <div className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100">
          {rows.map(({ Icon, color, label, value, href }) => {
            const inner = (
              <>
                <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}1A` }}><Icon size={17} style={{ color }} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
                  <span className="block text-[15px] font-semibold text-slate-900 break-words">{value}</span>
                </span>
              </>
            );
            return href
              ? <a key={label} href={href} className="flex items-center gap-3 p-3.5 active:bg-slate-50">{inner}<ChevronRight size={16} className="text-slate-300" /></a>
              : <div key={label} className="flex items-center gap-3 p-3.5">{inner}</div>;
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="fixed inset-x-0 z-30 px-4 pt-3 md:static md:mt-4 md:px-4"
        style={{ bottom: 'calc(4.25rem + env(safe-area-inset-bottom))', background: 'linear-gradient(to top, rgba(248,250,252,1) 75%, rgba(248,250,252,0))' }}>
        <div className="max-w-xl mx-auto space-y-2">
          {canShare && (
            <button onClick={() => shareVisitorPass(visitor, user?.estateId)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl font-bold text-white py-3.5 active:scale-[0.99] transition-transform"
              style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', boxShadow: '0 10px 24px -8px rgba(18,140,126,0.45)' }}>
              <WhatsAppIcon /> Share pass on WhatsApp
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {canCancel ? (
              <button onClick={cancelPass} className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm bg-red-50 text-red-600">
                <XCircle size={15} /> Cancel pass
              </button>
            ) : (
              <button onClick={copyCode} className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm bg-white border border-slate-200 text-slate-700">
                <Copy size={15} style={{ color: ACCENT }} /> Copy code
              </button>
            )}
            {visitor.visitorPhone ? (
              <a href={`tel:${visitor.visitorPhone}`} className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm bg-white border border-slate-200 text-slate-700">
                <Phone size={15} style={{ color: '#0EA5E9' }} /> Call visitor
              </a>
            ) : (
              <button onClick={() => navigate('/visitors')} className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm text-white" style={{ background: ACCENT }}>
                <CheckCircle size={15} /> Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
