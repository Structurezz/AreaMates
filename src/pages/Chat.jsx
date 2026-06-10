import { useEffect, useState, useRef, useCallback } from 'react';
import { messageAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Send, Users, MessageSquare, Plus, Search, X, ChevronLeft, RefreshCw,
} from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';

const NKECHI_AVATAR = '🌸';
const NKECHI_NAME = 'Nkechi';

// ─── Shared UI ─────────────────────────────────────────────────────

function DateSeparator({ date }) {
  const label = isToday(date) ? 'Today'
    : isYesterday(date) ? 'Yesterday'
    : format(date, 'MMMM d, yyyy');
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
      <span className="text-xs font-medium px-2" style={{ color: '#94A3B8' }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
    </div>
  );
}

function NkechiTyping() {
  return (
    <div className="flex items-end gap-2 mb-1">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
      >
        {NKECHI_AVATAR}
      </div>
      <div className="flex flex-col items-start">
        <span className="text-xs mb-1 pl-1" style={{ color: '#D97706' }}>{NKECHI_NAME}</span>
        <div
          className="px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1.5"
          style={{ background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.20)' }}
        >
          {[0, 150, 300].map(d => (
            <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#F59E0B', animationDelay: `${d}ms` }} />
          ))}
        </div>
        <span className="text-xs pl-1 mt-0.5" style={{ color: '#D97706', opacity: 0.6 }}>typing...</span>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isMe, showAvatar, showName }) {
  const isNkechi = msg.isNkechi;
  const senderName = isNkechi ? NKECHI_NAME
    : (typeof msg.senderId === 'object' ? msg.senderId?.name : null) || 'Unknown';
  const initial = isNkechi ? NKECHI_AVATAR : senderName[0]?.toUpperCase();
  const time = format(new Date(msg.createdAt), 'HH:mm');

  if (isMe) {
    return (
      <div className="flex flex-col items-end mb-0.5">
        <div className="flex items-end gap-1.5 max-w-[72%]">
          <span className="text-xs mb-1 self-end" style={{ color: '#CBD5E1' }}>{time}</span>
          <div
            className="font-medium px-3.5 py-2 rounded-2xl rounded-br-sm text-sm leading-relaxed text-white"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
          >
            {msg.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2 mb-0.5">
      <div className="w-8 flex-shrink-0 self-end">
        {showAvatar && (
          isNkechi ? (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
            >
              {NKECHI_AVATAR}
            </div>
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', color: '#059669' }}
            >
              {initial}
            </div>
          )
        )}
      </div>
      <div className="flex flex-col items-start max-w-[72%]">
        {showName && (
          <span className="text-xs mb-1 pl-1 font-medium" style={{ color: isNkechi ? '#D97706' : '#94A3B8' }}>
            {senderName}
            {isNkechi && <span className="ml-1.5 text-xs font-normal" style={{ color: '#F59E0B', opacity: 0.6 }}>· AI Moderator</span>}
          </span>
        )}
        <div className="flex items-end gap-1.5">
          <div
            className="px-3.5 py-2 rounded-2xl text-sm leading-relaxed rounded-tl-sm"
            style={isNkechi
              ? { background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.22)', color: '#92400E' }
              : { background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#0F172A' }
            }
          >
            {msg.content}
          </div>
          <span className="text-xs mb-1 self-end" style={{ color: '#CBD5E1' }}>{time}</span>
        </div>
      </div>
    </div>
  );
}

// ─── New DM Modal ──────────────────────────────────────────────────

function NewDMModal({ onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    setLoading(true);
    messageAPI.getEstateUsers({ q: query })
      .then(({ data }) => setUsers(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.4)' }}
      onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-white"
        style={{ border: '1px solid #E2E8F0', boxShadow: '0 20px 48px rgba(15,23,42,0.14)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <MessageSquare size={15} className="text-emerald-500 flex-shrink-0" />
          <span className="font-semibold text-sm flex-1" style={{ color: '#0F172A' }}>New Direct Message</span>
          <button onClick={onClose} style={{ color: '#94A3B8' }}
            className="hover:text-slate-700 transition-colors"><X size={16} /></button>
        </div>
        <div className="p-4">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#CBD5E1' }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search residents…"
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm focus:outline-none"
              style={{
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                color: '#0F172A',
              }}
              onFocus={e => e.target.style.borderColor = '#10B981'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            />
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6"><RefreshCw size={16} className="text-emerald-400 animate-spin" /></div>
            ) : users.length === 0 ? (
              <p className="text-center text-sm py-6" style={{ color: '#94A3B8' }}>
                {query ? 'No users found' : 'No other residents yet'}
              </p>
            ) : (
              users.map(u => (
                <button key={u._id} onClick={() => onSelect(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                  style={{ color: '#0F172A' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', color: '#059669' }}
                  >
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{u.name}</div>
                    <div className="text-xs capitalize" style={{ color: '#94A3B8' }}>{u.role?.replace(/_/g, ' ')}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Thread ────────────────────────────────────────────────────────

function Thread({ thread, currentUser, subscribe, emit, estateName }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [nkechiTyping, setNkechiTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const isGroup = thread.type === 'group';
  const partner = thread.partner;

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    (isGroup ? messageAPI.getGroup() : messageAPI.getDM(partner._id))
      .then(({ data }) => setMessages(data.data || []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, [isGroup, partner?._id]);

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [loading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, nkechiTyping]);

  // Socket — incoming messages for this thread
  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('new_message', (msg) => {
      if (isGroup) {
        if (msg.isGroupMessage || msg.isNkechi) {
          setMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, msg]);
          if (msg.isNkechi) setNkechiTyping(false);
        }
      } else {
        const from = (msg.senderId?._id || msg.senderId)?.toString();
        const to = msg.receiverId?.toString();
        const partnerId = partner._id?.toString();
        const myId = currentUser._id?.toString();
        const relevant =
          (from === partnerId && to === myId) ||
          (from === myId && to === partnerId);
        if (relevant) {
          setMessages(prev => prev.find(m => m._id === msg._id) ? prev : [...prev, msg]);
        }
      }
    });
    return unsub;
  }, [subscribe, isGroup, partner?._id, currentUser._id]);

  // Socket — Nkechi typing (group only)
  useEffect(() => {
    if (!subscribe || !isGroup) return;
    const unsub = subscribe('nkechi_typing', ({ isTyping }) => setNkechiTyping(isTyping));
    return unsub;
  }, [subscribe, isGroup]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    setContent('');
    const opt = {
      _id: `opt-${Date.now()}`,
      senderId: currentUser,
      content: text,
      createdAt: new Date().toISOString(),
      _opt: true,
      isGroupMessage: isGroup,
    };
    setMessages(prev => [...prev, opt]);
    try {
      const payload = isGroup
        ? { content: text, isGroupMessage: true }
        : { content: text, receiverId: partner._id };
      const { data } = await messageAPI.send(payload);
      const msg = data.data;
      setMessages(prev => prev.map(m => m._id === opt._id ? msg : m));
      if (isGroup) {
        const estateId = typeof currentUser.estateId === 'object'
          ? currentUser.estateId._id
          : currentUser.estateId;
        emit?.('send_message', { ...msg, estateId });
      }
    } catch {
      setMessages(prev => prev.filter(m => m._id !== opt._id));
      setContent(text);
      toast.error('Failed to send');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const isMine = (msg) => {
    if (msg.isNkechi) return false;
    const id = typeof msg.senderId === 'object' ? msg.senderId?._id : msg.senderId;
    return id === currentUser._id || id?.toString() === currentUser._id?.toString();
  };

  const renderMessages = () => {
    const items = [];
    let lastDate = null;
    let lastSenderId = null;
    messages.forEach((msg, i) => {
      const date = new Date(msg.createdAt);
      if (!lastDate || !isSameDay(date, lastDate)) {
        items.push(<DateSeparator key={`d-${i}`} date={date} />);
        lastDate = date;
        lastSenderId = null;
      }
      const mine = isMine(msg);
      const sid = msg.isNkechi ? 'nkechi'
        : (typeof msg.senderId === 'object' ? msg.senderId?._id : msg.senderId)?.toString();
      const grouped = sid === lastSenderId;
      items.push(
        <MessageBubble key={msg._id || i} msg={msg} isMe={mine}
          showAvatar={!mine && !grouped} showName={!mine && !grouped} />
      );
      lastSenderId = sid;
    });
    return items;
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 bg-white"
        style={{ borderBottom: '1px solid #E2E8F0' }}>
        {isGroup ? (
          <>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)' }}
            >
              <Users size={18} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: '#0F172A' }}>{estateName} Community</div>
              <div className="text-xs flex items-center gap-1.5" style={{ color: '#94A3B8' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Nkechi is moderating
              </div>
            </div>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
              style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.22)' }}
            >
              {NKECHI_AVATAR}
            </div>
          </>
        ) : (
          <>
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', color: '#059669' }}
            >
              {partner?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate" style={{ color: '#0F172A' }}>{partner?.name}</div>
              <div className="text-xs capitalize" style={{ color: '#94A3B8' }}>{partner?.role?.replace(/_/g, ' ')}</div>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ background: '#F8FAFC' }}>
        {loading ? (
          <div className="flex justify-center pt-16">
            <RefreshCw size={20} className="text-emerald-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            {isGroup ? (
              <>
                <div className="text-4xl">{NKECHI_AVATAR}</div>
                <div className="font-medium" style={{ color: '#0F172A' }}>No messages yet</div>
                <div className="text-sm max-w-xs" style={{ color: '#94A3B8' }}>Say hello! Nkechi is here and ready to chat.</div>
              </>
            ) : (
              <>
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl"
                  style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', color: '#059669' }}
                >
                  {partner?.name?.[0]?.toUpperCase()}
                </div>
                <div className="font-medium" style={{ color: '#0F172A' }}>Start a conversation</div>
                <div className="text-sm" style={{ color: '#94A3B8' }}>Send {partner?.name} a message</div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-0.5 pb-2">
            {renderMessages()}
            {isGroup && nkechiTyping && <NkechiTyping />}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 bg-white" style={{ borderTop: '1px solid #E2E8F0' }}>
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            ref={inputRef}
            className="input-field flex-1 text-sm"
            placeholder={isGroup ? 'Message the community…' : `Message ${partner?.name}…`}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={sending}
            autoComplete="off"
          />
          <button type="submit" disabled={sending || !content.trim()}
            className="btn-primary w-10 h-10 p-0 rounded-full flex-shrink-0">
            <Send size={16} />
          </button>
        </form>
        {isGroup && (
          <p className="text-xs mt-1.5 pl-1" style={{ color: '#CBD5E1' }}>
            Mention @Nkechi to get her attention {NKECHI_AVATAR}
          </p>
        )}
      </div>
    </>
  );
}

// ─── Conversation list item ────────────────────────────────────────

function ConvoItem({ label, sub, active, unread, isGroup, avatar, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
      style={{
        background: active ? 'rgba(16,185,129,0.08)' : 'transparent',
        color: active ? '#059669' : '#475569',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F1F5F9'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold"
        style={isGroup
          ? { background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', color: '#059669' }
          : { background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#64748B' }
        }
      >
        {isGroup ? <Users size={15} /> : avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: active ? '#059669' : '#0F172A' }}>{label}</div>
        {sub && <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{sub}</div>}
      </div>
      {unread > 0 && (
        <span
          className="w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 text-white"
          style={{ background: '#10B981' }}
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

// ─── Main Chat page ────────────────────────────────────────────────

export default function Chat() {
  const { user, estate } = useAuth();
  const { subscribe, emit } = useSocket() || {};
  const [conversations, setConversations] = useState([]);
  const [groupUnread, setGroupUnread] = useState(0);
  const [activeThread, setActiveThread] = useState({ type: 'group' });
  const [showNewDM, setShowNewDM] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [convoLoading, setConvoLoading] = useState(true);

  const estateName = estate?.name
    || (user?.estateId && typeof user.estateId === 'object' ? user.estateId.name : null)
    || 'Community';

  const loadConversations = useCallback(() => {
    setConvoLoading(true);
    Promise.all([messageAPI.getConversations(), messageAPI.getUnread()])
      .then(([cvRes, unreadRes]) => {
        setConversations(cvRes.data.data || []);
        setGroupUnread(unreadRes.data.data?.group || 0);
      })
      .catch(() => {})
      .finally(() => setConvoLoading(false));
  }, []);

  useEffect(() => { loadConversations(); }, []);

  // Update conversations sidebar on incoming DMs
  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('new_message', (msg) => {
      if (!msg.isGroupMessage && !msg.isNkechi) {
        const myId = user._id?.toString();
        const partnerId = (msg.senderId?._id || msg.senderId)?.toString() === myId
          ? msg.receiverId?.toString()
          : (msg.senderId?._id || msg.senderId)?.toString();
        const isActiveDM = activeThread.type === 'dm'
          && activeThread.partner?._id?.toString() === partnerId;

        setConversations(prev => {
          const idx = prev.findIndex(c => c._id?.toString() === partnerId);
          if (idx >= 0) {
            const updated = [...prev];
            const item = {
              ...updated[idx],
              lastMessage: { content: msg.content, createdAt: msg.createdAt },
              unread: isActiveDM ? 0 : (updated[idx].unread || 0) + 1,
            };
            updated.splice(idx, 1);
            return [item, ...updated];
          }
          // New conversation — refetch to get partner info
          loadConversations();
          return prev;
        });
      }
    });
    return unsub;
  }, [subscribe, user._id, activeThread, loadConversations]);

  const openThread = (thread) => {
    setActiveThread(thread);
    setMobileShowThread(true);
    if (thread.type === 'group') {
      setGroupUnread(0);
    } else {
      setConversations(prev => prev.map(c =>
        c._id?.toString() === thread.partner?._id?.toString() ? { ...c, unread: 0 } : c
      ));
    }
  };

  const startNewDM = (u) => {
    openThread({ type: 'dm', partner: u });
    setShowNewDM(false);
    setConversations(prev => {
      if (prev.find(c => c._id?.toString() === u._id?.toString())) return prev;
      return [{ _id: u._id, partner: u, lastMessage: null, unread: 0 }, ...prev];
    });
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] -m-4 md:-m-6 lg:-m-8 overflow-hidden">

      {/* ── Conversations sidebar ── */}
      <div
        className={`flex flex-col w-full md:w-72 flex-shrink-0 ${mobileShowThread ? 'hidden md:flex' : 'flex'}`}
        style={{ borderRight: '1px solid #E2E8F0', background: '#FFFFFF' }}
      >
        <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <span className="font-semibold text-sm" style={{ color: '#0F172A' }}>Messages</span>
          <button
            onClick={() => setShowNewDM(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all"
            style={{ color: '#10B981' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <Plus size={13} /> New DM
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <ConvoItem
            label={`${estateName} Community`}
            sub={groupUnread > 0 ? `${groupUnread} unread` : 'Nkechi is moderating'}
            active={activeThread.type === 'group'}
            unread={groupUnread}
            isGroup
            onClick={() => openThread({ type: 'group' })}
          />

          {conversations.length > 0 && (
            <div className="px-3 pt-3 pb-1.5">
              <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: '#94A3B8' }}>Direct Messages</p>
            </div>
          )}

          {convoLoading && conversations.length === 0 ? (
            <div className="flex justify-center py-6">
              <RefreshCw size={14} className="text-emerald-400 animate-spin" />
            </div>
          ) : (
            conversations.map(c => (
              <ConvoItem
                key={c._id}
                label={c.partner?.name || 'Unknown'}
                sub={c.lastMessage?.content?.slice(0, 42) || 'No messages yet'}
                active={activeThread.type === 'dm' && activeThread.partner?._id?.toString() === c._id?.toString()}
                unread={c.unread || 0}
                avatar={c.partner?.name?.[0]?.toUpperCase()}
                onClick={() => openThread({ type: 'dm', partner: c.partner || { _id: c._id } })}
              />
            ))
          )}

          {!convoLoading && conversations.length === 0 && (
            <div className="text-center py-8 px-4">
              <MessageSquare size={22} className="mx-auto mb-2" style={{ color: '#CBD5E1' }} />
              <p className="text-xs" style={{ color: '#94A3B8' }}>No direct messages yet</p>
              <button
                onClick={() => setShowNewDM(true)}
                className="mt-3 text-xs transition-colors"
                style={{ color: '#10B981' }}
              >
                Start a conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Thread panel ── */}
      <div className={`flex flex-col flex-1 min-w-0 ${!mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
        <button
          className="md:hidden flex items-center gap-2 px-4 py-2.5 text-sm transition-colors flex-shrink-0 bg-white"
          style={{ borderBottom: '1px solid #E2E8F0', color: '#94A3B8' }}
          onMouseEnter={e => e.currentTarget.style.color = '#0F172A'}
          onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
          onClick={() => setMobileShowThread(false)}
        >
          <ChevronLeft size={16} /> All messages
        </button>
        <Thread
          key={activeThread.type === 'group' ? 'group' : activeThread.partner?._id}
          thread={activeThread}
          currentUser={user}
          subscribe={subscribe}
          emit={emit}
          estateName={estateName}
        />
      </div>

      {showNewDM && (
        <NewDMModal onClose={() => setShowNewDM(false)} onSelect={startNewDM} />
      )}
    </div>
  );
}
