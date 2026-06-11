import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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

/* ── Mobile CSS ── */
const MOBILE_CSS = `
  @keyframes amOrb1 {
    0%,100% { transform: translate(0,0) scale(1); }
    35% { transform: translate(28px,-40px) scale(1.08); }
    68% { transform: translate(-22px,26px) scale(0.93); }
  }
  @keyframes amOrb2 {
    0%,100% { transform: translate(0,0) scale(1); }
    40% { transform: translate(-32px,24px) scale(1.06); }
    72% { transform: translate(20px,-28px) scale(0.95); }
  }
  @keyframes amPulse {
    0% { transform: scale(1); opacity: 0.55; }
    100% { transform: scale(2.6); opacity: 0; }
  }
  @keyframes amCardIn {
    0% { opacity: 0; transform: translateY(36px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  @keyframes amHeroIn {
    0% { opacity: 0; transform: scale(0.92) translateY(-10px); }
    100% { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes amScan {
    0% { top: -2px; opacity: 0.07; }
    100% { top: 101%; opacity: 0.01; }
  }
  @keyframes amGlow {
    0%,100% { opacity: 0.65; }
    50% { opacity: 1; }
  }
  .am-input {
    width: 100%; padding: 13px 16px; border-radius: 12px;
    background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.11);
    color: #fff; font-size: 14px; outline: none; box-sizing: border-box;
    transition: border-color 0.2s;
  }
  .am-input:focus { border-color: rgba(99,102,241,0.55); }
  .am-input::placeholder { color: rgba(255,255,255,0.3); }
`;

function MobileLogin({ form, setForm, showPw, setShowPw, loading, error, handleSubmit }) {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#05091A 0%,#08103A 100%)', position: 'relative', overflow: 'hidden' }}>
      <style>{MOBILE_CSS}</style>

      {/* Orb 1 — top right */}
      <div style={{
        position: 'fixed', top: -100, right: -80, width: 360, height: 360,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(99,102,241,0.24) 0%, transparent 65%)',
        animation: 'amOrb1 11s ease-in-out infinite',
      }}/>
      {/* Orb 2 — bottom left */}
      <div style={{
        position: 'fixed', bottom: -110, left: -90, width: 320, height: 320,
        borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(79,70,229,0.17) 0%, transparent 65%)',
        animation: 'amOrb2 14s 3s ease-in-out infinite',
      }}/>
      {/* Scan line */}
      <div style={{
        position: 'fixed', left: 0, right: 0, height: 1, pointerEvents: 'none',
        background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.35), transparent)',
        animation: 'amScan 9s linear infinite',
      }}/>

      {/* ── Hero ── */}
      <div style={{
        textAlign: 'center', padding: '64px 24px 36px',
        position: 'relative', zIndex: 1,
        animation: 'amHeroIn 0.8s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        {/* Icon + pulse rings */}
        <div style={{ position: 'relative', display: 'inline-flex', marginBottom: 22 }}>
          <div style={{
            position: 'absolute', inset: -18, borderRadius: '50%',
            border: '1.5px solid rgba(99,102,241,0.5)',
            animation: 'amPulse 2.8s ease-out infinite',
          }}/>
          <div style={{
            position: 'absolute', inset: -9, borderRadius: '50%',
            border: '1.5px solid rgba(99,102,241,0.35)',
            animation: 'amPulse 2.8s 0.7s ease-out infinite',
          }}/>
          <div style={{
            width: 76, height: 76, borderRadius: 22,
            background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
            boxShadow: '0 0 56px rgba(99,102,241,0.55), 0 12px 40px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'amGlow 3s ease-in-out infinite',
          }}>
            <svg width="38" height="38" viewBox="0 0 40 40" fill="none">
              <path d="M20 6L8 13v14l12 7 12-7V13L20 6z" stroke="rgba(255,255,255,0.25)" strokeWidth="1" fill="none"/>
              <path d="M20 10L11 15.5v11L20 32l9-5.5v-11L20 10z" fill="rgba(255,255,255,0.15)"/>
              <text x="20" y="25" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="system-ui,sans-serif">AM</text>
            </svg>
          </div>
        </div>

        <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.045em', color: '#fff', marginBottom: 4 }}>
          Area<span style={{ color: '#818CF8' }}>Mates</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 24 }}>
          Resident Portal
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 7 }}>
          {['Visitor Passes', 'Pay Levies', 'Community Chat', 'Alerts'].map(f => (
            <span key={f} style={{
              fontSize: 11, fontWeight: 600, padding: '5px 13px', borderRadius: 99,
              background: 'rgba(99,102,241,0.12)', color: '#A5B4FC',
              border: '1px solid rgba(99,102,241,0.25)',
            }}>{f}</span>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div style={{ margin: '0 20px', height: 1, background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.2), transparent)' }}/>

      {/* ── Form card ── */}
      <div style={{
        margin: '0 12px', padding: '28px 24px 40px',
        borderRadius: '28px 28px 0 0',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderBottom: 'none',
        animation: 'amCardIn 0.7s 0.2s cubic-bezier(0.22,1,0.36,1) both',
        position: 'relative', zIndex: 1,
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', marginBottom: 2 }}>Welcome back</h2>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 22 }}>Sign in to your estate account</p>

        {/* Demo chip */}
        <button
          onClick={() => setForm({ email: 'resident1@estate-demo.com', password: 'Resident@123' })}
          style={{
            width: '100%', textAlign: 'left', padding: '11px 14px', borderRadius: 12,
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)',
            cursor: 'pointer', marginBottom: 22,
          }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#818CF8', textTransform: 'uppercase', marginBottom: 3 }}>
            Try Demo Account
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>resident1@estate-demo.com</div>
        </button>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#FCA5A5', fontSize: 13,
          }}>
            <AlertCircle size={14}/> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 8 }}>
              Email Address
            </label>
            <input type="email" className="am-input" placeholder="you@example.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              required autoComplete="email"/>
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} className="am-input" placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required autoComplete="current-password" style={{ paddingRight: 44 }}/>
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366F1,#4F46E5)',
            color: '#fff', fontWeight: 700, fontSize: 15,
            boxShadow: loading ? 'none' : '0 6px 24px rgba(99,102,241,0.4)',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {loading ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite' }} width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Signing in…
              </>
            ) : 'Sign In'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            New resident?{' '}
            <Link to="/register" style={{ color: '#818CF8', fontWeight: 600 }}>Join with estate code</Link>
          </p>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.04em' }}>
          Powered by <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
        </p>
      </div>
    </div>
  );
}

