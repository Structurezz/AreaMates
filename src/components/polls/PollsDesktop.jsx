import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BarChart2, Check, RefreshCw, Clock, Lock, TrendingUp, Vote, CheckCircle2 } from 'lucide-react';
import { pollAPI } from '../../api';
import toast from 'react-hot-toast';

export const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#0EA5E9'];
export const total = (p) => p.options.reduce((s, o) => s + o.votes.length, 0);
export const ended = (p) => !p.isActive || (p.endsAt && new Date() > new Date(p.endsAt));
export const myPicks = (p, uid) => p.options.reduce((acc, o, i) => (o.votes.some((v) => v === uid || v?.toString() === uid) ? [...acc, i] : acc), []);

function PollCard({ poll, userId, onVote, i }) {
  const [voting, setVoting] = useState(null);
  const sum = total(poll);
  const mine = myPicks(poll, userId);
  const voted = mine.length > 0;
  const closed = ended(poll);
  const showResults = voted || closed;
  const lead = sum ? poll.options.reduce((best, o, k) => (o.votes.length > poll.options[best].votes.length ? k : best), 0) : -1;

  const vote = async (idx) => {
    if (closed) return;
    setVoting(idx);
    try {
      const { data } = await pollAPI.vote(poll._id, idx);
      onVote(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vote failed');
    } finally { setVoting(null); }
  };

  return (
    <div className={`dash-rise rounded-2xl bg-white border overflow-hidden flex flex-col ${closed ? 'border-slate-200/70' : 'border-indigo-100'}`}
      style={{ animationDelay: `${80 + i * 50}ms` }}>
      <div className="p-5 flex-1">
        <div className="flex items-center gap-2 text-[11px] font-medium">
          {closed ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500"><Lock size={10} /> Closed</span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Open
            </span>
          )}
          {poll.endsAt && !closed && (
            <span className="inline-flex items-center gap-1 text-amber-600"><Clock size={11} /> Closes {formatDistanceToNow(new Date(poll.endsAt), { addSuffix: true })}</span>
          )}
          {voted && !closed && <span className="ml-auto inline-flex items-center gap-1 text-emerald-600"><Check size={11} /> You voted</span>}
        </div>
        <h3 className="mt-2 text-[15px] font-semibold text-slate-900 leading-snug">{poll.question}</h3>
        {!showResults && <p className="mt-0.5 text-[12px] text-slate-400">Tap an option to vote. Results show after you vote.</p>}

        <div className="mt-4 space-y-2">
          {poll.options.map((opt, k) => {
            const pct = sum ? Math.round((opt.votes.length / sum) * 100) : 0;
            const isMine = mine.includes(k);
            const isLead = showResults && k === lead && sum > 0;
            const color = COLORS[k % COLORS.length];
            return (
              <button key={k} onClick={() => vote(k)} disabled={closed || voting !== null}
                className={`group relative w-full overflow-hidden rounded-xl border text-left transition-all ${closed ? 'cursor-default' : 'hover:-translate-y-0.5 hover:shadow-sm'}`}
                style={{ borderColor: isMine ? color : '#E2E8F0', boxShadow: isMine ? `0 0 0 3px ${color}1F` : undefined }}>
                {showResults && (
                  <span key={`${pct}-${sum}`} className="dash-bar-x absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: `${color}${isMine ? '2E' : '17'}` }} />
                )}
                <span className="relative flex items-center gap-2.5 px-3.5 py-3">
                  {voting === k ? (
                    <RefreshCw size={14} className="animate-spin flex-shrink-0" style={{ color }} />
                  ) : isMine ? (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: color }}><Check size={10} className="text-white" /></span>
                  ) : (
                    <span className="w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors" style={{ borderColor: closed ? '#CBD5E1' : `${color}80` }} />
                  )}
                  <span className={`flex-1 min-w-0 text-[13px] ${isMine || isLead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{opt.text}</span>
                  {isLead && <TrendingUp size={13} className="text-emerald-500 flex-shrink-0" />}
                  {showResults && (
                    <span className="text-[12px] font-semibold tabular-nums flex-shrink-0" style={{ color: isMine || isLead ? color : '#94A3B8' }}>
                      {pct}% <span className="font-normal text-slate-400">· {opt.votes.length}</span>
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-400">
        <span>{sum} vote{sum === 1 ? '' : 's'}</span>
        <span>by {poll.createdBy?.name || 'Estate management'}</span>
      </div>
    </div>
  );
}

export default function PollsDesktop({ polls, loading, userId, onVote }) {
  const [tab, setTab] = useState('active');
  const active = polls.filter((p) => !ended(p));
  const closed = polls.filter(ended);
  const needVote = active.filter((p) => myPicks(p, userId).length === 0);
  const votedOn = polls.filter((p) => myPicks(p, userId).length > 0);
  const votesCast = polls.reduce((s, p) => s + total(p), 0);
  const shown = tab === 'active' ? [...needVote, ...active.filter((p) => !needVote.includes(p))] : closed;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-10">
      {/* Banner */}
      <div className="dash-rise relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background: 'linear-gradient(120deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)', boxShadow: '0 16px 32px -18px rgba(49,46,129,0.8)' }}>
        <div className="dash-blob absolute -top-20 right-64 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(16,185,129,0.25)' }} />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 border border-white/15 flex-shrink-0"><BarChart2 size={22} className="text-emerald-300" /></div>
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Polls & Voting</h1>
              <p className="text-[13px] text-indigo-100/75">
                {needVote.length > 0 ? <><span className="font-semibold text-white">{needVote.length} poll{needVote.length === 1 ? '' : 's'}</span> waiting for your vote</> : 'Vote on community decisions and see what your neighbours think'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {[['Open polls', active.length], ['Need your vote', needVote.length], ['Votes cast', votesCast], ['Closed', closed.length]].map(([label, n]) => (
              <div key={label} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 min-w-[84px]">
                <div className="text-[16px] font-semibold text-white tabular-nums leading-none">{n}</div>
                <div className="text-[10px] text-indigo-100/65 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
        <div className="space-y-4 min-w-0">
          <div className="dash-rise flex p-1 rounded-xl bg-white border border-slate-200 w-fit" style={{ animationDelay: '60ms' }}>
            {[['active', 'Open', active.length], ['closed', 'Closed', closed.length]].map(([k, label, n]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all ${tab === k ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {label} <span className={`text-[11px] tabular-nums px-1.5 rounded-md ${tab === k ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{n}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4">{[0, 1].map((k) => <div key={k} className="skeleton h-64 rounded-2xl" />)}</div>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl bg-white border border-dashed border-slate-300 py-14 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center"><BarChart2 size={24} className="text-indigo-500" /></div>
              <p className="mt-3 text-[13px] text-slate-500">{tab === 'active' ? 'No open polls right now. Check back soon!' : 'No closed polls yet.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 items-start">
              {shown.map((p, i) => <PollCard key={p._id} poll={p} i={i} userId={userId} onVote={onVote} />)}
            </div>
          )}
        </div>

        <aside className="sticky top-0 space-y-4">
          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between px-4 h-11 border-b border-slate-100">
              <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-amber-500"><Vote size={12} className="text-white" /></span>
                Waiting for you
              </h3>
              <span className="text-[12px] text-slate-400">{needVote.length}</span>
            </div>
            {needVote.length === 0 ? (
              <div className="px-4 py-4 flex items-center gap-2 text-[12px] text-emerald-700"><CheckCircle2 size={14} /> You're all caught up.</div>
            ) : (
              <div className="py-1.5">
                {needVote.slice(0, 5).map((p) => (
                  <button key={p._id} onClick={() => setTab('active')} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors">
                    <div className="text-[13px] font-medium text-slate-900 line-clamp-2">{p.question}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{total(p)} votes so far{p.endsAt ? ` · closes ${formatDistanceToNow(new Date(p.endsAt), { addSuffix: true })}` : ''}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '140ms' }}>
            <div className="flex items-center justify-between px-4 h-11 border-b border-slate-100">
              <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-600"><Check size={12} className="text-white" /></span>
                Your votes
              </h3>
              <span className="text-[12px] text-slate-400">{votedOn.length}</span>
            </div>
            {votedOn.length === 0 ? (
              <p className="px-4 py-4 text-[12px] text-slate-400">You haven't voted yet.</p>
            ) : (
              <div className="py-1.5">
                {votedOn.slice(0, 6).map((p) => {
                  const picks = myPicks(p, userId).map((k) => p.options[k]?.text).filter(Boolean);
                  return (
                    <div key={p._id} className="px-4 py-2">
                      <div className="text-[12px] text-slate-500 line-clamp-1">{p.question}</div>
                      <div className="text-[13px] font-medium text-indigo-700 truncate">{picks.join(', ')}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
