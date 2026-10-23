import { useState } from 'react';
import { Calendar, MapPin, Users, Check, RefreshCw, Clock, CalendarCheck, History, Sparkles } from 'lucide-react';
import { eventAPI } from '../../api';
import toast from 'react-hot-toast';

export const CATS = {
  general:     { label: 'General',     color: '#6366F1', emoji: '📅' },
  fitness:     { label: 'Fitness',     color: '#0EA5E9', emoji: '🏃' },
  social:      { label: 'Social',      color: '#EC4899', emoji: '🎉' },
  networking:  { label: 'Networking',  color: '#8B5CF6', emoji: '🤝' },
  maintenance: { label: 'Maintenance', color: '#F59E0B', emoji: '🔧' },
  kids:        { label: 'Kids',        color: '#F97316', emoji: '👶' },
};
export const FUN = { label: 'FunTimes', color: '#F59E0B', emoji: '🎉' };
export const catOf = (e) => (e.isFridayFunTimes ? FUN : CATS[e.category] || CATS.general);

export const isMine = (e, uid) => e.rsvps?.some((id) => id === uid || id?._id === uid || id?.toString() === uid);

export function daysAway(date) {
  const d = Math.round((new Date(new Date(date).toDateString()) - new Date(new Date().toDateString())) / 86400000);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  return `In ${d} days`;
}

export function RsvpButton({ event, userId, onRsvp, light }) {
  const [loading, setLoading] = useState(false);
  const going = isMine(event, userId);
  const go = async () => {
    setLoading(true);
    try {
      const { data } = await eventAPI.rsvp(event._id);
      onRsvp(data.data);
      toast.success(going ? 'RSVP removed' : "You're going! 🎉");
    } catch {
      toast.error('Could not update RSVP');
    } finally { setLoading(false); }
  };
  const cls = light
    ? going ? 'bg-white text-emerald-700 hover:bg-red-50 hover:text-red-600' : 'bg-white text-indigo-700 hover:bg-indigo-50'
    : going ? 'bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600' : 'bg-indigo-600 text-white hover:bg-indigo-700';
  return (
    <button onClick={go} disabled={loading}
      className={`group/rsvp inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-50 ${cls}`}>
      {loading ? <RefreshCw size={12} className="animate-spin" /> : going ? <Check size={12} /> : <Users size={12} />}
      {going ? <><span className="group-hover/rsvp:hidden">Going</span><span className="hidden group-hover/rsvp:inline">Cancel</span></> : 'RSVP'}
    </button>
  );
}

function EventTile({ ev, i, userId, onRsvp }) {
  const c = catOf(ev);
  const d = new Date(ev.date);
  const going = isMine(ev, userId);
  return (
    <div className="dash-tile dash-rise group rounded-2xl border bg-white overflow-hidden flex flex-col"
      style={{ animationDelay: `${80 + i * 50}ms`, borderColor: `${c.color}30` }}>
      <div className="relative h-20 px-4 flex items-center justify-between" style={{ background: `linear-gradient(120deg, ${c.color}, ${c.color}B3)` }}>
        <span className="absolute -right-3 -bottom-6 text-[62px] opacity-25 select-none transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">{c.emoji}</span>
        <div className="relative text-white">
          <div className="text-[11px] font-medium opacity-85">{d.toLocaleDateString('en', { weekday: 'long' })}</div>
          <div className="text-[18px] font-semibold leading-tight">{d.toLocaleDateString('en', { day: 'numeric', month: 'short' })}</div>
        </div>
        <span className="relative text-[10px] font-semibold text-white px-2 py-0.5 rounded-full bg-white/20">{daysAway(ev.date)}</span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="text-[11px] font-medium" style={{ color: c.color }}>{c.emoji} {c.label}</div>
        <div className="mt-1 text-[14px] font-semibold text-slate-900 line-clamp-1">{ev.title}</div>
        <div className="mt-0.5 text-[12px] text-slate-400 truncate flex items-center gap-1">
          <Clock size={11} /> {ev.time || 'All day'}{ev.location ? ` · ${ev.location}` : ''}
        </div>
        {ev.description && <p className="mt-2 text-[12px] text-slate-500 line-clamp-2">{ev.description}</p>}
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className={`text-[12px] font-medium flex items-center gap-1 ${going ? 'text-emerald-600' : 'text-slate-500'}`}>
            <Users size={12} /> {ev.rsvps?.length || 0} going{going ? ' · incl. you' : ''}
          </span>
          <RsvpButton event={ev} userId={userId} onRsvp={onRsvp} />
        </div>
      </div>
    </div>
  );
}

