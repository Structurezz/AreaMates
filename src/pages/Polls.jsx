import { useEffect, useState } from 'react';
import { pollAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import PollsDesktop from '../components/polls/PollsDesktop';
import PollsMobile from '../components/polls/PollsMobile';
import useIsDesktop from '../hooks/useIsDesktop';

export default function Polls() {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    pollAPI.getAll()
      .then(({ data }) => setPolls(data.data))
      .catch(() => toast.error('Failed to load polls'))
      .finally(() => setLoading(false));
  }, []);

  const updatePoll = (updated) => setPolls(prev => prev.map(p => p._id === updated._id ? updated : p));

  if (isDesktop) return <PollsDesktop polls={polls} loading={loading} userId={user?._id} onVote={updatePoll} />;
  return <PollsMobile polls={polls} loading={loading} userId={user?._id} onVote={updatePoll} />;
}
