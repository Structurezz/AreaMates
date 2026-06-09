import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { paymentAPI } from '../api';
import toast from 'react-hot-toast';
import {
  CreditCard, Clock, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, ExternalLink, Banknote, ChevronRight, Info,
} from 'lucide-react';

const STATUS = {
  paid:    { label: 'Paid',    icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' },
  pending: { label: 'Pending', icon: Clock,          color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
  overdue: { label: 'Overdue', icon: AlertTriangle,  color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/20' },
  waived:  { label: 'Waived',  icon: XCircle,        color: 'text-slate-400',   bg: 'bg-slate-400/10',   border: 'border-slate-400/20' },
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
          <RefreshCw size={32} className="text-gold animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">Verifying your payment…</p>
          <p className="text-white/40 text-sm mt-1">Please wait, do not close this tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-white">Payments</h1>
        <p className="text-white/40 text-sm mt-1">View your dues, make payments, and track your history.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
            <Banknote size={18} className="text-gold" />
          </div>
          <div>
            <p className="text-white/40 text-xs">Total Outstanding</p>
            <p className="text-white font-bold text-lg">{fmt(totalDue)}</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-400/10 border border-red-400/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-white/40 text-xs">Overdue</p>
            <p className="text-white font-bold text-lg">{overdueCount} {overdueCount === 1 ? 'item' : 'items'}</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-white/40 text-xs">Paid</p>
            <p className="text-white font-bold text-lg">{history.filter(p => p.status === 'paid').length} payments</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#111115] border border-white/8 rounded-xl p-1 w-fit">
        {[['outstanding', 'Outstanding'], ['history', 'History']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === key ? 'bg-gold text-navy' : 'text-white/40 hover:text-white'
            }`}>
            {label}
            {key === 'outstanding' && outstanding.length > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === key ? 'bg-navy/30 text-white' : 'bg-white/10 text-white/60'
              }`}>{outstanding.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw size={24} className="text-gold animate-spin" />
        </div>
      ) : activeTab === 'outstanding' ? (
        outstanding.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-semibold">You're all caught up!</p>
            <p className="text-white/40 text-sm mt-1">No outstanding payments at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {outstanding
              .sort((a, b) => (b.status === 'overdue') - (a.status === 'overdue'))
              .map((p) => {
                const schedule = p.scheduleId || {};
                const isOverdue = p.status === 'overdue';
                return (
                  <div key={p._id}
                    className={`glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${
                      isOverdue ? 'border-red-400/20' : ''
                    }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isOverdue ? 'bg-red-400/10' : 'bg-gold/10'
                        }`}>
                          <CreditCard size={16} className={isOverdue ? 'text-red-400' : 'text-gold'} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate">{schedule.title || 'Payment Due'}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                            {schedule.type && (
                              <span className="text-xs text-white/40">{TYPE_LABEL[schedule.type] || schedule.type}</span>
                            )}
                            <span className="text-xs text-white/30">Due {fmtDate(schedule.dueDate || p.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${isOverdue ? 'text-red-400' : 'text-white'}`}>{fmt(p.amount)}</p>
                        <StatusBadge status={p.status} />
                      </div>
                      <button
                        onClick={() => handlePay(p)}
                        disabled={!!paying}
                        className="flex items-center gap-2 px-4 py-2 bg-gold text-navy rounded-xl font-semibold text-sm hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
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
            <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl mt-2">
              <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-white/40">
                Clicking "Pay Now" will take you to Paystack's secure payment page. You will be redirected back here once done.
                If your payment is not reflected, contact the estate manager with your reference number.
              </p>
            </div>
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Clock size={40} className="text-white/20 mx-auto mb-3" />
            <p className="text-white font-semibold">No payment history yet</p>
            <p className="text-white/40 text-sm mt-1">Completed payments will appear here.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-5 py-3 text-xs font-medium text-white/30 uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/30 uppercase tracking-wider hidden sm:table-cell">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/30 uppercase tracking-wider hidden md:table-cell">Method</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/30 uppercase tracking-wider hidden lg:table-cell">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-white/30 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((p) => {
                  const schedule = p.scheduleId || {};
                  return (
                    <tr key={p._id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-white text-sm font-medium">{schedule.title || 'Payment'}</p>
                        {schedule.type && (
                          <p className="text-white/30 text-xs mt-0.5">{TYPE_LABEL[schedule.type] || schedule.type}</p>
                        )}
                        <p className="text-gold font-bold sm:hidden text-sm mt-0.5">{fmt(p.amount)}</p>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-white font-semibold">{fmt(p.amount)}</span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-white/50 text-sm">{METHOD_LABEL[p.method] || p.method || '—'}</span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-white/50 text-sm">{fmtDate(p.paidAt)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={p.status} />
                        {p.paystackReference && (
                          <p className="text-white/20 text-xs mt-1 font-mono">{p.paystackReference.slice(-8)}</p>
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
