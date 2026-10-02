import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import { Radio, Mic, MicOff, Loader2, AlertCircle, X, Users } from 'lucide-react';

const API  = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const SOCK = import.meta.env.VITE_SOCKET_URL || API.replace(/\/api\/?$/, '');
const RTC_CONFIG = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:global.stun.twilio.com:3478' }] };

const BRAND = '#8B5CF6';
const BRAND_DARK = '#6D28D9';

function RemoteAudio({ stream }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current && stream) { ref.current.srcObject = stream; ref.current.play().catch(()=>{}); } }, [stream]);
  return <audio ref={ref} autoPlay playsInline />;
}

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

  // ── Views ───────────────────────────────────────────────────────────────
  if (stage === 'loading') {
    return <Centered><Loader2 className="animate-spin" size={28} color={BRAND}/></Centered>;
  }

  if (stage === 'error') {
    return (
      <Centered>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 12px' }}/>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Can't open this invite</h1>
          <p style={{ color: '#64748B', fontSize: 14 }}>{error}</p>
        </div>
      </Centered>
    );
  }

  if (stage === 'ended') {
    return (
      <Centered>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>Show ended</h1>
          <p style={{ color: '#64748B', fontSize: 14 }}>Thanks for being on the show.</p>
        </div>
      </Centered>
    );
  }

  if (stage === 'ready' || stage === 'joining') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, color: '#fff' }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 28px rgba(139,92,246,0.5)' }}>
            <Radio size={28} />
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#A5B4FC', textTransform: 'uppercase' }}>AreaConnect FM</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '6px 0', letterSpacing: '-0.02em' }}>You're invited</h1>
          <p style={{ color: '#CBD5E1', fontSize: 14, marginBottom: 20 }}>Join <strong>{info?.title}</strong> as a guest speaker{info?.hostName ? ` with ${info.hostName}` : ''}.</p>

          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#A5B4FC', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', marginBottom: 6 }}>Your name on air</label>
          <input value={name} onChange={e => setName(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, marginBottom: 14 }} />

          {error && <div style={{ color: '#FCA5A5', fontSize: 12, marginBottom: 10 }}>{error}</div>}

          <button onClick={join} disabled={stage === 'joining'}
            style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 10px 24px rgba(139,92,246,0.4)' }}>
            {stage === 'joining' ? <><Loader2 size={16} className="animate-spin"/> Joining…</> : <><Mic size={14}/> Join as speaker</>}
          </button>
          <div style={{ fontSize: 11, color: '#64748B', marginTop: 10 }}>Your mic will be requested. No account needed.</div>
        </div>
      </div>
    );
  }

  // Live
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 100%)', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
        {Array.from(remoteStreams.entries()).map(([id, s]) => <RemoteAudio key={id} stream={s}/>)}
      </div>

      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#EF4444', animation: 'ping 1.6s infinite' }} />
            <span style={{ position: 'relative', width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', color: '#FCA5A5' }}>ON AIR</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#CBD5E1', fontSize: 12 }}>
          <Users size={13}/> {count}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 90, height: 90, borderRadius: 24, background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: micOn ? '0 0 40px rgba(139,92,246,0.6)' : 'none' }}>
            <Radio size={38}/>
          </div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: '#A5B4FC', textTransform: 'uppercase' }}>You're live</div>
          <div style={{ fontSize: 22, fontWeight: 800, margin: '6px 0' }}>{name}</div>
          <div style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 22 }}>on {info?.title}</div>

          <button onClick={toggleMic}
            style={{ padding: '14px 24px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: micOn ? `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` : '#334155', color: '#fff',
              fontWeight: 700, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            {micOn ? <><Mic size={18}/> Mic open</> : <><MicOff size={18}/> Muted</>}
          </button>
        </div>
      </div>

      <style>{`@keyframes ping { 75%,100% { transform: scale(2.4); opacity: 0; } }`}</style>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', padding: 20 }}>
      {children}
    </div>
  );
}
