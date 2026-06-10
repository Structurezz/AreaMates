import { useEffect, useState } from 'react';
import { BarChart2, Check, RefreshCw, Clock, Lock } from 'lucide-react';
import { pollAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function PollCard({ poll, userId, onVote }) {
  const [voting, setVoting] = useState(null);
  const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);
  const myVotes = poll.options.reduce((acc, opt, i) => {
    if (opt.votes.some(v => v === userId || v?.toString() === userId)) acc.push(i);
    return acc;
  }, []);
  const hasVoted = myVotes.length > 0;
  const isEnded = !poll.isActive || (poll.endsAt && new Date() > new Date(poll.endsAt));

  const vote = async (idx) => {
    if (isEnded) return;
    setVoting(idx);
    try {
      const { data } = await pollAPI.vote(poll._id, idx);
      onVote(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vote failed');
    } finally {
      setVoting(null);
    }
  };

  const colors = ['#60A5FA', '#34D399', '#F59E0B', '#F472B6', '#A78BFA', '#FB923C'];

  return (
    <div className={`glass-card p-5 ${isEnded ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-semibold text-[#0F172A] leading-snug flex-1">{poll.question}</h3>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isEnded && (
            <span className="flex items-center gap-1 text-xs text-[#94A3B8] px-2 py-0.5 rounded-full bg-[#F1F5F9]">
              <Lock size={10} /> Closed
            </span>
          )}
          {poll.endsAt && !isEnded && (
            <span className="flex items-center gap-1 text-xs text-amber-600">
              <Clock size={10} />
              {new Date(poll.endsAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {poll.options.map((opt, i) => {
          const pct = totalVotes ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
          const isMyVote = myVotes.includes(i);
          const color = colors[i % colors.length];

          return (
            <button key={i} onClick={() => vote(i)}
              disabled={isEnded || !!voting}
              className={`w-full text-left relative overflow-hidden rounded-xl transition-all group ${
                isEnded ? 'cursor-default' : 'cursor-pointer hover:border-[#CBD5E1]'
              } ${isMyVote ? 'border' : 'border border-transparent'}`}
              style={isMyVote ? { borderColor: color + '60' } : {}}>
              {/* Progress fill */}
              <div className="absolute inset-0 rounded-xl transition-all duration-500"
                style={{ width: `${pct}%`, background: color + (isMyVote ? '25' : '10') }} />
              {/* Content */}
              <div className="relative px-3 py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {voting === i ? (
                    <RefreshCw size={12} className="animate-spin flex-shrink-0" style={{ color }} />
                  ) : isMyVote ? (
                    <Check size={12} className="flex-shrink-0" style={{ color }} />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-[#CBD5E1] flex-shrink-0 group-hover:border-[#94A3B8] transition-colors"
                      style={isMyVote ? { borderColor: color, background: color } : {}} />
                  )}
                  <span className={`text-sm ${isMyVote ? 'font-medium text-[#0F172A]' : 'text-[#475569]'}`}>{opt.text}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold" style={{ color: isMyVote ? color : '#94A3B8' }}>{pct}%</span>
                  <span className="text-xs text-[#CBD5E1]">{opt.votes.length}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-3 border-t border-[#E2E8F0]">
        <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''} total</span>
        <span>by {poll.createdBy?.name || 'Estate'}</span>
        {hasVoted && !isEnded && <span className="text-emerald-600 flex items-center gap-1"><Check size={10} /> You voted</span>}
      </div>
    </div>
  );
}

export default function Polls() {
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('active');

  useEffect(() => {
    pollAPI.getAll()
      .then(({ data }) => setPolls(data.data))
      .catch(() => toast.error('Failed to load polls'))
      .finally(() => setLoading(false));
  }, []);

  const updatePoll = (updated) => setPolls(prev => prev.map(p => p._id === updated._id ? updated : p));

  const active = polls.filter(p => p.isActive && (!p.endsAt || new Date() <= new Date(p.endsAt)));
  const closed = polls.filter(p => !p.isActive || (p.endsAt && new Date() > new Date(p.endsAt)));
  const shown = tab === 'active' ? active : closed;

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
          <BarChart2 size={22} className="text-emerald-600" /> Polls & Voting
        </h1>
        <p className="text-[#94A3B8] text-sm mt-0.5">Vote on community decisions and see what your neighbours think</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Polls', value: active.length, color: '#34D399' },
          { label: 'Total Votes Cast', value: polls.reduce((s, p) => s + p.options.reduce((ss, o) => ss + o.votes.length, 0), 0), color: '#60A5FA' },
          { label: 'Closed Polls', value: closed.length, color: '#6B7280' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs text-[#94A3B8] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F1F5F9] rounded-xl p-1 w-fit">
        {[
          { key: 'active', label: `Active (${active.length})` },
          { key: 'closed', label: `Closed (${closed.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key ? 'bg-emerald-600 text-white' : 'text-[#475569] hover:text-[#0F172A]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><RefreshCw size={20} className="text-emerald-600 animate-spin" /></div>
      ) : shown.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <BarChart2 size={28} className="text-[#CBD5E1] mx-auto mb-3" />
          <p className="text-[#94A3B8] text-sm">
            {tab === 'active' ? 'No active polls right now. Check back soon!' : 'No closed polls yet.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {shown.map(poll => (
            <PollCard key={poll._id} poll={poll} userId={user?._id} onVote={updatePoll} />
          ))}
        </div>
      )}
    </div>
  );
}
