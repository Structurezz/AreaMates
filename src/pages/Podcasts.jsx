import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Radio, Mic, Play, Pause, X, Users, Clock, Calendar, Headphones,
  Volume2, ChevronRight, Heart, MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { djAPI, podcastAPI } from '../api';
import { useSocket } from '../context/SocketContext';
import DJLive from '../components/DJLive';

const VIOLET      = '#8B5CF6';
const VIOLET_DARK = '#6D28D9';
const INDIGO      = '#6366F1';
const INDIGO_DARK = '#4F46E5';

const niceDate = (d) => d ? new Date(d).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const fmtMin   = (s) => `${Math.round((s || 0) / 60)} min`;

// ─── Episode / Mixtape player (shared minimalist player) ─────────────────────

function AudioPlayer({ item, kind, onClose }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos]         = useState(0);
  const [np, setNp]           = useState(kind === 'mix' ? (item.setlist?.[0] || null) : null);

  const dur     = kind === 'ep' ? (item.durationSec || 0) : (item.totalDurationSec || 0);
  const url     = kind === 'ep' ? item.audioUrl : item.voiceAudioUrl;
  const color   = kind === 'ep' ? VIOLET      : INDIGO;
  const colorD  = kind === 'ep' ? VIOLET_DARK : INDIGO_DARK;
  const label   = kind === 'ep' ? 'AreaConnect FM Episode' : 'Lounge Mixtape';

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      const t = a.currentTime;
      setPos(t);
      if (kind === 'mix') {
        const entry = (item.setlist || []).find(e => t >= e.startSec && (e.endSec === 0 || t < e.endSec));
        if (entry && entry.videoId !== np?.videoId) setNp(entry);
      }
    };
    const onEnd = () => setPlaying(false);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('ended', onEnd); };
  }, [item, kind, np]);

  const recorded = useRef(false);
  const toggle = async () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); return; }
    try {
      await audioRef.current.play();
      setPlaying(true);
      if (!recorded.current) {
        recorded.current = true;
        (kind === 'ep' ? podcastAPI.recordPlay(item._id) : djAPI.recordPlay(item._id)).catch(() => {});
      }
    } catch {}
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'linear-gradient(180deg, #0F172A, #1E1B4B)', display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#C4B5FD', textTransform: 'uppercase' }}>{label}</div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer' }}><X size={16}/></button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 720, width: '100%' }}>
          {kind === 'mix' && np?.videoId && (
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 16 }}>
              <iframe key={`${np.videoId}-${np.startSec}`}
                src={`https://www.youtube.com/embed/${np.videoId}?autoplay=${playing ? 1 : 0}&modestbranding=1&rel=0`}
                allow="autoplay; encrypted-media; fullscreen" allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            </div>
          )}

          {kind === 'ep' && (
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 110, height: 110, borderRadius: 28, background: `linear-gradient(135deg, ${color}, ${colorD})`, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 48px rgba(139,92,246,0.5)' }}>
                <Radio size={44}/>
              </div>
            </div>
          )}

          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#C4B5FD', textTransform: 'uppercase' }}>{item.hostName}</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 8px' }}>{item.title}</h2>
          {kind === 'ep' && item.description && <p style={{ color: '#CBD5E1', fontSize: 13, lineHeight: 1.55, marginBottom: 16 }}>{item.description}</p>}
          {kind === 'mix' && <div style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 16 }}>Now: {np?.title || '—'}{np?.artist && ` · ${np.artist}`}</div>}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={toggle}
              style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${color}, ${colorD})`, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 10px 24px ${color}55` }}>
              {playing ? <Pause size={22}/> : <Play size={22}/>}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, dur ? (pos / dur) * 100 : 0)}%`, background: `linear-gradient(90deg, ${color}, ${colorD})`, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                <span>{Math.floor(pos / 60)}:{String(Math.floor(pos % 60)).padStart(2, '0')}</span>
                <span>{Math.floor(dur / 60)}:{String(Math.floor(dur % 60)).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          <audio ref={audioRef} src={url} preload="auto" />
          {!url && <div style={{ marginTop: 14, fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>No audio recorded for this one.</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Podcasts() {
  const navigate = useNavigate();
  const { subscribe } = useSocket();
  const [upcoming, setUpcoming] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [mixtapes, setMixtapes] = useState([]);
  const [activeDJ, setActiveDJ] = useState(null);
  const [liveFM, setLiveFM]     = useState(null);
  const [playing, setPlaying]   = useState(null); // { kind: 'ep'|'mix', item }

  useEffect(() => {
    Promise.all([
      podcastAPI.getLive().catch(() => ({ data: { data: null } })),
      podcastAPI.getUpcoming().catch(() => ({ data: { data: [] } })),
      podcastAPI.listEpisodes().catch(() => ({ data: { data: [] } })),
      djAPI.getActive().catch(() => ({ data: { data: null } })),
      djAPI.listMixtapes().catch(() => ({ data: { data: [] } })),
    ]).then(([live, up, ep, dj, mix]) => {
      setLiveFM(live.data.data);
      setUpcoming(up.data.data || []);
      setEpisodes(ep.data.data || []);
      setActiveDJ(dj.data.data);
      setMixtapes(mix.data.data || []);
    });

    const u1 = subscribe('podcast:started', (s) => setLiveFM(s));
    const u2 = subscribe('podcast:ended',   () => setLiveFM(null));
    const u3 = subscribe('dj:started',      (s) => setActiveDJ(s));
    const u4 = subscribe('dj:ended',        () => setActiveDJ(null));
    return () => { u1 && u1(); u2 && u2(); u3 && u3(); u4 && u4(); };
  }, [subscribe]);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 4px 40px' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 55%, #8B5CF6 100%)',
        borderRadius: 20, padding: '22px 20px', color: '#fff', marginBottom: 18,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }}/>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 11px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', marginBottom: 10 }}>
            <Radio size={12}/> PODCAST
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.15 }}>
            Live rooms, mixtapes, FM shows.
          </h1>
          <p style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.55, marginTop: 8 }}>
            Catch neighbours going live, replay past sets, or start your own — prayer, chat, DJ, podcast.
          </p>
          <button onClick={() => navigate('/lounge/live')}
            style={{ marginTop: 14, padding: '10px 18px', borderRadius: 12, border: 'none', background: '#fff', color: VIOLET_DARK, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Mic size={14}/> Start a live room
          </button>
        </div>
      </div>

      {/* Live right now (uses the same DJLive banner for the estate's active room) */}
      {(activeDJ || liveFM) && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Live right now</div>
          {/* DJLive handles its own fetch + banner — rendering it here surfaces the estate's current room on this page too */}
          <DJLive />
          {liveFM && !activeDJ && (
            <div style={{ padding: 14, borderRadius: 14, background: 'linear-gradient(135deg, #4C1D95, #6D28D9)', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Radio size={18}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.85, textTransform: 'uppercase' }}>AreaConnect FM · Live</div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{liveFM.title}</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Tap the floating pill to tune in</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upcoming FM shows */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Calendar size={13} color={VIOLET_DARK}/>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>Coming up on AreaConnect FM</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.slice(0, 5).map(s => (
              <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${VIOLET}18`, color: VIOLET_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Radio size={14}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{s.title}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>
                    {s.scheduledAt ? niceDate(s.scheduledAt) : 'Any time'}
                    {s.isRecurring && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 999, background: '#EDE9FE', color: VIOLET_DARK, fontWeight: 700, fontSize: 10 }}>Recurring</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past FM episodes */}
      {episodes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Radio size={13} color={VIOLET_DARK}/>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>AreaConnect FM archive</h2>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>· {episodes.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {episodes.slice(0, 10).map(ep => (
              <button key={ep._id} onClick={() => setPlaying({ kind: 'ep', item: ep })}
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = VIOLET}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${VIOLET}18`, color: VIOLET_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Volume2 size={14}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.title}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>
                    {new Date(ep.publishedAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} · {fmtMin(ep.durationSec)}
                    {ep.guestNames?.length > 0 && <> · with {ep.guestNames.slice(0, 2).join(', ')}{ep.guestNames.length > 2 ? '…' : ''}</>}
                  </div>
                </div>
                <ChevronRight size={14} color="#94A3B8"/>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mixtapes from the estate */}
      {mixtapes.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Headphones size={13} color={INDIGO_DARK}/>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>Your estate's archive</h2>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>· {mixtapes.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {mixtapes.map(m => (
              <button key={m._id} onClick={() => setPlaying({ kind: 'mix', item: m })}
                style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = INDIGO}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${INDIGO}18`, color: INDIGO_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {m.hostPhoto ? <img src={m.hostPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <Play size={14}/>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>
                    {m.hostName} · <Clock size={10} style={{ display: 'inline', verticalAlign: '-2px' }}/> {fmtMin(m.totalDurationSec)} · {m.setlist?.length || 0} tracks
                  </div>
                </div>
                <ChevronRight size={14} color="#94A3B8"/>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!activeDJ && !liveFM && upcoming.length === 0 && episodes.length === 0 && mixtapes.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: '#EDE9FE', color: VIOLET_DARK, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Radio size={28}/>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>Nothing on air yet</div>
          <div style={{ fontSize: 13, color: '#64748B', maxWidth: 300, margin: '0 auto 16px' }}>
            Start the first live room — a prayer, a chat, a DJ set — your neighbours will get notified.
          </div>
          <button onClick={() => navigate('/lounge/live')}
            style={{ padding: '10px 20px', borderRadius: 12, background: `linear-gradient(135deg, ${VIOLET}, ${VIOLET_DARK})`, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Mic size={14}/> Start a live room
          </button>
        </div>
      )}

      {playing && <AudioPlayer item={playing.item} kind={playing.kind} onClose={() => setPlaying(null)} />}
    </div>
  );
}
