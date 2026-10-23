import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, Mic, MicOff } from 'lucide-react';
import { useMicLevel } from './StudioPanels';

// Step-by-step set-up for going live on a phone: one decision per screen,
// progress at the top, Back/Next pinned at the bottom.
// Kept identical in the residents and estatemanager apps.

/** Mic test used as the final step before going live */
export function MicCheck({ accent }) {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const level = useMicLevel(stream, !!stream);
  useEffect(() => () => stream?.getTracks().forEach(t => t.stop()), [stream]);
  const toggle = async () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); return; }
    try { setError(''); setStream(await navigator.mediaDevices.getUserMedia({ audio: true })); }
    catch { setError('Microphone is blocked — allow it in your browser settings.'); }
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={toggle}
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
          style={stream ? { background: accent, color: '#fff', boxShadow: `0 10px 24px -10px ${accent}` } : { background: '#F1F5F9', color: '#475569' }}>
          {stream ? <Mic size={22} /> : <MicOff size={22} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-[3px] h-8">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className="flex-1 rounded-sm transition-all duration-75"
                style={{ height: `${30 + (i / 16) * 70}%`, background: stream && level * 16 > i ? (i > 12 ? '#F59E0B' : '#10B981') : '#E2E8F0' }} />
            ))}
          </div>
          <div className="text-[12px] text-slate-500 mt-1.5">
            {error || (stream ? (level > 0.08 ? 'Sounding good 👍' : 'Say something…') : 'Tap the mic and say a few words')}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * steps: [{ key, title, hint, content, ready? (default true) }]
 * accent, onExit (back on step 1), onFinish, finishing, finishLabel
 */
export default function SetupSteps({ heading, steps, accent, onExit, onFinish, finishing, finishLabel = 'Go live now' }) {
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;
  const ready = step.ready !== false;

  return (
    <div className="-mx-4 -mt-4 min-h-[calc(100dvh-8rem)] flex flex-col">
      {/* Progress */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => (i ? setI(i - 1) : onExit())} className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500">
            <ArrowLeft size={14} /> {i ? 'Back' : 'Cancel'}
          </button>
          <span className="text-[12px] font-semibold text-slate-400">Step {i + 1} of {steps.length}</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {steps.map((s, k) => (
            <button key={s.key} type="button" onClick={() => k < i && setI(k)} aria-label={s.title}
              className="flex-1 h-1.5 rounded-full transition-colors" style={{ background: k <= i ? accent : '#E2E8F0' }} />
          ))}
        </div>
        {heading && <div className="mt-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: accent }}>{heading}</div>}
        <h1 className="mt-1 text-[20px] font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>{step.title}</h1>
        {step.hint && <p className="text-[13px] text-slate-500 mt-0.5">{step.hint}</p>}
      </div>

      {/* Step content */}
      <div key={step.key} className="flex-1 px-4 py-4 animate-fade-in">{step.content}</div>

      {/* Actions */}
      <div className="sticky bottom-0 px-4 py-3 bg-white/95 backdrop-blur border-t border-slate-100">
        {last ? (
          <button type="button" onClick={onFinish} disabled={finishing || !ready}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-[15px] disabled:opacity-60"
            style={{ background: accent, boxShadow: `0 12px 24px -12px ${accent}` }}>
            {finishing ? <><Loader2 size={16} className="animate-spin" /> Starting…</> : <><Mic size={16} /> {finishLabel}</>}
          </button>
        ) : (
          <button type="button" onClick={() => setI(i + 1)} disabled={!ready}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-[15px] disabled:opacity-50"
            style={{ background: accent }}>
            Next <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Big tappable option card for "pick one" steps */
export function OptionCard({ on, color, Icon, label, desc, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all active:scale-[0.99]"
      style={on ? { borderColor: color, background: `${color}10`, boxShadow: `0 0 0 3px ${color}1A` } : { borderColor: '#E2E8F0', background: '#fff' }}>
      <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={on ? { background: `linear-gradient(135deg, ${color}, ${color}CC)` } : { background: `${color}14` }}>
        <Icon size={19} style={{ color: on ? '#fff' : color }} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-semibold" style={{ color: on ? color : '#0F172A' }}>{label}</span>
        <span className="block text-[12px] text-slate-500 leading-snug mt-0.5">{desc}</span>
      </span>
      <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
        style={on ? { borderColor: color, background: color } : { borderColor: '#CBD5E1' }}>
        {on && <Check size={13} className="text-white" strokeWidth={3} />}
      </span>
    </button>
  );
}
