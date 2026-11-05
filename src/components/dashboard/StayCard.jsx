import { useEffect, useState } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { BedDouble, LogIn, LogOut, Clock, Briefcase } from 'lucide-react';
import { useSite } from '../../context/SiteContext';
import { shiftLine } from '../../utils/siteTypes';

const fmt = (d) => { try { return format(new Date(d), 'EEE d MMM · HH:mm'); } catch { return '—'; } };

/** "1 day 4h", "3h 20m", "12m" */
export function countdown(to, now = new Date()) {
  const mins = differenceInMinutes(new Date(to), now);
  if (mins <= 0) return null;
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  if (d) return `${d} day${d === 1 ? '' : 's'}${h ? ` ${h}h` : ''}`;
  if (h) return `${h}h${m ? ` ${m}m` : ''}`;
  return `${m}m`;
}

function useNow(ms = 60000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setNow(new Date()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

/**
 * Hotel guests (module `stays`): check-in / check-out, room and a countdown
 * to check-out. Renders nothing for anyone without a stay.
 */
export function StayCard({ user, compact = false }) {
  const { modules, terms, type, isStaff } = useSite();
  const now = useNow();
  const stay = user?.stay;
  const hotel = type === 'hotel';
  // Hotels need both dates; elsewhere (hospital admission / discharge) the end may be open
  if (!modules.stays || isStaff || !stay?.checkIn || (hotel && !stay?.checkOut)) return null;
  const inWord = terms.stayIn || 'Check-in';
  const outWord = terms.stayOut || 'Check-out';

  const room = user?.unitId && typeof user.unitId === 'object' ? user.unitId : null;
  const roomLabel = room ? `${terms.unit} ${room.unitNumber}${room.block ? ` · ${room.block}` : ''}` : null;
  const upcoming = new Date(stay.checkIn) > now;
  const left = upcoming || stay.checkOut ? countdown(upcoming ? stay.checkIn : stay.checkOut, now) : null;
  const headline = hotel
    ? (upcoming
      ? (left ? `Check-in in ${left}` : 'Check-in today')
      : left ? `Checks out in ${left}` : 'Check-out time')
    : upcoming
      ? (left ? `${inWord} in ${left}` : `${inWord} today`)
      : !stay.checkOut ? `${inWord} ${fmt(stay.checkIn)}`
        : left ? `${outWord} in ${left}` : `${outWord} today`;
  const urgent = !upcoming && !!stay.checkOut && differenceInMinutes(new Date(stay.checkOut), now) < 180;

  return (
    <section className={`dash-rise relative overflow-hidden rounded-2xl bg-white border border-slate-200/70 ${compact ? 'p-4' : 'p-5'}`}
      style={{ animationDelay: '40ms', background: 'linear-gradient(140deg, #0EA5E914 0%, #FFFFFF 55%)', borderColor: '#0EA5E92E' }}>
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0EA5E9, #0284C7)', boxShadow: '0 6px 14px -6px #0EA5E9' }}>
          <BedDouble size={18} className="text-white" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium text-slate-500 truncate">
            {hotel ? 'Your stay' : type === 'hospital' ? 'Your admission' : 'Your dates'}{roomLabel ? <> · <span className="font-semibold text-slate-700">{roomLabel}</span></> : null}
          </div>
          <div className={`text-[17px] font-semibold leading-tight truncate ${urgent ? 'text-amber-600' : 'text-slate-900'}`} style={{ letterSpacing: '-0.02em' }}>
            {headline}
          </div>
        </div>
      </div>
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white border border-slate-200/70 px-3 py-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-1"><LogIn size={11} /> {inWord}</div>
          <div className="text-[13px] font-semibold text-slate-800 mt-0.5 truncate">{fmt(stay.checkIn)}</div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200/70 px-3 py-2">
          <div className="text-[11px] text-slate-400 flex items-center gap-1"><LogOut size={11} /> {outWord}</div>
          <div className="text-[13px] font-semibold text-slate-800 mt-0.5 truncate">{stay.checkOut ? fmt(stay.checkOut) : 'Not set yet'}</div>
        </div>
      </div>
      {!upcoming && hotel && (
        <p className="mt-2.5 text-[11px] text-slate-400">Your access ends at check-out. Ask the {terms.manager.toLowerCase()} to extend your stay.</p>
      )}
    </section>
  );
}

/** "Your shift: 08:00–16:00 · Mon–Fri" (module `shifts`). */
export function ShiftLine({ user, className = '', light = false }) {
  const { modules } = useSite();
  const line = shiftLine(user?.shift);
  if (!modules.shifts || !line) return null;
  const Icon = user?.memberProfile?.title ? Briefcase : Clock;
  return (
    <span className={`inline-flex items-center gap-1.5 ${light ? 'text-white/80' : 'text-slate-500'} ${className}`}>
      <Icon size={12} className="flex-shrink-0" />
      <span className="truncate">Your shift: <span className={`font-semibold ${light ? 'text-white' : 'text-slate-700'}`}>{line}</span></span>
    </span>
  );
}
