import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DEMO = { label: 'Resident (Demo)', email: 'resident1@estate-demo.com', password: 'Resident@123' };

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <div
            style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              boxShadow: '0 4px 24px rgba(16,185,129,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
              <path d="M20 6L8 13v14l12 7 12-7V13L20 6z" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none"/>
              <path d="M20 10L11 15.5v11L20 32l9-5.5v-11L20 10z" fill="rgba(255,255,255,0.15)"/>
              <text x="20" y="25" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="system-ui,sans-serif">AM</text>
            </svg>
          </div>
          <h1
            className="text-3xl font-display font-bold mb-1"
            style={{ letterSpacing: '-0.03em', color: '#0F172A' }}
          >
            Area<span style={{ color: '#6366F1' }}>Mates</span>
          </h1>
          <p className="text-sm" style={{ color: '#64748B' }}>Sign in to your estate account</p>
        </div>

        {/* Demo account chip */}
        <div className="glass-card p-4 mb-4">
          <p
            className="text-xs font-semibold mb-3 uppercase tracking-wider"
            style={{ color: '#94A3B8' }}
          >
            Demo Account
          </p>
          <button
            onClick={() => { setForm({ email: DEMO.email, password: DEMO.password }); setError(''); }}
            className="w-full text-xs text-left p-2.5 rounded-lg transition-all"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.30)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <div className="font-semibold" style={{ color: '#0F172A' }}>{DEMO.label}</div>
            <div style={{ color: '#94A3B8' }}>{DEMO.email}</div>
          </button>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleSubmit}
          className="glass-card p-6 space-y-4"
          style={{ border: '1px solid rgba(16,185,129,0.20)', background: 'linear-gradient(135deg, rgba(16,185,129,0.04) 0%, #FFFFFF 100%)' }}
        >
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl p-3 text-sm"
              style={{ color: '#DC2626', background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>
              Email Address
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm" style={{ color: '#94A3B8' }}>
            New resident?{' '}
            <Link to="/register" className="font-medium hover:underline transition-colors" style={{ color: '#6366F1' }}>
              Join with estate code
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
