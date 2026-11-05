import { Link } from 'react-router-dom';
import { Lock, Users, ArrowRight } from 'lucide-react';
import { useHousehold, PERMISSION_LABELS } from '../../hooks/useHousehold';
import { useSite } from '../../context/SiteContext';

// Shown to a family member who opens a feature their household head hasn't
// switched on for them.
export default function HouseholdGate({ perm, children }) {
  const { householdAllows, head } = useHousehold();
  const { terms, isEstate } = useSite();
  if (householdAllows(perm)) return children;
  const feature = (perm === 'payments' && !isEstate ? terms.dues : PERMISSION_LABELS[perm]) || 'This feature';
  const hh = terms.household.toLowerCase();
  const headName = head?.name?.split(' ')[0] || `the head of your ${hh}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-11rem)] lg:min-h-[calc(100dvh-9rem)] text-center px-6">
      <div className="relative mb-6 dash-rise">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)', border: '1px solid #C7D2FE' }}>
          <Users size={32} style={{ color: '#6366F1' }} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow"
          style={{ border: '1.5px solid #C7D2FE' }}>
          <Lock size={14} style={{ color: '#4F46E5' }} />
        </div>
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#0F172A' }}>{feature} isn't on for you yet</h2>
      <p className="text-sm max-w-sm leading-relaxed mb-6" style={{ color: '#64748B' }}>
        Your {hh} decides what {terms.familyPlural.toLowerCase()} can use. Ask <span className="font-semibold text-slate-700">{headName}</span> to
        turn on <span className="font-semibold text-slate-700">{feature.toLowerCase()}</span> for you in My {terms.household}.
      </p>
      <Link to="/household" className="btn-primary inline-flex items-center gap-2">
        See my {hh} <ArrowRight size={14} />
      </Link>
    </div>
  );
}
