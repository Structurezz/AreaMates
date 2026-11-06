import { createContext, useContext, useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, AlertCircle, Clock, Eye, EyeOff, ArrowRight, ShieldCheck, Hash } from 'lucide-react';
import { TERMS, preAuthSiteType } from '../../utils/siteTypes';
import toast from 'react-hot-toast';
import { MobileAuthShell, DesktopAuthShell } from '../../components/auth/AuthShell';

// The site's words before sign-in (device's last site type or ?site=), same as Login
function signupWords() {
  const type = preAuthSiteType();
  const T = TERMS[type] || TERMS.estate;
  const E = type === 'estate';
  const low = (x) => x.charAt(0).toLowerCase() + x.slice(1);
  return { E, Site: E ? 'Estate' : T.site, site: E ? 'estate' : low(T.site), manager: E ? 'estate manager' : low(T.manager), member: E ? 'resident' : low(T.member) };
}

const ROLE_ROUTES = {
  super_admin: '/admin/dashboard',
  estate_manager: '/manager/dashboard',
  resident: '/dashboard',
  security: '/security/dashboard',
};

// Same frame as the login page; the form renders on the light phone page and
// the desktop panel, so it picks its input style from this context.
const Ui = createContext({ input: 'rl-input', dark: false });

// A <label> wrapping the input links them (tap the label → focus the field)
function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="ax-label block">{label}</span>
      {children}
      {hint && <span className="ax-faint text-[11.5px] mt-1.5 block">{hint}</span>}
    </label>
  );
}

function RegisterForm({ form, set, loading, error, handleSubmit }) {
  const W = signupWords();
  const { input, dark } = useContext(Ui);
  const [showPw, setShowPw] = useState(false);
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="ax-error flex items-start gap-2 rounded-lg px-3.5 py-3 text-[13px]">
          <AlertCircle size={15} className="shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <Field label="Full name">
        <input className={input} placeholder="Adaeze Obi" value={form.name} autoComplete="name"
          onChange={(e) => set('name', e.target.value)} required />
      </Field>
      <Field label="Email">
        <input type="email" className={input} placeholder="you@example.com" value={form.email} autoComplete="email"
          onChange={(e) => set('email', e.target.value)} required />
      </Field>
      <Field label="Phone (optional)">
        <input className={input} type="tel" inputMode="tel" placeholder="+234…" value={form.phone} autoComplete="tel"
          onChange={(e) => set('phone', e.target.value)} />
      </Field>
      <Field label={`${W.Site} code`} hint={`Ask your ${W.manager} for your ${W.site}'s code.`}>
        <div className="relative">
          <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: dark ? 'rgba(255,255,255,0.35)' : '#98A2B3' }} />
          <input className={input} style={{ paddingLeft: 36, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.2em', textTransform: 'uppercase' }}
            placeholder="GREEN1" value={form.estateCode} maxLength={12}
            autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoComplete="off"
            onChange={(e) => set('estateCode', e.target.value.toUpperCase())} required />
        </div>
      </Field>
      <Field label="Password">
        <div className="relative">
          <input type={showPw ? 'text' : 'password'} className={input} style={{ paddingRight: 44 }}
            placeholder="Min. 6 characters" value={form.password} autoComplete="new-password"
            onChange={(e) => set('password', e.target.value)} required minLength={6} />
          <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1" style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#98A2B3' }}>
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </Field>

      <button type="submit" disabled={loading} className="ax-btn !mt-6">
        {loading ? (
          <>
            <svg className="animate-spin" width={15} height={15} viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Creating account…
          </>
        ) : <>Create account <ArrowRight size={16} /></>}
      </button>
    </form>
  );
}

// Shown when the account was created but a manager still has to assign a unit
function PendingNotice({ message }) {
  return (
    <div className="text-center">
      <span className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)', boxShadow: '0 10px 30px -10px rgba(99,102,241,.6)' }}>
        <Clock size={26} color="#fff" />
      </span>
      <div className="ax-title mt-5">Almost there</div>
      <p className="ax-sub mt-2 leading-relaxed">{message}</p>
      <div className="ax-panel-soft rounded-xl px-4 py-3 mt-5 text-left text-[12.5px] ax-muted leading-relaxed">
        Once you've been added to your unit, sign in with the email and password you just chose.
      </div>
      <Link to="/login" className="ax-btn mt-5">Go to sign in <ArrowRight size={16} /></Link>
    </div>
  );
}

export default function Register() {
  const W = signupWords();
  const { estateCode: paramCode } = useParams();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    role: 'resident', estateCode: paramCode || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await register(form);
      if (user.pendingUnit) { setPending(user.message); return; }
      toast.success('Account created successfully!');
      navigate(ROLE_ROUTES[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const shared = { form, set, loading, error, handleSubmit };

  return (
    <>
      {/* ── Mobile ── */}
      <div className="lg:hidden">
        <Ui.Provider value={{ input: 'am-input', dark: false }}>
          <MobileAuthShell>
            {pending ? <PendingNotice message={pending} /> : (
              <>
                <h1 className="ax-title">Create your account</h1>
                <p className="ax-sub mt-1.5 mb-7">Join your {W.site} as a {W.member}</p>
                <RegisterForm {...shared} />
                <p className="mt-6 text-center text-[14px] text-[#667085]">
                  Already registered?{' '}
                  <Link to="/login" className="ax-link">Sign in</Link>
                </p>
                <p className="mt-3 text-center text-[13px] text-[#667085]">
                  Manage {W.E ? 'an estate' : `a ${W.site}`}?{' '}
                  <a href="https://area-connector.areaconnect.pro/register" className="ax-link">{W.E ? 'Estate manager' : 'Manager'} portal</a>
                </p>
              </>
            )}
          </MobileAuthShell>
        </Ui.Provider>
      </div>

      {/* ── Desktop ── */}
      <div className="hidden lg:block">
        <Ui.Provider value={{ input: 'rl-input', dark: false }}>
          <DesktopAuthShell
            headline={<>Your neighbours <span style={{ color: '#A5B4FC' }}>are already here.</span></>}
            sub={W.E ? 'Join your estate with the code from your estate manager — then let visitors in, pay dues and stay in the loop.' : `Join your ${W.site} with the code from your ${W.manager} — then let visitors in and stay in the loop.`}
            topRight={<>Already registered?&nbsp;<Link to="/login" className="font-semibold text-[#4F46E5] hover:text-[#4338CA]">Sign in</Link></>}>
            {pending ? <PendingNotice message={pending} /> : (
              <>
                <span className="w-12 h-12 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#4F46E5]"><Building2 size={22} /></span>
                <div className="ax-title mt-6">Join your {W.site}</div>
                <p className="ax-sub mt-1.5 mb-7">Create your {W.member} account.</p>
                <RegisterForm {...shared} />
                <div className="mt-7 rounded-xl border border-[#EAECF0] bg-[#F9FAFB] px-4 py-3.5 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-white border border-[#EAECF0] flex items-center justify-center text-[#475467]"><ShieldCheck size={16} /></span>
                  <div className="text-[12.5px] leading-snug">
                    <p className="font-medium text-[#101828]">Manage {W.E ? 'an estate' : `a ${W.site}`}?</p>
                    <p className="text-[#667085]">Use the <a href="https://area-connector.areaconnect.pro/register" className="font-medium text-[#4F46E5] hover:underline">{W.E ? 'estate manager' : 'manager'} portal</a>.</p>
                  </div>
                </div>
              </>
            )}
          </DesktopAuthShell>
        </Ui.Provider>
      </div>
    </>
  );
}
