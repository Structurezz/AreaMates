import { Radio, Mic, Play, Clock, Calendar, Headphones, Trash2, ListMusic, Repeat } from 'lucide-react';
import DJLive from '../DJLive';

const VIOLET = '#6366F1';
const INDIGO = '#6366F1';

const fmtMin = (s) => `${Math.round((s || 0) / 60)} min`;
const fmtClock = (s) => `${Math.floor((s || 0) / 60)}:${String(Math.floor((s || 0) % 60)).padStart(2, '0')}`;

// Cover colours for mixtapes without a host photo — stable per title
const COVERS = [
  ['#6366F1', '#8B5CF6'], ['#EC4899', '#8B5CF6'], ['#0EA5E9', '#6366F1'],
  ['#F59E0B', '#EC4899'], ['#10B981', '#0EA5E9'], ['#8B5CF6', '#DB2777'],
];
const coverFor = (s = '') => COVERS[[...s].reduce((t, c) => t + c.charCodeAt(0), 0) % COVERS.length];

function Equalizer({ bars = 5, className = '', color = '#fff' }) {
  return (
    <div className={`dash-eq flex items-end gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className="w-[3px] h-full rounded-full" style={{ background: color, animationDelay: `${(i * 137) % 900}ms` }} />
      ))}
    </div>
  );
}

function SectionHead({ Icon, color, title, count, right }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
        <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}CC)` }}>
          <Icon size={12} className="text-white" />
        </span>
        {title}
        {count != null && <span className="text-[12px] font-normal text-slate-400">· {count}</span>}
      </h2>
      {right}
    </div>
  );
}

