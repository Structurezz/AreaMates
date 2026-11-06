import { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo } from 'react';
import useIsDesktop from '../hooks/useIsDesktop';
import { messageAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  Send, Users, MessageSquare, Plus, Search, X, ChevronLeft, RefreshCw, Paperclip, Smile,
  FileText, FileSpreadsheet, FileArchive, Music2, Film, Download, Image as ImageIcon,
  PanelRightOpen, PanelRightClose, Sparkles, AtSign,
} from 'lucide-react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';
import Portal from '../components/ui/Portal';
import Spinner, { PageLoader } from '../components/ui/Spinner';
import { NkechiMascot, Sticker, STICKER_PACKS, stickerById, stickerLabel } from '../components/chat/Nkechi';
import { useSite } from '../context/SiteContext';
import { withArticle } from '../utils/siteTypes';

const NKECHI_NAME = 'Nkechi';
const INTRO_KEY = 'chat:nkechi-intro-dismissed';
const MAX_BYTES = 15 * 1024 * 1024;
const ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.mp3,.m4a,.wav,.ogg,.webm,.mp4,.mov';
const ORIGIN = (import.meta.env.VITE_API_URL || 'https://areaconnectapi-production.up.railway.app/api').replace(/\/api\/?$/, '');
const QUICK_EMOJI = ['😂', '❤️', '👍🏾', '🙏🏾', '🔥', '🎉', '😍', '😢', '😮', '👏🏾', '💯', '🤝🏾', '🏡', '☀️', '🌸', '💚'];

const fileUrl = (u) => (!u ? '' : /^(https?:|blob:|data:)/.test(u) ? u : `${ORIGIN}${u}`);
const fmtSize = (b) => (!b ? '' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);
const senderOf = (msg) => (typeof msg.senderId === 'object' ? msg.senderId : null);
const isImageType = (t = '') => /^image\//i.test(t);

