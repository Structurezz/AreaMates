import { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Users, Check, RefreshCw, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { eventAPI } from '../../api';
import { catOf, isMine, daysAway } from './EventsDesktop';

// Phone layout for the Event Board.

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const pad = (n) => String(n).padStart(2, '0');

function nextFriday() {
  const now = new Date();
  const d = new Date(now);
  d.setDate(now.getDate() + (((5 - now.getDay() + 7) % 7) || (now.getHours() >= 18 ? 7 : 0)));
  d.setHours(18, 0, 0, 0);
  return d;
}

function useFridayCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id); }, []);
  const d = new Date(now);
  if (d.getDay() === 5 && d.getHours() >= 18) return { live: true };
  const ms = Math.max(0, nextFriday() - now);
  return { live: false, d: Math.floor(ms / 86400000), h: Math.floor((ms % 86400000) / 3600000), m: Math.floor((ms % 3600000) / 60000) };
}

// Full-width RSVP toggle for thumbs
function RsvpToggle({ event, userId, onRsvp, light }) {
  const [loading, setLoading] = useState(false);
  const going = isMine(event, userId);
  const go = async () => {
    setLoading(true);
    try {
      const { data } = await eventAPI.rsvp(event._id);
      onRsvp(data.data);
      toast.success(going ? 'RSVP removed' : "You're going! 🎉");
    } catch { toast.error('Could not update RSVP'); }
    finally { setLoading(false); }
  };
  const cls = light
    ? going ? 'bg-white/20 text-white border border-white/40' : 'bg-white text-indigo-700'
    : going ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-indigo-600 text-white';
  return (
    <button onClick={go} disabled={loading}
      className={`min-h-[40px] inline-flex items-center justify-center gap-1.5 px-4 rounded-xl text-[13px] font-semibold active:scale-[0.97] transition disabled:opacity-60 ${cls}`}>
      {loading ? <RefreshCw size={14} className="animate-spin" /> : going ? <Check size={14} /> : <Users size={14} />}
      {going ? 'Going ✓' : 'RSVP'}
    </button>
  );
}

function DateBlock({ ev, size = 52 }) {
  const c = catOf(ev);
  const d = new Date(ev.date);
  return (
    <div className="rounded-2xl flex flex-col items-center justify-center text-white flex-shrink-0 shadow-sm"
      style={{ width: size, height: size + 6, background: `linear-gradient(160deg, ${c.color}, ${c.color}CC)` }}>
      <span className="text-[10px] font-semibold uppercase leading-none opacity-90">{d.toLocaleDateString('en', { month: 'short' })}</span>
      <span className="text-[20px] font-bold leading-none mt-0.5">{d.getDate()}</span>
      <span className="text-[9px] leading-none mt-0.5 opacity-85">{d.toLocaleDateString('en', { weekday: 'short' })}</span>
    </div>
  );
}

function EventRow({ ev, i, userId, onRsvp, past }) {
  const c = catOf(ev);
  return (
    <div className={`dash-rise rounded-2xl bg-white border border-slate-200/80 p-3.5 ${past ? 'opacity-75' : ''}`} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
      <div className="flex gap-3">
        <DateBlock ev={ev} />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold" style={{ color: c.color }}>{c.emoji} {c.label}{!past && ` · ${daysAway(ev.date)}`}</div>
          <h3 className="text-[15px] font-semibold text-slate-900 leading-snug line-clamp-2">{ev.title}</h3>
          <p className="mt-0.5 text-[12px] text-slate-500 flex items-center gap-1 min-w-0">
            <Clock size={11} className="flex-shrink-0" />
            <span className="truncate">{ev.time || 'All day'}{ev.location ? ` · ${ev.location}` : ''}</span>
          </p>
        </div>
      </div>
      {ev.description && !past && <p className="mt-2.5 text-[13px] text-slate-600 leading-relaxed line-clamp-2">{ev.description}</p>}
      <div className="mt-3 flex items-center gap-2">
        <span className="flex-1 text-[12px] text-slate-500 flex items-center gap-1"><Users size={12} /> {ev.rsvps?.length || 0} {past ? 'went' : 'going'}</span>
        {!past && <RsvpToggle event={ev} userId={userId} onRsvp={onRsvp} />}
      </div>
    </div>
  );
}

