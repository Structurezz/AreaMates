import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { visitorAPI } from '../api';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import Pagination from '../components/ui/Pagination';
import {
  UserCheck, Plus, QrCode, Calendar, Clock, X,
  Users, Package, Wrench, Heart, MoreHorizontal,
  Phone, Mail, FileText, ChevronDown, ChevronUp,
  Share2, CheckCircle,
} from 'lucide-react';
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

function PassTimer({ visitor }) {
  const [tick, setTick] = useState(0);
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
    const left = fmt(start - now);
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.14)' }}>
        <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#94A3B8' }}>Arrives in</div>
        <div className="text-2xl font-bold tabular-nums" style={{ color: ACCENT, letterSpacing: '-0.02em' }}>{left}</div>
        <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>
          Expected at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  }

  const left = fmt(expiry - now);
  if (!left) {
    return (
      <div className="rounded-xl p-4 text-center" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
        <div className="text-sm font-semibold" style={{ color: '#DC2626' }}>Pass Expired</div>
      </div>
    );
  }

  const pct      = Math.max(0, Math.min(100, ((expiry - now) / (duration * 60 * 1000)) * 100));
  const isUrgent = pct < 20;
  return (
    <div className="rounded-xl p-4" style={{ background: isUrgent ? '#FEF2F2' : 'rgba(99,102,241,0.06)', border: `1px solid ${isUrgent ? '#FECACA' : 'rgba(99,102,241,0.14)'}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Pass expires in</div>
        <div className="text-xs font-medium" style={{ color: isUrgent ? '#DC2626' : '#64748B' }}>{Math.round(pct)}% remaining</div>
      </div>
      <div className="text-2xl font-bold tabular-nums mb-3" style={{ color: isUrgent ? '#DC2626' : ACCENT, letterSpacing: '-0.02em' }}>
        {left}
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isUrgent ? '#EF4444' : ACCENT }} />
      </div>
    </div>
  );
}

function QRCanvas({ value, size = 160 }) {
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

const PURPOSES = [
  { label: 'Family',     Icon: Users          },
  { label: 'Friend',     Icon: UserCheck      },
  { label: 'Delivery',   Icon: Package        },
  { label: 'Contractor', Icon: Wrench         },
  { label: 'Medical',    Icon: Heart          },
  { label: 'Other',      Icon: MoreHorizontal },
];

const DURATIONS = [
  { label: '30m',     value: 30  },
  { label: '1h',      value: 60  },
  { label: '2h',      value: 120 },
  { label: '4h',      value: 240 },
  { label: 'All day', value: 480 },
];

/* ─────────────────────────────────────────────────────── */
/*  Create Guest Pass Form                                 */
/* ─────────────────────────────────────────────────────── */
function NewVisitorForm({ onClose, onSuccess }) {
  const tomorrow = () => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const [form, setForm] = useState({
    visitorName: '', visitorPhone: '', visitorEmail: '',
    purpose: '', expectedDate: tomorrow(), expectedTime: '10:00',
    expectedDuration: 60, notes: '',
  });
  const [customPurpose, setCustomPurpose] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectPurpose = (label) => {
    if (label === 'Other') { setCustomPurpose(true); set('purpose', ''); }
    else { setCustomPurpose(false); set('purpose', label); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const expectedDate = form.expectedDate && form.expectedTime
        ? new Date(`${form.expectedDate}T${form.expectedTime}`).toISOString()
        : form.expectedDate;
      const { data } = await visitorAPI.preRegister({ ...form, expectedDate });
      toast.success('Visitor pass created!');
      onSuccess(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create pass');
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>Visitor Details</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>
              Full Name <span style={{ color: ACCENT }}>*</span>
            </label>
            <input className="input-field" placeholder="e.g. John Adeyemi"
              value={form.visitorName} onChange={(e) => set('visitorName', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
                <Phone size={12} /> Phone
              </label>
              <input className="input-field" placeholder="+234..."
                value={form.visitorPhone} onChange={(e) => set('visitorPhone', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
                <Mail size={12} /> Email
              </label>
              <input type="email" className="input-field" placeholder="optional"
                value={form.visitorEmail} onChange={(e) => set('visitorEmail', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
          Purpose of Visit <span style={{ color: ACCENT }}>*</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PURPOSES.map(({ label, Icon }) => {
            const isSelected = customPurpose ? label === 'Other' : form.purpose === label;
            return (
              <button key={label} type="button" onClick={() => selectPurpose(label)}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all"
                style={isSelected ? { background: 'rgba(99,102,241,0.08)', borderColor: ACCENT, color: ACCENT_DARK }
                  : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#64748B' }}
                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.30)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}}
                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#F8FAFC'; }}}>
                <Icon size={16} />{label}
              </button>
            );
          })}
        </div>
        {customPurpose && (
          <input className="input-field mt-2" placeholder="Describe the visit purpose..."
            value={form.purpose} onChange={(e) => set('purpose', e.target.value)} required autoFocus />
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
          Visit Schedule <span style={{ color: ACCENT }}>*</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
              <Calendar size={12} /> Date
            </label>
            <input type="date" className="input-field" min={new Date().toISOString().split('T')[0]}
              value={form.expectedDate} onChange={(e) => set('expectedDate', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
              <Clock size={12} /> Time
            </label>
            <input type="time" className="input-field"
              value={form.expectedTime} onChange={(e) => set('expectedTime', e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-sm font-medium mb-2 block" style={{ color: '#475569' }}>Duration</label>
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map(({ label, value }) => {
              const isSelected = form.expectedDuration === value;
              return (
                <button key={value} type="button" onClick={() => set('expectedDuration', value)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                  style={isSelected ? { background: ACCENT, borderColor: ACCENT, color: 'white' }
                    : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#475569' }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div>
        <button type="button" onClick={() => setShowNotes(v => !v)}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: showNotes ? ACCENT : '#94A3B8' }}>
          <FileText size={14} />
          {showNotes ? 'Hide notes' : 'Add notes (optional)'}
          {showNotes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        {showNotes && (
          <textarea className="input-field resize-none mt-2" rows={2}
            placeholder="Any special instructions for security..."
            value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl p-3"
        style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.14)' }}>
        <QrCode size={14} style={{ color: ACCENT, flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs" style={{ color: '#64748B' }}>
          A unique access code and QR code will be generated and sent to your visitor automatically.
        </p>
      </div>

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
        <button type="submit"
          disabled={saving || !form.visitorName || (!form.purpose && !customPurpose)}
          className="btn-primary flex-1 gap-2">
          <QrCode size={15} />
          {saving ? 'Generating pass...' : 'Create Pass'}
        </button>
      </div>
    </form>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Sidebar helper                                         */
/* ─────────────────────────────────────────────────────── */
function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full sm:w-[480px] animate-slide-in-right bg-white"
      style={{ boxShadow: '-16px 0 48px rgba(15,23,42,0.12)', borderLeft: '1px solid #E2E8F0' }}>
      <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
        style={{ borderBottom: '1px solid #E2E8F0' }}>
        <h2 className="text-lg font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>{title}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg transition-all" style={{ color: '#94A3B8' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Visitor Pass Sidebar                                   */
/* ─────────────────────────────────────────────────────── */
function VisitorPassDrawer({ visitor, onClose }) {
  useEffect(() => {
    if (visitor) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [visitor]);

  if (!visitor) return null;

  const copyCode = () => {
    navigator.clipboard?.writeText(visitor.visitorCode);
    toast.success('Access code copied!');
  };

  const statusColor = {
    active:        { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
    'checked-in':  { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    'checked-out': { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' },
    expired:       { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
    blacklisted:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  }[visitor.status] || { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full sm:w-[480px] animate-slide-in-right bg-white"
      style={{ boxShadow: '-16px 0 48px rgba(15,23,42,0.12)', borderLeft: '1px solid #E2E8F0' }}>

      {/* Header */}
      <div className="px-6 py-5 flex-shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Visitor Pass</span>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-all" style={{ color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)` }}>
            {visitor.visitorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-lg truncate" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
              {visitor.visitorName}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>
                {visitor.status}
              </span>
              <span className="text-sm" style={{ color: '#64748B' }}>{visitor.purpose}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        <PassTimer visitor={visitor} />

        {/* Ticket */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.18)' }}>
          <div className="p-5 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.70)' }}>
                Guest Pass
              </div>
              <div className="text-xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>{visitor.visitorName}</div>
              <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>{visitor.purpose}</div>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.30)' }}>
              <UserCheck size={20} className="text-white" />
            </div>
          </div>

          <div className="relative" style={{ borderTop: '2px dashed rgba(99,102,241,0.20)' }}>
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }} />
          </div>

          <div className="p-5 text-center" style={{ background: '#FFFFFF' }}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>
              Access Code
            </div>
            <button onClick={copyCode} className="group inline-block mb-4" title="Click to copy">
              <div className="visitor-code text-4xl font-bold tracking-[0.15em] mb-1" style={{ color: ACCENT }}>
                {visitor.visitorCode}
              </div>
              <div className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#94A3B8' }}>
                Click to copy
              </div>
            </button>
            <QRCanvas value={visitor.visitorCode} size={160} />
            <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>Scan at the security gate</p>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Date',     value: format(new Date(visitor.expectedDate), 'MMM d, yyyy') },
            { label: 'Time',     value: format(new Date(visitor.expectedDate), 'h:mm a')      },
            { label: 'Duration', value: `${visitor.expectedDuration || 60} min`               },
            ...(visitor.visitorPhone ? [{ label: 'Phone', value: visitor.visitorPhone }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="text-xs font-medium mb-0.5" style={{ color: '#94A3B8' }}>{label}</div>
              <div className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={copyCode} className="btn-outline gap-2">
            <Share2 size={14} /> Copy Code
          </button>
          <button
            onClick={() => shareVisitorPass(visitor)}
            className="flex items-center justify-center gap-2 rounded-[9px] px-3 py-2 text-sm font-semibold transition-all"
            style={{ background: '#25D366', color: 'white', border: 'none', cursor: 'pointer' }}>
            <WhatsAppIcon /> Share Pass
          </button>
          <button onClick={onClose} className="btn-primary col-span-2 gap-2">
            <CheckCircle size={14} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  Page                                                   */
/* ─────────────────────────────────────────────────────── */
const PAGE_SIZE = 15;

export default function ResidentVisitors() {
  const navigate = useNavigate();
  const [visitors,        setVisitors]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [page,            setPage]            = useState(1);
  const [pagination,      setPagination]      = useState({ total: 0, pages: 1 });
  const [showNew,         setShowNew]         = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const openVisitor = (v) => {
    if (window.innerWidth < 640) navigate(`/visitors/${v._id}`);
    else setSelectedVisitor(v);
  };

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await visitorAPI.getAll({ page: p, limit: PAGE_SIZE });
      setVisitors(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handlePage = (p) => { setPage(p); load(p); };

  useEffect(() => { load(1); }, []);

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>My Visitor Passes</h1>
          <p className="text-sm" style={{ color: '#64748B' }}>Pre-register guests and manage their access</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary gap-2">
          <Plus size={15} /> Invite Visitor
        </button>
      </div>

      {/* List */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12"><Spinner /></div>
        ) : visitors.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <UserCheck size={40} style={{ color: '#CBD5E1' }} />
            <p className="font-medium" style={{ color: '#94A3B8' }}>No visitors registered</p>
            <button onClick={() => setShowNew(true)} className="btn-primary gap-2 mt-1">
              <Plus size={14} /> Invite Visitor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  {['Visitor', 'Purpose', 'Expected', 'Code', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-medium uppercase tracking-wider px-4 py-3"
                      style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visitors.map((v) => (
                  <tr key={v._id}
                    onClick={() => openVisitor(v)}
                    style={{ borderTop: '1px solid rgba(0,0,0,0.04)', transition: 'background 0.15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_DARK} 100%)` }}>
                          {v.visitorName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-sm" style={{ color: '#0F172A' }}>{v.visitorName}</div>
                          <div className="text-xs" style={{ color: '#94A3B8' }}>{v.visitorPhone || v.visitorEmail || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: '#475569' }}>{v.purpose}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: '#475569' }}>
                      {format(new Date(v.expectedDate), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-bold tracking-widest" style={{ color: ACCENT }}>
                        {v.visitorCode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination page={page} pages={pagination.pages} total={pagination.total} limit={PAGE_SIZE} onPage={handlePage} />

      {/* Create sidebar */}
      <Drawer open={showNew} onClose={() => setShowNew(false)} title="Invite a Visitor">
        <NewVisitorForm
          onClose={() => setShowNew(false)}
          onSuccess={(v) => { setShowNew(false); setSelectedVisitor(v); setPage(1); load(1); }}
        />
      </Drawer>

      {/* Pass detail sidebar */}
      <VisitorPassDrawer visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />
    </div>
  );
}
