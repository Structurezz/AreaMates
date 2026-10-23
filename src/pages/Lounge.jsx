import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Music, Calendar, BarChart2, Zap, Activity,
  Play, Pause, Volume2, VolumeX, Radio, Shuffle, SkipBack, SkipForward,
  RefreshCw, Plus, Trash2, X, Heart, MessageCircle, ImageIcon, Send,
  ChevronDown, ChevronRight, Pin, Eye, EyeOff, Link,
  Users, TrendingUp, Check,
  Dumbbell, Handshake, PartyPopper, ShoppingBag, Newspaper, Lightbulb, Trophy,
} from 'lucide-react';
import { eventAPI, pollAPI, loungeAPI, postAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DJLive from '../components/DJLive';
import MixtapeArchive from '../components/MixtapeArchive';
import GoLiveCTA from '../components/GoLiveCTA';
import Portal from '../components/ui/Portal';
import Feed from '../components/lounge/Feed';
import { LoungeBanner, LoungeNav, LoungeRightRail } from '../components/lounge/LoungeDesktop';
import useIsDesktop from '../hooks/useIsDesktop';
import useFillHeight from '../hooks/useFillHeight';

// ── Helpers ────────────────────────────────────────────────────────
const SERVER_URL = (import.meta.env.VITE_API_URL || 'https://areaconnectapi-production.up.railway.app/api').replace('/api', '');
const imgUrl     = (path) => {
  if (!path) return path;
  // Already absolute or an inline data URL (profilePhoto is base64) — don't rewrite
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${SERVER_URL}${path}`;
};

function timeAgo(iso) {
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800)return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
}

function Avatar({ name, size = 36, src }) {
  const initials = (name || '?').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  if (src) return <img src={imgUrl(src)} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  const colors = ['#6366F1','#10B981','#EC4899','#F59E0B','#0EA5E9','#8B5CF6'];
  const color  = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className="rounded-full flex items-center justify-center font-black flex-shrink-0 text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '12px',
  background: '#F8FAFC', border: '1px solid #E2E8F0',
  fontSize: '14px', color: '#0F172A', outline: 'none',
};

// ── Events Tab ─────────────────────────────────────────────────────
const EVENT_CATEGORIES = [
  { id:'general',    label:'General',    color:'#6366F1', emoji:'📅' },
  { id:'fitness',    label:'Fitness',    color:'#0EA5E9', emoji:'🏃' },
  { id:'social',     label:'Social',     color:'#EC4899', emoji:'🎉' },
  { id:'networking', label:'Networking', color:'#8B5CF6', emoji:'🤝' },
  { id:'maintenance',label:'Maintenance',color:'#F59E0B', emoji:'🔧' },
  { id:'kids',       label:'Kids',       color:'#F97316', emoji:'👶' },
];
const catMap = Object.fromEntries(EVENT_CATEGORIES.map(c => [c.id, c]));

function EventsTab({ userId }) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [rsvping, setRsvping] = useState(null);

  useEffect(() => {
    eventAPI.getAll()
      .then(({ data }) => setEvents(data.data || []))
      .catch(() => toast.error('Failed to load events'))
      .finally(() => setLoading(false));
  }, []);

  const handleRsvp = async (ev) => {
    setRsvping(ev._id);
    try {
      const { data } = await eventAPI.rsvp(ev._id);
      setEvents(prev => prev.map(e => e._id === ev._id ? data.data : e));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setRsvping(null); }
  };

  const upcoming = events.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date));
  const past     = events.filter(e => new Date(e.date) < new Date()).sort((a, b) => new Date(b.date) - new Date(a.date));

  if (loading) return <div className="flex justify-center py-12"><RefreshCw size={18} className="animate-spin" style={{ color: '#6366F1' }} /></div>;

  if (events.length === 0) return (
    <div className="rounded-2xl p-10 text-center text-sm border" style={{ color: '#94A3B8', borderColor: '#F1F5F9' }}>
      No upcoming events. Check back later!
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm" style={{ color: '#94A3B8' }}>{upcoming.length} upcoming · {past.length} past</p>

      {upcoming.map(ev => {
        const cat     = catMap[ev.category] || catMap['general'];
        const hasRsvp = ev.rsvps?.includes(userId) || ev.rsvps?.some(r => r === userId || r?._id === userId);
        return (
          <div key={ev._id} className="rounded-2xl p-4 border flex items-start gap-4"
            style={{ background: '#fff', borderColor: ev.isFridayFunTimes ? '#FDE68A' : '#F1F5F9' }}>
            <div className="w-12 h-12 rounded-2xl flex-shrink-0 flex flex-col items-center justify-center"
              style={{ background: ev.isFridayFunTimes ? '#FFFBEB' : cat.color + '15' }}>
              <span className="text-[10px] font-bold uppercase" style={{ color: ev.isFridayFunTimes ? '#D97706' : cat.color }}>
                {new Date(ev.date).toLocaleDateString('en', { month: 'short' })}
              </span>
              <span className="text-lg font-black leading-none" style={{ color: ev.isFridayFunTimes ? '#D97706' : '#0F172A' }}>
                {new Date(ev.date).getDate()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: cat.color + '15', color: cat.color }}>
                  {cat.emoji} {cat.label}
                </span>
                {ev.isFridayFunTimes && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#FFFBEB', color: '#D97706' }}>🎉 FunTimes</span>
                )}
              </div>
              <p className="text-sm font-bold" style={{ color: '#0F172A' }}>{ev.title}</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                {ev.time && `${ev.time} · `}{ev.location || 'Estate Grounds'}
              </p>
              {ev.description && (
                <p className="text-xs mt-1 leading-relaxed" style={{ color: '#64748B' }}>{ev.description}</p>
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs flex items-center gap-1" style={{ color: '#10B981' }}>
                  <Users size={11} /> {ev.rsvps?.length || 0} going
                </span>
                <button onClick={() => handleRsvp(ev)} disabled={rsvping === ev._id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={hasRsvp
                    ? { background: '#F0FDF4', color: '#10B981', border: '1px solid #BBF7D0' }
                    : { background: '#6366F1', color: '#fff' }}>
                  {rsvping === ev._id
                    ? <RefreshCw size={11} className="animate-spin" />
                    : hasRsvp ? <><Check size={11} /> Going</> : 'RSVP'
                  }
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {past.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2 mt-5" style={{ color: '#94A3B8' }}>Past</p>
          {past.slice(0, 3).map(ev => (
            <div key={ev._id} className="rounded-xl p-3 flex items-center gap-3 mb-2" style={{ background: '#F8FAFC', opacity: 0.7 }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#64748B' }}>{ev.title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                  {new Date(ev.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })} · {ev.rsvps?.length || 0} attended
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Activities Tab ────────────────────────────────────────────────
const ACTIVITY_TYPES = [
  { id: 'fitness',     emoji: '🏃', label: 'Fitness',      color: '#10B981', bg: '#F0FDF4', Icon: Dumbbell },
  { id: 'icebreaker',  emoji: '💬', label: 'Icebreaker',   color: '#6366F1', bg: '#EEF2FF', Icon: MessageCircle },
  { id: 'news',        emoji: '📰', label: 'Estate News',  color: '#0EA5E9', bg: '#F0F9FF', Icon: Newspaper },
  { id: 'tip',         emoji: '💡', label: 'Daily Tip',    color: '#F59E0B', bg: '#FFFBEB', Icon: Lightbulb },
  { id: 'networking',  emoji: '🤝', label: 'Networking',   color: '#8B5CF6', bg: '#F5F3FF', Icon: Handshake },
  { id: 'social',      emoji: '🎉', label: 'Fun & Social', color: '#EC4899', bg: '#FDF2F8', Icon: PartyPopper },
  { id: 'marketplace', emoji: '🛒', label: 'Marketplace',  color: '#F97316', bg: '#FFF7ED', Icon: ShoppingBag },
  { id: 'challenge',   emoji: '🏆', label: 'Challenge',    color: '#EF4444', bg: '#FEF2F2', Icon: Trophy },
];
const typeMap = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, t]));

const DEFAULT_ACTIVITIES = [
  { id:'da_1',  type:'fitness',     pinned:true,  visible:true, day:'Daily',   title:'Morning Walk Club',        desc:'7:00 AM at the estate gate. All fitness levels welcome — let\'s get those steps in together!' },
  { id:'da_2',  type:'icebreaker',  pinned:true,  visible:true, day:'Daily',   title:'Icebreaker of the Day',    desc:'What\'s one skill you have that most of your neighbours probably don\'t know about?' },
  { id:'da_3',  type:'challenge',   pinned:false, visible:true, day:'Daily',   title:'10,000 Steps Challenge',   desc:'Can you hit 10,000 steps today? Share your progress with the community!' },
  { id:'da_4',  type:'networking',  pinned:false, visible:true, day:'Weekly',  title:'Neighbour Spotlight',      desc:'Say hello to a neighbour you haven\'t met yet this week.' },
  { id:'da_5',  type:'tip',         pinned:false, visible:true, day:'Daily',   title:'Estate Tip of the Day',    desc:'Keep shared corridors clear at all times for emergency access and neighbour courtesy.' },
  { id:'da_6',  type:'social',      pinned:false, visible:true, day:'Weekly',  title:'Friday Night FunTimes',    desc:'Community bonding every Friday evening at the Estate Clubhouse, 7 PM.' },
  { id:'da_7',  type:'marketplace', pinned:false, visible:true, day:'Weekly',  title:'Marketplace Monday',       desc:'New week, new listings! Check out what your neighbours are offering.' },
  { id:'da_8',  type:'news',        pinned:false, visible:true, day:'Daily',   title:'Estate Update Board',      desc:'Check Announcements for this week\'s maintenance schedule and community updates.' },
  { id:'da_9',  type:'fitness',     pinned:false, visible:true, day:'Weekly',  title:'Weekend Yoga Session',     desc:'Outdoor yoga every Saturday at 8 AM by the estate pool area. Bring your own mat!' },
  { id:'da_10', type:'networking',  pinned:false, visible:true, day:'Monthly', title:'Residents\' Mixer',        desc:'Monthly get-together for new and old residents to meet, mingle and build community bonds.' },
  { id:'da_11', type:'challenge',   pinned:false, visible:true, day:'Weekly',  title:'Community Clean-Up Drive', desc:'Join residents this weekend for a 30-minute shared-space tidy-up. Gloves provided!' },
  { id:'da_12', type:'social',      pinned:false, visible:true, day:'Daily',   title:'Good Morning Wall',        desc:'Drop a good morning in the community chat. Positivity is contagious!' },
];

const ACTS_KEY = 'ac_res_lounge_activities';
function loadActivities() { try { return JSON.parse(localStorage.getItem(ACTS_KEY)) || DEFAULT_ACTIVITIES; } catch { return DEFAULT_ACTIVITIES; } }
function saveActivities(a) { localStorage.setItem(ACTS_KEY, JSON.stringify(a)); }

function ActivitiesTab() {
  const [activities, setActivities] = useState(loadActivities);
  const [filter, setFilter]         = useState('all');
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ type:'fitness', title:'', desc:'', day:'Daily' });

  const persist   = (u) => { setActivities(u); saveActivities(u); };
  const togglePin = (id) => persist(activities.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
  const toggleVis = (id) => persist(activities.map(a => a.id === id ? { ...a, visible: !a.visible } : a));
  const remove    = (id) => persist(activities.filter(a => a.id !== id));

  const handleCreate = (e) => {
    e.preventDefault();
    persist([{ ...form, id:`res_${Date.now()}`, pinned:false, visible:true, isCustom:true }, ...activities]);
    setShowForm(false);
    setForm({ type:'fitness', title:'', desc:'', day:'Daily' });
    toast.success('Activity added!');
  };

  const filtered = filter === 'all' ? activities : activities.filter(a => a.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm" style={{ color:'#94A3B8' }}>
          <span style={{ color:'#6366F1', fontWeight:700 }}>{activities.filter(a=>a.visible).length}</span> active &nbsp;·&nbsp;
          <span style={{ color:'#F59E0B', fontWeight:700 }}>{activities.filter(a=>a.pinned).length}</span> pinned
        </p>
        <div className="flex gap-2">
          <button onClick={() => { persist(DEFAULT_ACTIVITIES); toast.success('Reset!'); }}
            className="text-xs px-3 py-1.5 rounded-xl border" style={{ color:'#94A3B8', borderColor:'#E2E8F0', background:'#F8FAFC' }}>
            Reset
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold" style={{ background:'#6366F1' }}>
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {['all', ...ACTIVITY_TYPES.map(t => t.id)].map(id => {
          const t = typeMap[id];
          return (
            <button key={id} onClick={() => setFilter(id)}
              className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
              style={filter === id
                ? { background: t ? t.color : '#0F172A', color:'#fff', borderColor: t ? t.color : '#0F172A' }
                : { color:'#64748B', borderColor:'#E2E8F0', background:'#fff' }}>
              {t ? `${t.emoji} ${t.label}` : 'All'}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(act => {
          const t = typeMap[act.type] || ACTIVITY_TYPES[0];
          return (
            <div key={act.id} className="rounded-2xl p-4 border transition-all"
              style={{ background: act.visible ? t.bg : '#F8FAFC', borderColor: act.visible ? t.color+'30' : '#E2E8F0', opacity: act.visible ? 1 : 0.6 }}>
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: t.color+'20', color: t.color }}>{t.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full border" style={{ color:'#94A3B8', borderColor:'#E2E8F0', background:'#fff' }}>{act.day}</span>
                    {act.pinned && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background:'#FFFBEB', color:'#D97706' }}>📌 Pinned</span>}
                    {act.isCustom && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background:'#EEF2FF', color:'#6366F1' }}>Mine</span>}
                  </div>
                  <p className="text-sm font-bold leading-snug mb-1" style={{ color: act.visible ? '#0F172A' : '#94A3B8' }}>{act.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color:'#64748B' }}>{act.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t" style={{ borderColor: t.color+'20' }}>
                <button onClick={() => togglePin(act.id)} title={act.pinned ? 'Unpin' : 'Pin'}
                  className="p-1.5 rounded-lg transition-all"
                  style={act.pinned ? { color:'#D97706', background:'#FFFBEB' } : { color:'#94A3B8' }}>
                  <Pin size={13} />
                </button>
                <button onClick={() => toggleVis(act.id)} className="p-1.5 rounded-lg transition-all"
                  style={act.visible ? { color:'#6366F1', background:'#EEF2FF' } : { color:'#94A3B8' }}>
                  {act.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                </button>
                <button onClick={() => remove(act.id)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color:'#CBD5E1' }}
                  onMouseEnter={e => e.currentTarget.style.color='#EF4444'}
                  onMouseLeave={e => e.currentTarget.style.color='#CBD5E1'}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <Portal>
        <div className="fixed inset-0 overlay-scrim z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl p-6 bg-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color:'#0F172A' }}>New Activity</h2>
              <button onClick={() => setShowForm(false)} style={{ color:'#94A3B8' }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs block mb-1.5 font-medium" style={{ color:'#64748B' }}>Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIVITY_TYPES.map(t => (
                    <button key={t.id} type="button" onClick={() => setForm(p=>({...p,type:t.id}))}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                      style={form.type===t.id ? { background:t.color, color:'#fff', borderColor:t.color } : { color:'#64748B', borderColor:'#E2E8F0', background:'#fff' }}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color:'#64748B' }}>Title *</label>
                <input required value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color:'#64748B' }}>Description *</label>
                <textarea required rows={3} value={form.desc} onChange={e=>setForm(p=>({...p,desc:e.target.value}))} style={{...inputStyle,resize:'none'}} />
              </div>
              <div>
                <label className="text-xs block mb-1 font-medium" style={{ color:'#64748B' }}>Frequency</label>
                <div className="flex gap-2">
                  {['Daily','Weekly','Monthly','One-time'].map(d => (
                    <button key={d} type="button" onClick={() => setForm(p=>({...p,day:d}))}
                      className="flex-1 py-1.5 rounded-xl text-xs font-semibold border"
                      style={form.day===d ? { background:'#6366F1', color:'#fff', borderColor:'#6366F1' } : { color:'#64748B', borderColor:'#E2E8F0' }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm" style={{ background:'#F1F5F9', color:'#475569' }}>Cancel</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background:'#6366F1' }}>
                  Add Activity
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
}

// ── Polls Tab ─────────────────────────────────────────────────────
function PollsTab({ userId }) {
  const [polls, setPolls]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    pollAPI.getAll()
      .then(({ data }) => setPolls(data.data || []))
      .catch(() => toast.error('Failed to load polls'))
      .finally(() => setLoading(false));
  }, []);

  const handleVote = async (pollId, optionIndex) => {
    setVoting(`${pollId}:${optionIndex}`);
    try {
      const { data } = await pollAPI.vote(pollId, optionIndex);
      setPolls(prev => prev.map(p => p._id === pollId ? data.data : p));
      toast.success('Vote recorded!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setVoting(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><RefreshCw size={18} className="animate-spin" style={{ color: '#6366F1' }} /></div>;

  const active = polls.filter(p => p.isActive);
  const closed = polls.filter(p => !p.isActive);

  if (polls.length === 0) return (
    <div className="rounded-2xl p-10 text-center border" style={{ color: '#94A3B8', borderColor: '#F1F5F9' }}>
      No polls yet. Check back later!
    </div>
  );

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>Active Polls</p>
          {active.map(poll => {
            const total     = poll.options.reduce((s, o) => s + o.votes.length, 0);
            const hasVoted  = poll.options.some(o => o.votes.includes(userId) || o.votes.some(v => v === userId || v?._id === userId));
            const leading   = poll.options.reduce((a, b) => b.votes.length > a.votes.length ? b : a, poll.options[0]);
            return (
              <div key={poll._id} className="glass-card p-5">
                <p className="font-bold text-sm mb-3" style={{ color: '#0F172A' }}>{poll.question}</p>
                <div className="space-y-2 mb-3">
                  {poll.options.map((opt, i) => {
                    const pct       = total ? Math.round((opt.votes.length / total) * 100) : 0;
                    const isLeading = opt === leading && total > 0;
                    return (
                      <div key={i}>
                        {hasVoted ? (
                          <div className="relative rounded-xl overflow-hidden" style={{ border: `1px solid ${isLeading ? '#BBF7D0' : '#F1F5F9'}` }}>
                            <div className="absolute inset-0 rounded-xl" style={{ background: isLeading ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.06)', width: `${pct}%` }} />
                            <div className="relative px-3 py-2 flex justify-between items-center text-sm">
                              <span className="flex items-center gap-1.5" style={{ color: isLeading ? '#10B981' : '#475569' }}>
                                {isLeading && <TrendingUp size={12} />} {opt.text}
                              </span>
                              <span className="font-bold text-xs" style={{ color: isLeading ? '#10B981' : '#94A3B8' }}>{pct}%</span>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => handleVote(poll._id, i)} disabled={!!voting}
                            className="w-full px-3 py-2.5 rounded-xl text-sm text-left transition-all border font-medium"
                            style={{ background: '#F8FAFC', borderColor: '#E2E8F0', color: '#0F172A' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                            onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}>
                            {voting === `${poll._id}:${i}`
                              ? <span className="flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /> Voting…</span>
                              : opt.text}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs" style={{ color: '#94A3B8' }}>{total} vote{total !== 1 ? 's' : ''} total</p>
              </div>
            );
          })}
        </>
      )}

      {closed.length > 0 && (
        <>
          <p className="text-xs font-semibold uppercase tracking-widest mt-4" style={{ color: '#94A3B8' }}>Closed Polls</p>
          {closed.map(poll => {
            const total   = poll.options.reduce((s, o) => s + o.votes.length, 0);
            const leading = poll.options.reduce((a, b) => b.votes.length > a.votes.length ? b : a, poll.options[0]);
            return (
              <div key={poll._id} className="glass-card p-4" style={{ opacity: 0.7 }}>
                <p className="font-semibold text-sm mb-2" style={{ color: '#475569' }}>{poll.question}</p>
                <div className="space-y-1.5">
                  {poll.options.map((opt, i) => {
                    const pct       = total ? Math.round((opt.votes.length / total) * 100) : 0;
                    const isLeading = opt === leading && total > 0;
                    return (
                      <div key={i} className="relative rounded-xl overflow-hidden" style={{ border: '1px solid #F1F5F9' }}>
                        <div className="absolute inset-0" style={{ background: isLeading ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.05)', width: `${pct}%` }} />
                        <div className="relative px-3 py-1.5 flex justify-between text-xs">
                          <span style={{ color: isLeading ? '#10B981' : '#64748B' }}>{opt.text}</span>
                          <span style={{ color: '#94A3B8' }}>{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs mt-2" style={{ color: '#CBD5E1' }}>{total} votes · Closed</p>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ── Music Tab ─────────────────────────────────────────────────────
const STATIONS = [
  { name: 'Groove Salad',    genre: 'Ambient / Chill',      url: 'https://ice1.somafm.com/groovesalad-128-mp3',  color: '#10B981', emoji: '🌿' },
  { name: 'Beat Blender',    genre: 'Electronic / Dance',   url: 'https://ice1.somafm.com/beatblender-128-mp3',  color: '#8B5CF6', emoji: '🎧' },
  { name: 'Illinois Lounge', genre: 'Jazz / Lounge',        url: 'https://ice1.somafm.com/illstreet-128-mp3',    color: '#D97706', emoji: '🎷' },
  { name: 'Space Station',   genre: 'Electronic / Ambient', url: 'https://ice1.somafm.com/spacestation-128-mp3', color: '#3B82F6', emoji: '🚀' },
  { name: 'Digitalis',       genre: 'Indie / Alternative',  url: 'https://ice1.somafm.com/digitalis-128-mp3',    color: '#EC4899', emoji: '🎸' },
  { name: 'Party Vibes',     genre: 'Afrobeats / Dancehall',url: 'https://ice1.somafm.com/beatblender-128-mp3',  color: '#F59E0B', emoji: '🎉' },
];

const PAGE_SIZE = 10;

function EqBar({ color, delay }) {
  return <div className="w-1 rounded-full animate-eq" style={{ background: color, animationDelay: delay, height: '24px' }} />;
}

function extractVideoId(raw) {
  const m = raw.match(/(?:youtu\.be\/|[?&]v=|\/embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  return null;
}

function MusicTab({ userId }) {
  const audioRef = useRef(null);
  const [playing, setPlaying]         = useState(false);
  const [radioLoading, setRadioLoading] = useState(false);
  const [volume, setVolume]           = useState(0.7);
  const [muted, setMuted]             = useState(false);
  const [station, setStation]         = useState(STATIONS[0]);
  const [session, setSession]         = useState(null);
  const [queueIdx, setQueueIdx]       = useState(0);
  const [shuffleOn, setShuffleOn]     = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [linkInput, setLinkInput]     = useState('');
  const [titleInput, setTitleInput]   = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [defaultsPage, setDefaultsPage] = useState(1);
  const [loading, setLoading]         = useState(true);

  const now           = new Date();
  const isFridayNight = now.getDay() === 5 && now.getHours() >= 18;
  const accent        = isFridayNight ? '#F59E0B' : '#6366F1';

  useEffect(() => {
    loungeAPI.getSession()
      .then(({ data }) => {
        const s = data.data;
        setSession(s);
        if (typeof s?.isAutoDJ === 'boolean') setShuffleOn(s.isAutoDJ);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isFridayNight && station.name !== 'Party Vibes') setStation(STATIONS[5]);
  }, [isFridayNight]);

  const queue           = [...(session?.suggestions || [])].sort((a, b) => b.votes.length - a.votes.length);
  const communityTracks = queue.filter(t => !t.isDefault);
  const defaultTracks   = queue.filter(t => t.isDefault);
  const visibleDefaults = defaultTracks.slice(0, defaultsPage * PAGE_SIZE);
  const hasMoreDefaults = visibleDefaults.length < defaultTracks.length;
  const track           = queue[queueIdx] ?? null;

  const playRadio = useCallback(async (st = station) => {
    const audio = audioRef.current;
    if (!audio) return;
    setRadioLoading(true);
    audio.src = st.url;
    audio.volume = muted ? 0 : volume;
    try { await audio.play(); setPlaying(true); }
    catch { setPlaying(false); }
    finally { setRadioLoading(false); }
  }, [station, volume, muted]);

  const pauseRadio    = () => { audioRef.current?.pause(); setPlaying(false); };
  const selectStation = (st) => { setStation(st); if (playing) playRadio(st); };
  const togglePlay    = () => playing ? pauseRadio() : playRadio();
  const handleVolume  = (v) => { setVolume(v); if (audioRef.current) audioRef.current.volume = muted ? 0 : v; };
  const toggleMute    = () => { const n = !muted; setMuted(n); if (audioRef.current) audioRef.current.volume = n ? 0 : volume; };

  const advance = useCallback(() => {
    if (!queue.length) return;
    setQueueIdx(prev => shuffleOn ? Math.floor(Math.random() * queue.length) : (prev + 1) % queue.length);
  }, [queue.length, shuffleOn]);

  const goBack = useCallback(() => {
    if (!queue.length) return;
    setQueueIdx(prev => (prev - 1 + queue.length) % queue.length);
  }, [queue.length]);

  const toggleShuffle = async () => {
    const next = !shuffleOn;
    setShuffleOn(next);
    try { await loungeAPI.updateMood({ isAutoDJ: next }); } catch {}
  };

  const handleVote = async (id) => {
    try { const { data } = await loungeAPI.vote(id); setSession(data.data); } catch {}
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this track?')) return;
    try {
      await loungeAPI.remove(id);
      setSession(prev => prev ? { ...prev, suggestions: prev.suggestions.filter(s => s._id !== id) } : prev);
      setQueueIdx(i => Math.min(i, Math.max(0, queue.length - 2)));
    } catch {}
  };

  const handleAdd = async () => {
    const videoId = extractVideoId(linkInput.trim());
    if (!videoId)           { alert('Paste a YouTube URL or video ID'); return; }
    if (!titleInput.trim()) { alert('Enter a track title'); return; }
    setSubmitting(true);
    try {
      const { data } = await loungeAPI.suggest(videoId, titleInput.trim());
      setSession(data.data);
      setLinkInput(''); setTitleInput(''); setShowAdd(false);
    } catch (e) { alert(e.response?.data?.message || 'Could not add track'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><RefreshCw size={18} className="animate-spin" style={{ color: '#6366F1' }} /></div>;

  return (
    <div className="space-y-5">
      <audio ref={audioRef} onEnded={() => setPlaying(false)} onError={() => { setPlaying(false); setRadioLoading(false); }} />

      {/* Live DJ / Prayer / Chat / Podcast (announcements render on /announcements instead) */}
      <DJLive only="not-announcement" />

      {/* Start-a-live-room CTA (hidden when someone else is already live) */}
      <GoLiveCTA />

      {/* Mixtape + podcast archive */}
      <MixtapeArchive />

      {/* DJ Hero */}
      <div className="glass-card p-5 overflow-hidden">
        {track ? (
          <div className="rounded-xl overflow-hidden mb-4 w-full bg-black" style={{ aspectRatio: '16/9' }}>
            <iframe key={track.videoId}
              src={`https://www.youtube.com/embed/${track.videoId}?autoplay=1&modestbranding=1&rel=0`}
              allow="autoplay; encrypted-media; fullscreen" allowFullScreen
              className="w-full h-full border-0" title={track.title} />
          </div>
        ) : (
          <div className="rounded-xl mb-4 w-full flex flex-col items-center justify-center gap-3 py-12"
            style={{ background: accent + '10', border: `1px solid ${accent}25` }}>
            <Music size={36} style={{ color: accent }} />
            <p className="font-semibold text-sm" style={{ color: '#475569' }}>Queue is empty</p>
            <p className="text-xs" style={{ color: '#94A3B8' }}>Add a track below to start the session</p>
          </div>
        )}

        {track && (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-end gap-0.5">
              {['0s','0.1s','0.2s','0.3s'].map((d, i) => <EqBar key={i} color={accent} delay={d} />)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: '#94A3B8' }}>Now Playing</p>
              <p className="font-semibold truncate mt-0.5" style={{ color: '#0F172A' }}>{track.title}</p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                {track.artist || (track.suggestedBy?.name ? `Added by ${track.suggestedBy.name}` : 'Estate DJ Mix')}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 mb-2">
          <button onClick={toggleShuffle} className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{ background: shuffleOn ? accent + '18' : '#F1F5F9', border: `1px solid ${shuffleOn ? accent + '50' : '#E2E8F0'}` }}>
            <Shuffle size={15} style={{ color: shuffleOn ? accent : '#94A3B8' }} />
          </button>
          <button onClick={goBack} className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
            <SkipBack size={17} style={{ color: '#64748B' }} />
          </button>
          <div className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer" style={{ background: accent }} onClick={advance}>
            <Play size={20} className="text-white ml-0.5" />
          </div>
          <button onClick={advance} className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{ background: '#F1F5F9', border: '1px solid #E2E8F0' }}>
            <SkipForward size={17} style={{ color: '#64748B' }} />
          </button>
          <div className="w-9 h-9" />
        </div>
        <p className="text-center text-xs" style={{ color: '#94A3B8' }}>
          {shuffleOn ? '🔀 Shuffle on' : '▶ Sequential'}
        </p>
      </div>

      {/* Your Tracks */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-sm" style={{ color: '#0F172A' }}>Your Tracks</h2>
            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
              {communityTracks.length ? `${communityTracks.length} resident track${communityTracks.length !== 1 ? 's' : ''} · upvote to promote` : 'Add a track to jump the queue'}
            </p>
          </div>
          <button onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{ background: showAdd ? 'rgba(99,102,241,0.10)' : 'transparent', border: '1px solid rgba(99,102,241,0.30)', color: '#6366F1' }}>
            <Plus size={12} /> {showAdd ? 'Cancel' : 'Add Track'}
          </button>
        </div>

        {showAdd && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <Link size={14} style={{ color: '#CBD5E1' }} className="flex-shrink-0" />
              <input value={linkInput} onChange={e => setLinkInput(e.target.value)} placeholder="YouTube link or video ID"
                className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#0F172A' }} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <Music size={14} style={{ color: '#CBD5E1' }} className="flex-shrink-0" />
              <input value={titleInput} onChange={e => setTitleInput(e.target.value)} placeholder="Track title"
                className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#0F172A' }} />
            </div>
            <button onClick={handleAdd} disabled={submitting}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#6366F1' }}>
              {submitting ? <RefreshCw size={14} className="animate-spin" /> : 'Add to Queue'}
            </button>
          </div>
        )}

        {communityTracks.length === 0 && !showAdd ? (
          <div className="py-8 flex flex-col items-center gap-2" style={{ color: '#CBD5E1' }}>
            <Music size={24} />
            <p className="text-sm">Be the first DJ — add a track above</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {communityTracks.map(t => {
              const globalIdx = queue.indexOf(t);
              const active    = globalIdx === queueIdx;
              const hasVoted  = t.votes?.some(v => (v._id || v)?.toString() === userId?.toString());
              const isOwn     = (t.suggestedBy?._id || t.suggestedBy)?.toString() === userId?.toString();
              return (
                <div key={t._id} className="flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer transition-all"
                  style={active ? { background: 'rgba(99,102,241,0.08)' } : {}}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'rgba(99,102,241,0.08)' : 'transparent'; }}
                  onClick={() => setQueueIdx(globalIdx)}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: active ? '#6366F1' : '#F1F5F9', color: active ? '#fff' : '#94A3B8' }}>
                    {globalIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: active ? '#6366F1' : '#0F172A' }}>{t.title}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>
                      {t.suggestedBy?.name ? `Added by ${t.suggestedBy.name}` : 'Resident'}
                    </p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleVote(t._id); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all flex-shrink-0"
                    style={{ background: hasVoted ? 'rgba(99,102,241,0.12)' : '#F1F5F9', color: hasVoted ? '#6366F1' : '#94A3B8' }}>
                    <Heart size={11} fill={hasVoted ? '#6366F1' : 'none'} strokeWidth={hasVoted ? 0 : 2} />
                    {t.votes?.length || 0}
                  </button>
                  {isOwn && (
                    <button onClick={e => { e.stopPropagation(); handleRemove(t._id); }}
                      className="p-1 transition-colors flex-shrink-0" style={{ color: '#CBD5E1' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DJ Playlist */}
      {defaultTracks.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-sm" style={{ color: '#0F172A' }}>DJ Playlist</h2>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                {visibleDefaults.length} of {defaultTracks.length} tracks · tap to play
              </p>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ background: 'rgba(99,102,241,0.10)', color: '#6366F1' }}>
              <Music size={11} /> Auto
            </div>
          </div>
          <div className="space-y-0.5">
            {visibleDefaults.map(t => {
              const globalIdx = queue.indexOf(t);
              const active    = globalIdx === queueIdx;
              const hasVoted  = t.votes?.some(v => (v._id || v)?.toString() === userId?.toString());
              return (
                <div key={t._id} className="flex items-center gap-3 px-2 py-2 rounded-xl cursor-pointer transition-all"
                  style={active ? { background: 'rgba(99,102,241,0.08)' } : {}}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = active ? 'rgba(99,102,241,0.08)' : 'transparent'; }}
                  onClick={() => setQueueIdx(globalIdx)}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: active ? '#6366F1' : '#F1F5F9', color: active ? '#fff' : '#94A3B8' }}>
                    {globalIdx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: active ? '#6366F1' : '#0F172A' }}>{t.title}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: '#94A3B8' }}>{t.artist || 'Estate DJ Mix'}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleVote(t._id); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all flex-shrink-0"
                    style={{ background: hasVoted ? 'rgba(99,102,241,0.12)' : '#F1F5F9', color: hasVoted ? '#6366F1' : '#94A3B8' }}>
                    <Heart size={11} fill={hasVoted ? '#6366F1' : 'none'} strokeWidth={hasVoted ? 0 : 2} />
                    {t.votes?.length || 0}
                  </button>
                </div>
              );
            })}
          </div>
          {hasMoreDefaults && (
            <button onClick={() => setDefaultsPage(p => p + 1)}
              className="w-full mt-3 py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
              style={{ border: '1px solid rgba(99,102,241,0.22)', color: '#6366F1' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <ChevronDown size={15} /> Load more tracks
            </button>
          )}
        </div>
      )}

      {/* Radio */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Radio size={14} className="text-indigo-500" />
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Radio Station</h2>
        </div>
        <div className="flex items-center gap-4 mb-4 p-4 rounded-xl"
          style={{ background: station.color + '0F', border: `1px solid ${station.color}28` }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: station.color + '18' }}>
            {station.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate" style={{ color: '#0F172A' }}>{station.name}</div>
            <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{station.genre}</div>
            {playing && (
              <div className="flex items-end gap-0.5 mt-1.5">
                {['0s','0.1s','0.2s','0.3s','0.4s'].map((d, i) => <EqBar key={i} color={station.color} delay={d} />)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="p-2 transition-colors" style={{ color: '#94A3B8' }}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button onClick={togglePlay} disabled={radioLoading}
              className="w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all hover:scale-105 active:scale-95"
              style={{ background: station.color }}>
              {radioLoading ? <RefreshCw size={15} className="animate-spin text-white" />
                : playing ? <Pause size={15} className="text-white" /> : <Play size={15} className="text-white" />}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <Volume2 size={12} style={{ color: '#CBD5E1' }} className="flex-shrink-0" />
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e => handleVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 appearance-none rounded-full cursor-pointer"
            style={{ background: `linear-gradient(to right, ${station.color} ${volume * 100}%, #E2E8F0 ${volume * 100}%)` }} />
          <Volume2 size={16} style={{ color: '#94A3B8' }} className="flex-shrink-0" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {STATIONS.map(st => (
            <button key={st.name} onClick={() => selectStation(st)}
              className="p-3 rounded-xl text-left transition-all border"
              style={station.name === st.name
                ? { background: st.color + '12', borderColor: st.color + '40' }
                : { background: '#F8FAFC', borderColor: '#E2E8F0' }}>
              <div className="text-base mb-1">{st.emoji}</div>
              <div className="text-xs font-semibold truncate" style={{ color: '#0F172A' }}>{st.name}</div>
              <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{st.genre}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tabs config ───────────────────────────────────────────────────
const TABS = [
  { key: 'feed',       Icon: Activity,  label: 'Feed',       color: '#6366F1' },
  { key: 'events',     Icon: Calendar,  label: 'Events',     color: '#0EA5E9' },
  { key: 'activities', Icon: Zap,       label: 'Activities', color: '#8B5CF6' },
  { key: 'polls',      Icon: BarChart2, label: 'Polls',      color: '#10B981' },
  { key: 'music',      Icon: Music,     label: 'Music',      color: '#EC4899' },
];

// ── Friday countdown ──────────────────────────────────────────────
function getNextFriday() {
  const now = new Date();
  const daysUntil = ((5 - now.getDay() + 7) % 7) || 7;
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntil);
  next.setHours(18, 0, 0, 0);
  return next;
}

function useCountdown(target) {
  const [diff, setDiff] = useState(target - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const totalSec = Math.max(0, Math.floor(diff / 1000));
  return {
    d: Math.floor(totalSec / 86400),
    h: Math.floor((totalSec % 86400) / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

// ── Main Lounge ───────────────────────────────────────────────────
// Social hub: Instagram-style live feed (components/lounge) + events,
// activities, polls and music. Mobile-first: compact sticky header, sticky
// tab strip, edge-to-edge feed.
export default function Lounge() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('feed');

  const now           = new Date();
  const isFriday      = now.getDay() === 5;
  const isFridayNight = isFriday && now.getHours() >= 18;
  const countdown     = useCountdown(getNextFriday().getTime());
  const pad           = n => String(n).padStart(2, '0');
  const isDesktop     = useIsDesktop();
  const shellRef      = useRef(null);
  const centreRef     = useRef(null);
  const shellHeight   = useFillHeight(shellRef, isDesktop);
  const switchTab     = (key) => { setActiveTab(key); centreRef.current?.scrollTo({ top: 0 }); };

  // Desktop: banner + side rails stay put; only the centre column scrolls.
  if (isDesktop) return (
    <div ref={shellRef} className="max-w-[1400px] mx-auto flex flex-col gap-5 overflow-hidden"
      style={{ height: shellHeight ?? 'calc(100vh - 4rem)' }}>
      <div className="flex-none">
        <LoungeBanner isFridayNight={isFridayNight} countdown={countdown} name={user?.name?.split(' ')[0]} />
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px] gap-6">
        <div className="h-full min-h-0 overflow-y-auto no-scrollbar">
          <LoungeNav tabs={TABS} tab={activeTab} onTab={switchTab} />
        </div>
        <div ref={centreRef} data-lounge-scroll
          className={`h-full min-h-0 min-w-0 overflow-y-auto overscroll-contain pr-1 pb-8 ${activeTab === 'feed' ? '' : 'xl:col-span-2'}`}>
          {activeTab === 'feed'       && <Feed me={user} />}
          {activeTab === 'events'     && <EventsTab userId={user?._id} />}
          {activeTab === 'activities' && <ActivitiesTab />}
          {activeTab === 'polls'      && <PollsTab userId={user?._id} />}
          {activeTab === 'music'      && <MusicTab userId={user?._id} />}
        </div>
        {activeTab === 'feed' && (
          <div className="hidden xl:block h-full min-h-0 overflow-y-auto no-scrollbar pb-2">
            <LoungeRightRail onTab={switchTab} catMap={catMap} userId={user?._id} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in pb-12 -mt-4 md:-mt-6 lg:-mt-8">
      {/* Sticky header + tabs */}
      {/* Sticky offsets cancel <main>'s padding: sticky elements stop at the
          scroll container's padding edge, which left a see-through strip on top. */}
      <div className="sticky -top-4 md:-top-6 lg:-top-8 z-30 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pt-3 pb-2 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 max-w-[960px] mx-auto">
          <h1 className="text-[26px] font-black tracking-tight leading-none"
            style={{ background: 'linear-gradient(90deg,#6366F1,#4F46E5)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            Lounge
          </h1>
          {isFridayNight ? (
            <span className="px-3 py-1.5 rounded-full text-[11px] font-bold text-white animate-pulse"
              style={{ background: 'linear-gradient(90deg,#F59E0B,#EF4444)' }}>
              🎉 Friday Night is LIVE
            </span>
          ) : (
            <span className="px-3 py-1.5 rounded-full text-[11px] font-semibold text-slate-600 bg-slate-100 tabular-nums" title="Friday Night FunTimes">
              🎉 Fri night in {countdown.d > 0 ? `${countdown.d}d ` : ''}{pad(countdown.h)}:{pad(countdown.m)}:{pad(countdown.s)}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-3 max-w-[960px] mx-auto">
          {TABS.map(({ key, Icon, label }) => {
            const active = activeTab === key;
            return (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all shrink-0 ${active ? 'text-white shadow-sm' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
                style={active ? { background: 'linear-gradient(90deg,#6366F1,#4F46E5)' } : undefined}>
                <Icon size={15} /> {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="pt-4">
        {activeTab === 'feed'       && <Feed me={user} />}
        {activeTab === 'events'     && <div className="max-w-[960px] mx-auto"><EventsTab userId={user?._id} /></div>}
        {activeTab === 'activities' && <div className="max-w-[960px] mx-auto"><ActivitiesTab /></div>}
        {activeTab === 'polls'      && <div className="max-w-[960px] mx-auto"><PollsTab userId={user?._id} /></div>}
        {activeTab === 'music'      && <div className="max-w-[960px] mx-auto"><MusicTab userId={user?._id} /></div>}
      </div>
    </div>
  );
}
