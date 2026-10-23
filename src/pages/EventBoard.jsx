import { useEffect, useState } from 'react';
import { eventAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import EventsDesktop from '../components/events/EventsDesktop';
import EventsMobile from '../components/events/EventsMobile';
import useIsDesktop from '../hooks/useIsDesktop';

export default function EventBoard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    eventAPI.getAll()
      .then(({ data }) => setEvents(data.data))
      .catch(() => toast.error('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  const updateEvent = (updated) => setEvents(prev => prev.map(e => e._id === updated._id ? updated : e));

  if (isDesktop) return <EventsDesktop events={events} loading={loading} userId={user?._id} onRsvp={updateEvent} />;
  return <EventsMobile events={events} loading={loading} userId={user?._id} onRsvp={updateEvent} />;
}
