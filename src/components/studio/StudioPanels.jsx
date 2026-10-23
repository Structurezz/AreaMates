import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageSquare, Send, Pin, PinOff, ListChecks, Plus, Trash2, Check, ChevronRight, StickyNote,
  Music2, Sparkles, PartyPopper, Bell, Drum, Megaphone, Zap,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

/* ─────────────────────────────────────────────────────────────────────────
 * Engagement: chat, likes and reactions for a live room (dj:* socket relays)
 * ──────────────────────────────────────────────────────────────────────── */
export function useRoomEngagement(sessionId) {
  const { subscribe, emit } = useSocket() || {};
  const { user } = useAuth() || {};
  const [chat, setChat]           = useState([]);
  const [likes, setLikes]         = useState(0);
  const [reactions, setReactions] = useState([]);
  const [reactionCount, setReactionCount] = useState(0);

  useEffect(() => {
    if (!subscribe || !sessionId) return;
    const mine = (p) => String(p.sessionId) === String(sessionId);
    const offs = [
      subscribe('dj:chat', (m) => { if (mine(m)) setChat((prev) => [...prev.slice(-199), m]); }),
      subscribe('dj:like', (p) => { if (mine(p)) setLikes((n) => n + 1); }),
      subscribe('dj:reaction', (p) => {
        if (!mine(p)) return;
        const id = `${p.at}-${Math.random().toString(36).slice(2, 6)}`;
        setReactionCount((n) => n + 1);
        setReactions((prev) => [...prev.slice(-24), { id, emoji: p.emoji, x: 8 + Math.random() * 84 }]);
        setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 3200);
      }),
    ];
    return () => offs.forEach((off) => off?.());
  }, [subscribe, sessionId]);

  const send = useCallback((text) => {
    const t = String(text || '').trim();
    if (!t || !emit || !sessionId) return;
    emit('dj:chat:send', { sessionId, text: t, userId: user?._id, userName: user?.name || 'Host', userPhoto: user?.profilePhoto });
  }, [emit, sessionId, user]);

  return { chat, likes, reactions, reactionCount, send, hostId: user?._id };
}

/* 0–1 input level from a mic stream, for the rings around the mic button */
export function useMicLevel(stream, active) {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream || !active) { setLevel(0); return; }
    let raf, ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        setLevel((prev) => prev * 0.6 + Math.min(1, Math.sqrt(sum / buf.length) * 4) * 0.4);
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* level meter is decorative */ }
    return () => { cancelAnimationFrame(raf); ctx?.close().catch(() => {}); };
  }, [stream, active]);
  return level;
}