export default function EventsDesktop({ events, loading, userId, onRsvp }) {
  const [tab, setTab] = useState('upcoming');
  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
  const past = events.filter((e) => new Date(e.date) < now).sort((a, b) => new Date(b.date) - new Date(a.date));
  const mine = upcoming.filter((e) => isMine(e, userId));
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeek = upcoming.filter((e) => new Date(e.date) <= weekEnd);

  const [next, ...rest] = upcoming;
  const nextC = next && catOf(next);
  const gridList = tab === 'upcoming' ? rest : tab === 'mine' ? mine : [];

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-10">
      {/* Banner */}
      <div className="dash-rise relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background: 'linear-gradient(120deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)', boxShadow: '0 16px 32px -18px rgba(49,46,129,0.8)' }}>
        <div className="dash-blob absolute -top-20 right-64 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(129,140,248,0.35)' }} />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 border border-white/15 flex-shrink-0"><Calendar size={22} className="text-indigo-200" /></div>
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Event Board</h1>
              <p className="text-[13px] text-indigo-100/75">Estate events, activities and Friday Night FunTimes</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {[['Upcoming', upcoming.length], ['This week', thisWeek.length], ["You're going", mine.length], ['Past', past.length]].map(([label, n]) => (
              <div key={label} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 min-w-[80px]">
                <div className="text-[16px] font-semibold text-white tabular-nums leading-none">{n}</div>
                <div className="text-[10px] text-indigo-100/65 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Featured next event */}
          {next && tab === 'upcoming' && (
            <div className="dash-rise group relative overflow-hidden rounded-2xl p-6 text-white"
              style={{ animationDelay: '60ms', background: next.isFridayFunTimes ? 'linear-gradient(120deg, #D97706, #EA580C 50%, #DB2777)' : `linear-gradient(120deg, ${nextC.color}, ${nextC.color}CC 55%, #312E81)`, boxShadow: `0 18px 36px -20px ${nextC.color}` }}>
              <div className="dash-blob absolute -top-16 right-24 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(255,255,255,0.22)' }} />
              <div className="relative flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-white/20 border border-white/25 backdrop-blur flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-semibold uppercase opacity-90">{new Date(next.date).toLocaleDateString('en', { month: 'short' })}</span>
                  <span className="text-[28px] font-semibold leading-none">{new Date(next.date).getDate()}</span>
                  <span className="text-[10px] opacity-80 mt-0.5">{new Date(next.date).toLocaleDateString('en', { weekday: 'short' })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-semibold flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-white/20">Next up · {daysAway(next.date)}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/15">{nextC.emoji} {next.isFridayFunTimes ? 'Friday Night FunTimes' : nextC.label}</span>
                  </div>
                  <h2 className="mt-2 text-[20px] font-semibold text-white truncate" style={{ letterSpacing: '-0.02em' }}>{next.title}</h2>
                  {next.description && <p className="mt-1 text-[13px] text-white/80 line-clamp-2">{next.description}</p>}
                  <div className="mt-3 flex items-center gap-4 text-[12px] text-white/85 flex-wrap">
                    {next.time && <span className="flex items-center gap-1"><Clock size={12} /> {next.time}</span>}
                    {next.location && <span className="flex items-center gap-1"><MapPin size={12} /> {next.location}</span>}
                    <span className="flex items-center gap-1"><Users size={12} /> {next.rsvps?.length || 0} going</span>
                    {next.organizer && <span>By {next.organizer}</span>}
                  </div>
                </div>
                <RsvpButton event={next} userId={userId} onRsvp={onRsvp} light />
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="dash-rise flex items-center gap-3" style={{ animationDelay: '100ms' }}>
            <div className="flex p-1 rounded-xl bg-white border border-slate-200">
              {[['upcoming', 'Upcoming', upcoming.length, Calendar], ['mine', 'My RSVPs', mine.length, CalendarCheck], ['past', 'Past', past.length, History]].map(([k, label, n, Icon]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium transition-all ${tab === k ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  <Icon size={14} /> {label}
                  <span className={`text-[11px] tabular-nums px-1.5 rounded-md ${tab === k ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{n}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">{[0, 1, 2].map((k) => <div key={k} className="skeleton h-56 rounded-2xl" />)}</div>
          ) : tab === 'past' ? (
            past.length === 0 ? <Empty text="No past events yet." /> : (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {past.map((ev) => {
                  const c = catOf(ev);
                  return (
                    <div key={ev._id} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex flex-col items-center justify-center flex-shrink-0 text-slate-500">
                        <span className="text-[8px] font-semibold uppercase leading-none">{new Date(ev.date).toLocaleDateString('en', { month: 'short' })}</span>
                        <span className="text-[14px] font-semibold leading-none mt-0.5">{new Date(ev.date).getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-slate-600 truncate">{c.emoji} {ev.title}</div>
                        <div className="text-[11px] text-slate-400">{ev.rsvps?.length || 0} attended{isMine(ev, userId) ? ' · you went' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : gridList.length === 0 ? (
            <Empty text={tab === 'mine' ? "You haven't RSVPed to any upcoming events." : next ? 'Nothing else scheduled after this one yet.' : 'No upcoming events.'} />
          ) : (
            <>
              {tab === 'upcoming' && <h3 className="text-[14px] font-semibold text-slate-900">Coming up after</h3>}
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {gridList.map((ev, i) => <EventTile key={ev._id} ev={ev} i={i} userId={userId} onRsvp={onRsvp} />)}
              </div>
            </>
          )}
        </div>

        {/* Rail */}
        <aside className="sticky top-0 space-y-4">
          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center justify-between px-4 h-11 border-b border-slate-100">
              <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-600"><Calendar size={12} className="text-white" /></span>
                This week
              </h3>
              <span className="text-[12px] text-slate-400">{thisWeek.length}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 px-3 pt-3">
              {Array.from({ length: 7 }, (_, k) => {
                const day = new Date(); day.setDate(day.getDate() + k);
                const has = upcoming.some((e) => new Date(e.date).toDateString() === day.toDateString());
                return (
                  <div key={k} className={`flex flex-col items-center py-1.5 rounded-lg ${k === 0 ? 'bg-indigo-50' : ''}`}>
                    <span className="text-[10px] text-slate-400">{day.toLocaleDateString('en', { weekday: 'narrow' })}</span>
                    <span className={`text-[13px] font-semibold ${k === 0 ? 'text-indigo-700' : 'text-slate-700'}`}>{day.getDate()}</span>
                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${has ? 'bg-indigo-500' : 'bg-transparent'}`} />
                  </div>
                );
              })}
            </div>
            {thisWeek.length === 0 ? (
              <p className="px-4 py-4 text-[12px] text-slate-400">Nothing on this week.</p>
            ) : (
              <div className="py-2">
                {thisWeek.slice(0, 5).map((ev) => {
                  const c = catOf(ev);
                  return (
                    <div key={ev._id} className="flex items-center gap-2.5 px-4 py-1.5">
                      <span className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: c.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-slate-900 truncate">{ev.title}</div>
                        <div className="text-[11px] text-slate-400">{daysAway(ev.date)}{ev.time ? ` · ${ev.time}` : ''}</div>
                      </div>
                      {isMine(ev, userId) && <Check size={13} className="text-emerald-500 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-4" style={{ animationDelay: '140ms' }}>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><CalendarCheck size={12} /> Your plans</div>
            {mine.length === 0 ? (
              <p className="mt-2 text-[12px] text-slate-500">You haven't RSVPed to anything yet. Tap <b>RSVP</b> on an event to let neighbours know you're coming.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {mine.slice(0, 4).map((ev) => (
                  <div key={ev._id} className="text-[12px] text-slate-700 flex items-center gap-2">
                    <Check size={12} className="text-emerald-500 flex-shrink-0" />
                    <span className="truncate flex-1">{ev.title}</span>
                    <span className="text-slate-400 flex-shrink-0">{daysAway(ev.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dash-rise relative overflow-hidden rounded-2xl p-4 text-white" style={{ animationDelay: '200ms', background: 'linear-gradient(135deg, #D97706, #DB2777)' }}>
            <div className="dash-blob absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl" style={{ background: 'rgba(253,230,138,0.45)' }} />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Sparkles size={18} /></div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">Friday Night FunTimes</div>
                <div className="text-[11px] text-white/80">Every Friday from 6pm in the Lounge</div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl bg-white border border-dashed border-slate-300 py-14 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center"><Calendar size={24} className="text-indigo-500" /></div>
      <p className="mt-3 text-[13px] text-slate-500">{text}</p>
    </div>
  );
}
