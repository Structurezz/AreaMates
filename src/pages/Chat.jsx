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
      <div className="flex-1 h-px bg-white/8" />
      <span className="text-xs text-white/30 font-medium px-2">{label}</span>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  );
}

function NkechiTyping() {
  return (
    <div className="flex items-end gap-2 mb-1">
      <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-sm flex-shrink-0">
        {NKECHI_AVATAR}
      </div>
      <div className="flex flex-col items-start">
        <span className="text-xs text-amber-400/70 mb-1 pl-1">{NKECHI_NAME}</span>
        <div className="bg-[#2A2318] border border-amber-500/20 px-4 py-2.5 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
          {[0, 150, 300].map(d => (
            <span key={d} className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
        <span className="text-xs text-amber-400/40 pl-1 mt-0.5">typing...</span>
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
          <span className="text-xs text-white/20 mb-1 self-end">{time}</span>
          <div className="bg-gold text-navy font-medium px-3.5 py-2 rounded-2xl rounded-br-sm text-sm leading-relaxed">
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
            <div className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-sm">
              {NKECHI_AVATAR}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold text-xs font-bold">
              {initial}
            </div>
          )
        )}
      </div>
      <div className="flex flex-col items-start max-w-[72%]">
        {showName && (
          <span className={`text-xs mb-1 pl-1 font-medium ${isNkechi ? 'text-amber-400' : 'text-white/50'}`}>
            {senderName}
            {isNkechi && <span className="ml-1.5 text-xs font-normal text-amber-400/50">· AI Moderator</span>}
          </span>
        )}
        <div className="flex items-end gap-1.5">
          <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
            isNkechi
              ? 'bg-[#2A2318] border border-amber-500/25 text-amber-50'
              : 'bg-[#1E1E24] border border-white/8 text-white'
          } rounded-tl-sm`}>
            {msg.content}
          </div>
          <span className="text-xs text-white/20 mb-1 self-end">{time}</span>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="glass-card w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <MessageSquare size={15} className="text-gold flex-shrink-0" />
          <span className="font-semibold text-white text-sm flex-1">New Direct Message</span>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <div className="p-4">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search residents…"
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40"
            />
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6"><RefreshCw size={16} className="text-white/30 animate-spin" /></div>
            ) : users.length === 0 ? (
              <p className="text-center text-white/25 text-sm py-6">
                {query ? 'No users found' : 'No other residents yet'}
              </p>
            ) : (
              users.map(u => (
                <button key={u._id} onClick={() => onSelect(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/8 transition-all text-left">
                  <div className="w-9 h-9 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
                    {u.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{u.name}</div>
                    <div className="text-xs text-white/35 capitalize">{u.role?.replace(/_/g, ' ')}</div>
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-[#111115] flex-shrink-0">
        {isGroup ? (
          <>
            <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm truncate">{estateName} Community</div>
              <div className="text-xs text-white/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Nkechi is moderating
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-amber-400/15 border border-amber-400/25 flex items-center justify-center text-sm flex-shrink-0">
              {NKECHI_AVATAR}
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold flex-shrink-0">
              {partner?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm truncate">{partner?.name}</div>
              <div className="text-xs text-white/40 capitalize">{partner?.role?.replace(/_/g, ' ')}</div>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex justify-center pt-16">
            <RefreshCw size={20} className="text-gold animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            {isGroup ? (
              <>
                <div className="text-4xl">{NKECHI_AVATAR}</div>
                <div className="text-white font-medium">No messages yet</div>
                <div className="text-white/40 text-sm max-w-xs">Say hello! Nkechi is here and ready to chat.</div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-bold text-xl">
                  {partner?.name?.[0]?.toUpperCase()}
                </div>
                <div className="text-white font-medium">Start a conversation</div>
                <div className="text-white/40 text-sm">Send {partner?.name} a message</div>
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
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/8 bg-[#111115]">
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
          <p className="text-xs text-white/20 mt-1.5 pl-1">
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
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
        active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}>
      <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold border ${
        isGroup ? 'bg-gold/10 border-gold/20 text-gold' : 'bg-white/8 border-white/15 text-white'
      }`}>
        {isGroup ? <Users size={15} /> : avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${active ? 'text-white' : ''}`}>{label}</div>
        {sub && <div className="text-xs text-white/30 truncate">{sub}</div>}
      </div>
      {unread > 0 && (
        <span className="w-5 h-5 rounded-full bg-gold text-navy text-xs font-bold flex items-center justify-center flex-shrink-0">
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
      <div className={`flex flex-col w-full md:w-72 border-r border-white/8 bg-[#0E0E12] flex-shrink-0 ${
        mobileShowThread ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8">
          <span className="font-semibold text-white text-sm">Messages</span>
          <button onClick={() => setShowNewDM(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gold/80 hover:text-gold px-2.5 py-1.5 rounded-lg hover:bg-gold/10 transition-all">
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
              <p className="text-xs text-white/20 uppercase tracking-widest font-medium">Direct Messages</p>
            </div>
          )}

          {convoLoading && conversations.length === 0 ? (
            <div className="flex justify-center py-6">
              <RefreshCw size={14} className="text-white/20 animate-spin" />
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
              <MessageSquare size={22} className="text-white/10 mx-auto mb-2" />
              <p className="text-white/25 text-xs">No direct messages yet</p>
              <button onClick={() => setShowNewDM(true)}
                className="mt-3 text-xs text-gold/60 hover:text-gold transition-colors">
                Start a conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Thread panel ── */}
      <div className={`flex flex-col flex-1 min-w-0 ${!mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
        <button
          className="md:hidden flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-[#111115] text-white/50 hover:text-white text-sm transition-colors flex-shrink-0"
          onClick={() => setMobileShowThread(false)}>
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
