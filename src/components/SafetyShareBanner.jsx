import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useSafety } from '../context/SafetyContext';

// Always-visible reminder while live location is being shared with staff.
export default function SafetyShareBanner() {
  const { sharing, stopSharing } = useSafety() || {};
  if (!sharing) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm text-white bg-red-600" role="status">
      <span className="relative flex w-2.5 h-2.5 shrink-0">
        <span className="absolute inline-flex w-full h-full rounded-full bg-white opacity-75 animate-ping" />
        <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-white" />
      </span>
      <MapPin size={15} className="shrink-0" />
      <Link to="/safety" className="flex-1 min-w-0 truncate font-semibold">Sharing your live location with security</Link>
      <button onClick={() => stopSharing()} className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 shrink-0">Stop</button>
    </div>
  );
}