function fileKind(att) {
  const n = (att?.name || '').toLowerCase(), t = att?.type || '';
  if (isImageType(t)) return { kind: 'image' };
  if (/^audio\//.test(t) || /\.(mp3|m4a|wav|ogg)$/.test(n)) return { kind: 'audio', Icon: Music2, color: '#8B5CF6' };
  if (/^video\//.test(t) || /\.(mp4|mov|webm)$/.test(n)) return { kind: 'video', Icon: Film, color: '#0EA5E9' };
  if (/\.pdf$/.test(n)) return { kind: 'file', Icon: FileText, color: '#EF4444', tag: 'PDF' };
  if (/\.(xlsx?|csv)$/.test(n)) return { kind: 'file', Icon: FileSpreadsheet, color: '#6366F1', tag: n.split('.').pop().toUpperCase() };
  if (/\.zip$/.test(n)) return { kind: 'file', Icon: FileArchive, color: '#F59E0B', tag: 'ZIP' };
  if (/\.(pptx?)$/.test(n)) return { kind: 'file', Icon: FileText, color: '#F97316', tag: 'PPT' };
  return { kind: 'file', Icon: FileText, color: '#3B82F6', tag: (n.split('.').pop() || 'FILE').toUpperCase().slice(0, 4) };
}

// Role shown next to a name: the site's words ("administrator", "guest");
// estate keeps the raw role ("estate manager").
const roleText = (role, site) => {
  if (!role) return '';
  if (site && !site.isEstate) {
    if (role === 'resident') return site.w.memberLc;
    if (role === 'estate_manager') return site.w.managerLc;
  }
  return role.replace(/_/g, ' ');
};

const previewText = (m, site) => m?.content
  || (m?.sticker ? `🎨 ${stickerLabel(stickerById(m.sticker), site?.isEstate ?? true, site?.w) || 'Sticker'}` : '')
  || (m?.attachment?.url ? (isImageType(m.attachment.type) ? '📷 Photo' : `📎 ${m.attachment.name}`) : '')
  || (m?.imageUrl ? '📷 Photo' : '');

// Highlights @Nkechi mentions and links inside message text
function RichText({ text, mine }) {
  const parts = String(text).split(/(@nkechi\b|https?:\/\/[^\s]+)/gi);
  return parts.map((p, i) => {
    if (/^@nkechi$/i.test(p)) return <span key={i} className={`font-semibold px-1 rounded ${mine ? 'bg-white/20' : 'bg-amber-100 text-amber-800'}`}>@Nkechi</span>;
    if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noreferrer" className="underline underline-offset-2 break-all">{p}</a>;
    return <span key={i}>{p}</span>;
  });
}

function Avatar({ user, size = 36 }) {
  const name = user?.name || '?';
  const hue = (name.charCodeAt(0) * 37) % 360;
  return user?.profilePhoto ? (
    <img src={user.profilePhoto} alt="" className="rounded-full object-cover flex-shrink-0 block" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, hsl(${hue} 70% 62%), hsl(${(hue + 40) % 360} 70% 46%))` }}>
      {name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
    </span>
  );
}

// ─── Message pieces ────────────────────────────────────────────────

function DateSeparator({ date }) {
  const label = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'EEEE, d MMMM');
  return (
    <div className="flex justify-center my-4">
      <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-500 shadow-sm">{label}</span>
    </div>
  );
}

function NkechiTyping() {
  return (
    <div className="flex items-end gap-2 mb-2 animate-fade-in">
      <NkechiMascot size={32} bob />
      <div className="px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-2 border border-amber-200" style={{ background: 'linear-gradient(135deg, #FFFBEB, #FDF2F8)' }}>
        <span className="text-[12px] font-medium text-amber-700">Nkechi is typing</span>
        {[0, 150, 300].map((d) => <span key={d} className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
      </div>
    </div>
  );
}

function Attachment({ msg, mine, onOpenImage }) {
  const att = msg.attachment?.url ? msg.attachment : msg.imageUrl ? { url: msg.imageUrl, type: 'image/*', name: 'Photo' } : null;
  if (!att) return null;
  const k = fileKind(att);
  if (k.kind === 'image') {
    return (
      <button type="button" onClick={() => onOpenImage(fileUrl(att.url))} className="block overflow-hidden rounded-2xl border border-black/5 bg-slate-100">
        <img src={fileUrl(att.url)} alt={att.name} className="block max-w-[70vw] sm:max-w-[300px] max-h-[320px] object-cover hover:scale-[1.02] transition-transform duration-300" loading="lazy" />
      </button>
    );
  }
  if (k.kind === 'audio') {
    return (
      <div className={`rounded-2xl p-2.5 border ${mine ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2 px-1 pb-1.5 text-[12px] font-medium text-slate-600"><Music2 size={13} className="text-violet-500" /> <span className="truncate max-w-[220px]">{att.name}</span></div>
        <audio controls src={fileUrl(att.url)} className="h-9 w-[64vw] sm:w-[260px] max-w-[260px]" />
      </div>
    );
  }
  if (k.kind === 'video') {
    return <video controls src={fileUrl(att.url)} className="rounded-2xl max-w-[72vw] sm:max-w-[320px] max-h-[260px] bg-black" />;
  }
  return (
    <a href={msg._local ? fileUrl(att.url) : `${fileUrl(att.url)}?download=1`} target="_blank" rel="noreferrer"
      className={`group flex items-center gap-3 w-[72vw] sm:w-[270px] max-w-[270px] rounded-2xl p-3 border transition-all hover:-translate-y-0.5 ${mine ? 'bg-white/95 border-indigo-200' : 'bg-white border-slate-200'}`}
      style={{ textDecoration: 'none' }}>
      <span className="relative w-10 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${k.color}14`, color: k.color }}>
        <k.Icon size={20} />
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1 rounded text-white" style={{ background: k.color }}>{k.tag}</span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] font-semibold text-slate-900 truncate">{att.name}</span>
        <span className="block text-[11px] text-slate-400">{fmtSize(att.size)}{msg._progress != null ? ` · uploading ${msg._progress}%` : ''}</span>
      </span>
      <span className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors"><Download size={14} /></span>
    </a>
  );
}

function MessageBubble({ msg, isMe, showAvatar, showName, onOpenImage }) {
  const isNkechi = msg.isNkechi;
  const sender = senderOf(msg);
  const senderName = isNkechi ? NKECHI_NAME : sender?.name || 'Unknown';
  const site = useSite();
  const time = format(new Date(msg.createdAt), 'HH:mm');
  const hasAtt = !!(msg.attachment?.url || msg.imageUrl);
  const text = msg.content?.trim();

  const body = (
    <div className={`flex flex-col gap-1.5 ${isMe ? 'items-end' : 'items-start'}`}>
      {msg.sticker && <Sticker id={msg.sticker} size={window.innerWidth < 640 ? 112 : 128} />}
      {hasAtt && <Attachment msg={msg} mine={isMe} onOpenImage={onOpenImage} />}
      {text && (
        <div className={`px-3.5 py-2 text-[14px] leading-relaxed whitespace-pre-wrap break-words max-w-[78vw] sm:max-w-[520px] ${
          isMe ? 'text-white rounded-2xl rounded-br-md shadow-[0_6px_16px_-10px_#4338CA]'
            : isNkechi ? 'text-amber-950 rounded-2xl rounded-bl-md border border-amber-200'
              : 'text-slate-900 bg-white rounded-2xl rounded-bl-md border border-slate-200/80 shadow-sm'}`}
          style={isMe ? { background: 'linear-gradient(135deg, #6366F1, #4F46E5)' } : isNkechi ? { background: 'linear-gradient(135deg, #FFFBEB, #FDF2F8)' } : undefined}>
          <RichText text={text} mine={isMe} />
        </div>
      )}
    </div>
  );

  if (isMe) {
    return (
      <div className="group flex justify-end items-end gap-2 mb-1">
        <span className="text-[10.5px] text-slate-400 mb-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">{msg._opt ? 'Sending…' : time}</span>
        <div className={msg._opt ? 'opacity-70' : ''}>{body}</div>
      </div>
    );
  }

  return (
    <div className="group flex items-end gap-2 mb-1">
      <div className="w-8 flex-shrink-0 self-end">
        {showAvatar && (isNkechi ? <NkechiMascot size={32} /> : <Avatar user={sender} size={32} />)}
      </div>
      <div className="flex flex-col items-start min-w-0">
        {showName && (
          <span className="text-[11.5px] mb-1 pl-1 font-semibold flex items-center gap-1.5" style={{ color: isNkechi ? '#D97706' : '#64748B' }}>
            {senderName}
            {isNkechi && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(90deg, #F97316, #EC4899)' }}>AI</span>}
            {!isNkechi && sender?.role && sender.role !== 'resident' && <span className="text-[10px] font-medium text-slate-400 capitalize">· {roleText(sender.role, site)}</span>}
          </span>
        )}
        <div className="flex items-end gap-2">
          {body}
          <span className="text-[10.5px] text-slate-400 mb-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">{time}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Nkechi intro ──────────────────────────────────────────────────

const askNkechiFor = (isEstate, w) => [
  ['📅', isEstate ? "What's happening in the estate this week?" : `What's happening in the ${w.siteLc} this week?`],
  ['📜', 'What does the constitution say about noise?'],
  ['🗳️', 'Any polls I should vote on?'],
  ['👀', 'Wetin dey happen? Gist me!'],
];

function NkechiIntro({ firstName, onAsk, onWave, onClose, compact }) {
  const { isEstate, w } = useSite();
  const ASK_NKECHI = askNkechiFor(isEstate, w);
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-200/80 p-4 sm:p-5 mb-4 dash-rise"
      style={{ background: 'linear-gradient(120deg, #FFFBEB 0%, #FDF2F8 55%, #F5F3FF 100%)' }}>
      <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full opacity-50" style={{ background: 'radial-gradient(circle, #F9A8D4, transparent 70%)', animation: 'dashFloat 14s ease-in-out infinite' }} />
      {onClose && (
        <button onClick={onClose} aria-label="Hide intro" className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white/70"><X size={14} /></button>
      )}
      <div className="relative flex items-center gap-3.5 sm:gap-5">
        <div className="relative flex-shrink-0">
          <NkechiMascot size={compact ? 64 : window.innerWidth < 640 ? 68 : 96} wave bob />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap" style={{ background: 'linear-gradient(90deg, #F97316, #EC4899)' }}>{isEstate ? 'AI NEIGHBOUR' : 'AI ASSISTANT'}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-pink-600 flex items-center gap-1"><Sparkles size={11} /> Meet Nkechi</div>
          <div className="mt-1 text-[16px] sm:text-[17px] font-semibold text-slate-900 leading-snug">Hello {firstName}, I'm Nkechi 🌸</div>
          <p className="mt-1 text-[12.5px] sm:text-[13px] text-slate-600 leading-relaxed max-w-xl">
            {isEstate ? "Your estate's AI neighbour. I know the events, polls, dues and the constitution" : `Your ${w.siteLc}'s AI assistant. I know the events, polls, ${w.duesLc} and the constitution`} — and I <i>love</i> gist. Mention <b className="text-amber-700">@Nkechi</b> and I'll jump in.
          </p>
        </div>
      </div>
      <div className="relative mt-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex sm:flex-wrap gap-2 overflow-x-auto no-scrollbar">
        {ASK_NKECHI.map(([e, q]) => (
          <button key={q} onClick={() => onAsk(q)}
            className="flex-shrink-0 whitespace-nowrap text-[12.5px] font-medium px-3 py-1.5 rounded-full bg-white/90 border border-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:shadow transition-all">
            {e} {q}
          </button>
        ))}
        <button onClick={onWave}
          className="flex-shrink-0 whitespace-nowrap text-[12.5px] font-semibold px-3 py-1.5 rounded-full text-white shadow-sm hover:-translate-y-0.5 transition-all"
          style={{ background: 'linear-gradient(90deg, #F97316, #EC4899)' }}>
          👋🏾 Wave at Nkechi
        </button>
      </div>
    </div>
  );
}

// ─── Sticker + emoji tray ──────────────────────────────────────────

function StickerTray({ onSticker, onEmoji, onClose }) {
  const { isEstate, w } = useSite();
  const [tab, setTab] = useState('naija');
  const pack = STICKER_PACKS.find((p) => p.id === tab);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="absolute bottom-full left-0 right-0 sm:right-auto mb-2 sm:w-[440px] rounded-2xl bg-white border border-slate-200 shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45)] overflow-hidden animate-scale-in z-20">
      <div className="flex items-center gap-1 p-1.5 border-b border-slate-100 bg-slate-50/70">
        {[...STICKER_PACKS.map((p) => [p.id, `${p.icon} ${p.label}`]), ['emoji', '😊 Emoji']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all ${tab === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{l}</button>
        ))}
        <button onClick={onClose} className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white"><X size={14} /></button>
      </div>
      <div className="p-3 max-h-[46vh] sm:max-h-[300px] overflow-y-auto">
        {tab === 'emoji' ? (
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-1">
            {QUICK_EMOJI.map((e) => (
              <button key={e} onClick={() => onEmoji(e)} className="h-11 rounded-xl text-[22px] hover:bg-slate-100 hover:scale-110 transition-transform">{e}</button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {pack.stickers.map((s) => (
              <button key={s.id} onClick={() => onSticker(s.id)} className="rounded-xl p-1 hover:bg-slate-50 transition-colors" title={stickerLabel(s, isEstate, w)}>
                <Sticker id={s.id} size={window.innerWidth < 640 ? 88 : 92} animate={false} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── New DM Modal ──────────────────────────────────────────────────

function NewDMModal({ onClose, onSelect }) {
  const site = useSite();
  const { isEstate, w } = site;
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
    <Portal>
      <div className="fixed inset-0 z-[100] overlay-scrim flex items-center justify-center p-4" onClick={onClose}>
        <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
            <span className="w-8 h-8 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}><MessageSquare size={14} /></span>
            <span className="font-semibold text-[14px] flex-1 text-slate-900">New message</span>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
          </div>
          <div className="p-4">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isEstate ? 'Search your neighbours…' : `Search ${w.membersLc}…`}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
            </div>
            <div className="space-y-0.5 max-h-72 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-6"><Spinner size={18} /></div>
              ) : users.length === 0 ? (
                <p className="text-center text-sm py-6 text-slate-400">{query ? 'No one found' : (isEstate ? 'No other residents yet' : `No other ${w.membersLc} yet`)}</p>
              ) : users.map((u) => (
                <button key={u._id} onClick={() => onSelect(u)} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors">
                  <Avatar user={u} size={36} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-900 truncate">{u.name}</div>
                    <div className="text-[11px] text-slate-400 capitalize">{roleText(u.role, site)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Thread ────────────────────────────────────────────────────────

function Thread({ thread, currentUser, subscribe, emit, estateName, showInfo, onToggleInfo, onMessages, onBack }) {
  const { isEstate, w } = useSite();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [nkechiTyping, setNkechiTyping] = useState(false);
  const [pendingFile, setPendingFile] = useState(null); // { file, preview }
  const [tray, setTray] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [introHidden, setIntroHidden] = useState(() => { try { return localStorage.getItem(INTRO_KEY) === '1'; } catch { return false; } });
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const dragDepth = useRef(0);

  const isGroup = thread.type === 'group';
  const partner = thread.partner;
  const firstName = currentUser?.name?.split(' ')[0] || 'there';

  useEffect(() => { onMessages?.(messages); }, [messages, onMessages]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    (isGroup ? messageAPI.getGroup() : messageAPI.getDM(partner._id))
      .then(({ data }) => setMessages(data.data || []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  }, [isGroup, partner?._id]);

  const scrollToEnd = (smooth = true) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };
  useEffect(() => { if (!loading) scrollToEnd(false); }, [loading]);
  useEffect(() => { scrollToEnd(); }, [messages.length, nkechiTyping]);

  // Socket — incoming messages
  useEffect(() => {
    if (!subscribe) return undefined;
    const unsub = subscribe('new_message', (msg) => {
      if (isGroup) {
        if (msg.isGroupMessage || msg.isNkechi) {
          setMessages((prev) => (prev.find((m) => m._id === msg._id) ? prev : [...prev, msg]));
          if (msg.isNkechi) setNkechiTyping(false);
        }
      } else {
        const from = (msg.senderId?._id || msg.senderId)?.toString();
        const to = msg.receiverId?.toString();
        const partnerId = partner._id?.toString();
        const myId = currentUser._id?.toString();
        if ((from === partnerId && to === myId) || (from === myId && to === partnerId)) {
          setMessages((prev) => (prev.find((m) => m._id === msg._id) ? prev : [...prev, msg]));
        }
      }
    });
    return unsub;
  }, [subscribe, isGroup, partner?._id, currentUser._id]);

  useEffect(() => {
    if (!subscribe || !isGroup) return undefined;
    return subscribe('nkechi_typing', ({ isTyping }) => setNkechiTyping(isTyping));
  }, [subscribe, isGroup]);

  // ── Attachments ──
  const pickFile = (file) => {
    if (!file) return;
    if (file.size > MAX_BYTES) { toast.error('That file is over 15MB'); return; }
    if (pendingFile?.preview) URL.revokeObjectURL(pendingFile.preview);
    setPendingFile({ file, preview: isImageType(file.type) ? URL.createObjectURL(file) : null });
    inputRef.current?.focus();
  };
  const clearFile = () => { if (pendingFile?.preview) URL.revokeObjectURL(pendingFile.preview); setPendingFile(null); };

  const onPaste = (e) => {
    const f = [...(e.clipboardData?.files || [])][0];
    if (f) { e.preventDefault(); pickFile(f); }
  };
  const dragProps = {
    onDragEnter: (e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); dragDepth.current++; setDragging(true); } },
    onDragOver: (e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); },
    onDragLeave: () => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); },
    onDrop: (e) => { e.preventDefault(); dragDepth.current = 0; setDragging(false); pickFile(e.dataTransfer?.files?.[0]); },
  };

  // ── Send ──
  const send = async ({ text = content.trim(), sticker = '', file = pendingFile?.file } = {}) => {
    if ((!text && !sticker && !file) || sending) return;
    setSending(true);
    if (text === content.trim()) setContent('');
    if (file) setPendingFile(null);
    setTray(false);

    const optId = `opt-${Date.now()}`;
    const localUrl = file ? URL.createObjectURL(file) : '';
    setMessages((prev) => [...prev, {
      _id: optId, senderId: currentUser, content: text, sticker, createdAt: new Date().toISOString(), _opt: true, _local: !!file,
      isGroupMessage: isGroup,
      attachment: file ? { url: localUrl, name: file.name, type: file.type, size: file.size } : undefined,
      _progress: file ? 0 : undefined,
    }]);

    try {
      let payload;
      if (file) {
        payload = new FormData();
        if (text) payload.append('content', text);
        if (sticker) payload.append('sticker', sticker);
        if (isGroup) payload.append('isGroupMessage', 'true'); else payload.append('receiverId', partner._id);
        payload.append('file', file);
      } else {
        payload = isGroup ? { content: text, sticker, isGroupMessage: true } : { content: text, sticker, receiverId: partner._id };
      }
      const { data } = await messageAPI.send(payload, file ? {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (ev) => {
          const pct = ev.total ? Math.round((ev.loaded / ev.total) * 100) : 0;
          setMessages((prev) => prev.map((m) => (m._id === optId ? { ...m, _progress: pct } : m)));
        },
      } : undefined);
      const msg = data.data;
      // The live event for this message can arrive before this response:
      // if it's already in the list, just drop the temporary copy (no doubles)
      setMessages((prev) => (prev.some((m) => m._id === msg._id)
        ? prev.filter((m) => m._id !== optId)
        : prev.map((m) => (m._id === optId ? msg : m))));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m._id !== optId));
      if (text) setContent(text);
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      if (localUrl) setTimeout(() => URL.revokeObjectURL(localUrl), 30000);
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const askNkechi = (q) => send({ text: `@Nkechi ${q}` });
  const hideIntro = () => { setIntroHidden(true); try { localStorage.setItem(INTRO_KEY, '1'); } catch {} };

  const isMine = (msg) => {
    if (msg.isNkechi) return false;
    const id = typeof msg.senderId === 'object' ? msg.senderId?._id : msg.senderId;
    return id?.toString() === currentUser._id?.toString();
  };

  const rendered = useMemo(() => {
    const items = [];
    let lastDate = null, lastSender = null;
    messages.forEach((msg, i) => {
      const date = new Date(msg.createdAt);
      if (!lastDate || !isSameDay(date, lastDate)) {
        items.push(<DateSeparator key={`d-${i}`} date={date} />);
        lastDate = date; lastSender = null;
      }
      const mine = isMine(msg);
      const sid = msg.isNkechi ? 'nkechi' : (typeof msg.senderId === 'object' ? msg.senderId?._id : msg.senderId)?.toString();
      const grouped = sid === lastSender;
      items.push(<MessageBubble key={msg._id || i} msg={msg} isMe={mine} showAvatar={!mine && !grouped} showName={!mine && !grouped} onOpenImage={setLightbox} />);
      lastSender = sid;
    });
    return items;
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-grow the composer
  useEffect(() => {
    const el = inputRef.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(140, el.scrollHeight)}px`; }
  }, [content]);

  const canSend = !!(content.trim() || pendingFile) && !sending;

  return (
    <div className="relative flex flex-col flex-1 min-h-0" {...dragProps}>
      {/* Header */}
      <div className="flex items-center gap-3 pl-2 pr-3 sm:px-5 h-14 sm:h-16 flex-shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        {onBack && (
          <button onClick={onBack} aria-label="Back to chats" className="md:hidden w-9 h-9 -mr-1 rounded-full flex items-center justify-center text-slate-600 active:bg-slate-100">
            <ChevronLeft size={22} />
          </button>
        )}
        {isGroup ? (
          <>
            <span className="relative w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)', boxShadow: '0 8px 18px -10px #7C3AED' }}>
              <Users size={18} />
              <span className="absolute -bottom-1.5 -right-1.5"><NkechiMascot size={20} /></span>
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[15px] text-slate-900 truncate">{estateName} Community</div>
              <div className="text-[12px] text-slate-500 flex items-center gap-1.5 truncate">
                <span className="relative flex w-1.5 h-1.5 flex-shrink-0"><span className="absolute inset-0 rounded-full bg-amber-400 animate-ping" /><span className="relative w-1.5 h-1.5 rounded-full bg-amber-500" /></span>
                <span className="truncate">{nkechiTyping ? 'Nkechi is typing…' : <>Nkechi is moderating<span className="hidden sm:inline">{isEstate ? ' · everyone in the estate' : ` · everyone in the ${w.siteLc}`}</span></>}</span>
              </div>
            </div>
            {introHidden && (
              <button onClick={() => setIntroHidden(false)} title="Meet Nkechi" className="inline-flex items-center gap-1.5 h-9 pl-1 pr-1 sm:pr-3 rounded-full border border-amber-200 text-[12px] font-semibold text-amber-800 hover:-translate-y-0.5 transition-all" style={{ background: 'linear-gradient(90deg, #FFFBEB, #FDF2F8)' }}>
                <NkechiMascot size={26} /> <span className="hidden sm:inline">Meet Nkechi</span>
              </button>
            )}
          </>
        ) : (
          <>
            <Avatar user={partner} size={40} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[15px] text-slate-900 truncate">{partner?.name}</div>
              <div className="text-[12px] text-slate-500 capitalize">{partner?.role?.replace(/_/g, ' ') || 'Direct message'}</div>
            </div>
          </>
        )}
        <button onClick={onToggleInfo} title={showInfo ? 'Hide details' : 'Show details'} className="hidden xl:flex w-9 h-9 rounded-xl items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
          {showInfo ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-5 py-3 sm:py-4"
        style={{ background: 'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.05) 1px, transparent 0) 0 0 / 22px 22px, linear-gradient(180deg, #F8FAFC, #F1F5F9)' }}>
        <div className="max-w-[880px] mx-auto">
          {isGroup && (!introHidden || (!loading && messages.length === 0)) && (
            <NkechiIntro firstName={firstName} onAsk={askNkechi} onWave={() => send({ text: '', sticker: 'nkechi-hi' })}
              onClose={messages.length ? hideIntro : null} />
          )}
          {loading ? (
            <PageLoader variant="section" />
          ) : messages.length === 0 && !isGroup ? (
            <div className="flex flex-col items-center justify-center pt-20 gap-3 text-center">
              <Avatar user={partner} size={64} />
              <div className="font-semibold text-slate-900">Say hi to {partner?.name?.split(' ')[0]}</div>
              <div className="text-sm text-slate-400">Send a message, a photo or a sticker to start.</div>
              <div className="flex gap-2 mt-2">
                {['welcome', 'good-morning', 'thank-you'].map((id) => (
                  <button key={id} onClick={() => send({ text: '', sticker: id })} className="rounded-xl p-1 hover:bg-white transition-colors"><Sticker id={id} size={84} animate={false} /></button>
                ))}
              </div>
            </div>
          ) : (
            <div className="pb-2">
              {rendered}
              {isGroup && nkechiTyping && <NkechiTyping />}
            </div>
          )}
        </div>
      </div>

      {/* Drop overlay */}
      {dragging && (
        <div className="absolute inset-0 z-30 m-3 rounded-3xl border-2 border-dashed border-indigo-400 bg-indigo-50/85 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none animate-fade-in">
          <span className="w-16 h-16 rounded-2xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}><Paperclip size={28} /></span>
          <div className="mt-3 text-[15px] font-semibold text-indigo-800">Drop to attach</div>
          <div className="text-[12px] text-indigo-700/80">Photos, PDFs, documents, audio · up to 15MB</div>
        </div>
      )}

      {/* Composer */}
      <div className="flex-shrink-0 px-2.5 sm:px-5 pt-2.5 sm:py-3 border-t border-slate-200/80 bg-white" style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}>
        <div className="max-w-[880px] mx-auto">
          {pendingFile && (
            <div className="mb-2 flex sm:inline-flex items-center gap-3 pr-2 pl-2 py-2 rounded-2xl bg-slate-50 border border-slate-200 animate-scale-in">
              {pendingFile.preview
                ? <img src={pendingFile.preview} alt="" className="w-12 h-12 rounded-xl object-cover" />
                : (() => { const k = fileKind({ name: pendingFile.file.name, type: pendingFile.file.type }); const I = k.Icon || ImageIcon; return <span className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${k.color || '#64748B'}14`, color: k.color || '#64748B' }}><I size={20} /></span>; })()}
              <div className="min-w-0 flex-1 sm:flex-none sm:max-w-[260px]">
                <div className="text-[13px] font-semibold text-slate-900 truncate">{pendingFile.file.name}</div>
                <div className="text-[11px] text-slate-400">{fmtSize(pendingFile.file.size)} · ready to send</div>
              </div>
              <button onClick={clearFile} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-700"><X size={14} /></button>
            </div>
          )}
          <div className="relative flex items-end gap-2">
            {tray && (
              <StickerTray onClose={() => setTray(false)}
                onSticker={(id) => send({ text: '', sticker: id, file: null })}
                onEmoji={(e) => { setContent((c) => c + e); inputRef.current?.focus(); }} />
            )}
            <div className="flex-1 flex items-end gap-1 rounded-2xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 transition-all px-1.5">
              <button type="button" onClick={() => fileRef.current?.click()} title="Attach a file"
                className="w-9 h-9 my-1 rounded-xl flex items-center justify-center text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors flex-shrink-0">
                <Paperclip size={18} />
              </button>
              <button type="button" onClick={() => setTray((t) => !t)} title="Stickers & emoji"
                className={`w-9 h-9 my-1 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${tray ? 'text-pink-600 bg-pink-50' : 'text-slate-500 hover:text-pink-600 hover:bg-pink-50'}`}>
                <Smile size={18} />
              </button>
              <textarea ref={inputRef} rows={1} value={content} onChange={(e) => setContent(e.target.value)} onPaste={onPaste}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={isGroup ? 'Message the community… (try @Nkechi)' : `Message ${partner?.name?.split(' ')[0] || ''}…`}
                className="flex-1 min-w-0 resize-none bg-transparent outline-none text-[16px] sm:text-[14px] text-slate-900 placeholder:text-slate-400 py-2.5 px-1 max-h-[140px]"
                style={{ fontFamily: 'inherit' }} />
              {isGroup && !content.includes('@Nkechi') && (
                <button type="button" onClick={() => { setContent((c) => `@Nkechi ${c}`); inputRef.current?.focus(); }} title="Ask Nkechi"
                  className="hidden sm:flex items-center gap-1 h-8 my-1.5 pl-0.5 pr-2 rounded-full border border-amber-200 text-[11.5px] font-semibold text-amber-800 hover:bg-amber-50 transition-colors flex-shrink-0">
                  <NkechiMascot size={24} ring={false} /> <AtSign size={11} />
                </button>
              )}
            </div>
            <button type="button" onClick={() => send()} disabled={!canSend}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white flex-shrink-0 transition-all disabled:opacity-40 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: canSend ? '0 10px 20px -10px #4F46E5' : 'none' }}>
              {sending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={17} />}
            </button>
          </div>
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} />
          <div className="mt-1.5 text-[11px] text-slate-400 hidden sm:block">Enter to send · Shift + Enter for a new line · drag in or paste a file to attach</div>
        </div>
      </div>

      {lightbox && (
        <Portal>
          <div className="fixed inset-0 z-[150] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="" className="max-w-full max-h-full rounded-2xl shadow-2xl animate-scale-in" />
            <div className="absolute top-4 right-4 flex gap-2">
              <a href={`${lightbox}${lightbox.startsWith('blob:') ? '' : '?download=1'}`} onClick={(e) => e.stopPropagation()} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"><Download size={17} /></a>
              <button className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center"><X size={18} /></button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

// ─── Details panel (xl) ────────────────────────────────────────────

function InfoPanel({ thread, messages, estateName }) {
  const site = useSite();
  const { isEstate, w } = site;
  const isGroup = thread.type === 'group';
  const media = messages.filter((m) => (m.attachment?.url && isImageType(m.attachment.type)) || (!m.attachment?.url && m.imageUrl)).slice(-9).reverse();
  const files = messages.filter((m) => m.attachment?.url && !isImageType(m.attachment.type)).slice(-6).reverse();
  const people = useMemo(() => {
    const map = new Map();
    messages.forEach((m) => { const s = senderOf(m); if (s?._id && !m.isNkechi) map.set(s._id, s); });
    return [...map.values()].slice(-8);
  }, [messages]);

  return (
    <aside className="hidden xl:flex flex-col w-[300px] flex-shrink-0 border-l border-slate-200/80 bg-white overflow-y-auto">
      {isGroup ? (
        <div className="p-5 border-b border-slate-100 text-center" style={{ background: 'linear-gradient(180deg, #FFFBEB, #FFFFFF)' }}>
          <div className="mx-auto w-fit"><NkechiMascot size={88} wave bob /></div>
          <div className="mt-2 text-[15px] font-semibold text-slate-900">Nkechi</div>
          <div className="text-[11.5px] text-amber-700 font-medium">{isEstate ? 'AI neighbour' : 'AI assistant'} · {estateName}</div>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-left">
            {(isEstate ? ['📅 Events & polls', '📜 Estate rules', '💳 Dues info', '🛡️ Keeps it civil'] : ['📅 Events & polls', `📜 ${w.site} rules`, `💳 ${w.dues} info`, '🛡️ Keeps it civil']).map((t) => (
              <span key={t} className="px-2 py-1.5 rounded-lg bg-white border border-amber-100 text-slate-600">{t}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-5 border-b border-slate-100 text-center">
          <div className="mx-auto w-fit"><Avatar user={thread.partner} size={72} /></div>
          <div className="mt-2 text-[15px] font-semibold text-slate-900">{thread.partner?.name}</div>
          <div className="text-[12px] text-slate-500 capitalize">{roleText(thread.partner?.role, site) || (isEstate ? 'Resident' : w.member)}</div>
        </div>
      )}

      {isGroup && people.length > 0 && (
        <div className="p-5 border-b border-slate-100">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Active in the chat</div>
          <div className="flex -space-x-2">
            {people.map((p) => <span key={p._id} className="ring-2 ring-white rounded-full" title={p.name}><Avatar user={p} size={32} /></span>)}
          </div>
        </div>
      )}

      <div className="p-5 border-b border-slate-100">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Photos</div>
        {media.length ? (
          <div className="grid grid-cols-3 gap-1.5">
            {media.map((m) => {
              const u = fileUrl(m.attachment?.url || m.imageUrl);
              return <a key={m._id} href={u} target="_blank" rel="noreferrer" className="block aspect-square rounded-lg overflow-hidden bg-slate-100"><img src={u} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" /></a>;
            })}
          </div>
        ) : <p className="text-[12px] text-slate-400">No photos shared yet.</p>}
      </div>

      <div className="p-5">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">Files</div>
        {files.length ? (
          <div className="space-y-1.5">
            {files.map((m) => {
              const k = fileKind(m.attachment);
              const I = k.Icon || FileText;
              return (
                <a key={m._id} href={`${fileUrl(m.attachment.url)}?download=1`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors" style={{ textDecoration: 'none' }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${k.color}14`, color: k.color }}><I size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-slate-800 truncate">{m.attachment.name}</span>
                    <span className="block text-[10.5px] text-slate-400">{fmtSize(m.attachment.size)} · {format(new Date(m.createdAt), 'd MMM')}</span>
                  </span>
                </a>
              );
            })}
          </div>
        ) : <p className="text-[12px] text-slate-400">No files shared yet.</p>}
      </div>
    </aside>
  );
}

// ─── Conversation list item ────────────────────────────────────────

function ConvoItem({ label, sub, time, active, unread, isGroup, user, onClick }) {
  return (
    <button onClick={onClick}
      className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all ${active ? 'bg-indigo-50/80' : 'hover:bg-slate-50'}`}>
      {active && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-indigo-500" />}
      {isGroup ? (
        <span className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'linear-gradient(135deg, #6366F1, #7C3AED)' }}>
          <Users size={18} />
          <span className="absolute -bottom-1 -right-1"><NkechiMascot size={20} /></span>
        </span>
      ) : <Avatar user={user} size={44} />}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-[13.5px] truncate ${unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>{label}</span>
          {time && <span className={`text-[10.5px] flex-shrink-0 ${unread ? 'text-indigo-600 font-semibold' : 'text-slate-400'}`}>{time}</span>}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className={`text-[12px] truncate ${unread ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{sub}</span>
          {unread > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[10.5px] font-bold flex items-center justify-center flex-shrink-0">{unread > 99 ? '99+' : unread}</span>
          )}
        </div>
      </div>
    </button>
  );
}

const shortTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return isToday(date) ? format(date, 'HH:mm') : isYesterday(date) ? 'Yesterday' : format(date, 'd MMM');
};

// ─── Main Chat page ────────────────────────────────────────────────

export default function Chat() {
  const { user, estate } = useAuth();
  const site = useSite();
  const { subscribe, emit } = useSocket() || {};
  const [conversations, setConversations] = useState([]);
  const [groupUnread, setGroupUnread] = useState(0);
  const [activeThread, setActiveThread] = useState({ type: 'group' });
  const [showNewDM, setShowNewDM] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [convoLoading, setConvoLoading] = useState(true);
  const [q, setQ] = useState('');
  const [showInfo, setShowInfo] = useState(() => { try { return localStorage.getItem('chat:info') !== '0'; } catch { return true; } });
  const [threadMessages, setThreadMessages] = useState([]);
  const isDesktop = useIsDesktop();
  const [frame, setFrame] = useState(null);

  // Below lg the app has a top bar and a fixed bottom nav, so the chat pins itself
  // between them. An open thread on a phone goes full height over the nav (WhatsApp-style).
  useLayoutEffect(() => {
    if (isDesktop) { setFrame(null); return undefined; }
    const measure = () => {
      const main = document.querySelector('main');
      const nav = document.querySelector('nav.fixed.bottom-0');
      const r = main?.getBoundingClientRect();
      setFrame({
        top: r ? r.top : 56,
        left: r ? r.left : 0,
        nav: nav ? Math.max(0, window.innerHeight - nav.getBoundingClientRect().top) : 0,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [isDesktop]);
  const phoneThread = !!frame && mobileShowThread && typeof window !== 'undefined' && window.innerWidth < 768;

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

  useEffect(() => { loadConversations(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // From a message notification: /chat?dm=<userId> opens that conversation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dm = params.get('dm');
    if (!dm) return;
    params.delete('dm');
    const rest = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''));
    messageAPI.getConversations()
      .then(({ data }) => (data.data || []).find((c) => String(c._id) === dm)?.partner)
      .then((partner) => partner || messageAPI.getEstateUsers({}).then(({ data }) => (data.data || []).find((u) => String(u._id) === dm)))
      .then((partner) => { if (partner) openThread({ type: 'dm', partner }); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update conversations sidebar on incoming DMs
  useEffect(() => {
    if (!subscribe) return undefined;
    const unsub = subscribe('new_message', (msg) => {
      if (!msg.isGroupMessage && !msg.isNkechi) {
        const myId = user._id?.toString();
        const partnerId = (msg.senderId?._id || msg.senderId)?.toString() === myId
          ? msg.receiverId?.toString()
          : (msg.senderId?._id || msg.senderId)?.toString();
        const isActiveDM = activeThread.type === 'dm' && activeThread.partner?._id?.toString() === partnerId;

        setConversations((prev) => {
          const idx = prev.findIndex((c) => c._id?.toString() === partnerId);
          if (idx >= 0) {
            const updated = [...prev];
            const item = {
              ...updated[idx],
              lastMessage: { content: previewText(msg, site), createdAt: msg.createdAt },
              unread: isActiveDM ? 0 : (updated[idx].unread || 0) + 1,
            };
            updated.splice(idx, 1);
            return [item, ...updated];
          }
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
    if (thread.type === 'group') setGroupUnread(0);
    else setConversations((prev) => prev.map((c) => (c._id?.toString() === thread.partner?._id?.toString() ? { ...c, unread: 0 } : c)));
  };

  const startNewDM = (u) => {
    openThread({ type: 'dm', partner: u });
    setShowNewDM(false);
    setConversations((prev) => (prev.find((c) => c._id?.toString() === u._id?.toString()) ? prev : [{ _id: u._id, partner: u, lastMessage: null, unread: 0 }, ...prev]));
  };

  const toggleInfo = () => setShowInfo((v) => { try { localStorage.setItem('chat:info', v ? '0' : '1'); } catch {} return !v; });
  const shown = conversations.filter((c) => !q.trim() || (c.partner?.name || '').toLowerCase().includes(q.trim().toLowerCase()));
  const groupLast = activeThread.type === 'group' ? threadMessages[threadMessages.length - 1] : null;

  return (
    <div className={`flex overflow-hidden bg-white ${frame ? 'fixed right-0' : 'h-[calc(100vh-5rem)] -m-4 md:-m-6 lg:-m-8'}`}
      style={frame ? { top: frame.top, left: frame.left, bottom: phoneThread ? 0 : frame.nav, zIndex: phoneThread ? 40 : 20 } : undefined}>

      {/* ── Conversations ── */}
      <div className={`flex flex-col w-full md:w-[320px] flex-shrink-0 border-r border-slate-200/80 bg-white ${mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 pt-3.5 sm:pt-4 pb-3">
          <div className="flex items-center justify-between">
            <h1 className="text-[20px] font-semibold text-slate-900" style={{ letterSpacing: '-0.02em' }}>Chats</h1>
            <button onClick={() => setShowNewDM(true)} title="New message"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', boxShadow: '0 8px 16px -8px #4F46E5' }}>
              <Plus size={17} />
            </button>
          </div>
          <div className="relative mt-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations"
              className="w-full pl-9 pr-3 py-2 rounded-xl text-[13px] outline-none bg-slate-100 border border-transparent focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          <div className="px-2 pt-1 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Community</div>
          <ConvoItem
            label={`${estateName} Community`}
            sub={groupUnread > 0 ? `${groupUnread} new message${groupUnread === 1 ? '' : 's'}` : groupLast ? `${groupLast.isNkechi ? 'Nkechi' : senderOf(groupLast)?.name?.split(' ')[0] || ''}: ${previewText(groupLast, site)}` : 'Nkechi is moderating 🌸'}
            time={groupLast ? shortTime(groupLast.createdAt) : ''}
            active={activeThread.type === 'group'} unread={groupUnread} isGroup
            onClick={() => openThread({ type: 'group' })} />

          <div className="px-2 pt-4 pb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            Direct messages {conversations.length > 0 && <span className="font-semibold normal-case tracking-normal">{conversations.length}</span>}
          </div>

          {convoLoading && conversations.length === 0 ? (
            <div className="space-y-2 px-2">{[0, 1, 2].map((k) => <div key={k} className="flex items-center gap-3"><div className="skeleton w-11 h-11 rounded-full" /><div className="flex-1 space-y-2"><div className="skeleton h-3 w-28 rounded" /><div className="skeleton h-2.5 w-40 rounded" /></div></div>)}</div>
          ) : shown.map((c) => (
            <ConvoItem key={c._id}
              label={c.partner?.name || 'Unknown'}
              sub={previewText(c.lastMessage, site) || 'Say hello 👋🏾'}
              time={shortTime(c.lastMessage?.createdAt)}
              active={activeThread.type === 'dm' && activeThread.partner?._id?.toString() === c._id?.toString()}
              unread={c.unread || 0} user={c.partner}
              onClick={() => openThread({ type: 'dm', partner: c.partner || { _id: c._id } })} />
          ))}

          {!convoLoading && conversations.length === 0 && (
            <div className="mx-2 mt-1 rounded-2xl border border-dashed border-slate-200 text-center py-6 px-4">
              <MessageSquare size={20} className="mx-auto mb-2 text-slate-300" />
              <p className="text-[12px] text-slate-400">No direct messages yet</p>
              <button onClick={() => setShowNewDM(true)} className="mt-2 text-[12px] font-semibold text-indigo-600 hover:text-indigo-700">{site.isEstate ? 'Message a neighbour' : `Message ${withArticle(site.w.memberLc)}`}</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Thread ── */}
      <div className={`flex flex-col flex-1 min-w-0 ${!mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
        <Thread
          key={activeThread.type === 'group' ? 'group' : activeThread.partner?._id}
          thread={activeThread} currentUser={user} subscribe={subscribe} emit={emit} estateName={estateName}
          showInfo={showInfo} onToggleInfo={toggleInfo} onMessages={setThreadMessages} onBack={() => setMobileShowThread(false)} />
      </div>

      {showInfo && <InfoPanel thread={activeThread} messages={threadMessages} estateName={estateName} />}

      {showNewDM && <NewDMModal onClose={() => setShowNewDM(false)} onSelect={startNewDM} />}
    </div>
  );
}
