import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Search, Plus, Heart, MessageCircle, X, Send, ShoppingBag,
  ImageIcon, ChevronLeft, RefreshCw, SlidersHorizontal,
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
    <div className="flex flex-col h-full bg-navy">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8 flex-shrink-0">
        <button onClick={onClose}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all">
          <ChevronLeft size={18} />
        </button>
        <div className="w-9 h-9 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
          {seller.name?.[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-white text-sm truncate">{seller.name}</div>
          {listing && <div className="text-xs text-white/30 truncate">Re: {listing.title}</div>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {loading ? (
          <div className="flex justify-center py-10"><RefreshCw size={16} className="text-white/30 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageCircle size={28} className="text-white/10 mb-3" />
            <p className="text-white/25 text-sm">No messages yet</p>
            {listing && <p className="text-white/15 text-xs mt-1">Ask about "{listing.title.slice(0, 30)}"</p>}
          </div>
        ) : (
          messages.map((msg) => {
            const mine = isMe(msg);
            return (
              <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                  mine
                    ? 'bg-gold text-navy font-medium rounded-br-sm'
                    : 'bg-white/8 text-white rounded-bl-sm'
                } ${msg._opt ? 'opacity-60' : ''}`}>
                  {msg.content}
                  <div className={`text-xs mt-0.5 ${mine ? 'text-navy/50' : 'text-white/30'}`}>
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
      <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-white/8 flex-shrink-0">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={listing ? `Ask about "${listing.title.slice(0, 22)}…"` : 'Type a message…'}
          className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40"
        />
        <button type="submit" disabled={!text.trim() || sending}
          className="w-9 h-9 rounded-xl bg-gold flex items-center justify-center text-navy flex-shrink-0 disabled:opacity-35 hover:opacity-90 transition-opacity">
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="glass-card w-full max-w-md overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <img
            src={imgErr ? `https://picsum.photos/seed/${listing._id}b/600/400` : getImg(listing)}
            onError={() => setImgErr(true)}
            alt={listing.title}
            className="w-full h-52 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <X size={14} />
          </button>
          <span className="absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
            style={{ background: cat.color, color: '#111' }}>
            {cat.emoji} {cat.label}
          </span>
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-xl">
            <span className="text-gold font-bold text-xl">
              {listing.price === 0 ? 'Free' : `₦${listing.price.toLocaleString()}`}
            </span>
          </div>
        </div>
        <div className="p-5">
          <h2 className="text-xl font-bold text-white mb-2 leading-tight">{listing.title}</h2>
          <p className="text-white/55 text-sm leading-relaxed mb-4">{listing.description}</p>
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-white/8">
            <div className="w-9 h-9 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center text-gold font-bold text-sm flex-shrink-0">
              {listing.sellerId?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{listing.sellerId?.name}</div>
              <div className="text-xs text-white/30">
                Listed {new Date(listing.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
          {!isMine ? (
            <button
              onClick={() => { onClose(); onMessage(listing); }}
              className="w-full py-2.5 rounded-xl bg-gold text-navy font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <MessageCircle size={15} /> Message Seller
            </button>
          ) : (
            <div className="text-center text-sm text-white/25 py-1">This is your listing</div>
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-6 max-h-[92vh] overflow-y-auto animate-fade-in">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Post a Listing</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image upload */}
          <div>
            <label className="text-xs text-white/40 block mb-2">Photo (optional)</label>
            <label className="block cursor-pointer">
              <div className={`w-full h-36 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${
                imagePreview ? 'border-transparent' : 'border-white/12 hover:border-white/25'
              }`}>
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <div className="text-center select-none">
                    <ImageIcon size={22} className="text-white/20 mx-auto mb-1.5" />
                    <span className="text-xs text-white/30">Click to upload a photo</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            {imagePreview && (
              <button type="button" onClick={clearImage} className="text-xs text-red-400/60 hover:text-red-400 mt-1.5 transition-colors">
                Remove photo
              </button>
            )}
          </div>

          <div>
            <label className="text-xs text-white/40 block mb-1">Title *</label>
            <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="What are you selling?"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40" />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Description *</label>
            <textarea required rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Describe your item or service…"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 block mb-1">Price ₦ (0 = Free)</label>
              <input type="number" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-gold/40" />
            </div>
            <div>
              <label className="text-xs text-white/40 block mb-1">Category *</label>
              <select required value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-navy border border-white/10 text-sm text-white focus:outline-none focus:border-gold/40">
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT[c].emoji} {CAT[c].label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-white/5 text-white/60 text-sm hover:bg-white/10 transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl bg-gold text-navy text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
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
    <div className="glass-card overflow-hidden group hover:border-white/25 transition-all duration-200 hover:-translate-y-0.5 flex flex-col">
      {/* Image */}
      <div className="relative overflow-hidden cursor-pointer" onClick={() => onDetail(listing)}>
        <img
          src={imgErr ? `https://picsum.photos/seed/alt${listing._id}/600/400` : getImg(listing)}
          onError={() => setImgErr(true)}
          alt={listing.title}
          className="w-full h-44 object-cover group-hover:scale-[1.04] transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Category */}
        <span className="absolute top-2.5 left-2.5 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"
          style={{ background: cat.color, color: '#111' }}>
          {cat.emoji} {cat.label}
        </span>
        {/* Like */}
        <button
          onClick={e => { e.stopPropagation(); onLike(listing._id); }}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm transition-all active:scale-90 ${
            liked ? 'bg-red-500 text-white shadow-lg' : 'bg-black/40 text-white/60 hover:bg-red-500/70 hover:text-white'
          }`}>
          <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
        </button>
        {/* Price */}
        <div className="absolute bottom-2.5 right-2.5 bg-black/65 backdrop-blur-sm px-2.5 py-1 rounded-lg">
          <span className="text-gold font-bold text-sm">
            {listing.price === 0 ? 'Free' : `₦${listing.price.toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-white leading-snug mb-1 truncate cursor-pointer hover:text-gold/90 transition-colors"
          onClick={() => onDetail(listing)}>
          {listing.title}
        </h3>
        <p className="text-white/40 text-xs leading-relaxed line-clamp-2 flex-1 mb-3">{listing.description}</p>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-gold/15 border border-gold/25 flex items-center justify-center text-gold font-bold text-[10px] flex-shrink-0">
              {listing.sellerId?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="text-xs text-white/35 truncate max-w-[90px]">{listing.sellerId?.name?.split(' ')[0]}</span>
            {isMine && <span className="text-xs text-amber-400/50 ml-0.5 flex-shrink-0">· you</span>}
          </div>
          {!isMine && (
            <button
              onClick={() => onMessage(listing)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gold/10 text-gold border border-gold/15 hover:bg-gold/20 hover:border-gold/30 transition-all flex-shrink-0">
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
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag size={22} className="text-gold" /> Marketplace
          </h1>
          <p className="text-white/40 text-sm mt-0.5">
            {listings.length} listing{listings.length !== 1 ? 's' : ''} in your estate
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-navy font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus size={15} /> Post
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search listings…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-gold/40 transition-colors" />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        <button onClick={() => setCatFilter('')}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
            !catFilter ? 'bg-gold text-navy' : 'bg-white/5 text-white/50 hover:bg-white/10'
          }`}>
          All {listings.length > 0 && <span className="ml-1 opacity-60">{listings.length}</span>}
        </button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(catFilter === c ? '' : c)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              catFilter === c ? 'text-navy' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
            style={catFilter === c ? { background: CAT[c].color } : {}}>
            {CAT[c].emoji} {CAT[c].label}
            {catCounts[c] > 0 && <span className={catFilter === c ? 'opacity-60' : 'text-white/25'}>{catCounts[c]}</span>}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw size={22} className="text-gold animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <ShoppingBag size={32} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/30 font-medium">No listings found</p>
          <p className="text-white/20 text-sm mt-1">
            {search ? `No results for "${search}"` : 'Be the first to post something!'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)}
              className="mt-4 px-5 py-2 rounded-xl bg-gold text-navy text-sm font-semibold hover:opacity-90 transition-opacity">
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
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 z-50 shadow-2xl transition-transform duration-300 ease-out ${
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
        <div className="fixed inset-0 bg-black/40 z-40 sm:hidden" onClick={() => setActiveChat(null)} />
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
