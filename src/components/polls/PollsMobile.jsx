import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { BarChart2, Check, RefreshCw, Clock, Lock, TrendingUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { pollAPI } from '../../api';
import { COLORS, total, ended, myPicks } from './PollsDesktop';

// Phone layout for Polls. Results stay visible (as before on phones);
// once you've voted they fold away behind a tap to keep the list tidy.

function PollCard({ poll, userId, onVote, i }) {
  const [voting, setVoting] = useState(null);
  const picks = myPicks(poll, userId);
  const voted = picks.length > 0;
  const closed = ended(poll);
  const [open, setOpen] = useState(!voted || closed);
  const sum = total(poll);
  const top = sum ? Math.max(...poll.options.map((o) => o.votes.length)) : -1;

  const vote = async (idx) => {
    if (closed || voting != null) return;
    setVoting(idx);
    try {
      const { data } = await pollAPI.vote(poll._id, idx);
      onVote(data.data);
      setOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Vote failed');
    } finally { setVoting(null); }
  };

  const leader = top > 0 ? poll.options.find((o) => o.votes.length === top) : null;

  return (
    <div className={`dash-rise rounded-2xl bg-white border p-4 ${!voted && !closed ? 'border-indigo-200 shadow-sm' : 'border-slate-200/80'}`} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
      <div className="flex items-center gap-2 text-[11px] font-semibold">
        {closed
          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500"><Lock size={10} /> Closed</span>
          : voted
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700"><Check size={10} /> You voted</span>
            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" /> Needs your vote</span>}
        {!closed && poll.endsAt && (
          <span className="text-amber-600 inline-flex items-center gap-1 font-medium"><Clock size={10} /> closes {formatDistanceToNow(new Date(poll.endsAt), { addSuffix: true })}</span>
        )}
      </div>
      <h3 className="mt-2 text-[15px] font-semibold text-slate-900 leading-snug">{poll.question}</h3>

      {open ? (
        <div className="mt-3 space-y-2">
          {poll.options.map((o, k) => {
            const pct = sum ? Math.round((o.votes.length / sum) * 100) : 0;
            const mine = picks.includes(k);
            const lead = top > 0 && o.votes.length === top;
            const color = COLORS[k % COLORS.length];
            return (
              <button key={k} onClick={() => vote(k)} disabled={closed || voting != null}
                className={`relative w-full min-h-[46px] text-left rounded-xl overflow-hidden border transition-all ${closed ? 'cursor-default' : 'active:scale-[0.99]'}`}
                style={{ borderColor: mine ? color : '#E2E8F0', boxShadow: mine ? `0 0 0 2px ${color}26` : undefined }}>
                <span key={`${sum}-${pct}`} className="dash-bar-x absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: `${color}${mine ? '2E' : '17'}` }} />
                <span className="relative flex items-center gap-2.5 px-3 py-2.5">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border"
                    style={mine ? { background: color, borderColor: color } : { borderColor: '#CBD5E1' }}>
                    {voting === k ? <RefreshCw size={11} className="animate-spin text-slate-500" /> : mine ? <Check size={12} className="text-white" /> : null}
                  </span>
                  <span className={`flex-1 text-[14px] ${mine ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{o.text}</span>
                  {lead && <TrendingUp size={13} className="text-emerald-500 flex-shrink-0" />}
                  <span className="text-[13px] font-semibold tabular-nums flex-shrink-0" style={{ color: mine ? color : '#64748B' }}>{pct}%</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-3 w-full flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-left">
          <span className="flex-1 min-w-0 text-[13px] text-slate-600 truncate">
            You picked <span className="font-semibold text-slate-900">{picks.map((k) => poll.options[k]?.text).join(', ')}</span>
            {leader && <> · leading: <span className="font-semibold text-slate-900">{leader.text}</span></>}
          </span>
          <span className="text-[12px] font-semibold text-indigo-600 flex items-center gap-0.5 flex-shrink-0">Results <ChevronDown size={13} /></span>
        </button>
      )}

      <div className="mt-3 flex items-center justify-between text-[12px] text-slate-400">
        <span>{sum} vote{sum === 1 ? '' : 's'}</span>
        <span className="truncate ml-2">by {poll.createdBy?.name || 'Estate'}</span>
        {open && voted && !closed && (
          <button onClick={() => setOpen(false)} className="ml-2 text-indigo-600 font-semibold">Hide</button>
        )}
      </div>
    </div>
  );
}

export default function PollsMobile({ polls, loading, userId, onVote }) {
  const [tab, setTab] = useState('open');
  const open = polls.filter((p) => !ended(p));
  const closed = polls.filter((p) => ended(p));
  const waiting = open.filter((p) => myPicks(p, userId).length === 0);
  const votesCast = polls.filter((p) => myPicks(p, userId).length > 0).length;
  const shown = tab === 'open'
    ? [...open].sort((a, b) => (myPicks(a, userId).length > 0) - (myPicks(b, userId).length > 0))
    : closed;

  return (
    <div className="pb-6 animate-fade-in">
      {/* Hero */}
      <div className="-mx-4 -mt-4 px-4 pt-5 pb-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)' }}>
        <div className="dash-blob absolute -top-16 -right-12 w-48 h-48 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(129,140,248,0.35)' }} />
        <div className="relative">
          <h1 className="text-[20px] font-bold text-white flex items-center gap-2"><BarChart2 size={19} /> Polls</h1>
          <p className="text-[13px] text-indigo-100/80 mt-0.5">
            {loading ? 'Loading…' : waiting.length ? <><span className="font-semibold text-white">{waiting.length} poll{waiting.length === 1 ? '' : 's'}</span> need your vote</> : "You're all caught up"}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[['Open', open.length], ['Voted', votesCast], ['Closed', closed.length]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/10 border border-white/15 px-3 py-2">
                <div className="text-[17px] font-bold tabular-nums leading-none">{loading ? '–' : v}</div>
                <div className="text-[11px] text-indigo-100/75 mt-1">{k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky -top-4 z-20 -mx-4 px-4 pt-3 pb-2 bg-[#F8FAFC]/95 backdrop-blur">
        <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100">
          {[['open', 'Open', open.length], ['closed', 'Closed', closed.length]].map(([k, label, n]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`min-h-[36px] rounded-lg text-[13px] font-semibold transition-all ${tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {label} <span className="text-slate-400 font-normal tabular-nums">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 mt-1">{[0, 1].map((k) => <div key={k} className="skeleton h-[200px] rounded-2xl" />)}</div>
      ) : shown.length === 0 ? (
        <div className="mt-2 rounded-2xl bg-white border border-dashed border-slate-300 py-12 px-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center"><BarChart2 size={22} className="text-indigo-500" /></div>
          <p className="mt-3 text-[14px] font-semibold text-slate-800">{tab === 'open' ? 'No open polls right now' : 'No closed polls yet'}</p>
          <p className="mt-1 text-[13px] text-slate-500">{tab === 'open' ? 'Check back soon.' : 'Finished polls will show their results here.'}</p>
        </div>
      ) : (
        <div className="mt-1 space-y-3">
          {shown.map((p, i) => <PollCard key={p._id} poll={p} i={i} userId={userId} onVote={onVote} />)}
        </div>
      )}
    </div>
  );
}
