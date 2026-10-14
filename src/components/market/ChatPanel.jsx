import { useEffect, useState, useRef } from 'react';
import { MessageCircle, Send, ChevronLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { messageAPI } from '../../api';
import { useSocket } from '../../context/SocketContext';
import { imgUrl } from '../lounge/shared';

// Direct messages with a seller, opened from a listing.
export default function ChatPanel({ seller, listing, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const { subscribe } = useSocket();

  useEffect(() => {
    setLoading(true);
    messageAPI.getDM(seller._id)
      .then(({ data }) => setMessages(data.data || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, [seller._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const unsub = subscribe?.('new_message', (msg) => {
      const from = msg.senderId?._id || msg.senderId;
      if (from?.toString() === seller._id?.toString()) {
        setMessages(prev => [...prev, msg]);
      }
    });
    return unsub;
  }, [seller._id, subscribe]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText('');
    const opt = { _id: `opt-${Date.now()}`, senderId: currentUser, content, createdAt: new Date().toISOString(), _opt: true };
    setMessages(prev => [...prev, opt]);
    setSending(true);
    try {
      const { data } = await messageAPI.send({ to: seller._id, content });
      setMessages(prev => prev.map(m => m._id === opt._id ? (data.data || m) : m));
    } catch {
      setMessages(prev => prev.filter(m => m._id !== opt._id));
      setText(content);
      toast.error('Message failed to send');
    } finally {
      setSending(false);
    }
  };

  const isMe = (msg) => {
    const id = msg.senderId?._id || msg.senderId;
    return id?.toString() === currentUser._id?.toString();
  };

  return (
    <div className="flex flex-col h-full bg-white" style={{ borderLeft: '1px solid #E2E8F0' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid #E2E8F0', paddingTop: 'max(0.875rem, env(safe-area-inset-top))' }}>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: '#94A3B8' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#F1F5F9'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
        >
          <ChevronLeft size={18} />
        </button>
        {seller.profilePhoto ? (
          <img src={imgUrl(seller.profilePhoto)} alt=""
            className="w-9 h-9 rounded-full object-cover flex-shrink-0"
            style={{ border: '1px solid rgba(99,102,241,0.25)' }} />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.22)', color: '#4F46E5' }}
          >
            {seller.name?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: '#0F172A' }}>{seller.name}</div>
          {listing && <div className="text-xs truncate" style={{ color: '#94A3B8' }}>Re: {listing.title}</div>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5" style={{ background: '#F8FAFC' }}>
        {loading ? (
          <div className="flex justify-center py-10"><RefreshCw size={16} className="text-indigo-400 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageCircle size={28} className="mb-3" style={{ color: '#CBD5E1' }} />
            <p className="text-sm" style={{ color: '#94A3B8' }}>No messages yet</p>
            {listing && <p className="text-xs mt-1" style={{ color: '#CBD5E1' }}>Ask about "{listing.title.slice(0, 30)}"</p>}
          </div>
        ) : (
          messages.map((msg) => {
            const mine = isMe(msg);
            return (
              <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${msg._opt ? 'opacity-60' : ''} ${
                    mine ? 'rounded-br-sm text-white font-medium' : 'rounded-bl-sm'
                  }`}
                  style={mine
                    ? { background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }
                    : { background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A' }
                  }
                >
                  {msg.content}
                  <div className="text-xs mt-0.5" style={{ color: mine ? 'rgba(255,255,255,0.6)' : '#CBD5E1' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 p-3 flex-shrink-0 bg-white" style={{ borderTop: '1px solid #E2E8F0', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={listing ? `Ask about "${listing.title.slice(0, 22)}…"` : 'Type a message…'}
          className="flex-1 px-3 py-2.5 rounded-xl text-[15px] focus:outline-none"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}
          onFocus={e => e.target.style.borderColor = '#6366F1'}
          onBlur={e => e.target.style.borderColor = '#E2E8F0'}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-opacity disabled:opacity-35 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)' }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
