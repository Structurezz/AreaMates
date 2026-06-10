import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Radio, Calendar, BarChart2,
  RefreshCw, ChevronRight, ChevronDown, Music, Heart, Shuffle,
  SkipBack, SkipForward, Plus, Link, Trash2,
} from 'lucide-react';
import { eventAPI, pollAPI, loungeAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 10;

const STATIONS = [
  { name: 'Groove Salad',    genre: 'Ambient / Chill',      url: 'https://ice1.somafm.com/groovesalad-128-mp3',  color: '#10B981', emoji: '🌿' },
  { name: 'Beat Blender',    genre: 'Electronic / Dance',   url: 'https://ice1.somafm.com/beatblender-128-mp3',  color: '#8B5CF6', emoji: '🎧' },
  { name: 'Illinois Lounge', genre: 'Jazz / Lounge',        url: 'https://ice1.somafm.com/illstreet-128-mp3',    color: '#D97706', emoji: '🎷' },
  { name: 'Space Station',   genre: 'Electronic / Ambient', url: 'https://ice1.somafm.com/spacestation-128-mp3', color: '#3B82F6', emoji: '🚀' },
  { name: 'Digitalis',       genre: 'Indie / Alternative',  url: 'https://ice1.somafm.com/digitalis-128-mp3',    color: '#EC4899', emoji: '🎸' },
  { name: 'Party Vibes',     genre: 'Afrobeats / Dancehall',url: 'https://ice1.somafm.com/beatblender-128-mp3',  color: '#F59E0B', emoji: '🎉' },
];

function getNextFriday() {
  const now = new Date();
  const daysUntil = ((5 - now.getDay() + 7) % 7) || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(18, 0, 0, 0);
  return next;
}

function useCountdown(target) {
  const [diff, setDiff] = useState(target - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const totalSec = Math.max(0, Math.floor(diff / 1000));
  return {
    d: Math.floor(totalSec / 86400),
    h: Math.floor((totalSec % 86400) / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

function EqBar({ color, delay }) {
  return (
    <div className="w-1 rounded-full animate-eq"
      style={{ background: color, animationDelay: delay, height: '24px' }} />
  );
}

function extractVideoId(raw) {
  const m = raw.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  return null;
}

export default function Lounge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef(null);

  // radio
  const [playing, setPlaying]           = useState(false);
  const [radioLoading, setRadioLoading] = useState(false);
  const [volume, setVolume]             = useState(0.7);
  const [muted, setMuted]               = useState(false);
  const [station, setStation]           = useState(STATIONS[0]);

  // dj queue
  const [session, setSession]           = useState(null);
  const [queueIdx, setQueueIdx]         = useState(0);
  const [shuffleOn, setShuffleOn]       = useState(true);
  const [showAdd, setShowAdd]           = useState(false);
  const [linkInput, setLinkInput]       = useState('');
  const [titleInput, setTitleInput]     = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [defaultsPage, setDefaultsPage] = useState(1);
  const [dataLoading, setDataLoading]   = useState(true);

  // sidebar
  const [events, setEvents] = useState([]);
  const [polls, setPoll]    = useState([]);

  const now           = new Date();
  const isFriday      = now.getDay() === 5;
  const isFridayNight = isFriday && now.getHours() >= 18;
  const accent        = isFridayNight ? '#F59E0B' : '#10B981';
  const countdown     = useCountdown(getNextFriday().getTime());
  const pad           = n => String(n).padStart(2, '0');

  const queue           = [...(session?.suggestions || [])].sort((a, b) => b.votes.length - a.votes.length);
  const communityTracks = queue.filter(t => !t.isDefault);
  const defaultTracks   = queue.filter(t => t.isDefault);
  const visibleDefaults = defaultTracks.slice(0, defaultsPage * PAGE_SIZE);
  const hasMoreDefaults = visibleDefaults.length < defaultTracks.length;
  const track           = queue[queueIdx] ?? null;

  useEffect(() => {
    Promise.all([eventAPI.getAll(), pollAPI.getAll(), loungeAPI.getSession()])
      .then(([ev, po, lo]) => {
        setEvents((ev.data.data || []).slice(0, 3));
        setPoll((po.data.data || []).filter(p => p.isActive).slice(0, 2));
        const s = lo.data.data;
        setSession(s);
        if (typeof s?.isAutoDJ === 'boolean') setShuffleOn(s.isAutoDJ);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, []);

  useEffect(() => {
    if (isFridayNight && station.name !== 'Party Vibes') setStation(STATIONS[5]);
  }, [isFridayNight]);

  // ── Radio ──────────────────────────────────────────────────────────
  const playRadio = useCallback(async (st = station) => {
    const audio = audioRef.current;
    if (!audio) return;
    setRadioLoading(true);
    audio.src = st.url;
    audio.volume = muted ? 0 : volume;
    try { await audio.play(); setPlaying(true); }
    catch { setPlaying(false); }
    finally { setRadioLoading(false); }
  }, [station, volume, muted]);

  const pauseRadio    = () => { audioRef.current?.pause(); setPlaying(false); };
  const selectStation = (st) => { setStation(st); if (playing) playRadio(st); };
  const togglePlay    = () => playing ? pauseRadio() : playRadio();
  const handleVolume  = (v) => { setVolume(v); if (audioRef.current) audioRef.current.volume = muted ? 0 : v; };
  const toggleMute    = () => { const n = !muted; setMuted(n); if (audioRef.current) audioRef.current.volume = n ? 0 : volume; };

  // ── DJ Queue ───────────────────────────────────────────────────────
  const advance = useCallback(() => {
    if (!queue.length) return;
    setQueueIdx(prev => shuffleOn
      ? Math.floor(Math.random() * queue.length)
      : (prev + 1) % queue.length);
  }, [queue.length, shuffleOn]);

  const goBack = useCallback(() => {
    if (!queue.length) return;
    setQueueIdx(prev => (prev - 1 + queue.length) % queue.length);
  }, [queue.length]);

  const pickTrack = (idx) => setQueueIdx(idx);

  const toggleShuffle = async () => {
    const next = !shuffleOn;
    setShuffleOn(next);
    try { await loungeAPI.updateMood({ isAutoDJ: next }); } catch {}
  };

  const handleVote = async (id) => {
    try { const { data } = await loungeAPI.vote(id); setSession(data.data); } catch {}
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this track from the queue?')) return;
    try {
      await loungeAPI.remove(id);
      setSession(prev => prev
        ? { ...prev, suggestions: prev.suggestions.filter(s => s._id !== id) }
        : prev);
      setQueueIdx(i => Math.min(i, Math.max(0, queue.length - 2)));
    } catch {}
  };

  const handleAdd = async () => {
    const videoId = extractVideoId(linkInput.trim());
    if (!videoId)           { alert('Paste a YouTube URL or video ID'); return; }
    if (!titleInput.trim()) { alert('Enter a track title'); return; }
    setSubmitting(true);
    try {
      const { data } = await loungeAPI.suggest(videoId, titleInput.trim());
      setSession(data.data);
      setLinkInput(''); setTitleInput(''); setShowAdd(false);
    } catch (e) {
      alert(e.response?.data?.message || 'Could not add track');
    } finally { setSubmitting(false); }
  };

  const activePoll = polls[0];
  const totalVotes = activePoll ? activePoll.options.reduce((s, o) => s + o.votes.length, 0) : 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <audio ref={audioRef}
        onEnded={() => setPlaying(false)}
        onError={() => { setPlaying(false); setRadioLoading(false); }} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#0F172A', letterSpacing: '-0.03em' }}>
            <Music size={22} className="text-emerald-500" /> Resident Lounge
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Community DJ · Estate Vibes</p>
        </div>
        {isFridayNight && (
          <div
            className="px-3 py-1.5 rounded-full text-xs font-bold animate-pulse"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#D97706', border: '1px solid rgba(245,158,11,0.30)' }}
          >
            🎉 Friday Night FunTimes is LIVE!
          </div>
        )}
      </div>

      {/* Friday Night / Countdown */}
      {isFridayNight ? (
        <div
          className="glass-card p-4 flex items-center gap-4"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}
        >
          <span className="text-3xl">🎉</span>
          <div>
            <p className="font-bold text-base" style={{ color: '#D97706' }}>Friday Night FunTimes!</p>
            <p className="text-sm mt-0.5" style={{ color: '#F59E0B', opacity: 0.7 }}>Add a banger and vibe with the estate</p>
          </div>
        </div>
      ) : (
        <div className="glass-card p-5 text-center">
          <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: '#94A3B8' }}>
            {isFriday ? 'Friday FunTimes starts at 6 PM — get ready!' : 'Next Friday Night FunTimes in'}
          </p>
          <div className="flex justify-center gap-3">
            {[['d', countdown.d], ['h', countdown.h], ['m', countdown.m], ['s', countdown.s]].map(([l, v]) => (
              <div key={l} className="glass-card px-4 py-2 min-w-[56px]">
                <div className="text-xl font-bold tabular-nums" style={{ color: '#0F172A' }}>{pad(v)}</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DJ Hero */}
      <div
        className="glass-card p-5 overflow-hidden"
        style={{ background: isFridayNight ? 'rgba(255,251,235,0.9)' : 'rgba(236,253,245,0.9)' }}
      >
        {track ? (
          <div className="rounded-xl overflow-hidden mb-4 w-full bg-black" style={{ aspectRatio: '16/9' }}>
            <iframe
              key={track.videoId}
              src={`https://www.youtube.com/embed/${track.videoId}?autoplay=1&modestbranding=1&rel=0`}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              className="w-full h-full border-0"
              title={track.title}
            />
          </div>
        ) : (
          <div
            className="rounded-xl mb-4 w-full flex flex-col items-center justify-center gap-3 py-12"
            style={{ background: accent + '10', border: `1px solid ${accent}25` }}
          >
            <Music size={36} style={{ color: accent }} />
            <p className="font-semibold text-sm" style={{ color: '#475569' }}>Queue is empty</p>
            <p className="text-xs" style={{ color: '#94A3B8' }}>Add a track below to start the session</p>
          </div>
        )}

        {track && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-end gap-0.5">
              {['0s', '0.1s', '0.2s', '0.3s'].map((d, i) => (
                <EqBar key={i} color={accent} delay={d} />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: '#94A3B8' }}>Now Playing</p>
              <p className="font-semibold truncate mt-0.5" style={{ color: '#0F172A' }}>{track.title}</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                {track.artist || (track.suggestedBy?.name ? `Added by ${track.suggestedBy.name}` : 'Estate DJ Mix')}
              </p>
            </div>
          </div>
        )}

        {/* Transport */}
        <div className="flex items-center justify-center gap-4 mb-2">
          <button
            onClick={toggleShuffle}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: shuffleOn ? accent + '18' : '#F1F5F9',
              border: `1px solid ${shuffleOn ? accent + '50' : '#E2E8F0'}`,
            }}
          >
            <Shuffle size={15} style={{ color: shuffleOn ? accent : '#94A3B8' }} />
          </button>
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}
            onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
            onMouseLeave={e => e.currentTarget.style.background = '#F1F5F9'}
          >
            <SkipBack size={17} style={{ color: '#64748B' }} />
          </button>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: accent }}>
            <Play size={20} className="text-white ml-0.5" />
          </div>
          <button
            onClick={advance}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}
            onMouseEnter={e => e.currentTarget.style.background = '#E2E8F0'}
            onMouseLeave={e => e.currentTarget.style.background = '#F1F5F9'}
          >
            <SkipForward size={17} style={{ color: '#64748B' }} />
          </button>
          <div className="w-9 h-9" />
        </div>
        <p className="text-center text-xs" style={{ color: '#94A3B8' }}>
          {shuffleOn ? '🔀 Shuffle on — playing randomly' : '▶ Sequential — playing in order'}
        </p>
      </div>

      {/* Community Tracks */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-sm" style={{ color: '#0F172A' }}>Your Tracks</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
              {communityTracks.length
                ? `${communityTracks.length} resident track${communityTracks.length !== 1 ? 's' : ''} · upvote to promote`
                : 'Add a track to jump the queue'}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: showAdd ? 'rgba(59,130,246,0.10)' : 'transparent',
              border: '1px solid rgba(59,130,246,0.30)',
              color: '#3B82F6',
            }}
          >
            <Plus size={12} /> {showAdd ? 'Cancel' : 'Add Track'}
          </button>
        </div>

        {showAdd && (
          <div className="mb-4 space-y-2">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <Link size={14} style={{ color: '#CBD5E1' }} className="flex-shrink-0" />
              <input
                value={linkInput}
                onChange={e => setLinkInput(e.target.value)}
                placeholder="YouTube link or video ID"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: '#0F172A' }}
              />
            </div>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <Music size={14} style={{ color: '#CBD5E1' }} className="flex-shrink-0" />
              <input
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                placeholder="Track title"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: '#0F172A' }}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#3B82F6' }}
            >
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : 'Add to Queue'}
            </button>
          </div>
        )}

        {communityTracks.length === 0 && !showAdd ? (
          <div className="py-8 flex flex-col items-center gap-2" style={{ color: '#CBD5E1' }}>
            <Music size={24} />
            <p className="text-sm">Be the first DJ — add a track above</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {communityTracks.map(t => {
              const globalIdx = queue.indexOf(t);
              const active    = globalIdx === queueIdx;
              const hasVoted  = t.votes?.some(v => (v._id || v)?.toString() === user?._id?.toString());
              const isOwn     = (t.suggestedBy?._id || t.suggestedBy)?.toString() === user?._id?.toString();
              return (
                <div
                  key={t._id}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer transition-all"
                  style={active ? { background: 'rgba(59,130,246,0.08)' } : {}}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'rgba(59,130,246,0.08)' : 'transparent'; }}
                  onClick={() => pickTrack(globalIdx)}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      background: active ? '#3B82F6' : '#F1F5F9',
                      color: active ? '#fff' : '#94A3B8',
                    }}
                  >
                    {globalIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate"
                      style={{ color: active ? '#3B82F6' : '#0F172A' }}>{t.title}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>
                      {t.suggestedBy?.name ? `Added by ${t.suggestedBy.name}` : 'Resident'}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleVote(t._id); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all flex-shrink-0"
                    style={{
                      background: hasVoted ? 'rgba(59,130,246,0.12)' : '#F1F5F9',
                      color: hasVoted ? '#3B82F6' : '#94A3B8',
                    }}
                  >
                    <Heart size={11} fill={hasVoted ? '#3B82F6' : 'none'} strokeWidth={hasVoted ? 0 : 2} />
                    {t.votes?.length || 0}
                  </button>
                  {isOwn && !t.isDefault && (
                    <button
                      onClick={e => { e.stopPropagation(); handleRemove(t._id); }}
                      className="p-1 transition-colors flex-shrink-0"
                      style={{ color: '#CBD5E1' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DJ Playlist (default tracks) */}
      {defaultTracks.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-sm" style={{ color: '#0F172A' }}>DJ Playlist</h2>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                {visibleDefaults.length} of {defaultTracks.length} tracks · tap to play
              </p>
            </div>
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(59,130,246,0.10)', color: '#3B82F6' }}
            >
              <Music size={11} /> Auto
            </div>
          </div>
          <div className="space-y-0.5">
            {visibleDefaults.map(t => {
              const globalIdx = queue.indexOf(t);
              const active    = globalIdx === queueIdx;
              const hasVoted  = t.votes?.some(v => (v._id || v)?.toString() === user?._id?.toString());
              return (
                <div
                  key={t._id}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer transition-all"
                  style={active ? { background: 'rgba(59,130,246,0.08)' } : {}}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'rgba(59,130,246,0.08)' : 'transparent'; }}
                  onClick={() => pickTrack(globalIdx)}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      background: active ? '#3B82F6' : '#F1F5F9',
                      color: active ? '#fff' : '#94A3B8',
                    }}
                  >
                    {globalIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate"
                      style={{ color: active ? '#3B82F6' : '#0F172A' }}>{t.title}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>{t.artist || 'Estate DJ Mix'}</p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleVote(t._id); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all flex-shrink-0"
                    style={{
                      background: hasVoted ? 'rgba(59,130,246,0.12)' : '#F1F5F9',
                      color: hasVoted ? '#3B82F6' : '#94A3B8',
                    }}
                  >
                    <Heart size={11} fill={hasVoted ? '#3B82F6' : 'none'} strokeWidth={hasVoted ? 0 : 2} />
                    {t.votes?.length || 0}
                  </button>
                </div>
              );
            })}
          </div>
          {hasMoreDefaults && (
            <button
              onClick={() => setDefaultsPage(p => p + 1)}
              className="w-full mt-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
              style={{ border: '1px solid rgba(59,130,246,0.22)', color: '#3B82F6' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <ChevronDown size={15} />
              Load {Math.min(PAGE_SIZE, defaultTracks.length - visibleDefaults.length)} more tracks
            </button>
          )}
        </div>
      )}

      {/* Radio Player */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Radio size={14} className="text-emerald-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Radio Station</h2>
        </div>
        <div
          className="flex items-center gap-4 mb-4 p-4 rounded-xl"
          style={{ background: station.color + '0F', border: `1px solid ${station.color}28` }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: station.color + '18' }}
          >
            {station.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate" style={{ color: '#0F172A' }}>{station.name}</div>
            <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{station.genre}</div>
            {playing && (
              <div className="flex items-end gap-0.5 mt-1.5">
                {['0s','0.1s','0.2s','0.3s','0.4s'].map((d, i) => (
                  <EqBar key={i} color={station.color} delay={d} />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="p-2 transition-colors" style={{ color: '#94A3B8' }}
              onMouseEnter={e => e.currentTarget.style.color = '#0F172A'}
              onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={togglePlay}
              disabled={radioLoading}
              className="w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all hover:scale-105 active:scale-95"
              style={{ background: station.color }}
            >
              {radioLoading
                ? <RefreshCw size={15} className="animate-spin text-white" />
                : playing
                  ? <Pause size={15} className="text-white" />
                  : <Play size={15} className="text-white" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <Volume2 size={12} style={{ color: '#CBD5E1' }} className="flex-shrink-0" />
          <input type="range" min="0" max="1" step="0.05" value={volume}
            onChange={e => handleVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
            style={{ background: `linear-gradient(to right, ${station.color} ${volume * 100}%, #E2E8F0 ${volume * 100}%)` }} />
          <Volume2 size={16} style={{ color: '#94A3B8' }} className="flex-shrink-0" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STATIONS.map(st => (
            <button
              key={st.name}
              onClick={() => selectStation(st)}
              className="p-3 rounded-xl text-left transition-all border"
              style={station.name === st.name
                ? { background: st.color + '12', borderColor: st.color + '40' }
                : { background: '#F8FAFC', borderColor: '#E2E8F0' }
              }
              onMouseEnter={e => { if (station.name !== st.name) e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={e => { if (station.name !== st.name) e.currentTarget.style.background = '#F8FAFC'; }}
            >
              <div className="text-base mb-1">{st.emoji}</div>
              <div className="text-xs font-semibold truncate" style={{ color: '#0F172A' }}>{st.name}</div>
              <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{st.genre}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-blue-500" />
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Upcoming Events</h2>
          </div>
          <button
            onClick={() => navigate('/events')}
            className="text-xs flex items-center gap-1 transition-colors"
            style={{ color: '#10B981' }}
          >
            View all <ChevronRight size={12} />
          </button>
        </div>
        {!dataLoading && events.length ? (
          <div className="grid sm:grid-cols-3 gap-3">
            {events.map(ev => (
              <div
                key={ev._id}
                onClick={() => navigate('/events')}
                className="glass-card p-4 cursor-pointer transition-all"
              >
                <div className="text-xs font-medium mb-1" style={{ color: '#3B82F6' }}>
                  {new Date(ev.date).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}
                  {ev.time && ` · ${ev.time}`}
                </div>
                <div className="font-semibold text-sm leading-snug" style={{ color: '#0F172A' }}>{ev.title}</div>
                {ev.location && <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>📍 {ev.location}</div>}
                <div className="text-xs mt-2" style={{ color: '#CBD5E1' }}>{ev.rsvps?.length || 0} going</div>
              </div>
            ))}
          </div>
        ) : (
          !dataLoading && (
            <div className="glass-card p-5 text-center text-sm" style={{ color: '#94A3B8' }}>
              No upcoming events
            </div>
          )
        )}
      </div>

      {/* Community Poll */}
      {!dataLoading && activePoll && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart2 size={14} className="text-emerald-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Community Poll</h2>
            </div>
            <button
              onClick={() => navigate('/polls')}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: '#10B981' }}
            >
              All polls <ChevronRight size={12} />
            </button>
          </div>
          <div className="glass-card p-5">
            <p className="font-semibold mb-3" style={{ color: '#0F172A' }}>{activePoll.question}</p>
            <div className="space-y-2 mb-3">
              {activePoll.options.slice(0, 3).map((opt, i) => {
                const pct = totalVotes ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                return (
                  <div key={i} className="relative">
                    <div
                      className="absolute inset-0 rounded-lg"
                      style={{ background: 'rgba(16,185,129,0.10)', width: `${pct}%` }}
                    />
                    <div
                      className="relative px-3 py-2 rounded-lg flex justify-between text-sm"
                      style={{ border: '1px solid rgba(15,23,42,0.07)' }}
                    >
                      <span style={{ color: '#475569' }}>{opt.text}</span>
                      <span className="font-medium" style={{ color: '#94A3B8' }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => navigate('/polls')}
              className="text-xs transition-colors"
              style={{ color: '#10B981' }}
            >
              Vote on this poll →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
