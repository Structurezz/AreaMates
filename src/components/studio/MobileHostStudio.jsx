import { useState } from 'react';
import { Mic, MicOff, Users, TrendingUp, Heart, Smile, X, Loader2, SkipForward, Volume2, VolumeX, Volume1, Music } from 'lucide-react';
import { ReactionLayer, ChatPanel } from './StudioPanels';

// Phone layout for hosting a live room (podcast, DJ set, prayer, chat).
// Sticky on-air bar → mic console with live numbers and compact faders →
// now-playing strip → tabs (chat first, then whatever tools the page passes).
// Kept identical in the residents and estatemanager apps.

const fmtDur = (ms) => {
  const s = Math.floor(ms / 1000); const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

function HFader({ label, value, max = 100, color, Icon, disabled, onChange, presets = [] }) {
  return (
    <div className={`p-3 rounded-xl bg-black/25 border border-white/10 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60 flex items-center gap-1.5"><Icon size={12} /> {label}</span>
        <span className="text-[13px] font-semibold tabular-nums">{value}<span className="text-[10px] text-white/50 ml-0.5">%</span></span>
      </div>
      <input type="range" min="0" max={max} value={value} disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full mt-2 cursor-pointer disabled:cursor-not-allowed" style={{ accentColor: color }} />
      <div className="flex gap-1.5 mt-1.5 flex-wrap">
        {presets.map(([l, v]) => (
          <button key={l} type="button" disabled={disabled} onClick={() => onChange(v)}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors"
            style={value === v ? { background: color, borderColor: color, color: '#0F172A' } : { borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)' }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * props:
 *  title, kindLabel, KindIcon, accent, dark       — room identity
 *  live, level, elapsed, peak, engagement         — live state (useLiveAudio etc.)
 *  onEnd, ending                                  — end the room
 *  music: { title, subtitle, thumb, onNext, nextLabel, volume, onVolume } | null
 *  tabs:  [{ key, label, Icon, content }]         — extra tabs after Chat
 */
export default function MobileHostStudio({
  title, kindLabel, KindIcon = Mic, accent, dark, live, level = 0, elapsed, peak, engagement,
  onEnd, ending, music, tabs = [],
}) {
  const [tab, setTab] = useState('chat');
  const allTabs = [{ key: 'chat', label: 'Chat', Icon: null, badge: engagement.chat.length }, ...tabs];
  const active = allTabs.find(t => t.key === tab) || allTabs[0];
  const VolIcon = !music ? Volume2 : music.volume === 0 ? VolumeX : music.volume < 40 ? Volume1 : Volume2;

  return (
    <div className="-mx-4 -mt-4 pb-6">
      {/* On-air bar */}
      <div className="sticky top-0 z-20 px-4 py-2.5 bg-slate-900 text-white flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 flex-shrink-0">
          <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-red-400 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-red-500" /></span>
          <span className="text-[10px] font-bold tracking-wider text-red-300">LIVE</span>
          <span className="text-[11px] font-semibold tabular-nums text-white/80">{fmtDur(elapsed)}</span>
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate">{title}</div>
          <div className="text-[10px] text-slate-400 truncate flex items-center gap-1"><KindIcon size={10} /> {kindLabel}</div>
        </div>
        <button onClick={onEnd} disabled={ending}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 active:bg-red-600 text-white font-semibold text-[12px] disabled:opacity-60 flex-shrink-0">
          {ending ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} End
        </button>
      </div>

      {/* Console */}
      <div className="relative overflow-hidden text-white px-4 pt-5 pb-4"
        style={{ background: `linear-gradient(160deg, #0F172A 0%, #1E1B4B 55%, ${dark} 140%)` }}>
        <div className="absolute -top-20 left-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none" style={{ background: `${accent}40` }} />
        <ReactionLayer reactions={engagement.reactions} />
        <div className="relative">
          <div className="flex flex-col items-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {live.micOn && (
                <>
                  <span className="absolute inset-0 rounded-full transition-transform duration-100" style={{ background: `${accent}22`, transform: `scale(${1 + level * 0.45})` }} />
                  <span className="absolute inset-5 rounded-full transition-transform duration-100" style={{ background: `${accent}38`, transform: `scale(${1 + level * 0.3})` }} />
                </>
              )}
              <button onClick={live.toggleMic} aria-label={live.micOn ? 'Mute mic' : 'Unmute mic'}
                className="relative w-24 h-24 rounded-full flex items-center justify-center transition-transform active:scale-95"
                style={live.micOn ? { background: `linear-gradient(135deg, ${accent}, ${dark})`, boxShadow: `0 16px 40px -12px ${accent}` } : { background: '#334155' }}>
                {live.micOn ? <Mic size={34} /> : <MicOff size={34} />}
              </button>
            </div>
            <div className="mt-1 text-[13px] font-semibold" style={{ color: live.micOn ? '#A7F3D0' : '#FCA5A5' }}>
              {live.micOn ? 'You are live — speaking' : 'Muted — tap to talk'}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              [Users, live.listenerCount, 'Listening', '#7DD3FC'],
              [TrendingUp, peak, 'Peak', '#A7F3D0'],
              [Heart, engagement.likes, 'Likes', '#FDA4AF'],
              [Smile, engagement.reactionCount, 'Reacts', '#FDE68A'],
            ].map(([Icon, v, label, color]) => (
              <div key={label} className="rounded-xl bg-white/5 border border-white/10 py-2 text-center">
                <Icon size={13} className="mx-auto" style={{ color }} />
                <div className="text-[15px] font-semibold tabular-nums mt-0.5">{v}</div>
                <div className="text-[10px] text-white/50">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            <HFader label="Mic level" value={Math.round((live.micGain || 1) * 100)} max={200} color="#34D399" Icon={Mic}
              onChange={(v) => live.setMicGain((v || 0) / 100)} presets={[['Low', 80], ['Normal', 100], ['Hot', 150]]} />
            {music && (
              <HFader label="Music · everyone" value={music.volume} color={accent} Icon={VolIcon} disabled={!music.title}
                onChange={music.onVolume} presets={[['Duck', 15], ['Bed', 35], ['Up', 70], ['Mute', 0]]} />
            )}
          </div>

          {music && (
            <div className="mt-3 flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
              {music.thumb
                ? <img src={music.thumb} alt="" className="w-12 h-9 rounded-md object-cover flex-shrink-0" />
                : <span className="w-12 h-9 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0"><Music size={14} className="text-white/60" /></span>}
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold truncate">{music.title || 'Nothing playing'}</div>
                <div className="text-[11px] text-white/50 truncate">{music.subtitle || 'Pick a track in the Music tab'}</div>
              </div>
              {music.onNext && (
                <button onClick={music.onNext} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white flex-shrink-0" style={{ background: accent }}>
                  <SkipForward size={12} /> {music.nextLabel || 'Next'}
                </button>
              )}
            </div>
          )}
          {/* Embedded player (YouTube iframe or local audio) has to stay mounted */}
          {music?.player}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[52px] z-10 bg-white/95 backdrop-blur border-b border-slate-100 px-3">
        <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
          {allTabs.map(t => {
            const on = t.key === active.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors flex-shrink-0"
                style={on ? { background: accent, color: '#fff' } : { background: '#F1F5F9', color: '#475569' }}>
                {t.Icon && <t.Icon size={13} />} {t.label}
                {t.badge > 0 && !on && <span className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] leading-4 text-white" style={{ background: accent }}>{t.badge > 99 ? '99+' : t.badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-3">
        {active.key === 'chat'
          ? <div className="h-[62vh] min-h-[360px]"><ChatPanel engagement={engagement} accent={accent} /></div>
          : active.content}
      </div>
    </div>
  );
}
