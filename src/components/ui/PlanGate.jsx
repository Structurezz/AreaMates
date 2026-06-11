import { Lock, ArrowUpRight, Sparkles } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';

export default function PlanGate({ feature, featureName, children }) {
  const { can, loading, planName, planColor } = usePlan();

  if (loading) return null;
  if (can(feature)) return children;

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center px-6">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#F1F5F9,#E2E8F0)', border: '1px solid #CBD5E1' }}>
          <Lock size={32} style={{ color: '#94A3B8' }} />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: '#EEF2FF', border: '1.5px solid #818CF8' }}>
          <Sparkles size={12} style={{ color: '#6366F1' }} />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2" style={{ color: '#0F172A' }}>
        {featureName} is locked
      </h2>
      <p className="text-sm mb-1 max-w-sm leading-relaxed" style={{ color: '#475569' }}>
        Your estate's current plan
        <span className="font-semibold mx-1" style={{ color: planColor }}>({planName})</span>
        doesn't include <span className="font-semibold">{featureName}</span>.
      </p>
      <p className="text-sm mb-8 max-w-sm" style={{ color: '#94A3B8' }}>
        Ask your estate manager to upgrade the estate plan to unlock this feature.
      </p>

      <div
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white"
        style={{ background: '#6366F1', boxShadow: '0 4px 14px rgba(99,102,241,0.3)' }}>
        <ArrowUpRight size={16} />
        Contact Your Estate Manager
      </div>

      <p className="text-xs mt-4" style={{ color: '#CBD5E1' }}>
        Already upgraded? Try refreshing the page.
      </p>
    </div>
  );
}
