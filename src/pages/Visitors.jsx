import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { visitorAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { passKindLabel, passPurposeLine, passShareLines, passSiteName } from '../utils/passText';
import InviteForm from '../components/visitors/InviteForm';
import VisitorsMobile from '../components/visitors/VisitorsMobile';
import VisitorsDesktop from '../components/visitors/desktop/VisitorsDesktop';
import VisitorPassDrawer from '../components/visitors/desktop/VisitorPassDrawer';
import {
  UserCheck, Plus, QrCode, Calendar, Clock, X,
  Users, Package, Wrench, Heart, MoreHorizontal,
  Phone, Mail, FileText, ChevronDown, ChevronUp,
  Share2, CheckCircle, Copy, XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import PassApprovals from '../components/roles/PassApprovals';

const ACCENT      = '#6366F1';
const ACCENT_DARK = '#4F46E5';
const BRAND_URL   = 'areaconnect.pro';

const WhatsAppIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

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

const generateBrandedPass = async (v, estate) => {
  const W = 580, H = 820;
  const estateName    = truncate(passSiteName(estate), 36);
  const estateAddress = truncate(estate?.address || '', 60);

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Hero
  const grad = ctx.createLinearGradient(0, 0, W, 230);
  grad.addColorStop(0, ACCENT); grad.addColorStop(1, ACCENT_DARK);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 230);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath(); ctx.arc(W - 40, 30, 110, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath(); ctx.arc(40, 220, 80, 0, Math.PI * 2); ctx.fill();

  // Top-right AreaMates app logo
  drawShieldLogo(ctx, W - 100, 32, 64, 'AM');

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 11px sans-serif';
  const estateCap = estateName.toUpperCase();
  ctx.fillText(estateCap, 36, 46);
  const w = ctx.measureText(estateCap).width;
  ctx.fillStyle = 'rgba(255,255,255,0.70)';
  ctx.fillText('·', 36 + w + 6, 46);
  ctx.fillText(passKindLabel(v), 36 + w + 18, 46);

  ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 28px sans-serif';
  ctx.fillText(truncate(v.visitorName, 24), 36, 100);
  ctx.fillStyle = 'rgba(255,255,255,0.82)'; ctx.font = '15px sans-serif';
  ctx.fillText(truncate(passPurposeLine(v), 52), 36, 132);
  ctx.fillStyle = 'rgba(255,255,255,0.70)'; ctx.font = '13px sans-serif';
  ctx.fillText(format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a'), 36, 162);
  if (estateAddress) {
    ctx.fillStyle = 'rgba(255,255,255,0.60)'; ctx.font = '11px sans-serif';
    ctx.fillText(estateAddress, 36, 195);
  }

  // Perforation
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath(); ctx.arc(0, 250, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W, 250, 10, 0, Math.PI * 2); ctx.fill();
  ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(15,23,42,0.14)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(16, 250); ctx.lineTo(W - 16, 250); ctx.stroke();
  ctx.setLineDash([]);

  // Code + QR
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText('ACCESS CODE', W / 2, 288);
  ctx.fillStyle = ACCENT; ctx.font = 'bold 42px monospace';
  ctx.fillText(v.visitorCode, W / 2, 340);

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, v.visitorCode, { width: 200, margin: 2, color: { dark: '#0B1C3D', light: '#FFFFFF' } });
  ctx.drawImage(qrCanvas, (W - 200) / 2, 365);

  ctx.fillStyle = '#94A3B8'; ctx.font = '11px sans-serif';
  ctx.fillText('Scan at the security gate', W / 2, 590);

  // Meta
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('DURATION', 40, 625);
  ctx.fillStyle = '#0F172A'; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${v.expectedDuration || 720} min`, 40, 646);
  if (v.visitorPhone) {
    ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('PHONE', W / 2, 625);
    ctx.fillStyle = '#0F172A'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(v.visitorPhone, W / 2, 646);
  }
  if (v.place?.name) {
    // Where the visitor is going (hall / building) — directions go in the share text
    ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('GOING TO', 40, 685);
    ctx.fillStyle = '#0F172A'; ctx.font = 'bold 13px sans-serif'; ctx.fillText(truncate(v.place.name, 40), 40, 705);
    if (estateAddress) { ctx.fillStyle = '#64748B'; ctx.font = '11px sans-serif'; ctx.fillText(truncate(estateAddress, 70), 40, 722); }
  } else if (estateAddress) {
    ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('LOCATION', 40, 685);
    ctx.fillStyle = '#334155'; ctx.font = '12px sans-serif'; ctx.fillText(estateAddress, 40, 705);
  }

  // Brand footer
  const fgrad = ctx.createLinearGradient(0, 740, W, 820);
  fgrad.addColorStop(0, '#0F172A'); fgrad.addColorStop(1, '#1E293B');
  ctx.fillStyle = fgrad;
  ctx.fillRect(0, 740, W, 80);

  // AreaConnect brand mark (always green, regardless of app accent)
  drawShieldLogo(ctx, 32, 758, 44, 'AC', { bgGrad: ['#10B981', '#059669'] });

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.50)'; ctx.font = 'bold 9px sans-serif';
  ctx.fillText('POWERED BY', 88, 772);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#FFFFFF'; ctx.fillText('Area ', 88, 795);
  const areaW = ctx.measureText('Area ').width;
  ctx.fillStyle = '#34D399'; ctx.fillText('Connector Technologies', 88 + areaW, 795);

  ctx.textAlign = 'right';
  ctx.fillStyle = ACCENT; ctx.font = 'bold 13px sans-serif';
  ctx.fillText(BRAND_URL, W - 40, 775);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.font = '10px sans-serif';
  ctx.fillText('RC 9607864', W - 40, 795);

  ctx.textAlign = 'left';
  return canvas;
};

const shareVisitorPass = async (pass, estate) => {
  // List rows don't carry the host's hall / building — fetch it for the directions link
  let v = pass;
  if (!('place' in pass)) {
    try { const { data } = await visitorAPI.getOne(pass._id); v = { ...pass, place: data.place || data.data?.place || null }; } catch { /* share without it */ }
  }
  const date = format(new Date(v.expectedDate), 'MMM d, yyyy · h:mm a');
  const { siteWord, extra } = passShareLines(v, estate);
  const estateLine = estate?.name ? `\n*${siteWord}:* ${estate.name}` : '';
  const waText = `🏠 *Visitor Pass — ${v.visitorName}*${estateLine}\n\n*Code:* ${v.visitorCode}\n*Purpose:* ${v.purpose}${extra}\n*Expected:* ${date}\n\n_Powered by Area Connector Technologies · RC 9607864_\n${BRAND_URL}`;

  let file = null;
  try {
    const canvas = await generateBrandedPass(v, estate);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (blob) file = new File([blob], `visitor-pass-${v.visitorCode}.png`, { type: 'image/png' });
  } catch { /* image generation failed — we'll still share text */ }

  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        text: waText,
        title: `Visitor Pass — ${v.visitorName}`,
      });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }

  window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank');
  if (file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; a.click();
    URL.revokeObjectURL(url);
    toast('Pass image downloaded — attach it in the WhatsApp chat.', { icon: '📎', duration: 5000 });
  }
};

// Download the branded pass image (same artwork the share sheet attaches)
const savePassImage = async (v, estate) => {
  try {
    const canvas = await generateBrandedPass(v, estate);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('no image');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `visitor-pass-${v.visitorCode}.png`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Pass image saved');
  } catch { toast.error('Couldn\'t create the pass image'); }
};

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
/*  Sidebar helper (desktop only — mobile uses /visitors/new) */
/* ─────────────────────────────────────────────────────── */
function Drawer({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-[480px] animate-slide-in-right bg-white"
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
/*  Page                                                   */
/* ─────────────────────────────────────────────────────── */
const PAGE_SIZE = 15;

export default function ResidentVisitors() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search,          setSearch]          = useState('');
  const [statusFilter,    setStatusFilter]    = useState('');
  const [counts,          setCounts]          = useState(null);
  const searchTimer = useRef(null);
  const [visitors,        setVisitors]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [page,            setPage]            = useState(1);
  const [limit,           setLimit]           = useState(PAGE_SIZE);
  const [pagination,      setPagination]      = useState({ total: 0, pages: 1 });
  const [showNew,         setShowNew]         = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const openVisitor = (v) => {
    if (window.innerWidth < 640) navigate(`/visitors/${v._id}`);
    else setSelectedVisitor(v);
  };

  const load = async (p = 1, q = search, status = statusFilter, lim = limit) => {
    setLoading(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data } = await visitorAPI.getAll({
        page: p, limit: lim,
        search: q || undefined,
        ...(status === 'today' ? { date: today.toISOString() } : { status: status || undefined }),
      });
      setVisitors(data.data);
      setPagination(data.pagination || { total: data.data.length, pages: 1 });
      if (data.counts) setCounts(data.counts);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handlePage = (p) => { setPage(p); load(p); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleLimit = (l) => { setLimit(l); setPage(1); load(1, search, statusFilter, l); };
  const handleSearch = (q) => {
    setSearch(q); setPage(1);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, q, statusFilter), 300);
  };
  const handleStatus = (st) => { const next = st === statusFilter ? '' : st; setStatusFilter(next); setPage(1); load(1, search, next); };
  const invite = () => (window.innerWidth < 640 ? navigate('/visitors/new') : setShowNew(true));
  const cancelPass = async (v) => {
    if (!window.confirm(`Cancel ${v.visitorName}'s pass? The code will stop working at the gate.`)) return;
    try {
      await visitorAPI.cancel(v._id);
      toast.success('Pass cancelled');
      setSelectedVisitor((s) => (s?._id === v._id ? null : s));
      load(page);
    } catch (e) { toast.error(e.response?.data?.message || 'Couldn\'t cancel the pass'); }
  };
  const copyCode = (v) => { navigator.clipboard?.writeText(v.visitorCode); toast.success(`Code ${v.visitorCode} copied`); };

  useEffect(() => { load(1); }, []);

  return (
    <div className="animate-fade-in">
      {/* Care team: passes to restricted units waiting for my approval (staff only) */}
      <PassApprovals className="mb-5" />
      {/* ── Phone ── */}
      <div className="md:hidden pb-6">
        <VisitorsMobile
          visitors={visitors} loading={loading} counts={counts}
          search={search} onSearch={handleSearch}
          statusFilter={statusFilter} onPick={handleStatus} onStatus={(st) => { setStatusFilter(st); setPage(1); load(1, search, st); }}
          page={page} pagination={pagination} limit={limit} onPage={handlePage}
          onOpen={(v) => navigate(`/visitors/${v._id}`)} onCreate={invite}
          onShare={(v) => shareVisitorPass(v, user?.estateId)} onCopy={copyCode} onCancel={cancelPass}
          ShareIcon={WhatsAppIcon}
        />
      </div>

      {/* ── Tablet / desktop ── */}
      <div className="hidden md:block">
        <VisitorsDesktop
          visitors={visitors} loading={loading} counts={counts}
          search={search} onSearch={handleSearch} statusFilter={statusFilter} onStatus={handleStatus}
          page={page} pagination={pagination} limit={limit} onPage={handlePage} onLimit={handleLimit}
          onInvite={invite} onOpen={openVisitor}
          onShare={(v) => shareVisitorPass(v, user?.estateId)} onCopy={copyCode} onCancel={cancelPass}
        />
      </div>

      {/* Create sidebar */}
      <Drawer open={showNew} onClose={() => setShowNew(false)} title="Invite a Visitor">
        <InviteForm
          onCancel={() => setShowNew(false)}
          onCreated={(v) => { setShowNew(false); setSelectedVisitor(v); setPage(1); load(1); }}
        />
      </Drawer>

      {/* Pass detail sidebar */}
      <VisitorPassDrawer
        visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} onCancelPass={cancelPass}
        onShare={(v) => shareVisitorPass(v, user?.estateId)} onSaveImage={(v) => savePassImage(v, user?.estateId)}
        ShareIcon={WhatsAppIcon}
      />
    </div>
  );
}
