import { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_ROUTES = {
  super_admin: '/admin/dashboard',
  estate_manager: '/manager/dashboard',
  resident: '/dashboard',
  security: '/security/dashboard',
};

export default function Register() {
  const { estateCode: paramCode } = useParams();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    role: 'resident', estateCode: paramCode || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await register(form);
      toast.success('Account created successfully!');
      navigate(ROLE_ROUTES[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (key, val) => setForm({ ...form, [key]: val });

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gold flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} className="text-navy" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">Join Estate</h1>
          <p className="text-white/50 text-sm">Create your resident account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card-gold p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-3 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm text-white/60 mb-1.5 block">Full Name</label>
              <input className="input-field" placeholder="Adaeze Obi" value={form.name}
                onChange={(e) => set('name', e.target.value)} required />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-white/60 mb-1.5 block">Email</label>
              <input type="email" className="input-field" placeholder="you@example.com" value={form.email}
                onChange={(e) => set('email', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Phone</label>
              <input className="input-field" placeholder="+234..." value={form.phone}
                onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Role</label>
              <select className="input-field" value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="resident">Resident</option>
                <option value="security">Security</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm text-white/60 mb-1.5 block">Estate Invite Code</label>
              <input className="input-field font-mono uppercase tracking-widest"
                placeholder="e.g. GREEN1" value={form.estateCode}
                onChange={(e) => set('estateCode', e.target.value.toUpperCase())} required />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-white/60 mb-1.5 block">Password</label>
              <input type="password" className="input-field" placeholder="Min. 6 characters" value={form.password}
                onChange={(e) => set('password', e.target.value)} required minLength={6} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm text-white/40">
            Already registered?{' '}
            <Link to="/login" className="text-gold hover:text-gold-300 transition-colors">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
