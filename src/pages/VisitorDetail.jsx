import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { visitorAPI } from '../api';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import { ArrowLeft, UserCheck, Share2, CheckCircle, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ACCENT      = '#6366F1';
const ACCENT_DARK = '#4F46E5';

const WhatsAppIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const generatePassCanvas = async (v) => {
  const W = 560, H = 700;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, ACCENT); grad.addColorStop(1, ACCENT_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 185);
  ctx.fillStyle = 'rgba(255,255,255,0.70)'; ctx.font = 'bold 12px sans-serif';
  ctx.fillText('GUEST PASS', 36, 44);
  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText(v.visitorName, 36, 90);
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.font = '15px sans-serif';
  ctx.fillText(v.purpose, 36, 122);
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.font = '13px sans-serif';
  ctx.fillText(format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a'), 36, 154);
  ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(0,0,0,0.10)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(16, 200); ctx.lineTo(W - 16, 200); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#94A3B8'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('ACCESS CODE', W / 2, 238);
  ctx.fillStyle = ACCENT; ctx.font = 'bold 38px monospace';
  ctx.fillText(v.visitorCode, W / 2, 288);
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, v.visitorCode, { width: 200, margin: 2, color: { dark: '#0B1C3D', light: '#FFFFFF' } });
  ctx.drawImage(qrCanvas, (W - 200) / 2, 308);
  ctx.fillStyle = '#94A3B8'; ctx.font = '11px sans-serif';
  ctx.fillText('Scan at the security gate', W / 2, 528);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8'; ctx.font = '11px sans-serif'; ctx.fillText('Duration', 40, 568);
  ctx.fillStyle = '#0F172A'; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${v.expectedDuration || 720} min`, 40, 586);
  if (v.visitorPhone) {
    ctx.fillStyle = '#94A3B8'; ctx.font = '11px sans-serif'; ctx.fillText('Phone', W / 2, 568);
    ctx.fillStyle = '#0F172A'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(v.visitorPhone, W / 2, 586);
  }
  ctx.textAlign = 'center'; ctx.fillStyle = '#CBD5E1'; ctx.font = '11px sans-serif';
  ctx.fillText('Show this pass at the security gate', W / 2, 640);
  return canvas;
};

const shareVisitorPass = (v) => {
  const date = format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a');
  const waText = `🏠 *Visitor Pass — ${v.visitorName}*\n\n*Code:* ${v.visitorCode}\n*Purpose:* ${v.purpose}\n*Expected:* ${date}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
  generatePassCanvas(v)
    .then(canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/png')))
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'visitor-pass.png'; a.click();
      URL.revokeObjectURL(url);
    })
    .catch(() => {});
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

  if (['checked-out', 'blacklisted', 'expired'].includes(visitor.status)) return null;

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
  const [visitor, setVisitor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    visitorAPI.getOne(id)
      .then(({ data }) => setVisitor(data.data))
      .catch(() => { toast.error('Visitor not found'); navigate('/visitors'); })
      .finally(() => setLoading(false));
  }, [id]);

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
  }[visitor.status] || { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };

  return (
    <div className="animate-fade-in">

      {/* Top bar */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/visitors')}
          className="p-2 rounded-xl transition-all"
          style={{ background: '#F1F5F9', color: '#475569' }}
          onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseLeave={e => e.currentTarget.style.background = '#F1F5F9'}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Visitor Pass</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>{visitor.visitorName}</p>
        </div>
      </div>

      <div className="space-y-5 max-w-lg">

        {/* Status + name */}
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)` }}>
            {visitor.visitorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-lg truncate" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>{visitor.visitorName}</div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>
                {visitor.status}
              </span>
              <span className="text-sm" style={{ color: '#64748B' }}>{visitor.purpose}</span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <PassTimer visitor={visitor} />

        {/* Ticket */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.18)' }}>
          <div className="p-5 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.70)' }}>Guest Pass</div>
              <div className="text-xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>{visitor.visitorName}</div>
              <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{visitor.purpose}</div>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.30)' }}>
              <UserCheck size={20} className="text-white" />
            </div>
          </div>
          <div className="relative" style={{ borderTop: '2px dashed rgba(99,102,241,0.20)' }}>
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
          </div>
          <div className="p-5 text-center" style={{ background: '#FFFFFF' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>Access Code</div>
            <button onClick={copyCode} className="group inline-block mb-4" title="Click to copy">
              <div className="visitor-code text-4xl font-bold tracking-[0.15em] mb-1" style={{ color: ACCENT }}>{visitor.visitorCode}</div>
              <div className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#94A3B8' }}>Tap to copy</div>
            </button>
            <QRCanvas value={visitor.visitorCode} size={180} />
            <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>Scan at the security gate</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Date',     value: format(new Date(visitor.expectedDate), 'MMM d, yyyy') },
            { label: 'Time',     value: format(new Date(visitor.expectedDate), 'h:mm a')      },
            { label: 'Duration', value: `${visitor.expectedDuration || 720} min`              },
            ...(visitor.visitorPhone ? [{ label: 'Phone', value: visitor.visitorPhone }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="text-xs font-medium mb-0.5" style={{ color: '#94A3B8' }}>{label}</div>
              <div className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 pb-8">
          <button onClick={copyCode} className="btn-outline gap-2"><Share2 size={14} /> Copy Code</button>
          <button
            onClick={() => shareVisitorPass(visitor)}
            className="flex items-center justify-center gap-2 rounded-[9px] px-3 py-2 text-sm font-semibold"
            style={{ background: '#25D366', color: 'white', border: 'none', cursor: 'pointer' }}>
            <WhatsAppIcon /> Share Pass
          </button>
          <button onClick={() => navigate('/visitors')} className="btn-primary col-span-2 gap-2"><CheckCircle size={14} /> Done</button>
        </div>
      </div>
    </div>
  );
}
