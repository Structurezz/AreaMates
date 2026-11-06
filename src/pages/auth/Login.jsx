import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';
import { Eye, EyeOff, AlertCircle, CalendarClock, CheckCircle, KeyRound, Mail, ShieldCheck, X, Lock, ArrowRight, UserCheck, Package, Radio, Vote, Wallet, Megaphone, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Portal from '../../components/ui/Portal';
import { TERMS, preAuthSiteType } from '../../utils/siteTypes';
import { MobileAuthShell } from '../../components/auth/AuthShell';

/**
 * Forgot-password modal. Residents (and security) submit their email →
 * backend creates a pending PasswordResetRequest and emails every estate
 * manager of their estate. The manager approves/denies in-app. We never
 * confirm whether the email actually exists — same message either way.
 */
function ForgotPasswordModal({ initialEmail = '', onClose }) {
  const W = authWords();
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    if (!email.includes('@')) { toast.error('Enter a valid email'); return; }
    setSubmitting(true);
    try {
      await authAPI.requestPasswordReset({ email });
      setSent(true);
    } catch {
      // Backend always responds 200; keep the UX positive even on error
      setSent(true);
    } finally { setSubmitting(false); }
  };

  return (
    <Portal>
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(2,6,23,0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 30px 60px -20px rgba(0,0,0,0.5)', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close"
          style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <X size={14}/>
        </button>

        {sent ? (
          <div style={{ padding: '36px 28px 28px', textAlign: 'center' }}>
            <div style={{ width: 68, height: 68, borderRadius: 20, background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={30}/>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', margin: '0 0 6px' }}>Request sent</h2>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
              If an account exists for <strong>{email}</strong>, your {W.manager} has been notified and will approve the reset. You'll receive a temporary password by email once approved.
            </p>
            <button onClick={onClose}
              style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 32px', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
              Got it
            </button>
          </div>
        ) : (
          <>
            <div style={{ background: 'linear-gradient(135deg,#1E1B4B,#4338CA)', padding: '28px 28px 22px', color: '#fff', position: 'relative' }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <KeyRound size={24}/>
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 2 }}>
                Password help
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.2 }}>Ask your {W.manager} to reset it</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: '8px 0 0', lineHeight: 1.5 }}>
                Enter your account email — your {W.manager} will approve a reset and we'll email you a temporary password.
              </p>
            </div>
            <form onSubmit={submit} style={{ padding: '20px 28px 28px' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                Email address
              </label>
              <div style={{ position: 'relative', marginBottom: 18 }}>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{ width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px 12px 40px', fontSize: 14, color: '#0F172A', outline: 'none' }} />
                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}/>
              </div>
              <button type="submit" disabled={submitting}
                style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none',
                  background: submitting ? '#94A3B8' : 'linear-gradient(135deg,#6366F1,#4F46E5)',
                  color: '#fff', fontWeight: 800, fontSize: 15,
                  boxShadow: '0 6px 16px rgba(99,102,241,0.4)', cursor: submitting ? 'wait' : 'pointer' }}>
                {submitting ? 'Sending request…' : 'Request password reset'}
              </button>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '12px 0 0', textAlign: 'center', lineHeight: 1.55 }}>
                Your {W.manager} must approve the reset — this prevents stranger-driven password resets.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
    </Portal>
  );
}

/* ── Words before sign-in: the device's last site type (or ?site=) ── */
function authWords() {
  const type = preAuthSiteType();
  const T = TERMS[type] || TERMS.estate;
  const E = type === 'estate';
  const low = (x) => x.charAt(0).toLowerCase() + x.slice(1);
  return {
    E,
    manager: E ? 'estate manager' : low(T.manager),
    site: E ? 'estate' : low(T.site),
    member: E ? 'resident' : low(T.member),
    unit: T.unit,
  };
}

