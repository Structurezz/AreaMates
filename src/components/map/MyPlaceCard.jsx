import { Link } from 'react-router-dom';
import { Navigation, ArrowRight } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import useSitePlaces from '../../hooks/useSitePlaces';
import { directionsFor } from '../../utils/googleMaps';
import { kindMeta, myPlaceWord } from './placeKinds';

/** "Your hall · Moremi Hall · Directions" on the dashboard (only when the member has a place). */
export default function MyPlaceCard({ compact = false }) {
  const site = useSite();
  const { myPlace } = useSitePlaces();
  if (!myPlace?.name) return null;
  const { color, Icon } = kindMeta(myPlace.kind, site.type);
  const url = directionsFor(myPlace);

  return (
    <section className={`dash-rise flex items-center gap-3 rounded-2xl border ${compact ? 'p-3.5' : 'px-5 py-4'}`}
      style={{ animationDelay: '50ms', background: `linear-gradient(140deg, ${color}14 0%, #FFFFFF 60%)`, borderColor: `${color}2E` }}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 14px -6px ${color}` }}>
        <Icon size={18} className="text-white" />
      </span>
      <Link to="/map" className="flex-1 min-w-0" style={{ textDecoration: 'none' }}>
        <span className="block text-[12px] font-medium text-slate-500">Your {myPlaceWord(myPlace.kind, site.type)}</span>
        <span className="flex items-center gap-1 text-[15px] font-semibold text-slate-900 truncate" style={{ letterSpacing: '-0.01em' }}>
          <span className="truncate">{myPlace.name}</span> <ArrowRight size={13} className="text-slate-400 flex-shrink-0" />
        </span>
      </Link>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-2 rounded-xl text-white flex-shrink-0 active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
          <Navigation size={13} /> Directions
        </a>
      )}
    </section>
  );
}
