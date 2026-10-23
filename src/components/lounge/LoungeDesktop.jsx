import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, BarChart2, ArrowRight, Mic, Sparkles, Music, Zap, Radio, Heart, MessageSquare, Headphones } from 'lucide-react';
import { eventAPI, pollAPI, djAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';

const pad = (n) => String(n).padStart(2, '0');

/* ── Slim gradient banner with the Friday countdown ─────────────────── */
export function LoungeBanner({ isFridayNight, countdown, name }) {
  return (
    <div className="dash-rise relative overflow-hidden rounded-2xl px-6 py-5"
      style={{ background: 'linear-gradient(120deg, #1E1B4B 0%, #312E81 50%, #4F46E5 100%)', boxShadow: '0 16px 32px -18px rgba(49,46,129,0.8)' }}>
      <div className="dash-blob absolute -top-20 right-48 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(129,140,248,0.35)' }} />
      <div className="dash-blob absolute -bottom-24 left-24 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.4)', animationDelay: '-6s' }} />
      <div className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '16px 16px',
          maskImage: 'linear-gradient(90deg, transparent 35%, black 100%)', WebkitMaskImage: 'linear-gradient(90deg, transparent 35%, black 100%)',
        }} />
      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
            <Sparkles size={11} /> Community
          </span>
          <h1 className="mt-2 text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Lounge</h1>
          <p className="mt-0.5 text-[13px] text-white/75">Hang out with your neighbours{name ? `, ${name}` : ''}: posts, events, polls and music.</p>
        </div>

        {isFridayNight ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 backdrop-blur text-white">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-amber-300 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-amber-300" />
            </span>
            <span className="text-[13px] font-semibold">🎉 Friday Night FunTimes is live</span>
          </div>
        ) : (
          <div className="flex-shrink-0 text-right">
            <div className="text-[11px] font-medium text-white/70 mb-1.5">🎉 Friday Night FunTimes starts in</div>
            <div className="flex items-center gap-1.5 justify-end">
              {[['d', countdown.d], ['h', countdown.h], ['m', countdown.m], ['s', countdown.s]].map(([u, v]) => (
                <div key={u} className="w-11 py-1.5 rounded-lg bg-white/15 border border-white/20 backdrop-blur text-center">
                  <div className="text-[16px] font-semibold text-white tabular-nums leading-none">{pad(v)}</div>
                  <div className="text-[9px] font-medium uppercase text-white/60 mt-0.5">{u}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Left rail: section nav + quick actions ─────────────────────────── */
export function LoungeNav({ tabs, tab, onTab }) {
  const navigate = useNavigate();
  return (
    <aside className="space-y-4">
      <nav className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-2" style={{ animationDelay: '60ms' }}>
        {tabs.map(({ key, Icon, label, color }) => {
          const on = tab === key;
          return (
            <button key={key} onClick={() => onTab(key)}
              className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${on ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              style={on ? { background: `linear-gradient(90deg, ${color}17, transparent)` } : undefined}>
              {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full" style={{ background: color }} />}
              <span className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={on ? { background: `linear-gradient(135deg, ${color}, ${color}CC)`, boxShadow: `0 6px 12px -6px ${color}` } : { background: `${color}14` }}>
                <Icon size={14} style={{ color: on ? '#fff' : color }} />
              </span>
              {label}
            </button>
          );
        })}
      </nav>

      <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-3 space-y-2" style={{ animationDelay: '120ms' }}>
        <div className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quick actions</div>
        {[
          { label: 'Go live', Icon: Mic, color: '#4F46E5', run: () => navigate('/lounge/live') },
          { label: 'Request a song', Icon: Music, color: '#EC4899', run: () => onTab('music') },
          { label: 'Plan an activity', Icon: Zap, color: '#8B5CF6', run: () => onTab('activities') },
        ].map(({ label, Icon, color, run }) => (
          <button key={label} onClick={run}
            className="group w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[13px] font-medium text-slate-700 transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: `linear-gradient(135deg, ${color}12, #fff 70%)`, borderColor: `${color}26` }}>
            <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: color }}>
              <Icon size={12} className="text-white" />
            </span>
            {label}
            <ArrowRight size={14} className="ml-auto text-slate-400 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>
    </aside>
  );
}

/* ── Right rail (feed only): what's coming up ───────────────────────── */
function RailCard({ title, Icon, color, action, children, i }) {
  return (
    <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: `${100 + i * 60}ms` }}>
      <div className="flex items-center justify-between px-4 h-11 border-b border-slate-100">
        <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}>
            <Icon size={12} className="text-white" />
          </span>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function LoungeRightRail({ onTab, catMap, userId }) {
  const navigate = useNavigate();
  const { subscribe } = useSocket() || {};
  const [events, setEvents] = useState(null);
  const [polls, setPolls] = useState(null);
  const [liveRoom, setLiveRoom] = useState(null);

  useEffect(() => {
    eventAPI.getAll().then(({ data }) => setEvents(data.data || [])).catch(() => setEvents([]));
    pollAPI.getAll().then(({ data }) => setPolls(data.data || [])).catch(() => setPolls([]));
    djAPI.getActive().then(({ data }) => setLiveRoom(data.data)).catch(() => {});
    if (!subscribe) return undefined;
    const u1 = subscribe('dj:started', (s) => setLiveRoom(s));
    const u2 = subscribe('dj:ended', () => setLiveRoom(null));
    return () => { u1?.(); u2?.(); };
  }, [subscribe]);

  const upcoming = (events || []).filter((e) => new Date(e.date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 3);
  const live = (polls || []).filter((p) => p.isActive && !(p.endsAt && new Date() > new Date(p.endsAt))).slice(0, 2);
  const seeAll = (key) => (
    <button onClick={() => onTab(key)} className="group text-[12px] font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1">
      See all <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
    </button>
  );

  return (
    <aside className="space-y-4">
      <RailCard i={0} title="Upcoming events" Icon={Calendar} color="#0EA5E9" action={seeAll('events')}>
        {events === null ? (
          <div className="p-4 space-y-3">{[0, 1].map((k) => <div key={k} className="skeleton h-10 rounded-lg" />)}</div>
        ) : upcoming.length === 0 ? (
          <p className="px-4 py-4 text-[12px] text-slate-400">Nothing scheduled yet.</p>
        ) : (
          <div className="py-1.5">
            {upcoming.map((ev) => {
              const cat = catMap[ev.category] || catMap.general;
              const d = new Date(ev.date);
              const going = ev.rsvps?.some((r) => r === userId || r?._id === userId);
              return (
                <button key={ev._id} onClick={() => onTab('events')} className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-slate-50/80 transition-colors">
                  <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 text-white"
                    style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}CC)` }}>
                    <span className="text-[8px] font-semibold uppercase leading-none opacity-90">{d.toLocaleDateString('en', { month: 'short' })}</span>
                    <span className="text-[15px] font-semibold leading-none mt-0.5">{d.getDate()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-slate-900 truncate">{ev.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {ev.time ? `${ev.time} · ` : ''}{ev.rsvps?.length || 0} going{going ? ' · you too' : ''}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </RailCard>

      <RailCard i={1} title="Live polls" Icon={BarChart2} color="#10B981" action={seeAll('polls')}>
        {polls === null ? (
          <div className="p-4"><div className="skeleton h-16 rounded-lg" /></div>
        ) : live.length === 0 ? (
          <p className="px-4 py-4 text-[12px] text-slate-400">No open polls.</p>
        ) : (
          <div className="p-4 space-y-4">
            {live.map((poll) => {
              const total = poll.options.reduce((s, o) => s + (o.votes?.length || 0), 0);
              return (
                <button key={poll._id} onClick={() => onTab('polls')} className="block w-full text-left">
                  <div className="text-[13px] font-medium text-slate-900 leading-snug">{poll.question}</div>
                  <div className="mt-2 space-y-1.5">
                    {poll.options.slice(0, 3).map((o, k) => {
                      const pct = total ? Math.round(((o.votes?.length || 0) / total) * 100) : 0;
                      return (
                        <div key={k} className="relative h-6 rounded-md bg-slate-100 overflow-hidden">
                          <div className="dash-bar-x absolute inset-y-0 left-0 rounded-md" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #C7D2FE, #A5B4FC)' }} />
                          <div className="relative flex items-center justify-between h-full px-2 text-[11px]">
                            <span className="text-slate-700 truncate">{o.text}</span>
                            <span className="font-semibold text-slate-600 tabular-nums">{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1.5 text-[11px] text-slate-400">{total} vote{total === 1 ? '' : 's'} · tap to vote</div>
                </button>
              );
            })}
          </div>
        )}
      </RailCard>

      {liveRoom ? (
        <div className="dash-rise relative overflow-hidden rounded-2xl p-4 text-white" style={{ animationDelay: '220ms', background: 'linear-gradient(135deg, #7F1D1D, #DC2626)' }}>
          <div className="relative flex items-center gap-3">
            <span className="relative flex w-2.5 h-2.5"><span className="absolute inset-0 rounded-full bg-white animate-ping" /><span className="relative w-2.5 h-2.5 rounded-full bg-white" /></span>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-white/75">Live now</div>
              <div className="text-[13px] font-semibold truncate">{liveRoom.title}</div>
              <div className="text-[11px] text-white/75 truncate">Hosted by {liveRoom.hostName}. Tune in from the banner.</div>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => navigate('/lounge/live')}
          className="dash-rise group w-full text-left relative overflow-hidden rounded-2xl p-4 text-white transition-transform hover:-translate-y-0.5"
          style={{ animationDelay: '220ms', background: 'linear-gradient(135deg, #312E81, #4F46E5 60%, #6366F1)', boxShadow: '0 14px 28px -16px rgba(79,70,229,0.8)' }}>
          <div className="dash-blob absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl" style={{ background: 'rgba(199,210,254,0.4)' }} />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Mic size={18} /></div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold">Start a live room</div>
              <div className="text-[11px] text-white/75">Spin, pray, chat or podcast</div>
            </div>
            <ArrowRight size={16} className="ml-auto transition-transform group-hover:translate-x-1" />
          </div>
          <div className="relative mt-3 flex gap-1.5">
            {[Radio, Heart, MessageSquare, Headphones].map((I, k) => (
              <span key={k} className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center"><I size={12} /></span>
            ))}
          </div>
        </button>
      )}
    </aside>
  );
}