/* ── Ad sidebar slides (desktop only) ── */
const AD_SLIDES = [
  {
    tag: 'What is AreaMates?',
    headline: 'Your Estate, Your Community',
    body: 'AreaMates is the resident app that keeps you connected to your estate. Pre-register visitors, pay levies, chat with neighbours, and get instant security alerts — all from your phone.',
    points: ['Visitor Pre-registration & QR Passes', 'Online Levy & Service Payments', 'Neighbourhood Chat', 'Real-time Security Alerts'],
    accent: '#6366F1',
    num: '01',
  },
  {
    tag: 'Convenience at Your Fingertips',
    headline: 'Never Miss a Beat',
    body: 'From estate announcements to community polls and local marketplace listings — AreaMates puts everything you need to stay informed and engaged right in your pocket.',
    points: ['Estate Announcements & Notices', 'Community Polls & Voting', 'Local Marketplace', 'Event Board & RSVPs'],
    accent: '#818CF8',
    num: '02',
  },
  {
    tag: 'Safe & Connected',
    headline: 'Peace of Mind, Always',
    body: 'Share guest QR passes via WhatsApp, track entry logs, and receive push alerts for gate events — AreaMates keeps your home safe and your community tight-knit.',
    points: ['QR-code Gate Passes via WhatsApp', 'Visitor Entry & Exit Logs', 'Emergency Alert Broadcasting', 'Works with AreaConnect Manager'],
    accent: '#A78BFA',
    num: '03',
  },
];

function AdSidebar() {
  const [idx, setIdx] = useState(0);
  const [out, setOut] = useState(false);

  const go = (i) => { setOut(true); setTimeout(() => { setIdx(i); setOut(false); }, 280); };

  useEffect(() => {
    const t = setInterval(() => go((idx + 1) % AD_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [idx]);

  const s = AD_SLIDES[idx];

  return (
    <div className="hidden lg:flex" style={{
      flex: 1,
      background: 'linear-gradient(180deg,#060E1A 0%,#0B1626 100%)',
      flexDirection: 'column', padding: '48px 52px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
        width: 260, height: 260, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${s.accent}20 0%, transparent 70%)`,
        transition: 'background 0.5s',
      }}/>
      <div style={{
        position: 'absolute', bottom: -60, right: -40, pointerEvents: 'none',
        width: 200, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${s.accent}12 0%, transparent 70%)`,
        transition: 'background 0.5s',
      }}/>

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 11,
          background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
            <path d="M20 10L11 15.5v11L20 32l9-5.5v-11L20 10z" fill="rgba(255,255,255,0.2)"/>
            <text x="20" y="25" textAnchor="middle" fill="white" fontSize="12" fontWeight="800" fontFamily="system-ui">AM</text>
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.02em' }}>
          Area<span style={{ color: '#6366F1' }}>Mates</span>
        </span>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.15)', position: 'relative', zIndex: 1 }}>
        {s.num} <span style={{ color: 'rgba(255,255,255,0.08)' }}>/ 03</span>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        paddingTop: 20, paddingBottom: 20, position: 'relative', zIndex: 1,
        opacity: out ? 0 : 1, transform: out ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity 0.28s, transform 0.28s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ width: 22, height: 2, borderRadius: 99, background: s.accent }}/>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: s.accent, textTransform: 'uppercase' }}>{s.tag}</span>
        </div>

        <h3 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.03em', color: '#fff', marginBottom: 12 }}>
          {s.headline}
        </h3>

        <div style={{ width: 30, height: 3, borderRadius: 99, background: `linear-gradient(90deg,${s.accent},transparent)`, marginBottom: 16 }}/>

        <p style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.42)', marginBottom: 24 }}>{s.body}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {s.points.map(pt => (
            <div key={pt} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <CheckCircle size={13} color={s.accent} style={{ flexShrink: 0, marginTop: 2 }}/>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{pt}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, paddingBottom: 18, position: 'relative', zIndex: 1 }}>
        {AD_SLIDES.map((_, i) => (
          <button key={i} onClick={() => go(i)} style={{
            width: i === idx ? 24 : 6, height: 6, borderRadius: 99, border: 'none', cursor: 'pointer', padding: 0,
            background: i === idx ? s.accent : 'rgba(255,255,255,0.15)',
            transition: 'all 0.35s',
          }}/>
        ))}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em', color: 'rgba(255,255,255,0.55)' }}>
          Area<span style={{ color: '#10B981' }}>Connect</span>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>Smart Estate Technology</div>
      </div>
    </div>
  );
}

