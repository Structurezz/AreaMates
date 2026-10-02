import { useEffect, useRef, useState } from 'react';
import { Play, Pause, X, Headphones, Users, Clock, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { djAPI } from '../api';

const INDIGO = '#6366F1';
const INDIGO_DARK = '#4F46E5';

const fmtMin = (sec) => `${Math.round((sec || 0) / 60)} min`;

function MixtapePlayer({ mixtape, onClose }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos]         = useState(0);
  const [np, setNp]           = useState(mixtape.setlist?.[0] || null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      const t = audio.currentTime;
      setPos(t);
      // Find the setlist entry covering this time
      const entry = (mixtape.setlist || []).find(e => t >= e.startSec && (e.endSec === 0 || t < e.endSec));
      if (entry && entry.videoId !== np?.videoId) setNp(entry);
    };
    const onEnd  = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnd);
    };
  }, [mixtape, np]);

  // Record a single play on first play
  const recordedRef = useRef(false);
  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); return; }
    try {
      await audioRef.current.play();
      setPlaying(true);
      if (!recordedRef.current) {
        recordedRef.current = true;
        djAPI.recordPlay(mixtape._id).catch(() => {});
      }
    } catch {}
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(2,6,23,0.9)', display: 'flex', flexDirection: 'column', color: '#fff' }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#A5B4FC', textTransform: 'uppercase' }}>Mixtape</div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: 8, color: '#fff', cursor: 'pointer' }}><X size={16}/></button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 760, width: '100%' }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            {np?.videoId ? (
              <iframe key={`${np.videoId}-${np.startSec}`}
                src={`https://www.youtube.com/embed/${np.videoId}?autoplay=${playing ? 1 : 0}&modestbranding=1&rel=0&start=0&mute=0`}
                allow="autoplay; encrypted-media; fullscreen"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                No video for this segment
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: '#A5B4FC', textTransform: 'uppercase' }}>{mixtape.hostName} · {fmtMin(mixtape.totalDurationSec)}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 2px' }}>{mixtape.title}</h2>
            <div style={{ fontSize: 13, color: '#CBD5E1' }}>Now: {np?.title || '—'} · {np?.artist || ''}</div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={togglePlay}
              style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${INDIGO}, ${INDIGO_DARK})`, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 10px 24px rgba(99,102,241,0.5)' }}>
              {playing ? <Pause size={22}/> : <Play size={22}/>}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (pos / (mixtape.totalDurationSec || 1)) * 100)}%`, background: `linear-gradient(90deg, ${INDIGO}, ${INDIGO_DARK})`, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                <span>{Math.floor(pos / 60)}:{String(Math.floor(pos % 60)).padStart(2, '0')}</span>
                <span>{Math.floor((mixtape.totalDurationSec || 0) / 60)}:{String(Math.floor((mixtape.totalDurationSec || 0) % 60)).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          <audio ref={audioRef} src={mixtape.voiceAudioUrl} preload="auto" />
          {!mixtape.voiceAudioUrl && (
            <div style={{ marginTop: 12, fontSize: 12, color: '#94A3B8', textAlign: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 12 }}>
              No voice recording — tracks will not auto-sync.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MixtapeArchive() {
  const [mixtapes, setMixtapes] = useState([]);
  const [playing, setPlaying]   = useState(null);

  useEffect(() => {
    djAPI.listMixtapes().then(({ data }) => setMixtapes(data.data || [])).catch(() => {});
  }, []);

  if (mixtapes.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Headphones size={14} color={INDIGO_DARK}/>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Lounge Mixtapes</div>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>· replay your DJ's sets</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {mixtapes.slice(0, 6).map(m => (
          <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12 }}
            onMouseEnter={e => e.currentTarget.style.borderColor = INDIGO}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
            <button onClick={() => setPlaying(m)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${INDIGO}18`, color: INDIGO_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                {m.hostPhoto ? <img src={m.hostPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <Play size={14}/>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                <div style={{ fontSize: 11, color: '#94A3B8' }}>
                  {m.hostName} · <Clock size={10} style={{ display: 'inline', verticalAlign: '-2px' }}/> {fmtMin(m.totalDurationSec)} · {m.setlist?.length || 0} tracks · <Users size={10} style={{ display: 'inline', verticalAlign: '-2px' }}/> {m.peakListeners || 0} peak
                </div>
              </div>
            </button>
            <button onClick={(e) => {
                e.stopPropagation();
                const url = `${window.location.origin}/lounge?mixtape=${m._id}`;
                if (navigator.share) {
                  navigator.share({ title: m.title, text: `Listen to "${m.title}" by ${m.hostName}`, url }).catch(()=>{});
                } else {
                  navigator.clipboard.writeText(url);
                  toast.success('Link copied');
                }
              }}
              style={{ padding: 6, borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', cursor: 'pointer', flexShrink: 0 }}
              title="Share mixtape">
              <Share2 size={13}/>
            </button>
          </div>
        ))}
      </div>

      {playing && <MixtapePlayer mixtape={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
