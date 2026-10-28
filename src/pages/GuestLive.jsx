import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Radio, Mic, MicOff, Loader2, AlertCircle, X, Users, Clock, CalendarClock, Headphones, Volume2, Wifi, CheckCircle2, ListOrdered, Crown, Briefcase, GraduationCap, User, LogOut, Sparkles, PhoneOff } from 'lucide-react';
import BoostedRemoteAudio from '../components/BoostedRemoteAudio';

const API  = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const SOCK = import.meta.env.VITE_SOCKET_URL || API.replace(/\/api\/?$/, '');
const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] };

const BRAND = '#7A5AF8';
const BRAND_DARK = '#5925DC';
const ROLE = {
  co_host: { label: 'Co-host', Icon: Crown, color: '#B692F6' },
  estate_leader: { label: 'Estate leader', Icon: Briefcase, color: '#6CE9A6' },
  expert: { label: 'Expert guest', Icon: GraduationCap, color: '#53B1FD' },
  guest: { label: 'Guest speaker', Icon: User, color: '#FDB022' },
};


export default function GuestLive() {
  const { token } = useParams();
  const [stage, setStage]   = useState('loading'); // loading | ready | joining | live | error
  const [info, setInfo]     = useState(null);
  const [name, setName]     = useState('');
  const [error, setError]   = useState('');
  const [micOn, setMicOn]   = useState(true);
  const [count, setCount]   = useState(0);
  const [remoteStreams, setStreams] = useState(() => new Map());

  const socketRef = useRef(null);
  const peersRef  = useRef(new Map());
  const localRef  = useRef(null);

  // Resolve the invite
  useEffect(() => {
    axios.get(`${API}/podcast/guest/${token}`)
      .then(r => {
        setInfo(r.data.data);
        setName(r.data.data.guest.name);
        setStage('ready');
      })
      .catch(e => { setError(e.response?.data?.message || 'Invite not valid'); setStage('error'); });
  }, [token]);

  const createPeer = async (remoteSocketId, isInitiator) => {
    if (peersRef.current.has(remoteSocketId)) return peersRef.current.get(remoteSocketId);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(remoteSocketId, pc);
    pc.onicecandidate = (ev) => {
      if (ev.candidate) socketRef.current?.emit('rtc:ice', { to: remoteSocketId, candidate: ev.candidate });
    };
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      setStreams(prev => { const n = new Map(prev); n.set(remoteSocketId, stream); return n; });
    };
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        peersRef.current.delete(remoteSocketId);
        setStreams(prev => { const n = new Map(prev); n.delete(remoteSocketId); return n; });
      }
    };
    if (localRef.current) {
      localRef.current.getTracks().forEach(t => pc.addTrack(t, localRef.current));
    }
    if (isInitiator) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      socketRef.current?.emit('rtc:offer', { to: remoteSocketId, sdp: pc.localDescription });
    }
    return pc;
  };

  const join = async () => {
    if (!name.trim()) { setError('Enter your name'); return; }
    setError('');
    setStage('joining');
    try {
      // Mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localRef.current = stream;

      // Mark joined (server)
      await axios.post(`${API}/podcast/guest/${token}/join`);

      // Open socket
      const sock = io(SOCK, { transports: ['polling', 'websocket'] });
      socketRef.current = sock;

      sock.on('connect', () => {
        sock.emit('podcast:guest-ready', { showId: info.showId, guestId: info.guest.id, name: name.trim() });
        setStage('live');
      });

      sock.on('rtc:offer', async ({ from, sdp }) => {
        const pc = await createPeer(from, false);
        await pc.setRemoteDescription(sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sock.emit('rtc:answer', { to: from, sdp: pc.localDescription });
      });
      sock.on('rtc:answer', async ({ from, sdp }) => {
        const pc = peersRef.current.get(from);
        if (pc) await pc.setRemoteDescription(sdp);
      });
      sock.on('rtc:ice', async ({ from, candidate }) => {
        const pc = peersRef.current.get(from);
        if (pc && candidate) { try { await pc.addIceCandidate(candidate); } catch {} }
      });
      sock.on('podcast:listener-count', ({ count }) => setCount(count));
      sock.on('podcast:ended', () => {
        setStage('ended');
        cleanup();
      });
    } catch (e) {
      setError(e.name === 'NotAllowedError' ? 'Mic permission denied' : (e.message || 'Could not join'));
      setStage('ready');
    }
  };

  const cleanup = () => {
    peersRef.current.forEach(pc => { try { pc.close(); } catch {} });
    peersRef.current.clear();
    setStreams(new Map());
    if (localRef.current) { localRef.current.getTracks().forEach(t => t.stop()); localRef.current = null; }
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
  };

  useEffect(() => () => cleanup(), []);

  const toggleMic = () => {
    const t = localRef.current?.getAudioTracks()?.[0];
    if (!t) return;
    t.enabled = !t.enabled;
    setMicOn(t.enabled);
  };

  // ── Mic level (green-room test + on-air meter) ─────────────────────────
  const [testStream, setTestStream] = useState(null);
  const [level, setLevel] = useState(0);
  useEffect(() => {
    const stream = stage === 'live' ? localRef.current : testStream;
    if (!stream) { setLevel(0); return undefined; }
    let raf, ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const an = ctx.createAnalyser(); an.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteTimeDomainData(buf);
        let sum = 0; for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* no audio context */ }
    return () => { cancelAnimationFrame(raf); try { ctx?.close(); } catch { /* ignore */ } };
  }, [stage, testStream, micOn]);
  const startTest = async () => {
    try { setTestStream(await navigator.mediaDevices.getUserMedia({ audio: true })); setError(''); }
    catch (e) { setError(e.name === 'NotAllowedError' ? 'Allow microphone access in your browser to test.' : 'No microphone found'); }
  };
  const stopTest = () => { testStream?.getTracks().forEach((t) => t.stop()); setTestStream(null); };
  useEffect(() => () => testStream?.getTracks().forEach((t) => t.stop()), [testStream]);

  // ── Clocks ─────────────────────────────────────────────────────────────
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const [liveSince, setLiveSince] = useState(null);
  useEffect(() => { if (stage === 'live' && !liveSince) setLiveSince(Date.now()); }, [stage, liveSince]);
  const onAir = liveSince ? Math.floor((now - liveSince) / 1000) : 0;
  const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  const startsIn = info?.scheduledAt ? new Date(info.scheduledAt).getTime() - now : null;
  const countdown = useMemo(() => {
    if (startsIn == null || startsIn <= 0) return null;
    const d = Math.floor(startsIn / 86400000), h = Math.floor((startsIn % 86400000) / 3600000), m = Math.floor((startsIn % 3600000) / 60000), sec = Math.floor((startsIn % 60000) / 1000);
    return d ? `${d}d ${h}h ${m}m` : h ? `${h}h ${m}m` : `${m}m ${String(sec).padStart(2, '0')}s`;
  }, [startsIn]);

  // Space bar toggles mute while on air
  useEffect(() => {
    if (stage !== 'live') return undefined;
    const onKey = (e) => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); toggleMic(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const leave = () => { cleanup(); setStage('left'); };
  const joinNow = () => { stopTest(); join(); };
  const role = ROLE[info?.guest?.role] || ROLE.guest;
  const RoleIcon = role.Icon;
  const bars = Array.from({ length: 28 }, (_, i) => {
    const wave = Math.sin((now / 140) + i * 0.7) * 0.5 + 0.5;
    return Math.max(0.08, level * (0.45 + wave * 0.55));
  });

  // ── Views ───────────────────────────────────────────────────────────────
  if (stage === 'loading') {
    return <Shell><div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-violet-300" size={30} /></div></Shell>;
  }

  if (stage === 'error' || stage === 'ended' || stage === 'left') {
    const ok = stage !== 'error';
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-sm w-full text-center">
            <span className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center ${ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
              {ok ? <CheckCircle2 size={30} /> : <AlertCircle size={30} />}
            </span>
            <h1 className="mt-5 text-[22px] font-semibold" style={{ color: '#fff' }}>{stage === 'error' ? 'This invite can’t be opened' : stage === 'ended' ? 'The show has ended' : 'You left the show'}</h1>
            <p className="mt-2 text-[14px] text-white/60">{stage === 'error' ? error : `Thank you for joining ${info?.title ? `“${info.title}”` : 'AreaConnect FM'}${onAir ? ` — you were on air for ${mmss(onAir)}` : ''}.`}</p>
            {stage === 'left' && <button onClick={() => { setLiveSince(null); setStage('ready'); }} className="mt-6 h-11 px-5 rounded-xl bg-white/10 border border-white/15 text-[14px] font-semibold text-white hover:bg-white/15">Rejoin the show</button>}
          </div>
        </div>
      </Shell>
    );
  }

  if (stage === 'ready' || stage === 'joining') {
    const isLiveNow = info?.status === 'live';
    return (
      <Shell>
        <div className="flex-1 w-full max-w-5xl mx-auto px-5 py-8 lg:py-12 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] items-start">
          {/* Show card */}
          <div className="rounded-3xl bg-white/[0.04] border border-white/10 overflow-hidden">
            <div className="relative p-6 pb-5">
              <div className="absolute inset-0 opacity-60 pointer-events-none" style={{ background: 'radial-gradient(90% 80% at 100% 0%, rgba(122,90,248,.45), transparent 60%)' }} />
              <div className="relative flex gap-4">
                {info?.coverImage
                  ? <img src={info.coverImage} alt="" className="w-24 h-24 rounded-2xl object-cover shadow-2xl flex-shrink-0" />
                  : <span className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}><Radio size={36} /></span>}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">AreaConnect FM{info?.seriesName ? ` · ${info.seriesName}` : ''}{info?.episodeNumber ? ` · Ep ${info.episodeNumber}` : ''}</p>
                  <h1 className="mt-1.5 text-[24px] lg:text-[28px] font-semibold leading-tight tracking-tight" style={{ color: '#fff' }}>{info?.title}</h1>
                  <p className="mt-1 text-[13.5px] text-white/60">Hosted by {info?.hostName || 'AreaConnect FM'}</p>
                </div>
              </div>
              <div className="relative mt-5 flex flex-wrap gap-2">
                {isLiveNow
                  ? <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-red-500 text-[12px] font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />Live now — they’re waiting for you</span>
                  : countdown
                    ? <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/10 border border-white/15 text-[12.5px] font-medium"><Clock size={13} />Starts in <b className="tabular-nums">{countdown}</b></span>
                    : null}
                {info?.scheduledAt && <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/[0.06] border border-white/10 text-[12.5px] text-white/75"><CalendarClock size={13} />{new Date(info.scheduledAt).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-white/[0.06] border border-white/10 text-[12.5px] text-white/75"><Clock size={13} />{info?.durationMins || 45} min</span>
              </div>
              {info?.description && <p className="relative mt-4 text-[14px] leading-relaxed text-white/70">{info.description}</p>}
            </div>

            {(info?.segments || []).length > 0 && (
              <div className="px-6 py-5 border-t border-white/[0.07]">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-white/45 flex items-center gap-1.5 mb-3"><ListOrdered size={13} /> Run of show</p>
                <ol className="space-y-2.5">
                  {info.segments.map((sg, i) => {
                    const mine = sg.speaker && name && sg.speaker.toLowerCase().includes(name.split(' ')[0].toLowerCase());
                    return (
                      <li key={i} className={`flex gap-3 rounded-xl px-3 py-2.5 ${mine ? 'bg-violet-500/15 border border-violet-400/30' : 'bg-white/[0.03]'}`}>
                        <span className="w-6 h-6 rounded-lg bg-white/10 text-[11.5px] font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-medium text-white">{sg.title}{mine && <span className="ml-2 text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-violet-400 text-white">You</span>}</p>
                          {(sg.speaker || sg.notes) && <p className="text-[12px] text-white/50">{[sg.speaker, sg.notes].filter(Boolean).join(' · ')}</p>}
                        </div>
                        <span className="text-[12px] text-white/45 tabular-nums">{sg.minutes}m</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {(info?.speakers || []).length > 0 && (
              <div className="px-6 py-5 border-t border-white/[0.07]">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-white/45 flex items-center gap-1.5 mb-3"><Users size={13} /> Also on the show</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {info.speakers.map((p, i) => {
                    const r = ROLE[p.role] || ROLE.guest;
                    return (
                      <div key={i} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] px-3 py-2.5">
                        <span className="relative w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold text-[#0B1220]" style={{ background: r.color }}>
                          {p.name?.[0]?.toUpperCase()}
                          {p.joined && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#120B2A]" />}
                        </span>
                        <div className="min-w-0"><p className="text-[13px] font-medium text-white truncate">{p.name}</p><p className="text-[11.5px] text-white/45 truncate">{p.title || r.label}{p.estate ? ` · ${p.estate}` : ''}</p></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Green room */}
          <div className="rounded-3xl bg-white text-slate-900 p-6 shadow-2xl order-first lg:order-none lg:sticky lg:top-6">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${role.color}33`, color: BRAND_DARK }}><RoleIcon size={20} /></span>
              <div>
                <p className="text-[12px] font-semibold text-violet-600">You’re invited as</p>
                <p className="text-[17px] font-semibold">{role.label}</p>
              </div>
            </div>
            {(info?.guest?.title || info?.guest?.topic) && (
              <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-100 p-3.5 space-y-1">
                {info.guest.title && <p className="text-[13px] text-slate-600">On air as <b className="text-slate-900">{info.guest.title}</b></p>}
                {info.guest.topic && <div className="flex gap-2"><Sparkles size={14} className="text-violet-500 mt-0.5 flex-shrink-0" /><p className="text-[13px] text-slate-600">Your topic<span className="block font-semibold text-slate-900">{info.guest.topic}</span></p></div>}
              </div>
            )}

            <label className="block mt-5">
              <span className="text-[12.5px] font-medium text-slate-600">Your name on air</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full h-12 px-4 rounded-xl border border-slate-200 text-[15px] outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10" />
            </label>

            {/* Mic check */}
            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold flex items-center gap-1.5"><Mic size={15} className="text-violet-600" /> Mic check</p>
                {testStream
                  ? <button onClick={stopTest} className="text-[12.5px] font-medium text-slate-500 hover:text-slate-800">Stop test</button>
                  : <button onClick={startTest} className="text-[12.5px] font-semibold text-violet-600 hover:text-violet-700">Test my mic</button>}
              </div>
              <div className="mt-3 h-10 flex items-center gap-[3px]">
                {bars.map((b, i) => <span key={i} className="flex-1 rounded-full transition-[height] duration-75" style={{ height: `${testStream ? Math.max(8, b * 100) : 8}%`, background: testStream ? (level > 0.6 ? '#F79009' : BRAND) : '#E2E8F0' }} />)}
              </div>
              <p className="mt-2 text-[12px] text-slate-500">{testStream ? (level > 0.05 ? 'We can hear you — sounding good.' : 'Say something… the bars should move.') : 'Speak a few words to check your microphone before going on air.'}</p>
            </div>

            <ul className="mt-4 space-y-1.5 text-[12.5px] text-slate-600">
              <li className="flex items-center gap-2"><Headphones size={14} className="text-slate-400" /> Use earphones to avoid echo</li>
              <li className="flex items-center gap-2"><Volume2 size={14} className="text-slate-400" /> Find a quiet room</li>
              <li className="flex items-center gap-2"><Wifi size={14} className="text-slate-400" /> Stay on good Wi-Fi or 4G</li>
            </ul>

            {error && <p className="mt-4 text-[13px] text-red-600 flex items-center gap-1.5"><AlertCircle size={14} />{error}</p>}
            <button onClick={joinNow} disabled={stage === 'joining'}
              className="mt-5 w-full h-13 py-3.5 rounded-2xl text-white text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, boxShadow: '0 14px 30px -12px rgba(122,90,248,.8)' }}>
              {stage === 'joining' ? <><Loader2 size={17} className="animate-spin" /> Joining…</> : <><Mic size={17} /> {isLiveNow ? 'Join the live show' : 'Enter the studio'}</>}
            </button>
            <p className="mt-2.5 text-center text-[11.5px] text-slate-400">No account needed · the host brings you on air</p>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Live ──
  const others = remoteStreams.size;
  return (
    <Shell>
      <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
        {Array.from(remoteStreams.entries()).map(([id, st]) => <BoostedRemoteAudio key={id} stream={st} />)}
      </div>

      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-red-500 text-[12px] font-bold tracking-wider">
            <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-white" style={{ animation: 'gping 1.4s infinite' }} /><span className="relative w-2 h-2 rounded-full bg-white" /></span>
            ON AIR
          </span>
          <span className="text-[14px] font-semibold tabular-nums text-white/80">{mmss(onAir)}</span>
        </div>
        <div className="flex items-center gap-3 text-[12.5px] text-white/70">
          <span className="inline-flex items-center gap-1.5"><Headphones size={14} />{count} listening</span>
          <span className="hidden sm:inline-flex items-center gap-1.5"><Users size={14} />{others + 1} on stage</span>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto px-5 py-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-center">
        <div className="text-center">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-violet-300">{info?.title}</p>
          <div className="relative mx-auto mt-6 w-44 h-44">
            <span className="absolute inset-0 rounded-full transition-transform duration-100" style={{ background: micOn ? 'rgba(122,90,248,.25)' : 'rgba(148,163,184,.15)', transform: `scale(${micOn ? 1 + level * 0.35 : 1})` }} />
            <span className="absolute inset-4 rounded-full transition-transform duration-100" style={{ background: micOn ? 'rgba(122,90,248,.35)' : 'rgba(148,163,184,.2)', transform: `scale(${micOn ? 1 + level * 0.2 : 1})` }} />
            <span className="absolute inset-8 rounded-full flex items-center justify-center text-[40px] font-semibold" style={{ background: micOn ? `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` : '#334155' }}>
              {name?.[0]?.toUpperCase() || <Radio size={36} />}
            </span>
          </div>
          <p className="mt-5 text-[22px] font-semibold" style={{ color: '#fff' }}>{name}</p>
          <p className="text-[13px] text-white/55">{role.label}{info?.guest?.title ? ` · ${info.guest.title}` : ''}</p>

          <div className="mt-6 mx-auto max-w-xs h-8 flex items-center gap-[3px]">
            {bars.map((b, i) => <span key={i} className="flex-1 rounded-full" style={{ height: `${micOn ? Math.max(10, b * 100) : 10}%`, background: micOn ? (level > 0.6 ? '#FDB022' : '#B692F6') : 'rgba(255,255,255,.15)' }} />)}
          </div>

          <div className="mt-7 flex items-center justify-center gap-3">
            <button onClick={toggleMic} className="h-14 px-7 rounded-full text-[15px] font-semibold inline-flex items-center gap-2.5 transition-colors"
              style={micOn ? { background: '#fff', color: BRAND_DARK } : { background: '#F04438', color: '#fff' }}>
              {micOn ? <><Mic size={19} /> Mute</> : <><MicOff size={19} /> Unmute</>}
            </button>
            <button onClick={leave} className="h-14 w-14 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-red-500/80" title="Leave the show"><PhoneOff size={19} /></button>
          </div>
          <p className="mt-3 text-[11.5px] text-white/40">{micOn ? 'Listeners can hear you' : 'You’re muted — listeners can’t hear you'} · press Space to toggle</p>
        </div>

        {(info?.segments || []).length > 0 && (
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-white/45 flex items-center gap-1.5 mb-3"><ListOrdered size={13} /> Run of show</p>
            <ol className="space-y-2">
              {info.segments.map((sg, i) => (
                <li key={i} className="flex gap-2.5 text-[13px]">
                  <span className="w-5 h-5 rounded-md bg-white/10 text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="flex-1 min-w-0"><span className="block text-white/90">{sg.title}</span>{sg.speaker && <span className="block text-[11.5px] text-white/45">{sg.speaker}</span>}</span>
                  <span className="text-[11.5px] text-white/40 tabular-nums">{sg.minutes}m</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen flex flex-col text-white" style={{ background: 'radial-gradient(80% 60% at 85% -10%, rgba(122,90,248,.35) 0%, transparent 60%), radial-gradient(60% 50% at 0% 110%, rgba(89,37,220,.25) 0%, transparent 60%), #0B0817' }}>
      <header className="flex items-center gap-2.5 px-5 py-4">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` }}><Radio size={17} /></span>
        <span className="leading-tight"><span className="block text-[14px] font-semibold" style={{ color: '#fff' }}>AreaConnect FM</span><span className="block text-[11px] text-white/45">Guest studio</span></span>
      </header>
      {children}
      <style>{'@keyframes gping { 75%,100% { transform: scale(2.4); opacity: 0; } }'}</style>
    </div>
  );
}