/* ── Phone: clean light page (shared frame with sign-up) ── */
function MobileLogin({ form, setForm, showPw, setShowPw, loading, error, errorTone, handleSubmit, openForgot }) {
  const W = authWords();
  return (
    <MobileAuthShell>
      <h1 className="ax-title">Welcome back</h1>
      <p className="ax-sub mt-1.5">Sign in to your {W.site}</p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        {error && errorTone === 'stay' && (
          <div className="ax-stay flex items-start gap-2.5 px-3.5 py-3 leading-relaxed" role="status">
            <CalendarClock size={17} className="shrink-0 mt-0.5 text-[#6366F1]"/> <span>{error}</span>
          </div>
        )}
        {error && errorTone !== 'stay' && (
          <div className="ax-error flex items-start gap-2 px-3.5 py-3" role="alert">
            <AlertCircle size={16} className="shrink-0 mt-0.5"/> <span>{error}</span>
          </div>
        )}

        <label className="block">
          <span className="ax-label">Email</span>
          <input type="email" inputMode="email" className="am-input" placeholder="you@email.com"
            value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
            required autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}/>
        </label>

        <div>
          <label className="block">
            <span className="ax-label">Password</span>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="am-input" placeholder="Enter your password"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required autoComplete="current-password" style={{ paddingRight: 52 }}/>
              <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center text-[#98A2B3] active:text-[#475467]">
                {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
            </div>
          </label>
          <div className="mt-2.5 text-right">
            <button type="button" onClick={openForgot} className="ax-link text-[14px] py-1">Forgot password?</button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="ax-btn !mt-5">
          {loading ? (
            <>
              <svg className="animate-spin" width={17} height={17} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              Signing in…
            </>
          ) : <>Sign in <ArrowRight size={18}/></>}
        </button>
      </form>

      <p className="mt-6 text-center text-[14px] text-[#667085]">
        New here?{' '}
        <Link to="/register" className="ax-link">Join with {W.site} code</Link>
      </p>

      <div className="mt-8 rounded-xl border border-[#EAECF0] bg-[#F9FAFB] px-4 py-3.5 flex items-center gap-3">
        <span className="w-9 h-9 rounded-lg bg-white border border-[#EAECF0] flex items-center justify-center text-[#475467] shrink-0"><ShieldCheck size={16}/></span>
        <p className="text-[13px] leading-snug text-[#667085] min-w-0">
          <span className="block font-medium text-[#101828]">Manage {W.E ? 'an estate' : `a ${W.site}`}?</span>
          Use the <a href="https://area-connector.areaconnect.pro/login" className="ax-link">{W.E ? 'estate manager' : 'manager'} portal</a>.
        </p>
      </div>
    </MobileAuthShell>
  );
}

/* ── Desktop: split screen with a live resident preview ── */
const FEED = [
  { icon: UserCheck, tone: '#34D399', title: 'Your visitor has arrived',  sub: 'Ada Obi · checked in at Gate A' },
  { icon: Package,   tone: '#FBBF24', title: 'Package at the gate',       sub: 'Jumia delivery · held by Guard Musa' },
  { icon: Radio,     tone: '#F472B6', title: 'Lounge is live',            sub: 'Friday night podcast · 23 listening' },
  { icon: Vote,      tone: '#60A5FA', title: 'New estate poll',           sub: 'Repaint the main gate? · 61% yes' },
  { icon: Wallet,    tone: '#A5B4FC', title: 'Payment received',          sub: 'Service charge · ₦25,000' },
  { icon: Megaphone, tone: '#FB923C', title: 'Announcement',              sub: 'Water maintenance on Saturday' },
];

const DESKTOP_CSS = `
  @keyframes rlFeedIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
  @keyframes rlFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes rlPing { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.4); opacity: 0; } }
  @keyframes rlRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  .rl-input { width: 100%; height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid #D0D5DD; background: #fff;
    font-size: 14px; color: #101828; outline: none; transition: border-color .15s, box-shadow .15s; box-shadow: 0 1px 2px rgba(16,24,40,.05); }
  .rl-input:focus { border-color: #6366F1; box-shadow: 0 0 0 4px rgba(99,102,241,.14); }
  .rl-input::placeholder { color: #98A2B3; }
`;

function useTicker(n, ms) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % n), ms); return () => clearInterval(t); }, [n, ms]);
  return i;
}

