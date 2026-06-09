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
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div
            style={{
              width: 64, height: 64, borderRadius: 18,
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 0 32px rgba(16,185,129,0.4)',
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
          <h1 className="text-3xl font-display font-bold text-white mb-1">
            Area<span style={{ color: '#10B981' }}>Mates</span>
          </h1>
          <p className="text-white/50 text-sm">Sign in to your estate account</p>
        </div>

        <div className="glass-card p-4 mb-6">
          <p className="text-xs text-white/50 font-medium mb-3 uppercase tracking-wider">Demo Account</p>
          <button
            onClick={() => { setForm({ email: DEMO.email, password: DEMO.password }); setError(''); }}
            className="w-full text-xs text-left p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-gold/30 transition-all"
          >
            <div className="font-semibold text-white/80">{DEMO.label}</div>
            <div className="text-white/40">{DEMO.email}</div>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="glass-card-gold p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-3 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Email Address</label>
            <input type="email" className="input-field" placeholder="you@example.com"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              required autoComplete="email" />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1.5 block">Password</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                required autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="text-center text-sm text-white/40">
            New resident?{' '}
            <Link to="/register" className="text-gold hover:underline transition-colors">
              Join with estate code
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
