import { useEffect, useState } from 'react';
import { Calendar, MapPin, Users, Check, RefreshCw, Clock } from 'lucide-react';
import { eventAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function EventCard({ event, userId, onRsvp }) {
  const [loading, setLoading] = useState(false);
  const hasRsvped = event.rsvps?.some(id => id === userId || id?._id === userId || id?.toString() === userId);
  const isPast = new Date(event.date) < new Date();

  const handleRsvp = async () => {
    setLoading(true);
    try {
      const { data } = await eventAPI.rsvp(event._id);
      onRsvp(data.data);
    } catch {
      toast.error('Could not update RSVP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`glass-card p-5 flex flex-col transition-all ${isPast ? 'opacity-50' : 'hover:border-white/20'} ${event.isFridayFunTimes ? 'border-amber-500/30' : ''}`}>
      {event.isFridayFunTimes && (
        <div className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">🎉 Friday Night FunTimes</div>
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-white leading-snug">{event.title}</h3>
          {event.organizer && <p className="text-xs text-white/35 mt-0.5">by {event.organizer}</p>}
        </div>
        {!isPast && (
          <button onClick={handleRsvp} disabled={loading}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              hasRsvped
                ? 'bg-emerald-500/15 text-emerald-400 hover:bg-red-500/10 hover:text-red-400'
                : 'bg-white/8 text-white/60 hover:bg-blue-500/15 hover:text-blue-400'
            } disabled:opacity-50`}>
            {loading ? <RefreshCw size={11} className="animate-spin" /> : hasRsvped ? <Check size={11} /> : <Users size={11} />}
            {hasRsvped ? 'Going' : 'RSVP'}
          </button>
        )}
      </div>

      <div className="space-y-1.5 mb-3 flex-1">
        <div className="flex items-center gap-2 text-xs text-white/45">
          <Calendar size={11} className="text-blue-400 flex-shrink-0" />
          {new Date(event.date).toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {event.time && ` at ${event.time}`}
        </div>
        {event.location && (
          <div className="flex items-center gap-2 text-xs text-white/45">
            <MapPin size={11} className="text-red-400 flex-shrink-0" />
            {event.location}
          </div>
        )}
      </div>

      {event.description && (
        <p className="text-xs text-white/40 leading-relaxed mb-3 line-clamp-2">{event.description}</p>
      )}

      <div className="flex items-center gap-2 pt-3 border-t border-white/5">
        <Users size={11} className="text-white/20" />
        <span className="text-xs text-white/30">{event.rsvps?.length || 0} going</span>
        {isPast && <span className="ml-auto text-xs text-white/20">Past event</span>}
      </div>
    </div>
  );
}

export default function EventBoard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  useEffect(() => {
    eventAPI.getAll()
      .then(({ data }) => setEvents(data.data))
      .catch(() => toast.error('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  const updateEvent = (updated) => setEvents(prev => prev.map(e => e._id === updated._id ? updated : e));

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
  const past = events.filter(e => new Date(e.date) < now).sort((a, b) => new Date(b.date) - new Date(a.date));
  const myEvents = events.filter(e => e.rsvps?.some(id => id === user?._id || id?.toString() === user?._id));
  const shown = tab === 'upcoming' ? upcoming : tab === 'past' ? past : myEvents;

  const nextEvent = upcoming[0];

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar size={22} className="text-blue-400" /> Event Board
        </h1>
        <p className="text-white/40 text-sm mt-0.5">Estate events, activities, and Friday Night FunTimes</p>
      </div>

      {/* Next event banner */}
      {nextEvent && (
        <div className="glass-card p-4 flex items-center gap-4" style={{ borderColor: nextEvent.isFridayFunTimes ? '#F59E0B40' : '#60A5FA30' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
            style={{ background: nextEvent.isFridayFunTimes ? '#F59E0B18' : '#60A5FA18' }}>
            {nextEvent.isFridayFunTimes ? '🎉' : '📅'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white/40 mb-0.5">Up Next</div>
            <div className="font-semibold text-white truncate">{nextEvent.title}</div>
            <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
              <Clock size={10} />
              {new Date(nextEvent.date).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}
              {nextEvent.time && ` · ${nextEvent.time}`}
              {nextEvent.location && ` · ${nextEvent.location}`}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold" style={{ color: nextEvent.isFridayFunTimes ? '#F59E0B' : '#60A5FA' }}>
              {nextEvent.rsvps?.length || 0}
            </div>
            <div className="text-xs text-white/30">going</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 w-fit">
        {[
          { key: 'upcoming', label: `Upcoming (${upcoming.length})` },
          { key: 'mine',     label: `My RSVPs (${myEvents.length})` },
          { key: 'past',     label: `Past (${past.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="text-gold animate-spin" /></div>
      ) : shown.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Calendar size={28} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/30 text-sm">
            {tab === 'upcoming' ? 'No upcoming events' : tab === 'mine' ? "You haven't RSVPed to any events" : 'No past events'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map(ev => (
            <EventCard key={ev._id} event={ev} userId={user?._id} onRsvp={updateEvent} />
          ))}
        </div>
      )}
    </div>
  );
}
