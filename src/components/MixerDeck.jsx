import { useEffect, useRef, useState } from 'react';
import { Music, Mic, Volume2, Volume1, VolumeX, X, Sliders } from 'lucide-react';
import { loungeAPI } from '../api';

/**
 * Classic broadcast mixer deck used by all host pages (DJ, prayer, podcast,
 * chat, announcement). Two vertical faders — Music + Mic — plus a track
 * picker. Hidden YouTube iframe plays the picked track locally for the host.
 *
 *   track:         current {videoId, title, artist} or null
 *   onChangeTrack: (newTrack|null) → fired when host picks / stops
 *   onMusicVolume: (0-100) → fired on slider change (host should emit socket)
 *   musicVolume:   current 0-100
 *   onMicGain:     (0-200) → fired on mic fader change
 *   micGain:       current 0-200
 *   accent:        brand color (string hex) for the music fader
 *   compact:       bool — tighter layout for small pages (announcement)
 */
export default function MixerDeck({
  track, onChangeTrack, musicVolume = 35, onMusicVolume,
  micGain = 100, onMicGain, accent = '#8B5CF6', compact = false,
}) {
  const [library, setLibrary]     = useState([]);
  const [showPicker, setPicker]   = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    loungeAPI.getSession().then(({ data }) => setLibrary(data.data?.suggestions || [])).catch(() => {});
  }, []);

  // Apply volume to the local iframe whenever musicVolume changes
  useEffect(() => {
    try { iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [musicVolume] }), '*'); } catch {}
  }, [musicVolume, track?.videoId]);

  const dark = '#0F172A';

  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 16, padding: compact ? '10px 12px' : '14px 18px', color: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: compact ? 8 : 12, flexWrap: 'wrap' }}>
        <Sliders size={14} color="#C4B5FD"/>
        <span style={{ fontSize: 12, fontWeight: 700 }}>Mixer deck</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>· broadcast to the room</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {track ? (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: `${accent}33`, border: `1px solid ${accent}66`, fontSize: 11, fontWeight: 700, color: '#fff', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <Music size={11}/> {track.title}
              </div>
              <button onClick={() => setPicker(true)} style={{ padding: '5px 10px', borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Change</button>
              <button onClick={() => onChangeTrack(null)} style={{ padding: '5px 10px', borderRadius: 999, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.14)', color: '#FCA5A5', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Stop</button>
            </>
          ) : (
            <button onClick={() => setPicker(true)} style={{ padding: '5px 12px', borderRadius: 999, border: 'none', background: accent, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Music size={11}/> Add music
            </button>
          )}
        </div>
      </div>

      {/* Hidden music iframe */}
      {track?.videoId && (
        <iframe ref={iframeRef} key={track.videoId}
          src={`https://www.youtube.com/embed/${track.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
          allow="autoplay; encrypted-media"
          style={{ position: 'absolute', width: 1, height: 1, border: 0, opacity: 0, pointerEvents: 'none' }}
          title="Mixer music"
        />
      )}

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Fader label="Music" value={musicVolume} max={100} unit="%"
          disabled={!track}
          onChange={onMusicVolume}
          color={accent}
          icon={musicVolume === 0 ? <VolumeX size={13}/> : musicVolume < 40 ? <Volume1 size={13}/> : <Volume2 size={13}/>}
          quickActions={[{ label: 'Duck', value: 15 }, { label: 'Up', value: 60 }]}
        />
        <Fader label="Mic" value={Math.round(micGain)} max={200} unit="%"
          disabled={false}
          onChange={(v) => onMicGain?.(v)}
          color="#10B981"
          icon={<Mic size={13}/>}
          quickActions={[{ label: 'Low', value: 80 }, { label: 'Hot', value: 150 }]}
        />
      </div>

      {showPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.72)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: dark }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Pick a background track</div>
              <button onClick={() => setPicker(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={16}/></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {library.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No tracks in the library.</div>}
              {library.map(t => (
                <button key={t._id} onClick={() => { onChangeTrack({ videoId: t.videoId, title: t.title, artist: t.artist || '' }); setPicker(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', width: '100%', textAlign: 'left', background: 'transparent', border: '1px solid transparent', borderRadius: 10, cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${accent}20`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Music size={13}/></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{t.artist || 'Shared library'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Fader({ label, value, max = 100, unit = '%', color, icon, disabled, onChange, quickActions = [] }) {
  return (
    <div style={{
      flex: 1, minWidth: 140,
      background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.25)',
      border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: 14, padding: 12,
      opacity: disabled ? 0.55 : 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#CBD5E1', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 4 }}>{value}<span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 2 }}>{unit}</span></div>
      <input type="range" min="0" max={max} value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          WebkitAppearance: 'slider-vertical',
          width: 24, height: 120, margin: '8px 0',
          accentColor: color,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }} />
      <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
        {quickActions.map(q => (
          <button key={q.label} disabled={disabled} onClick={() => onChange(q.value)}
            style={{ padding: '3px 9px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer' }}>
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