export default function PodcastsDesktop({ upcoming, episodes, mixtapes, activeDJ, liveFM, deleting, onPlay, onDeleteMixtape, onStart }) {
  const isEmpty = !activeDJ && !liveFM && upcoming.length === 0 && episodes.length === 0 && mixtapes.length === 0;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10">
      {/* ── Banner ── */}
      <div className="dash-rise relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background: 'linear-gradient(120deg, #1E1B4B 0%, #3730A3 50%, #6366F1 100%)', boxShadow: '0 16px 32px -18px rgba(55,48,163,0.8)' }}>
        <div className="dash-blob absolute -top-20 right-56 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(236,72,153,0.4)' }} />
        <div className="dash-blob absolute -bottom-24 left-32 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(99,102,241,0.5)', animationDelay: '-6s' }} />
        <Equalizer bars={28} className="absolute right-6 bottom-0 h-16 opacity-20 pointer-events-none" />
        <div className="relative flex items-center justify-between gap-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white px-2 py-0.5 rounded-full bg-white/15 border border-white/20">
              <Radio size={11} /> Podcast
            </span>
            <h1 className="mt-2 text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Live rooms, mixtapes & FM shows</h1>
            <p className="mt-0.5 text-[13px] text-white/75">Catch neighbours going live, replay past sets, or start your own room.</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {[
              ['Episodes', episodes.length],
              ['Mixtapes', mixtapes.length],
              ['Upcoming', upcoming.length],
            ].map(([label, n]) => (
              <div key={label} className="px-3 py-2 rounded-xl bg-white/10 border border-white/15 backdrop-blur text-center min-w-[72px]">
                <div className="text-[16px] font-semibold text-white tabular-nums leading-none">{n}</div>
                <div className="text-[10px] text-white/65 mt-1">{label}</div>
              </div>
            ))}
            <button onClick={onStart}
              className="group inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2.5 rounded-xl bg-white text-indigo-700 hover:-translate-y-0.5 transition-all"
              style={{ boxShadow: '0 8px 18px -8px rgba(0,0,0,0.4)' }}>
              <Mic size={14} /> Start a live room
            </button>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 py-16 text-center">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <span className="dash-ripple absolute inset-0 rounded-2xl border border-indigo-300" />
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${VIOLET}, #4F46E5)` }}>
              <Radio size={24} />
            </div>
          </div>
          <div className="text-[15px] font-semibold text-slate-900 mt-4">Nothing on air yet</div>
          <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">Start the first live room: a prayer, a chat or a DJ set. Your neighbours will get notified.</p>
          <button onClick={onStart} className="btn-primary !text-[13px] !px-4 !py-2 mt-4" style={{ background: `linear-gradient(135deg, ${VIOLET}, #4F46E5)` }}>
            <Mic size={14} /> Start a live room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* ── Main column ── */}
          <div className="col-span-12 xl:col-span-8 space-y-6 min-w-0">
            {(activeDJ || liveFM) && (
              <section className="dash-rise" style={{ animationDelay: '60ms' }}>
                <SectionHead Icon={Radio} color="#EF4444" title="Live right now"
                  right={<span className="flex items-center gap-1.5 text-[12px] font-medium text-red-500"><span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-red-400 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-red-500" /></span>On air</span>} />
                <DJLive />
                {liveFM && !activeDJ && (
                  <div className="relative overflow-hidden flex items-center gap-4 p-4 rounded-2xl text-white"
                    style={{ background: 'linear-gradient(120deg, #312E81, #4F46E5)' }}>
                    <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0"><Radio size={20} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-white/75">AreaConnect FM · Live</div>
                      <div className="text-[15px] font-semibold truncate">{liveFM.title}</div>
                      <div className="text-[12px] text-white/70">Use the floating pill to tune in</div>
                    </div>
                    <Equalizer bars={6} className="h-8" />
                  </div>
                )}
              </section>
            )}

            {mixtapes.length > 0 && (
              <section className="dash-rise" style={{ animationDelay: '120ms' }}>
                <SectionHead Icon={Headphones} color={INDIGO} title="Your estate's archive" count={mixtapes.length} />
                <div className="grid grid-cols-3 2xl:grid-cols-4 gap-4">
                  {mixtapes.map((m, i) => {
                    const [c1, c2] = coverFor(m.title);
                    return (
                      <div key={m._id} className="dash-tile dash-rise group rounded-2xl bg-white border border-slate-200/70 p-3"
                        style={{ animationDelay: `${160 + i * 40}ms` }}>
                        <button onClick={() => onPlay('mix', m)} className="relative block w-full aspect-square rounded-xl overflow-hidden"
                          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} aria-label={`Play ${m.title}`}>
                          {m.hostPhoto
                            ? <img src={m.hostPhoto} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            : (
                              <>
                                <Headphones size={40} className="absolute inset-0 m-auto text-white/35 transition-transform duration-500 group-hover:scale-110" />
                                <Equalizer bars={14} className="absolute left-3 right-3 bottom-3 h-8 opacity-30" />
                              </>
                            )}
                          <span className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
                          <span className="absolute right-3 bottom-3 w-11 h-11 rounded-full bg-white text-indigo-700 flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                            <Play size={18} className="ml-0.5" fill="currentColor" />
                          </span>
                          <span className="absolute left-2.5 top-2.5 text-[10px] font-semibold text-white px-2 py-0.5 rounded-full bg-black/30 backdrop-blur">{fmtMin(m.totalDurationSec)}</span>
                        </button>
                        <div className="mt-3 flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-slate-900 truncate">{m.title}</div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">{m.hostName} · {m.setlist?.length || 0} tracks</div>
                          </div>
                          {onDeleteMixtape && <button onClick={() => onDeleteMixtape(m)} disabled={deleting === m._id} aria-label="Delete from archive" title="Delete from archive"
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50">
                            <Trash2 size={14} />
                          </button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {episodes.length > 0 && (
              <section className="dash-rise" style={{ animationDelay: '180ms' }}>
                <SectionHead Icon={ListMusic} color={VIOLET} title="AreaConnect FM archive" count={episodes.length} />
                <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden">
                  <div className="grid grid-cols-[40px_minmax(0,1fr)_120px_70px] gap-3 px-4 py-2 text-[11px] font-medium text-slate-400 border-b border-slate-100">
                    <span className="text-center">#</span><span>Episode</span><span>Published</span><span className="text-right"><Clock size={12} className="inline" /></span>
                  </div>
                  {episodes.slice(0, 20).map((ep, i) => (
                    <button key={ep._id} onClick={() => onPlay('ep', ep)}
                      className="dash-rise group w-full grid grid-cols-[40px_minmax(0,1fr)_120px_70px] gap-3 items-center px-4 py-2.5 text-left border-t border-slate-50 first-of-type:border-0 hover:bg-indigo-50/50 transition-colors"
                      style={{ animationDelay: `${220 + i * 30}ms` }}>
                      <span className="relative w-8 h-8 mx-auto flex items-center justify-center">
                        <span className="text-[12px] text-slate-400 tabular-nums group-hover:opacity-0 transition-opacity">{i + 1}</span>
                        <span className="absolute inset-0 rounded-full flex items-center justify-center text-white opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all"
                          style={{ background: `linear-gradient(135deg, ${VIOLET}, #4F46E5)` }}>
                          <Play size={13} className="ml-0.5" fill="currentColor" />
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-slate-900 truncate group-hover:text-indigo-700 transition-colors">{ep.title}</span>
                        <span className="block text-[11px] text-slate-400 truncate">
                          {ep.hostName || 'AreaConnect FM'}
                          {ep.guestNames?.length > 0 && <> · with {ep.guestNames.slice(0, 2).join(', ')}{ep.guestNames.length > 2 ? '…' : ''}</>}
                        </span>
                      </span>
                      <span className="text-[12px] text-slate-500">{ep.publishedAt ? new Date(ep.publishedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                      <span className="text-[12px] text-slate-500 text-right tabular-nums">{fmtClock(ep.durationSec)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Side column ── */}
          <aside className="col-span-12 xl:col-span-4 space-y-4">
            <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 overflow-hidden" style={{ animationDelay: '100ms' }}>
              <div className="flex items-center justify-between px-4 h-11 border-b border-slate-100">
                <h3 className="text-[13px] font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${VIOLET}, #4F46E5)` }}>
                    <Calendar size={12} className="text-white" />
                  </span>
                  Coming up on FM
                </h3>
                <span className="text-[12px] text-slate-400">{upcoming.length}</span>
              </div>
              {upcoming.length === 0 ? (
                <p className="px-4 py-4 text-[12px] text-slate-400">No shows scheduled.</p>
              ) : (
                <div className="relative py-2">
                  <span className="absolute left-[30px] top-4 bottom-4 w-px bg-gradient-to-b from-indigo-300 to-transparent" />
                  {upcoming.slice(0, 6).map((s, i) => {
                    const d = s.scheduledAt ? new Date(s.scheduledAt) : null;
                    return (
                      <div key={s._id} className="relative flex items-start gap-3 px-4 py-2.5">
                        <span className={`relative z-10 mt-1 w-[11px] h-[11px] ml-[2px] rounded-full border-2 border-white shadow ${i === 0 ? 'bg-indigo-500' : 'bg-indigo-300'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium text-slate-900 truncate">{s.title}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            {d ? d.toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Any time'}
                            {s.isRecurring && <span className="inline-flex items-center gap-0.5 px-1.5 rounded-full bg-indigo-50 text-indigo-600 font-medium"><Repeat size={9} /> Weekly</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button onClick={onStart}
              className="dash-rise group w-full relative overflow-hidden rounded-2xl p-4 text-left text-white transition-transform hover:-translate-y-0.5"
              style={{ animationDelay: '160ms', background: 'linear-gradient(135deg, #4F46E5, #0EA5E9)', boxShadow: '0 14px 28px -16px rgba(79,70,229,0.8)' }}>
              <div className="dash-blob absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl" style={{ background: 'rgba(251,207,232,0.45)' }} />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><Mic size={18} /></div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">Go live</div>
                  <div className="text-[11px] text-white/75">Host a room, DJ set or FM show</div>
                </div>
                <Equalizer bars={5} className="ml-auto h-6" />
              </div>
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
