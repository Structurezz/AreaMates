import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import InviteForm from '../components/visitors/InviteForm';

// Phone screen for inviting a visitor (desktop uses the drawer on /visitors).
export default function NewVisitorPage() {
  const navigate = useNavigate();
  return (
    <div className="-mx-4 -mt-4 md:mx-0 md:mt-0 bg-white min-h-full animate-fade-in">
      <div className="sticky -top-4 md:top-0 z-20 bg-white/95 backdrop-blur flex items-center gap-2 px-2 py-2.5 border-b border-slate-100">
        <button onClick={() => navigate('/visitors')} aria-label="Back" className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100">
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-[17px] font-bold text-slate-900 leading-tight">Invite a visitor</h1>
          <p className="text-[12px] text-slate-500">They'll get a code to show at the gate</p>
        </div>
      </div>
      <div className="px-4 pt-4 max-w-lg mx-auto">
        <InviteForm sticky onCreated={(v) => navigate(`/visitors/${v._id}`, { replace: true })} />
      </div>
    </div>
  );
}