function ResidentPreview() {
  const W = authWords();
  const tick = useTicker(FEED.length, 2600);
  const rows = [0, 1, 2].map((k) => FEED[(tick - k + FEED.length * 4) % FEED.length]);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div style={{ animation: 'rlFloat 7s ease-in-out infinite' }}
      className="w-full max-w-[440px] rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 h-9 border-b border-white/[0.07]">
        {['#F97066', '#FDB022', '#32D583'].map((c) => <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: .8 }} />)}
        <span className="ml-3 text-[11px] text-white/35">area-mates.areaconnect.pro</span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold text-white" style={{ background: 'linear-gradient(135deg,#818CF8,#4F46E5)' }}>F4</span>
            <div>
              <p className="text-[11px] text-white/45">{greet}</p>
              <p className="text-[14.5px] font-semibold" style={{ color: '#fff' }}>{W.E ? 'Flat 4B · Greenfield Estate' : `${W.unit} 4B`}</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-indigo-200">
            <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-indigo-300" style={{ animation: 'rlPing 1.6s ease-out infinite' }} /><span className="relative w-2 h-2 rounded-full bg-indigo-300" /></span>
            Live
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[['Visitors today', '2', '#34D399'], ['Next dues', '₦25k', '#A5B4FC'], ['Neighbours online', '18', '#FBBF24']].map(([l, v, c]) => (
            <div key={l} className="rounded-xl bg-white/[0.05] border border-white/[0.07] px-3 py-2.5">
              <p className="text-[10.5px] text-white/45 truncate">{l}</p>
              <p className="mt-0.5 text-[18px] font-semibold tabular-nums" style={{ color: c }}>{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/35">For you</p>
        <div className="space-y-1.5">
          {rows.map((r, k) => (
            <div key={`${tick}-${k}`} className="flex items-center gap-3 rounded-lg px-2.5 py-2"
              style={{ background: k === 0 ? 'rgba(255,255,255,.07)' : 'transparent', opacity: 1 - k * 0.25, animation: k === 0 ? 'rlFeedIn .5s cubic-bezier(.22,1,.36,1)' : undefined }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${r.tone}22`, color: r.tone }}><r.icon size={14} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium text-white/90 truncate">{r.title}</span>
                <span className="block text-[11px] text-white/45 truncate">{r.sub}</span>
              </span>
              <span className="text-[10.5px] text-white/30">{k === 0 ? 'now' : `${k * 4}m`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DesktopLogin({ form, setForm, showPw, setShowPw, loading, error, errorTone, handleSubmit, openForgot }) {
  const W = authWords();
  return (
    <div className="h-screen min-h-[640px] grid grid-cols-[1.1fr_1fr] bg-white overflow-hidden">
      <style>{DESKTOP_CSS}</style>

      <aside className="relative overflow-hidden flex flex-col px-14 py-10 text-white h-full"
        style={{ background: 'radial-gradient(90% 70% at 85% 10%, rgba(99,102,241,.35) 0%, transparent 60%), radial-gradient(70% 60% at 0% 100%, rgba(79,70,229,.22) 0%, transparent 60%), #0A0F24' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at 60% 40%, #000 0%, transparent 75%)' }} />

        <div className="relative flex items-center gap-3">
          <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl" />
          <div className="leading-tight">
            <div className="text-[17px] font-bold tracking-tight" style={{ color: '#fff' }}>Area<span style={{ color: '#A5B4FC' }}>Mates</span></div>
            <div className="text-[11px] text-white/45">For residents</div>
          </div>
        </div>

        <div className="relative flex-1 min-h-0 flex flex-col justify-center py-6" style={{ animation: 'rlRise .8s cubic-bezier(.22,1,.36,1) both' }}>
          <h2 className="text-[34px] leading-[1.12] font-semibold tracking-tight max-w-[470px]" style={{ color: '#fff' }}>
            Home, <span style={{ color: '#A5B4FC' }}>a little closer.</span>
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/60 max-w-[430px]">
            {W.E ? 'Let visitors in, pay dues, hear from your estate and meet your neighbours — all from one place.' : `Let visitors in, get alerts and hear from your ${W.site} — all from one place.`}
          </p>
          <div className="mt-7"><ResidentPreview /></div>
        </div>

        <div className="relative flex gap-8 text-[12px] text-white/45">
          {[['Instant', 'visitor passes'], ['Paystack', 'secure dues'], ['Lounge', 'podcasts & chat']].map(([a, b]) => (
            <div key={a}><p className="text-[15px] font-semibold text-white/90">{a}</p><p>{b}</p></div>
          ))}
        </div>
      </aside>

      <main className="flex flex-col px-10 py-8 h-full overflow-y-auto">
        <div className="flex justify-end text-[13px] text-[#475467]">
          New {W.member}?&nbsp;<Link to="/register" className="font-semibold text-[#4F46E5] hover:text-[#4338CA]">Join with {W.site} code</Link>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-[380px]" style={{ animation: 'rlRise .6s .1s cubic-bezier(.22,1,.36,1) both' }}>
            <span className="w-12 h-12 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]"><Building2 size={22} /></span>
            <h1 className="mt-6 text-[28px] font-semibold tracking-tight" style={{ color: '#101828' }}>Welcome home</h1>
            <p className="mt-1.5 text-[14.5px] text-[#475467]">Sign in to your {W.site} account.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (errorTone === 'stay' ? (
                <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-[13px] bg-[#EEF2FF] border border-[#C7D2FE] text-[#3730A3]">
                  <CalendarClock size={16} className="shrink-0 mt-0.5 text-[#6366F1]" /> {error}
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg px-3.5 py-3 text-[13px] bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318]">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
                </div>
              ))}
              <div>
                <label className="block text-[13px] font-medium text-[#344054] mb-1.5">Email</label>
                <input type="email" className="rl-input" placeholder="you@example.com" autoFocus
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[13px] font-medium text-[#344054]">Password</label>
                  <button type="button" onClick={openForgot} className="text-[13px] font-semibold text-[#4F46E5] hover:text-[#4338CA]">Forgot password?</button>
                </div>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="rl-input" style={{ paddingRight: 44 }} placeholder="Enter your password"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#98A2B3] hover:text-[#475467]">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full h-11 rounded-[10px] text-[14.5px] font-semibold text-white flex items-center justify-center gap-2 transition-colors disabled:opacity-60 bg-[#4F46E5] hover:bg-[#4338CA]"
                style={{ boxShadow: '0 1px 2px rgba(16,24,40,.05), inset 0 -2px 0 rgba(0,0,0,.1)' }}>
                {loading ? (
                  <>
                    <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in…
                  </>
                ) : <>Sign in <ArrowRight size={16} /></>}
              </button>
            </form>

            <div className="mt-8 rounded-xl border border-[#EAECF0] bg-[#F9FAFB] px-4 py-3.5 flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-white border border-[#EAECF0] flex items-center justify-center text-[#475467]"><ShieldCheck size={16} /></span>
              <div className="text-[12.5px] leading-snug">
                <p className="font-medium text-[#101828]">Manage {W.E ? 'an estate' : `a ${W.site}`}?</p>
                <p className="text-[#667085]">Use the <a href="https://area-connector.areaconnect.pro/login" className="font-medium text-[#4F46E5] hover:underline">{W.E ? 'estate manager' : 'manager'} portal</a>.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11.5px] text-[#98A2B3]">
          <span className="flex items-center gap-1.5"><Lock size={12} /> Encrypted connection</span>
          <span>Powered by <span className="font-semibold text-[#667085]">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864</span>
        </div>
      </main>
    </div>
  );
}

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  // 'stay' = hotel guest's stay hasn't started / has ended (friendly, not an error)
  const [errorTone, setErrorTone] = useState('error');
  const [forgotOpen, setForgotOpen] = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  // Auto-open the forgot-password modal when linked via /login?forgot=1
  useEffect(() => {
    // Why we were signed out (e.g. removed from their unit)
    try {
      const notice = sessionStorage.getItem('authNotice');
      if (notice) {
        setError(notice);
        if (sessionStorage.getItem('authNoticeTone') === 'stay') setErrorTone('stay');
        sessionStorage.removeItem('authNotice');
      }
      sessionStorage.removeItem('authNoticeTone');
    } catch {}
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get('forgot') === '1') setForgotOpen(true);
    } catch {}
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    setErrorTone('error');
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      // Force a password change immediately for admin-reset accounts
      if (user?.mustChangePassword) {
        toast('Please set a new password to continue.', { icon: '🔐' });
        navigate('/settings');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'STAY_NOT_STARTED' || code === 'STAY_ENDED') {
        setErrorTone('stay');
        setError(err.response.data.message || (code === 'STAY_ENDED' ? 'Your stay has ended.' : "Your stay hasn't started yet. You can sign in from check-in."));
      } else {
        setError(err.response?.data?.message || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const openForgot = () => setForgotOpen(true);

  const shared = { form, setForm, showPw, setShowPw, loading, error, errorTone, handleSubmit, openForgot };

  return (
    <>
      {/* Shared forgot-password modal */}
      {forgotOpen && (
        <ForgotPasswordModal
          initialEmail={form.email}
          onClose={() => setForgotOpen(false)}
        />
      )}

      {/* ── Mobile ── */}
      <div className="lg:hidden">
        <MobileLogin {...shared}/>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block">
        <DesktopLogin {...shared}/>
      </div>
    </>
  );
}
