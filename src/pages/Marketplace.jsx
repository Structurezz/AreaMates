import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Search, Plus, Heart, MessageCircle, X, Send, ShoppingBag,
  ImageIcon, ChevronLeft, RefreshCw,
} from 'lucide-react';
import { marketplaceAPI, messageAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import toast from 'react-hot-toast';

// ── Config ─────────────────────────────────────────────────────────

const CAT = {
  food:          { label: 'Food',     emoji: '🍽️', color: '#F59E0B' },
  services:      { label: 'Services', emoji: '🔧', color: '#60A5FA' },
  skills:        { label: 'Skills',   emoji: '💡', color: '#A78BFA' },
  items_for_sale:{ label: 'For Sale', emoji: '🏷️', color: '#34D399' },
  rentals:       { label: 'Rentals',  emoji: '🏠', color: '#F472B6' },
};
const CATEGORIES = Object.keys(CAT);

const getImg = (listing) =>
  listing.images?.[0] || `https://picsum.photos/seed/${listing._id}/600/400`;

// ── Chat Panel ─────────────────────────────────────────────────────

function ChatPanel({ seller, listing, currentUser, onClose }) {
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
      <div className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid #E2E8F0' }}>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: '#94A3B8' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#F1F5F9'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
        >
          <ChevronLeft size={18} />
        </button>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', color: '#059669' }}
        >
          {seller.name?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate" style={{ color: '#0F172A' }}>{seller.name}</div>
          {listing && <div className="text-xs truncate" style={{ color: '#94A3B8' }}>Re: {listing.title}</div>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5" style={{ background: '#F8FAFC' }}>
        {loading ? (
          <div className="flex justify-center py-10"><RefreshCw size={16} className="text-emerald-400 animate-spin" /></div>
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
                    ? { background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }
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
      <form onSubmit={handleSend} className="flex gap-2 p-3 flex-shrink-0 bg-white" style={{ borderTop: '1px solid #E2E8F0' }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={listing ? `Ask about "${listing.title.slice(0, 22)}…"` : 'Type a message…'}
          className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#0F172A' }}
          onFocus={e => e.target.style.borderColor = '#10B981'}
          onBlur={e => e.target.style.borderColor = '#E2E8F0'}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-opacity disabled:opacity-35 hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

// ── Detail Modal ───────────────────────────────────────────────────

function DetailModal({ listing, currentUserId, onClose, onMessage }) {
  const [imgErr, setImgErr] = useState(false);
  const cat = CAT[listing.category] || { label: listing.category, emoji: '📦', color: '#6B7280' };
  const isMine = (listing.sellerId?._id || listing.sellerId)?.toString() === currentUserId?.toString();

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white animate-fade-in"
        style={{ border: '1px solid #E2E8F0', boxShadow: '0 20px 48px rgba(15,23,42,0.14)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative">
          <img
            src={imgErr ? `https://picsum.photos/seed/${listing._id}b/600/400` : getImg(listing)}
            onError={() => setImgErr(true)}
            alt={listing.title}
            className="w-full h-52 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X size={14} />
          </button>
          <span
            className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
            style={{ background: cat.color, color: '#111' }}
          >
            {cat.emoji} {cat.label}
          </span>
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-xl">
            <span className="font-bold text-xl text-white">
              {listing.price === 0 ? 'Free' : `₦${listing.price.toLocaleString()}`}
            </span>
          </div>
        </div>
        <div className="p-5">
          <h2 className="text-xl font-bold mb-2 leading-tight" style={{ color: '#0F172A' }}>{listing.title}</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#64748B' }}>{listing.description}</p>
          <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', color: '#059669' }}
            >
              {listing.sellerId?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{listing.sellerId?.name}</div>
              <div className="text-xs" style={{ color: '#CBD5E1' }}>
                Listed {new Date(listing.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
          {!isMine ? (
            <button
              onClick={() => { onClose(); onMessage(listing); }}
              className="btn-primary w-full"
            >
              <MessageCircle size={15} /> Message Seller
            </button>
          ) : (
            <div className="text-center text-sm py-1" style={{ color: '#94A3B8' }}>This is your listing</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Modal ───────────────────────────────────────────────────

function CreateModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', price: '', category: 'food' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => { setImageFile(null); setImagePreview(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('price', form.price || 0);
      fd.append('category', form.category);
      if (imageFile) fd.append('images', imageFile);
      const { data } = await marketplaceAPI.create(fd);
      onCreated(data.data);
      toast.success('Listing posted!');
      onClose();
      setForm({ title: '', description: '', price: '', category: 'food' });
      clearImage();
    } catch { toast.error('Failed to post listing'); }
    finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)' }}
    >
      <div
        className="w-full max-w-md p-6 max-h-[92vh] overflow-y-auto animate-fade-in rounded-2xl bg-white"
        style={{ border: '1px solid #E2E8F0', boxShadow: '0 20px 48px rgba(15,23,42,0.14)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>Post a Listing</h2>
          <button
            onClick={onClose}
            style={{ color: '#94A3B8' }}
            onMouseEnter={e => e.currentTarget.style.color = '#0F172A'}
            onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image upload */}
          <div>
            <label className="text-xs block mb-2 font-medium" style={{ color: '#64A3B8' }}>Photo (optional)</label>
            <label className="block cursor-pointer">
              <div
                className={`w-full h-36 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${
                  imagePreview ? 'border-transparent' : ''
                }`}
                style={!imagePreview ? { borderColor: '#E2E8F0' } : {}}
                onMouseEnter={e => { if (!imagePreview) e.currentTarget.style.borderColor = '#10B981'; }}
                onMouseLeave={e => { if (!imagePreview) e.currentTarget.style.borderColor = '#E2E8F0'; }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="text-center select-none">
                    <ImageIcon size={22} className="mx-auto mb-1.5" style={{ color: '#CBD5E1' }} />
                    <span className="text-xs" style={{ color: '#94A3B8' }}>Click to upload a photo</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            {imagePreview && (
              <button type="button" onClick={clearImage} className="text-xs text-red-500 hover:text-red-600 mt-1.5 transition-colors">
                Remove photo
              </button>
            )}
          </div>

          <div>
            <label className="text-xs block mb-1 font-medium" style={{ color: '#475569' }}>Title *</label>
            <input
              required
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="What are you selling?"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs block mb-1 font-medium" style={{ color: '#475569' }}>Description *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe your item or service…"
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs block mb-1 font-medium" style={{ color: '#475569' }}>Price ₦ (0 = Free)</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="0"
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs block mb-1 font-medium" style={{ color: '#475569' }}>Category *</label>
              <select
                required
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="input-field"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT[c].emoji} {CAT[c].label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? <><RefreshCw size={13} className="animate-spin" /> Posting…</> : 'Post Listing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Listing Card ───────────────────────────────────────────────────

function ListingCard({ listing, currentUserId, onMessage, onDetail, liked, onLike }) {
  const [imgErr, setImgErr] = useState(false);
  const cat = CAT[listing.category] || { label: listing.category, emoji: '📦', color: '#6B7280' };
  const isMine = (listing.sellerId?._id || listing.sellerId)?.toString() === currentUserId?.toString();

  return (
    <div className="glass-card overflow-hidden group transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
      {/* Image */}
      <div className="relative overflow-hidden cursor-pointer" onClick={() => onDetail(listing)}>
        <img
          src={imgErr ? `https://picsum.photos/seed/alt${listing._id}/600/400` : getImg(listing)}
          onError={() => setImgErr(true)}
          alt={listing.title}
          className="w-full h-44 object-cover group-hover:scale-[1.04] transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {/* Category */}
        <span
          className="absolute top-2.5 left-2.5 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
          style={{ background: cat.color, color: '#111' }}
        >
          {cat.emoji} {cat.label}
        </span>
        {/* Like */}
        <button
          onClick={e => { e.stopPropagation(); onLike(listing._id); }}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all active:scale-90 ${
            liked ? 'bg-red-500 text-white shadow-lg' : 'bg-black/30 text-white/70 hover:bg-red-500/70 hover:text-white'
          }`}
        >
          <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
        </button>
        {/* Price */}
        <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
          <span className="font-bold text-sm text-white">
            {listing.price === 0 ? 'Free' : `₦${listing.price.toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3
          className="font-semibold leading-snug mb-1 truncate cursor-pointer transition-colors hover:text-emerald-600"
          style={{ color: '#0F172A' }}
          onClick={() => onDetail(listing)}
        >
          {listing.title}
        </h3>
        <p className="text-xs leading-relaxed line-clamp-2 flex-1 mb-3" style={{ color: '#94A3B8' }}>{listing.description}</p>

        <div className="flex items-center justify-between mt-auto pt-3" style={{ borderTop: '1px solid rgba(15,23,42,0.06)' }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.22)', color: '#059669' }}
            >
              {listing.sellerId?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-xs truncate max-w-[90px]" style={{ color: '#94A3B8' }}>
              {listing.sellerId?.name?.split(' ')[0]}
            </span>
            {isMine && <span className="text-xs ml-0.5 flex-shrink-0" style={{ color: '#D97706' }}>· you</span>}
          </div>
          {!isMine && (
            <button
              onClick={() => onMessage(listing)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
              style={{ background: '#ECFDF5', color: '#059669', border: '1px solid rgba(16,185,129,0.22)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#D1FAE5'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ECFDF5'; }}
            >
              <MessageCircle size={11} /> Chat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function Marketplace() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [liked, setLiked] = useState(new Set());
  const [activeChat, setActiveChat] = useState(null); // { seller, listing }
  const [detailItem, setDetailItem] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    marketplaceAPI.getAll(catFilter ? { category: catFilter } : {})
      .then(({ data }) => setListings(data.data))
      .catch(() => toast.error('Failed to load marketplace'))
      .finally(() => setLoading(false));
  }, [catFilter]);

  useEffect(() => { load(); }, [load]);

  const openChat = (listing) => {
    const seller = listing.sellerId;
    if (!seller) { toast.error('Seller info unavailable'); return; }
    setActiveChat({ seller, listing });
  };

  const toggleLike = (id) => {
    setLiked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = listings.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.title?.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q);
  });

  const catCounts = CATEGORIES.reduce((acc, c) => {
    acc[c] = listings.filter(l => l.category === c).length;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#0F172A', letterSpacing: '-0.03em' }}>
            <ShoppingBag size={22} className="text-emerald-500" /> Marketplace
          </h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            {listings.length} listing{listings.length !== 1 ? 's' : ''} in your estate
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary"
        >
          <Plus size={15} /> Post
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search listings…"
          className="input-field pl-10"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        <button
          onClick={() => setCatFilter('')}
          className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={!catFilter
            ? { background: '#10B981', color: '#FFFFFF' }
            : { background: '#F1F5F9', color: '#64748B' }
          }
          onMouseEnter={e => { if (catFilter) e.currentTarget.style.background = '#E2E8F0'; }}
          onMouseLeave={e => { if (catFilter) e.currentTarget.style.background = '#F1F5F9'; }}
        >
          All {listings.length > 0 && <span className="ml-1 opacity-70">{listings.length}</span>}
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setCatFilter(catFilter === c ? '' : c)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={catFilter === c
              ? { background: CAT[c].color, color: '#111' }
              : { background: '#F1F5F9', color: '#64748B' }
            }
            onMouseEnter={e => { if (catFilter !== c) e.currentTarget.style.background = '#E2E8F0'; }}
            onMouseLeave={e => { if (catFilter !== c) e.currentTarget.style.background = '#F1F5F9'; }}
          >
            {CAT[c].emoji} {CAT[c].label}
            {catCounts[c] > 0 && (
              <span style={{ opacity: catFilter === c ? 0.7 : 0.5 }}>{catCounts[c]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw size={22} className="text-emerald-500 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <ShoppingBag size={32} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
          <p className="font-medium" style={{ color: '#64748B' }}>No listings found</p>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
            {search ? `No results for "${search}"` : 'Be the first to post something!'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary mt-4"
            >
              Post a Listing
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
          {filtered.map(l => (
            <ListingCard
              key={l._id}
              listing={l}
              currentUserId={user?._id}
              onMessage={openChat}
              onDetail={setDetailItem}
              liked={liked.has(l._id)}
              onLike={toggleLike}
            />
          ))}
        </div>
      )}

      {/* Chat slide-in */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 z-50 shadow-2xl shadow-slate-900/10 transition-transform duration-300 ease-out ${
        activeChat ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {activeChat && (
          <ChatPanel
            seller={activeChat.seller}
            listing={activeChat.listing}
            currentUser={user}
            onClose={() => setActiveChat(null)}
          />
        )}
      </div>
      {/* Backdrop for chat */}
      {activeChat && (
        <div className="fixed inset-0 bg-slate-900/20 z-40 sm:hidden" onClick={() => setActiveChat(null)} />
      )}

      {/* Detail Modal */}
      {detailItem && (
        <DetailModal
          listing={detailItem}
          currentUserId={user?._id}
          onClose={() => setDetailItem(null)}
          onMessage={(l) => { setDetailItem(null); openChat(l); }}
        />
      )}

      {/* Create Modal */}
      <CreateModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(newListing) => setListings(prev => [newListing, ...prev])}
      />
    </div>
  );
}
