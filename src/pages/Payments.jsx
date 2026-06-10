import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentAPI } from '../api';
import toast from 'react-hot-toast';
import {
  CreditCard, Clock, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, ExternalLink, Banknote, Info,
} from 'lucide-react';

const STATUS = {
  paid:    { label: 'Paid',    icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  pending: { label: 'Pending', icon: Clock,          color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
  overdue: { label: 'Overdue', icon: AlertTriangle,  color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200' },
  waived:  { label: 'Waived',  icon: XCircle,        color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200' },
};

const TYPE_LABEL = {
  security_dues: 'Security Dues',
  maintenance: 'Maintenance',
  levy: 'Levy',
  contribution: 'Contribution',
  other: 'Other',
};

const METHOD_LABEL = {
  paystack: 'Paystack',
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  manual: 'Manual',
};

function fmt(n) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(n || 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color} ${s.bg} border ${s.border}`}>
      <Icon size={11} />
      {s.label}
    </span>
  );
}

export default function Payments() {
  const location = useLocation();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState('outstanding');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await paymentAPI.getMine();
      setPayments(data.data || []);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle Paystack redirect back with ?ref=
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    if (!ref) return;

    (async () => {
      setVerifying(true);
      try {
        const { data } = await paymentAPI.verify(ref);
        if (data.success) {
          toast.success('Payment confirmed! Thank you.');
          await load();
        } else {
          toast.error('Payment could not be verified.');
        }
      } catch {
        toast.error('Verification failed. Contact the estate manager.');
      } finally {
        setVerifying(false);
        navigate('/payments', { replace: true });
      }
    })();
  }, []);

  useEffect(() => { load(); }, [load]);

  const outstanding = payments.filter((p) => p.status === 'pending' || p.status === 'overdue');
  const history = payments.filter((p) => p.status === 'paid' || p.status === 'waived');

  const totalDue = outstanding.reduce((s, p) => s + p.amount, 0);
  const overdueCount = payments.filter((p) => p.status === 'overdue').length;

  const handlePay = async (payment) => {
    setPaying(payment._id);
    try {
      const { data } = await paymentAPI.initialize(payment._id);
      if (data.success && data.data.authorizationUrl) {
        window.location.href = data.data.authorizationUrl;
      } else {
        toast.error('Could not start payment. Try again.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment initialization failed';
      toast.error(msg);
    } finally {
      setPaying(null);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-10 text-center">
          <RefreshCw size={32} className="text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="font-semibold text-lg" style={{ color: '#0F172A' }}>Verifying your payment…</p>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Please wait, do not close this tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold" style={{ color: '#0F172A', letterSpacing: '-0.03em' }}>Payments</h1>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>View your dues, make payments, and track your history.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        <div className="glass-card p-5 flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)' }}
          >
            <Banknote size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs" style={{ color: '#94A3B8' }}>Total Outstanding</p>
            <p className="font-bold text-lg" style={{ color: '#0F172A' }}>{fmt(totalDue)}</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.20)' }}
          >
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs" style={{ color: '#94A3B8' }}>Overdue</p>
            <p className="font-bold text-lg" style={{ color: '#0F172A' }}>{overdueCount} {overdueCount === 1 ? 'item' : 'items'}</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#ECFDF5', border: '1px solid rgba(16,185,129,0.22)' }}
          >
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xs" style={{ color: '#94A3B8' }}>Paid</p>
            <p className="font-bold text-lg" style={{ color: '#0F172A' }}>{history.filter(p => p.status === 'paid').length} payments</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-5 rounded-xl p-1 w-fit"
        style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}
      >
        {[['outstanding', 'Outstanding'], ['history', 'History']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={activeTab === key
              ? { background: '#FFFFFF', color: '#0F172A', boxShadow: '0 1px 3px rgba(15,23,42,0.08)' }
              : { color: '#94A3B8' }
            }
          >
            {label}
            {key === 'outstanding' && outstanding.length > 0 && (
              <span
                className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
                style={activeTab === key
                  ? { background: '#ECFDF5', color: '#059669' }
                  : { background: '#E2E8F0', color: '#64748B' }
                }
              >
                {outstanding.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw size={24} className="text-emerald-500 animate-spin" />
        </div>
      ) : activeTab === 'outstanding' ? (
        outstanding.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold" style={{ color: '#0F172A' }}>You're all caught up!</p>
            <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>No outstanding payments at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {outstanding
              .sort((a, b) => (b.status === 'overdue') - (a.status === 'overdue'))
              .map((p) => {
                const schedule = p.scheduleId || {};
                const isOverdue = p.status === 'overdue';
                return (
                  <div
                    key={p._id}
                    className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                    style={isOverdue ? { borderColor: 'rgba(239,68,68,0.25)' } : {}}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={isOverdue
                            ? { background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.20)' }
                            : { background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)' }
                          }
                        >
                          <CreditCard size={16} className={isOverdue ? 'text-red-500' : 'text-emerald-600'} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate" style={{ color: '#0F172A' }}>{schedule.title || 'Payment Due'}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                            {schedule.type && (
                              <span className="text-xs" style={{ color: '#94A3B8' }}>{TYPE_LABEL[schedule.type] || schedule.type}</span>
                            )}
                            <span className="text-xs" style={{ color: '#CBD5E1' }}>Due {fmtDate(schedule.dueDate || p.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${isOverdue ? 'text-red-600' : ''}`}
                          style={!isOverdue ? { color: '#0F172A' } : {}}>
                          {fmt(p.amount)}
                        </p>
                        <StatusBadge status={p.status} />
                      </div>
                      <button
                        onClick={() => handlePay(p)}
                        disabled={!!paying}
                        className="btn-primary flex items-center gap-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {paying === p._id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <ExternalLink size={14} />
                        )}
                        Pay Now
                      </button>
                    </div>
                  </div>
                );
              })}
            <div
              className="flex items-start gap-2 p-3 rounded-xl mt-2"
              style={{ background: '#EFF6FF', border: '1px solid rgba(99,102,241,0.18)' }}
            >
              <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs" style={{ color: '#475569' }}>
                Clicking "Pay Now" will take you to Paystack's secure payment page. You will be redirected back here once done.
                If your payment is not reflected, contact the estate manager with your reference number.
              </p>
            </div>
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Clock size={40} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
            <p className="font-semibold" style={{ color: '#0F172A' }}>No payment history yet</p>
            <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Completed payments will appear here.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden sm:table-cell" style={{ color: '#94A3B8' }}>Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden md:table-cell" style={{ color: '#94A3B8' }}>Method</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider hidden lg:table-cell" style={{ color: '#94A3B8' }}>Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p) => {
                  const schedule = p.scheduleId || {};
                  return (
                    <tr
                      key={p._id}
                      style={{ borderBottom: '1px solid rgba(15,23,42,0.05)' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      className="transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{schedule.title || 'Payment'}</p>
                        {schedule.type && (
                          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{TYPE_LABEL[schedule.type] || schedule.type}</p>
                        )}
                        <p className="font-bold sm:hidden text-sm mt-0.5 text-emerald-600">{fmt(p.amount)}</p>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="font-semibold" style={{ color: '#0F172A' }}>{fmt(p.amount)}</span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm" style={{ color: '#64748B' }}>{METHOD_LABEL[p.method] || p.method || '—'}</span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-sm" style={{ color: '#64748B' }}>{fmtDate(p.paidAt)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={p.status} />
                        {p.paystackReference && (
                          <p className="text-xs mt-1 font-mono" style={{ color: '#CBD5E1' }}>{p.paystackReference.slice(-8)}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