export default function EventsMobile({ events, loading, userId, onRsvp }) {
  const [tab, setTab] = useState('upcoming');
  const [day, setDay] = useState(null);
  const fri = useFridayCountdown();

  const now = new Date();
  const upcoming = useMemo(() => events.filter((e) => new Date(e.date) >= new Date(now.toDateString())).sort((a, b) => new Date(a.date) - new Date(b.date)), [events]); // eslint-disable-line react-hooks/exhaustive-deps
  const past = useMemo(() => events.filter((e) => new Date(e.date) < new Date(now.toDateString())).sort((a, b) => new Date(b.date) - new Date(a.date)), [events]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = upcoming.filter((e) => isMine(e, userId));
  const thisWeek = upcoming.filter((e) => new Date(e.date) - now < 7 * 86400000);

  const week = Array.from({ length: 7 }, (_, k) => { const d = new Date(); d.setDate(d.getDate() + k); return d; });
  const next = upcoming[0];

  const base = tab === 'upcoming' ? upcoming : tab === 'mine' ? mine : past;
  const shown = day && tab !== 'past' ? base.filter((e) => sameDay(e.date, day)) : base;
  const listForTab = tab === 'upcoming' && !day ? shown.slice(next ? 1 : 0) : shown;

  return (
    <div className="pb-6 animate-fade-in">
      {/* Hero */}
      <div className="-mx-4 -mt-4 px-4 pt-5 pb-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)' }}>
        <div className="dash-blob absolute -top-16 -right-12 w-48 h-48 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(129,140,248,0.35)' }} />
        <div className="relative">
          <h1 className="text-[20px] font-bold text-white flex items-center gap-2"><Calendar size={19} /> Event Board</h1>
          <p className="text-[13px] text-indigo-100/80 mt-0.5">What's on in your estate</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[['Upcoming', upcoming.length], ['This week', thisWeek.length], ["You're going", mine.length]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/10 border border-white/15 px-3 py-2">
                <div className="text-[17px] font-bold tabular-nums leading-none">{loading ? '–' : v}</div>
                <div className="text-[11px] text-indigo-100/75 mt-1">{k}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[12px]"
            style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.25), rgba(236,72,153,0.2))', border: '1px solid rgba(253,230,138,0.3)' }}>
            <span className="text-[15px]">🎉</span>
            {fri.live
              ? <span className="font-semibold">Friday Night FunTimes is on right now</span>
              : <span><span className="font-semibold">Friday FunTimes</span> starts in <span className="font-semibold tabular-nums">{fri.d > 0 ? `${fri.d}d ` : ''}{pad(fri.h)}h {pad(fri.m)}m</span></span>}
          </div>
        </div>
      </div>

      {/* This week strip */}
      <div className="mt-4 -mx-4 px-4 flex gap-2 overflow-x-auto no-scrollbar">
        {week.map((d) => {
          const n = upcoming.filter((e) => sameDay(e.date, d)).length;
          const on = day && sameDay(day, d);
          return (
            <button key={d.toDateString()} onClick={() => setDay(on ? null : d)}
              className={`flex-shrink-0 w-[52px] py-2 rounded-2xl flex flex-col items-center border transition-colors ${on ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
              <span className={`text-[10px] font-semibold uppercase ${on ? 'text-indigo-100' : 'text-slate-400'}`}>{sameDay(d, new Date()) ? 'Today' : d.toLocaleDateString('en', { weekday: 'short' })}</span>
              <span className="text-[17px] font-bold leading-tight">{d.getDate()}</span>
              <span className={`mt-0.5 w-1.5 h-1.5 rounded-full ${n ? (on ? 'bg-white' : 'bg-indigo-500') : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
      {day && (
        <button onClick={() => setDay(null)} className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
          {day.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })} <X size={12} />
        </button>
      )}

      {/* Next up */}
      {!loading && next && tab === 'upcoming' && !day && (
        <div className="dash-rise mt-4 relative overflow-hidden rounded-3xl p-4 text-white"
          style={{ background: next.isFridayFunTimes ? 'linear-gradient(135deg, #D97706, #EA580C 55%, #DB2777)' : `linear-gradient(135deg, ${catOf(next).color}, #4338CA)` }}>
          <div className="dash-blob absolute -top-10 -right-8 w-36 h-36 rounded-full blur-2xl pointer-events-none" style={{ background: 'rgba(255,255,255,0.22)' }} />
          <div className="relative flex gap-3">
            <div className="w-16 h-[70px] rounded-2xl bg-white/20 border border-white/25 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-[10px] font-semibold uppercase opacity-90">{new Date(next.date).toLocaleDateString('en', { month: 'short' })}</span>
              <span className="text-[24px] font-bold leading-none">{new Date(next.date).getDate()}</span>
              <span className="text-[10px] opacity-85">{new Date(next.date).toLocaleDateString('en', { weekday: 'short' })}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold"><span className="px-1.5 py-0.5 rounded-full bg-white/20">Next up · {daysAway(next.date)}</span></div>
              <h2 className="mt-1.5 text-[17px] font-bold text-white leading-snug line-clamp-2">{next.title}</h2>
              <p className="mt-1 text-[12px] text-white/85 flex items-center gap-1 min-w-0">
                <MapPin size={11} className="flex-shrink-0" /><span className="truncate">{next.time ? `${next.time} · ` : ''}{next.location || 'Estate grounds'}</span>
              </p>
            </div>
          </div>
          <div className="relative mt-3 flex items-center gap-2">
            <span className="flex-1 text-[12px] text-white/85 flex items-center gap-1"><Users size={12} /> {next.rsvps?.length || 0} going</span>
            <RsvpToggle event={next} userId={userId} onRsvp={onRsvp} light />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="sticky -top-4 z-20 -mx-4 px-4 pt-3 pb-2 mt-1 bg-[#F8FAFC]/95 backdrop-blur">
        <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100">
          {[['upcoming', 'Upcoming', upcoming.length], ['mine', 'My RSVPs', mine.length], ['past', 'Past', past.length]].map(([k, label, n]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`min-h-[36px] rounded-lg text-[13px] font-semibold transition-all ${tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {label} <span className="text-slate-400 font-normal tabular-nums">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3 mt-1">{[0, 1, 2].map((k) => <div key={k} className="skeleton h-[118px] rounded-2xl" />)}</div>
      ) : listForTab.length === 0 && !(tab === 'upcoming' && next && !day) ? (
        <div className="mt-2 rounded-2xl bg-white border border-dashed border-slate-300 py-12 px-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center"><Calendar size={22} className="text-indigo-500" /></div>
          <p className="mt-3 text-[14px] font-semibold text-slate-800">
            {day ? 'Nothing on this day' : tab === 'upcoming' ? 'No upcoming events' : tab === 'mine' ? "You haven't RSVPed yet" : 'No past events'}
          </p>
          <p className="mt-1 text-[13px] text-slate-500">{tab === 'mine' ? 'Tap RSVP on an event to add it here.' : 'Check back soon.'}</p>
        </div>
      ) : tab === 'past' ? (
        <div className="mt-1 grid grid-cols-2 gap-2.5">
          {listForTab.map((ev, i) => (
            <div key={ev._id} className="dash-rise rounded-2xl bg-white border border-slate-200/80 p-3" style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}>
              <div className="flex items-center gap-2">
                <span className="text-[18px]">{catOf(ev).emoji}</span>
                <span className="text-[11px] text-slate-400">{new Date(ev.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
              </div>
              <div className="mt-1 text-[13px] font-semibold text-slate-700 line-clamp-2">{ev.title}</div>
              <div className="mt-1 text-[11px] text-slate-400">{ev.rsvps?.length || 0} went</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-1 space-y-3">
          {listForTab.map((ev, i) => <EventRow key={ev._id} ev={ev} i={i} userId={userId} onRsvp={onRsvp} />)}
        </div>
      )}
    </div>
  );
}