const DESKTOP_DEMO = { label: 'Resident (Demo)', email: 'resident1@estate-demo.com', password: 'Resident@123' };

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const shared = { form, setForm, showPw, setShowPw, loading, error, handleSubmit };

  return (
    <>
      {/* ── Mobile ── */}
      <div className="lg:hidden">
        <MobileLogin {...shared}/>
      </div>

      {/* ── Desktop: sidebar + form ── */}
      <div className="hidden lg:flex min-h-screen" style={{ background: '#060E1A' }}>
        <AdSidebar />

        {/* Form panel */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', minHeight: '100vh', background: '#F8FAFC', padding: '40px 24px' }}>
          <div className="w-full max-w-md">
            {/* Brand mark */}
            <div className="text-center mb-8">
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: 'linear-gradient(135deg,#6366F1,#4F46E5)',
                boxShadow: '0 4px 24px rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
                  <path d="M20 6L8 13v14l12 7 12-7V13L20 6z" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none"/>
                  <path d="M20 10L11 15.5v11L20 32l9-5.5v-11L20 10z" fill="rgba(255,255,255,0.15)"/>
                  <text x="20" y="25" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="system-ui,sans-serif">AM</text>
                </svg>
              </div>
              <h1 className="text-3xl font-bold mb-1" style={{ letterSpacing: '-0.03em', color: '#0F172A' }}>
                Area<span style={{ color: '#6366F1' }}>Mates</span>
              </h1>
              <p className="text-sm" style={{ color: '#64748B' }}>Sign in to your estate account</p>
            </div>

            {/* Demo chip */}
            <div className="glass-card p-4 mb-4">
              <p className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: '#94A3B8' }}>Demo Account</p>
              <button
                onClick={() => { setForm({ email: DESKTOP_DEMO.email, password: DESKTOP_DEMO.password }); setError(''); }}
                className="w-full text-xs text-left p-2.5 rounded-lg transition-all"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}>
                <div className="font-semibold" style={{ color: '#0F172A' }}>{DESKTOP_DEMO.label}</div>
                <div style={{ color: '#94A3B8' }}>{DESKTOP_DEMO.email}</div>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4"
              style={{ border: '1px solid rgba(99,102,241,0.18)', background: 'linear-gradient(135deg,rgba(99,102,241,0.04) 0%,#FFFFFF 100%)' }}>
              {error && (
                <div className="flex items-center gap-2 rounded-xl p-3 text-sm"
                  style={{ color: '#DC2626', background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <AlertCircle size={16}/> {error}
                </div>
              )}
              <div>
                <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>Email Address</label>
                <input type="email" className="input-field" placeholder="you@example.com"
                  value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  required autoComplete="email"/>
              </div>
              <div>
                <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input-field pr-10"
                    placeholder="••••••••" value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required autoComplete="current-password"/>
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#94A3B8' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                    {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-2"
                style={{ background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <p className="text-center text-sm" style={{ color: '#94A3B8' }}>
                New resident?{' '}
                <Link to="/register" className="font-medium" style={{ color: '#6366F1' }}>Join with estate code</Link>
              </p>
            </form>
            <p className="text-[11px] text-slate-400 text-center mt-6 tracking-wide">
              Powered by <span className="font-semibold text-slate-500">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
