import { Link } from 'react-router-dom';
import { Ban, ArrowRight } from 'lucide-react';
import { useSite } from '../../context/SiteContext';

const FEATURE_NAMES = {
  payments: null, // uses terms.dues
  marketplace: 'The marketplace',
  community: 'The community lounge',
  events: 'The event board',
  neighbours: 'The directory',
  household: null, // uses terms.household
  gatelog: 'Deliveries & vehicles',
  shifts: 'Staff shifts',
  stays: 'Guest stays',
  visiting: 'Visiting hours',
  requests: 'Requests',
  rollcall: 'Emergency roll-call',
};

// Shown instead of a page whose site module is switched off (e.g. the
// marketplace at a hospital).
export default function ModuleGate({ module, children }) {
  const { moduleOn, name, terms } = useSite();
  if (!module || moduleOn(module)) return children;
  const feature = module === 'payments' ? terms.dues
    : module === 'household' ? `My ${terms.household.toLowerCase()}`
    : FEATURE_NAMES[module] || 'This feature';

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-11rem)] lg:min-h-[calc(100dvh-9rem)] text-center px-6">
      <div className="mb-6 dash-rise w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#F1F5F9,#E2E8F0)', border: '1px solid #CBD5E1' }}>
        <Ban size={32} style={{ color: '#64748B' }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#0F172A' }}>Not available at {name}</h2>
      <p className="text-sm max-w-sm leading-relaxed mb-6" style={{ color: '#64748B' }}>
        {feature} isn't part of AreaMates at {name}. If you think it should be, ask the {terms.manager.toLowerCase()}.
      </p>
      <Link to="/dashboard" className="btn-primary inline-flex items-center gap-2">
        Back to home <ArrowRight size={14} />
      </Link>
    </div>
  );
}
