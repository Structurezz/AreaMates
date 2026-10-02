import { useEffect, useState } from 'react';
import { Mic, Radio, Heart, MessageSquare, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { djAPI } from '../api';
import { useSocket } from '../context/SocketContext';

export default function GoLiveCTA() {
  const navigate = useNavigate();
  const { subscribe } = useSocket();
  const [active, setActive] = useState(null);

  useEffect(() => {
    djAPI.getActive().then(({ data }) => setActive(data.data)).catch(() => {});
    const u1 = subscribe('dj:started', (s) => setActive(s));
    const u2 = subscribe('dj:ended',   () => setActive(null));
    return () => { u1 && u1(); u2 && u2(); };
  }, [subscribe]);

  // Hide if someone else is already live — they can tune in via the DJLive banner above.
  if (active) return null;

  return (
    <button onClick={() => navigate('/lounge/live')}
      className="w-full text-left relative overflow-hidden rounded-2xl p-4 mb-4"
      style={{
        background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%)',
        color: '#fff', border: 'none', cursor: 'pointer',
        boxShadow: '0 12px 28px -14px rgba(79,70,229,0.55)',
      }}>
      <div className="absolute -top-8 -right-6 w-36 h-36 rounded-full opacity-20" style={{ background: 'rgba(255,255,255,0.4)' }}/>
      <div className="relative flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
          <Mic size={20}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-extrabold tracking-widest uppercase opacity-85">Start a live room</div>
          <div className="text-sm font-extrabold">Spin, pray, chat or podcast</div>
          <div className="text-[11px] opacity-85 mt-0.5">Your neighbours get a notification instantly.</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.14)' }}><Radio size={13}/></div>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.14)' }}><Heart size={13}/></div>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center hidden sm:flex" style={{ background: 'rgba(255,255,255,0.14)' }}><MessageSquare size={13}/></div>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center hidden sm:flex" style={{ background: 'rgba(255,255,255,0.14)' }}><Headphones size={13}/></div>
        </div>
      </div>
    </button>
  );
}