/* Floating emoji reactions over any positioned container */
export function ReactionLayer({ reactions }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {reactions.map((r) => (
        <span key={r.id} className="absolute bottom-4 text-[26px] studio-float" style={{ left: `${r.x}%` }}>{r.emoji}</span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Live chat — pinned message, host highlight, quick replies
 * ──────────────────────────────────────────────────────────────────────── */
const QUICK_REPLIES = [
  'Welcome everyone! 👋',
  'Drop your questions in the chat 💬',
  'Thanks for tuning in 🙏',
  'Back in a moment ⏸️',
];
const QUICK_EMOJI = ['🔥', '😂', '👏', '❤️', '🙌'];

function initials(name = '') {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase() || 'L';
}

export function ChatPanel({ engagement, accent }) {
  const { chat, send, hostId } = engagement;
  const [input, setInput] = useState('');
  const [pinned, setPinned] = useState(null);
  const [stick, setStick] = useState(true);
  const boxRef = useRef(null);

  useEffect(() => {
    if (stick && boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [chat.length, stick]);

  const onScroll = () => {
    const el = boxRef.current;
    if (el) setStick(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  const submit = (text = input) => {
    if (!String(text).trim()) return;
    send(text);
    if (text === input) setInput('');
  };

  const pin = (m) => {
    setPinned(m);
    send(`📌 ${m.userName || 'Listener'}: ${m.text}`);
  };

  return (
    <div className="h-full min-h-0 flex flex-col rounded-2xl bg-white border border-slate-200/70 overflow-hidden">
      <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100 flex-none">
        <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: accent }}>
            <MessageSquare size={12} className="text-white" />
          </span>
          Live chat
        </h3>
        <span className="text-[12px] text-slate-400 tabular-nums">{chat.length} message{chat.length === 1 ? '' : 's'}</span>
      </div>

      {pinned && (
        <div className="flex-none mx-3 mt-3 flex items-start gap-2 px-3 py-2 rounded-xl border animate-scale-in" style={{ background: `${accent}0F`, borderColor: `${accent}33` }}>
          <Pin size={13} className="mt-0.5 flex-shrink-0" style={{ color: accent }} />
          <div className="min-w-0 flex-1 text-[12px] leading-snug">
            <span className="font-semibold text-slate-900">{pinned.userName || 'Listener'}</span>
            <span className="text-slate-600"> {pinned.text}</span>
          </div>
          <button onClick={() => setPinned(null)} aria-label="Unpin" className="text-slate-400 hover:text-slate-700"><PinOff size={13} /></button>
        </div>
      )}

      <div ref={boxRef} onScroll={onScroll} className="relative flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1">
        {chat.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${accent}14` }}>
              <MessageSquare size={20} style={{ color: accent }} />
            </div>
            <p className="text-[13px] font-medium text-slate-700 mt-3">No messages yet</p>
            <p className="text-[12px] text-slate-400 mt-0.5">Say hello. Listeners' messages appear here as they arrive.</p>
          </div>
        )}
        {chat.map((m) => {
          const isHost = String(m.userId) === String(hostId);
          return (
            <div key={m.id} className="group flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors studio-msg">
              {m.userPhoto
                ? <img src={m.userPhoto} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                : <span className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 text-white"
                    style={{ background: isHost ? accent : '#94A3B8' }}>{initials(m.userName)}</span>}
              <div className="min-w-0 flex-1 text-[13px] leading-snug">
                <span className="font-semibold mr-1.5" style={{ color: isHost ? accent : '#0F172A' }}>
                  {m.userName || 'Listener'}
                  {isHost && <span className="ml-1 text-[9px] font-bold uppercase px-1 py-px rounded text-white align-middle" style={{ background: accent }}>Host</span>}
                </span>
                <span className="text-slate-700 break-words">{m.text}</span>
              </div>
              {!isHost && (
                <button onClick={() => pin(m)} title="Pin to the room" aria-label="Pin message"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-white transition-all">
                  <Pin size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {!stick && chat.length > 0 && (
        <button onClick={() => { setStick(true); boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: 'smooth' }); }}
          className="flex-none mx-auto -mt-10 mb-2 relative z-10 text-[11px] font-medium text-white px-3 py-1 rounded-full shadow" style={{ background: accent }}>
          New messages ↓
        </button>
      )}

      <div className="flex-none border-t border-slate-100 p-3 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {QUICK_REPLIES.map((q) => (
            <button key={q} onClick={() => submit(q)}
              className="flex-shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors">
              {q}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Reply to the room…" maxLength={300}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13px] outline-none focus:bg-white focus:border-slate-300 transition-colors" />
          {QUICK_EMOJI.slice(0, 3).map((e) => (
            <button key={e} onClick={() => submit(e)} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[15px] transition-transform hover:scale-110" aria-label={`Send ${e}`}>{e}</button>
          ))}
          <button onClick={() => submit()} disabled={!input.trim()} aria-label="Send"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-opacity disabled:opacity-40" style={{ background: accent }}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Soundboard — synthesized stingers mixed into the broadcast
 * ──────────────────────────────────────────────────────────────────────── */
function noiseBuffer(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
function tone(ctx, out, { type = 'sine', freq, start, dur, vol = 0.3, attack = 0.01 }) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(out); o.start(start); o.stop(start + dur + 0.05);
}
function hit(ctx, out, { start, dur = 0.15, vol = 0.5, filter = 1800, type = 'bandpass' }) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx, dur);
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = filter;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, start); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(out); src.start(start);
}

const PADS = [
  { key: '1', label: 'Intro sting', Icon: Sparkles, color: '#8B5CF6', play: (ctx, out, t) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, out, { type: 'triangle', freq: f, start: t + i * 0.09, dur: 0.6, vol: 0.22 }));
    tone(ctx, out, { type: 'sine', freq: 1046.5, start: t + 0.36, dur: 1.2, vol: 0.18 });
  } },
  { key: '2', label: 'Applause', Icon: PartyPopper, color: '#F59E0B', play: (ctx, out, t) => {
    for (let i = 0; i < 60; i++) hit(ctx, out, { start: t + Math.random() * 2.2, dur: 0.05 + Math.random() * 0.05, vol: 0.12 + Math.random() * 0.2, filter: 1500 + Math.random() * 2500 });
  } },
  { key: '3', label: 'Drum roll', Icon: Drum, color: '#EF4444', play: (ctx, out, t) => {
    for (let i = 0; i < 28; i++) hit(ctx, out, { start: t + i * 0.045, dur: 0.06, vol: 0.12 + (i / 28) * 0.3, filter: 900 });
    hit(ctx, out, { start: t + 1.3, dur: 1.4, vol: 0.45, filter: 6000, type: 'highpass' });
    tone(ctx, out, { type: 'sine', freq: 70, start: t + 1.3, dur: 0.4, vol: 0.6 });
  } },
  { key: '4', label: 'Air horn', Icon: Megaphone, color: '#0EA5E9', play: (ctx, out, t) => {
    [0, 0.28, 0.56].forEach((d, i) => [466, 587, 698].forEach((f) =>
      tone(ctx, out, { type: 'sawtooth', freq: f, start: t + d, dur: i === 2 ? 0.7 : 0.22, vol: 0.08, attack: 0.02 })));
  } },
  { key: '5', label: 'Ding', Icon: Bell, color: '#10B981', play: (ctx, out, t) => {
    tone(ctx, out, { freq: 1318.5, start: t, dur: 1.6, vol: 0.3 });
    tone(ctx, out, { freq: 2637, start: t, dur: 0.8, vol: 0.08 });
  } },
  { key: '6', label: 'Ba-dum-tss', Icon: Zap, color: '#EC4899', play: (ctx, out, t) => {
    tone(ctx, out, { freq: 160, start: t, dur: 0.2, vol: 0.5 });
    tone(ctx, out, { freq: 120, start: t + 0.18, dur: 0.25, vol: 0.5 });
    hit(ctx, out, { start: t + 0.42, dur: 0.9, vol: 0.4, filter: 7000, type: 'highpass' });
  } },
];

export function Soundboard({ getMixBus, accent, enabled }) {
  const [hot, setHot] = useState(null);
  const [monitor, setMonitor] = useState(true);

  const fire = useCallback((pad) => {
    const bus = getMixBus?.();
    if (!bus) return;
    const { ctx, dest } = bus;
    if (ctx.state === 'suspended') ctx.resume();
    const out = ctx.createGain(); out.gain.value = 0.9;
    out.connect(dest);                                   // listeners + recording
    if (monitor) { const m = ctx.createGain(); m.gain.value = 0.5; out.connect(m).connect(ctx.destination); } // host hears it
    pad.play(ctx, out, ctx.currentTime + 0.02);
    setHot(pad.key);
    setTimeout(() => setHot((k) => (k === pad.key ? null : k)), 450);
  }, [getMixBus, monitor]);

  // 1–6 fire pads when not typing
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const pad = PADS.find((p) => p.key === e.key);
      if (pad) { e.preventDefault(); fire(pad); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, fire]);

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: accent }}>
            <Music2 size={12} className="text-white" />
          </span>
          Soundboard
        </h3>
        <label className="flex items-center gap-1.5 text-[12px] text-slate-500 cursor-pointer select-none">
          <input type="checkbox" checked={monitor} onChange={(e) => setMonitor(e.target.checked)} className="accent-violet-600" />
          Hear it myself
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PADS.map((p) => (
          <button key={p.key} onClick={() => fire(p)} disabled={!enabled}
            className={`group relative flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border text-[12px] font-medium text-slate-700 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${hot === p.key ? 'scale-95' : ''}`}
            style={{
              background: hot === p.key ? `${p.color}26` : `linear-gradient(135deg, ${p.color}12, #fff 70%)`,
              borderColor: hot === p.key ? p.color : `${p.color}2E`,
              boxShadow: hot === p.key ? `0 0 0 3px ${p.color}33` : undefined,
            }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ background: p.color }}>
              <p.Icon size={15} className="text-white" />
            </span>
            {p.label}
            <kbd className="absolute top-1.5 right-2 text-[9px] font-semibold text-slate-400">{p.key}</kbd>
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] text-slate-400">Listeners hear these too. Press 1–6 on your keyboard.</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Rundown — the show's segments with a running segment clock
 * ──────────────────────────────────────────────────────────────────────── */
const RUNDOWN_KEY = 'ac_podcast_rundown';
const DEFAULT_RUNDOWN = [
  { id: 'r1', title: 'Welcome & intro', mins: 3 },
  { id: 'r2', title: 'Main topic', mins: 15 },
  { id: 'r3', title: 'Listener questions', mins: 10 },
  { id: 'r4', title: 'Wrap up & shout-outs', mins: 2 },
];
const loadRundown = () => { try { return JSON.parse(localStorage.getItem(RUNDOWN_KEY)) || DEFAULT_RUNDOWN; } catch { return DEFAULT_RUNDOWN; } };
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function useRundown() {
  const [items, setItems] = useState(loadRundown);
  const [current, setCurrent] = useState(0);
  const [segStart, setSegStart] = useState(null);
  const persist = (next) => { setItems(next); try { localStorage.setItem(RUNDOWN_KEY, JSON.stringify(next)); } catch {} };
  return {
    items, current, segStart,
    start: () => { setCurrent(0); setSegStart(Date.now()); },
    next: () => { setCurrent((c) => Math.min(items.length, c + 1)); setSegStart(Date.now()); },
    jump: (i) => { setCurrent(i); setSegStart(Date.now()); },
    add: (title, mins) => persist([...items, { id: `r${Date.now()}`, title, mins }]),
    remove: (id) => persist(items.filter((x) => x.id !== id)),
  };
}

export function RundownPanel({ rundown, live, accent }) {
  const { items, current, segStart } = rundown;
  const [title, setTitle] = useState('');
  const [mins, setMins] = useState(5);
  const [, tick] = useState(0);
  useEffect(() => { if (!live) return; const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, [live]);

  // N advances to the next segment while live
  useEffect(() => {
    if (!live) return;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.metaKey || e.ctrlKey) return;
      if (e.key === 'n' || e.key === 'N') rundown.next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [live, rundown]);

  const segSec = live && segStart ? (Date.now() - segStart) / 1000 : 0;
  const totalMins = items.reduce((t, x) => t + (Number(x.mins) || 0), 0);

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden">
      <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100">
        <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: accent }}>
            <ListChecks size={12} className="text-white" />
          </span>
          Rundown
        </h3>
        <span className="text-[12px] text-slate-400">{totalMins} min planned</span>
      </div>
      <div className="py-1.5">
        {items.map((it, i) => {
          const done = live && i < current;
          const now = live && i === current;
          const over = now && segSec > it.mins * 60;
          const pct = now ? Math.min(100, (segSec / (it.mins * 60 || 1)) * 100) : 0;
          return (
            <div key={it.id} className={`group relative px-4 py-2 ${now ? '' : 'hover:bg-slate-50'} transition-colors`}
              style={now ? { background: `${accent}0D` } : undefined}>
              {now && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background: accent }} />}
              <div className="flex items-center gap-2.5">
                <button onClick={() => live && rundown.jump(i)} disabled={!live}
                  className="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-[10px] font-semibold"
                  style={done ? { background: accent, borderColor: accent, color: '#fff' } : now ? { borderColor: accent, color: accent } : { borderColor: '#CBD5E1', color: '#94A3B8' }}>
                  {done ? <Check size={11} /> : i + 1}
                </button>
                <span className={`flex-1 min-w-0 text-[13px] truncate ${done ? 'text-slate-400 line-through' : 'text-slate-800'} ${now ? 'font-semibold' : ''}`}>{it.title}</span>
                <span className={`text-[11px] tabular-nums ${over ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                  {now ? `${fmt(segSec)} / ${it.mins}:00` : `${it.mins}m`}
                </span>
                {!live && (
                  <button onClick={() => rundown.remove(it.id)} aria-label="Remove segment" className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              {now && (
                <div className="mt-1.5 ml-7 h-1 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, background: over ? '#EF4444' : accent }} />
                </div>
              )}
            </div>
          );
        })}
        {live && current >= items.length && (
          <p className="px-4 py-2 text-[12px] text-slate-400">All segments done. Wrap it up whenever you're ready.</p>
        )}
      </div>
      {live ? (
        current < items.length && (
          <div className="px-4 pb-4">
            <button onClick={rundown.next}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: accent }}>
              {current + 1 < items.length ? <>Next: {items[current + 1].title}</> : 'Finish rundown'} <ChevronRight size={14} />
              <kbd className="ml-1 text-[10px] opacity-70">N</kbd>
            </button>
          </div>
        )
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) { rundown.add(title.trim(), Math.max(1, Number(mins) || 1)); setTitle(''); } }}
          className="flex items-center gap-1.5 px-3 pb-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a segment…"
            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white focus:border-slate-300" />
          <input type="number" min={1} max={180} value={mins} onChange={(e) => setMins(e.target.value)} aria-label="Minutes"
            className="w-14 px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[12px] outline-none focus:bg-white" />
          <button type="submit" aria-label="Add segment" className="w-7 h-7 rounded-lg flex items-center justify-center text-white" style={{ background: accent }}>
            <Plus size={13} />
          </button>
        </form>
      )}
    </div>
  );
}

/* Host notes — private, saved on this device */
const NOTES_KEY = 'ac_podcast_notes';
export function NotesPanel({ accent }) {
  const [text, setText] = useState(() => { try { return localStorage.getItem(NOTES_KEY) || ''; } catch { return ''; } });
  useEffect(() => { try { localStorage.setItem(NOTES_KEY, text); } catch {} }, [text]);
  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100">
        <h3 className="text-[14px] font-semibold text-slate-900 flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: accent }}>
            <StickyNote size={12} className="text-white" />
          </span>
          Host notes
        </h3>
        <span className="text-[11px] text-slate-400">Only you see these</span>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
        placeholder={'Talking points, shout-outs, sponsor reads…'}
        className="w-full px-4 py-3 text-[13px] leading-relaxed text-slate-700 outline-none resize-none bg-amber-50/30" />
    </div>
  );
}

