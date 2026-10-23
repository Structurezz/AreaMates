import { format, formatDistanceToNow } from 'date-fns';
import {
  ShieldAlert, ShieldCheck, MapPin, UserX, Siren, Eye, EyeOff, Radio, Phone, Lock, BellRing, DoorOpen,
} from 'lucide-react';
import EstateMap from '../EstateMap';

function Person({ p, size = 40 }) {
  return p?.profilePhoto
    ? <img src={p.profilePhoto} alt="" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
    : <div className="rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.36 }}>
        {(p?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>;
}

const HOW = [
  { Icon: Siren,    title: "I'm being followed", desc: 'An instant critical alarm to security and your estate manager, with your location.' },
  { Icon: Radio,    title: 'Live location',       desc: 'Security can watch where you are until you stop, or for up to 1 hour.' },
  { Icon: Lock,     title: 'Block quietly',       desc: "They're never told. You vanish from each other's Neighbours, calls and buzzes." },
  { Icon: DoorOpen, title: 'Gate watch',          desc: "Security is told when a blocked person's guest arrives at the gate." },
];

/**
 * Desktop layout for the Personal safety page. All actions come from the page,
 * which also renders the panic and block sheets for both layouts.
 */
export default function SafetyDesktop({ sharing, onToggleShare, blocks, loading, onPanic, onAddBlock, onUnblock, onToggleGate, estate }) {
  const attempts = blocks.reduce((t, b) => t + (b.contactAttempts || 0), 0);
  const gateOn = blocks.filter((b) => b.gateWatch).length;
  const fix = sharing?.lastFix;
  const mapLocation = fix ? { lat: fix.lat, lng: fix.lng } : estate?.location;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-10">
      {/* ── Banner: calm indigo, red while sharing ── */}
      <div className="dash-rise relative overflow-hidden rounded-2xl px-6 py-5"
        style={{
          background: sharing ? 'linear-gradient(120deg, #1F0A0A 0%, #450A0A 55%, #991B1B 100%)' : 'linear-gradient(120deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)',
          boxShadow: sharing ? '0 16px 32px -18px rgba(153,27,27,0.8)' : '0 16px 32px -18px rgba(49,46,129,0.8)',
        }}>
        <div className="dash-blob absolute -top-20 right-64 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: sharing ? 'rgba(248,113,113,0.3)' : 'rgba(129,140,248,0.3)' }} />
        <div className="relative flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-12 h-12 flex-shrink-0">
              <span className="dash-ripple absolute inset-0 rounded-xl border-2" style={{ borderColor: sharing ? '#F87171' : '#A5B4FC' }} />
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 border border-white/15">
                {sharing ? <Radio size={22} className="text-red-300" /> : <ShieldCheck size={22} className="text-indigo-200" />}
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Personal safety</h1>
              <p className="text-[13px] text-white/75">
                {sharing
                  ? <>Security can see your live location · since {format(new Date(sharing.startedAt), 'h:mm a')}</>
                  : 'Only security and your estate manager are ever alerted. Nobody else is told.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {[
              ['Blocked', blocks.length],
              ['Gate watch on', gateOn],
              ['Contact attempts', attempts],
            ].map(([label, n]) => (
              <div key={label} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 min-w-[84px]">
                <div className="text-[16px] font-semibold text-white tabular-nums leading-none">{loading ? '—' : n}</div>
                <div className="text-[10px] text-white/60 mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5 items-start">
        {/* ── Left: actions ── */}
        <div className="col-span-12 xl:col-span-7 space-y-5 min-w-0">
          {/* Panic */}
          <div className="dash-rise relative overflow-hidden rounded-2xl p-6 text-white" style={{ animationDelay: '60ms', background: 'linear-gradient(130deg, #7F1D1D 0%, #B91C1C 55%, #EF4444 120%)', boxShadow: '0 18px 36px -20px rgba(185,28,28,0.9)' }}>
            <div className="dash-blob absolute -top-16 -right-10 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(254,202,202,0.3)' }} />
            <div className="relative flex items-center gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[12px] font-semibold text-red-100"><ShieldAlert size={14} /> Emergency</div>
                <h2 className="mt-1.5 text-[20px] font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>Feeling unsafe or being followed?</h2>
                <p className="mt-1 text-[13px] text-red-100/90 max-w-md">Security and your estate manager are alerted instantly with your location, and live sharing starts so they can follow you. In immediate danger, call 112.</p>
              </div>
              <button onClick={onPanic} aria-label="I'm being followed" className="group relative w-36 h-36 flex-shrink-0">
                <span className="dash-ripple absolute inset-0 rounded-full border-2 border-white/60" />
                <span className="dash-ripple absolute inset-0 rounded-full border-2 border-white/60" style={{ animationDelay: '1s' }} />
                <span className="absolute inset-2 rounded-full bg-white text-red-700 flex flex-col items-center justify-center gap-1 shadow-2xl transition-transform group-hover:scale-105 group-active:scale-95">
                  <Siren size={30} />
                  <span className="text-[12px] font-black leading-tight text-center px-2">I'm being<br />followed</span>
                </span>
              </button>
            </div>
          </div>

          {/* Live location */}
          <div className="dash-rise rounded-2xl bg-white border p-5" style={{ animationDelay: '120ms', borderColor: sharing ? '#FECACA' : 'rgba(226,232,240,0.7)' }}>
            <div className="flex items-start gap-4">
              <span className={`relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${sharing ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                {sharing && <span className="absolute inset-0 rounded-xl bg-red-400/30 animate-ping" />}
                <MapPin size={20} className="relative" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-slate-900">Share live location with security</h3>
                  {sharing && <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-500 text-white">Live</span>}
                </div>
                <p className="mt-0.5 text-[13px] text-slate-500">
                  {sharing
                    ? `Sharing since ${format(new Date(sharing.startedAt), 'h:mm a')}${fix ? ` · updated ${formatDistanceToNow(new Date(fix.at), { addSuffix: true })}` : ''}. Stops automatically after 1 hour.`
                    : 'Walking home late or feeling uneasy? Security and your estate manager can watch your location until you stop.'}
                </p>
                {sharing && fix?.accuracy != null && <p className="mt-1 text-[12px] text-slate-400">Accuracy about {Math.round(fix.accuracy)} m</p>}
              </div>
              <button onClick={onToggleShare}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:-translate-y-0.5 ${sharing ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'text-white'}`}
                style={sharing ? undefined : { background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 10px 20px -10px rgba(79,70,229,0.8)' }}>
                {sharing ? 'Stop sharing' : <><Radio size={14} /> Start sharing</>}
              </button>
            </div>
          </div>

          {/* Blocked people */}
          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '180ms' }}>
            <div className="flex items-center justify-between px-5 h-12 border-b border-slate-100">
              <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-red-500"><UserX size={12} className="text-white" /></span>
                Blocked for my safety
              </h3>
              <button onClick={onAddBlock} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                <UserX size={13} /> Block someone
              </button>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">{[0, 1].map((k) => <div key={k} className="skeleton h-14 rounded-xl" />)}</div>
            ) : blocks.length === 0 ? (
              <div className="px-5 py-6 flex gap-3 text-[13px] text-slate-500">
                <ShieldCheck size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>You haven't blocked anyone. If a resident is making you uncomfortable (calling, following or watching you), block them here. <strong className="text-slate-700">They're never told.</strong></span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {blocks.map((b) => (
                  <div key={b._id} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <Person p={b.person} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-slate-900 truncate">{b.person?.name}</div>
                      <div className="text-[12px] text-slate-400 truncate">{b.person?.unit} · blocked {format(new Date(b.createdAt), 'MMM d')}</div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${b.contactAttempts ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
                      {b.contactAttempts ? `${b.contactAttempts} contact attempt${b.contactAttempts > 1 ? 's' : ''}` : 'No contact attempts'}
                    </span>
                    <button onClick={() => onToggleGate(b)} title="Tell security when their guests arrive"
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${b.gateWatch ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                      {b.gateWatch ? <Eye size={12} /> : <EyeOff size={12} />} Gate watch {b.gateWatch ? 'on' : 'off'}
                    </button>
                    <button onClick={() => onUnblock(b)} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">Unblock</button>
                  </div>
                ))}
              </div>
            )}
            <p className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-400">
              Blocked people can't see you in Neighbours, call or buzz you. If they keep trying, security and your estate manager are alerted.
            </p>
          </div>
        </div>

        {/* ── Right: map + how it works ── */}
        <div className="col-span-12 xl:col-span-5 space-y-5">
          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100">
              <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${sharing ? 'bg-red-500' : 'bg-indigo-500'}`}><MapPin size={12} className="text-white" /></span>
                {sharing ? 'Your live location' : 'Your estate'}
              </h3>
              {sharing
                ? <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600"><span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-red-400 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-red-500" /></span>Visible to security</span>
                : <span className="text-[11px] text-slate-400">Not sharing</span>}
            </div>
            <div className="p-1.5">
              <EstateMap
                name={sharing ? 'You are here' : (estate?.name || 'Your estate')}
                address={estate?.address}
                location={mapLocation}
                height={300}
                variant="plain"
              />
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400">
              {sharing ? (fix ? 'Updates as you move, about every few seconds.' : 'Waiting for your first location fix…') : 'Start sharing to show your live position to security.'}
            </div>
          </div>

          <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-5" style={{ animationDelay: '160ms' }}>
            <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-500"><BellRing size={12} className="text-white" /></span>
              How it protects you
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {HOW.map(({ Icon, title, desc }) => (
                <div key={title} className="rounded-xl bg-slate-50/70 border border-slate-100 p-3">
                  <Icon size={15} className="text-indigo-500" />
                  <div className="mt-1.5 text-[13px] font-semibold text-slate-900">{title}</div>
                  <div className="mt-0.5 text-[12px] text-slate-500 leading-snug">{desc}</div>
                </div>
              ))}
            </div>
            <a href="tel:112" className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-200 text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-colors">
              <Phone size={13} /> In immediate danger, call 112
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

