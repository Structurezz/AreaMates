import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, X, ShoppingBag, ShieldCheck, SlidersHorizontal, Ban, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { marketplaceAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import Portal, { Z, useScrollLock } from '../components/ui/Portal';
import ListingCard from '../components/market/ListingCard';
import ListingDetail from '../components/market/ListingDetail';
import ChatPanel from '../components/market/ChatPanel';
import { SellSheet, ReportSheet, RateSheet } from '../components/market/Sheets';
import { BuySheet, OrderCard, DisputeSheet, CancelSheet } from '../components/market/Orders';
import { WalletCard, WalletSheet, WithdrawSheet } from '../components/market/Wallet';
import BankSheet from '../components/market/BankSheet';
import { useCall } from '../context/CallContext';
import { CAT, CATEGORIES, STATUS, naira } from '../components/market/shared';
import { imgUrl } from '../components/lounge/shared';
import ProductCard from '../components/market/desktop/ProductCard';
import useIsDesktop from '../hooks/useIsDesktop';
import { Receipt, Store, Heart, LayoutGrid } from 'lucide-react';

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'popular', label: 'Most viewed' },
];
const TABS = [{ id: 'browse', label: 'Browse' }, { id: 'orders', label: 'Orders' }, { id: 'mine', label: 'Selling' }, { id: 'saved', label: 'Saved' }];

function ChatOverlay({ chat, me, onClose }) {
  useScrollLock(true);
  return (
    <Portal>
      <div className={`fixed inset-0 ${Z.drawer} flex justify-end`}>
        <div className="overlay-backdrop hidden sm:block" onClick={onClose} aria-hidden="true" />
        <div className="relative w-full sm:w-96 h-full shadow-2xl animate-fade-in">
          <ChatPanel seller={chat.seller} listing={chat.listing} currentUser={me} onClose={onClose} />
        </div>
      </div>
    </Portal>
  );
}

// Row for "My listings": status and management's reason are what matter here.
function MyRow({ l, onOpen }) {
  const st = STATUS[l.status] || STATUS.active;
  return (
    <button onClick={() => onOpen(l)} className="w-full flex gap-3 items-center p-3 rounded-2xl bg-white border border-slate-200 text-left active:bg-slate-50">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center text-2xl">
        {l.images?.[0] ? <img src={imgUrl(l.images[0])} alt="" className="w-full h-full object-cover" /> : CAT[l.category]?.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
          <span className="text-[11px] text-slate-400">{l.views || 0} views · {(l.savedBy || []).length} saves</span>
        </div>
        <p className="text-sm font-semibold text-slate-900 truncate mt-1">{l.title}</p>
        <p className="text-sm font-bold text-slate-700">{naira(l.price)}</p>
        {['rejected', 'removed'].includes(l.status) && l.moderation?.reason && (
          <p className="text-xs text-red-600 truncate">{l.moderation.reason}</p>
        )}
        {l.status === 'pending_approval' && <p className="text-xs text-amber-700 truncate">Waiting for estate management</p>}
      </div>
      <ChevronRight size={18} className="text-slate-300 shrink-0" />
    </button>
  );
}

export default function Marketplace() {
  const { user } = useAuth();
  const [tab, setTab] = useState('browse');
  const [listings, setListings] = useState([]);
  const [mine, setMine] = useState([]);
  const [saved, setSaved] = useState([]);
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState('newest');
  const [showSort, setShowSort] = useState(false);

  const [open, setOpen] = useState(null);
  const [chat, setChat] = useState(null);
  const [sell, setSell] = useState(null); // null | 'new' | listing (editing)
  const [reportFor, setReportFor] = useState(null);
  const [rateFor, setRateFor] = useState(null);
  // Buying & selling money flow
  const [buyFor, setBuyFor] = useState(null);
  const [orders, setOrders] = useState(null);      // my purchases
  const [sales, setSales] = useState(null);        // orders for my listings
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [sheet, setSheet] = useState(null);        // 'wallet' | 'withdraw' | 'bank'
  const [disputeFor, setDisputeFor] = useState(null);
  const [cancelFor, setCancelFor] = useState(null);
  const [params, setParams] = useSearchParams();
  const { startCall } = useCall() || {};
  const isDesktop = useIsDesktop();

  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);

  const loadBrowse = useCallback(() => {
    setLoading(true);
    marketplaceAPI.getAll({ category: cat || undefined, q: debounced || undefined, sort, limit: 60 })
      .then(({ data }) => setListings(data.data || []))
      .catch(() => toast.error('Couldn\'t load the marketplace'))
      .finally(() => setLoading(false));
  }, [cat, debounced, sort]);
  const loadMine = useCallback(() => marketplaceAPI.mine().then(({ data }) => setMine(data.data || [])).catch(() => {}), []);
  const loadSaved = useCallback(() => marketplaceAPI.saved().then(({ data }) => setSaved(data.data || [])).catch(() => {}), []);

  const loadOrders = useCallback(() => marketplaceAPI.orders('buyer').then(({ data }) => setOrders(data.data || [])).catch(() => setOrders((o) => o || [])), []);
  const loadSales = useCallback(() => marketplaceAPI.orders('seller').then(({ data }) => setSales(data.data || [])).catch(() => setSales((o) => o || [])), []);
  const loadWallet = useCallback(() => {
    setWalletLoading(true);
    return marketplaceAPI.wallet().then(({ data }) => setWallet(data.data)).catch(() => {}).finally(() => setWalletLoading(false));
  }, []);

  useEffect(() => { loadBrowse(); }, [loadBrowse]);
  useEffect(() => { loadOrders(); loadSales(); }, [loadOrders, loadSales]);
  useEffect(() => { if (tab === 'orders') loadOrders(); if (tab === 'mine') { loadSales(); loadWallet(); } }, [tab, loadOrders, loadSales, loadWallet]);

  // Back from Paystack: /marketplace?order=MKT-…
  useEffect(() => {
    const ref = params.get('order');
    if (!ref) return;
    setParams({}, { replace: true });
    setTab('orders');
    const t = toast.loading('Confirming your payment…');
    marketplaceAPI.verifyOrder(ref)
      .then(({ data }) => {
        const o = data.data;
        if (o.status === 'refunded') toast.error(`Sorry — ${o.refund?.reason || 'the item sold out'}. You've been refunded.`, { id: t, duration: 6000 });
        else toast.success('Payment successful! The seller has been notified.', { id: t, duration: 5000 });
        loadOrders(); loadBrowse();
      })
      .catch((e) => toast.error(e.response?.data?.message || 'We couldn\'t confirm the payment yet', { id: t }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateOrder = (o) => {
    const put = (arr) => arr && arr.map((x) => (x._id === o._id ? { ...x, ...o } : x));
    setOrders(put); setSales(put);
    if (['completed', 'refunded'].includes(o.status)) loadWallet();
  };
  const chatAbout = (person, o) => setChat({ seller: person, listing: { title: o.title } });
  useEffect(() => { marketplaceAPI.rules().then(({ data }) => setRules(data.data)).catch(() => {}); loadMine(); }, [loadMine]);
  useEffect(() => { if (tab === 'saved') loadSaved(); if (tab === 'mine') loadMine(); }, [tab, loadSaved, loadMine]);

  // Keep every list in sync after a change made in a sheet/detail view.
  const applyChange = (l) => {
    const upd = (arr) => (l._deleted ? arr.filter((x) => x._id !== l._id) : arr.map((x) => (x._id === l._id ? { ...x, ...l } : x)));
    setListings((a) => upd(a).filter((x) => x.status === 'active' || x.status === 'sold'));
    setMine(upd);
    setSaved((a) => upd(a).filter((x) => (x.savedBy || []).some((id) => String(id) === String(user?._id))));
  };

  const toggleSave = async (l) => {
    try {
      const { data } = await marketplaceAPI.toggleSave(l._id);
      applyChange({ ...l, savedBy: data.data.savedBy });
      if (data.saved) toast.success('Saved', { icon: '❤️', duration: 1500 });
    } catch { toast.error('Couldn\'t save'); }
  };

  const onSaved = (l) => {
    if (sell === 'new') {
      setMine((m) => [l, ...m]);
      if (l.status === 'active') setListings((a) => [l, ...a]);
      if (l.status !== 'active') setTab('mine');
    } else {
      applyChange(l);
      if (open?._id === l._id) setOpen(null);
    }
  };

  const startSell = () => {
    if (rules?.suspended) return toast.error(`Your marketplace access is suspended${rules.suspended.reason ? `: ${rules.suspended.reason}` : ''}`);
    setSell('new');
  };

  const toFulfil = (sales || []).filter((o) => ['paid', 'disputed'].includes(o.status));
  const pending = mine.filter((l) => ['pending_approval', 'rejected'].includes(l.status)).length + toFulfil.length;
  const toConfirm = (orders || []).filter((o) => o.status === 'delivered').length;
  const shown = tab === 'browse' ? listings : tab === 'saved' ? saved : mine;
  const sortLabel = useMemo(() => SORTS.find((s) => s.id === sort)?.label, [sort]);

  const content = (
      <div className="px-4 md:px-0 mt-3">
        {tab === 'orders' ? (
          orders === null ? <ListSkeleton /> : orders.length === 0 ? (
            <Empty title="No orders yet" body="When you buy from a neighbour, your order and its status show here. Your money is held safely until you confirm delivery." cta="Browse the market" onCta={() => setTab('browse')} />
          ) : (
            <div className="space-y-2.5">
              {orders.map((o) => <OrderCard key={o._id} order={o} as="buyer" onChanged={updateOrder} onChat={chatAbout} onCall={(p) => startCall?.(p)} onDispute={setDisputeFor} />)}
            </div>
          )
        ) : tab === 'mine' ? (
          <div className="space-y-5">
            <WalletCard wallet={wallet} loading={walletLoading} onOpen={() => setSheet('wallet')} onWithdraw={() => setSheet('withdraw')} />
            {toFulfil.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-slate-900 mb-2">Orders to handle <span className="text-amber-600">({toFulfil.length})</span></h2>
                <div className="space-y-2.5">{toFulfil.map((o) => <OrderCard key={o._id} order={o} as="seller" onChanged={updateOrder} onChat={chatAbout} onCall={(p) => startCall?.(p)} onCancel={setCancelFor} />)}</div>
              </section>
            )}
            {(sales || []).some((o) => o.status === 'delivered') && (
              <section>
                <h2 className="text-sm font-bold text-slate-900 mb-2">Waiting for buyers to confirm</h2>
                <div className="space-y-2.5">{sales.filter((o) => o.status === 'delivered').map((o) => <OrderCard key={o._id} order={o} as="seller" onChanged={updateOrder} onChat={chatAbout} onCall={(p) => startCall?.(p)} onCancel={setCancelFor} />)}</div>
              </section>
            )}
            <section>
              <h2 className="text-sm font-bold text-slate-900 mb-2">Your listings</h2>
              {mine.length === 0
                ? <Empty title="You're not selling anything yet" body="Home-cooked food, a service you offer, things you no longer need. List it and get paid straight into your wallet." cta="Sell something" onCta={startSell} />
                : <div className="space-y-2.5">{mine.map((l) => <MyRow key={l._id} l={l} onOpen={setOpen} />)}</div>}
            </section>
          </div>
        ) : loading && tab === 'browse' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i}><div className="aspect-square rounded-2xl bg-slate-200/70 animate-pulse" /><div className="h-4 w-16 bg-slate-200/70 rounded mt-2 animate-pulse" /><div className="h-3 w-28 bg-slate-200/60 rounded mt-1.5 animate-pulse" /></div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          tab === 'saved'
            ? <Empty title="Nothing saved yet" body="Tap the ♥ on a listing to keep it here." />
            : <Empty title={q ? `No results for "${q}"` : 'No listings yet'} body={q || cat ? 'Try another search or category.' : 'Be the first to sell something in your estate.'} cta={!q && !cat ? 'Sell something' : null} onCta={startSell} />
        ) : (
          isDesktop ? (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {shown.map((l, i) => (
                <ProductCard key={l._id} i={i} listing={l} me={user} onOpen={setOpen} onToggleSave={toggleSave}
                  onChat={(x) => setChat({ seller: x.sellerId, listing: x })} onBuy={setBuyFor} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-5">
              {shown.map((l) => <ListingCard key={l._id} listing={l} me={user} onOpen={setOpen} onToggleSave={toggleSave} />)}
            </div>
          )
        )}
      </div>
  );
  const overlays = (
    <>
      {open && (
        <ListingDetail
          listing={open} me={user}
          onClose={() => setOpen(null)}
          onChat={(l) => setChat({ seller: l.sellerId, listing: l })}
          onChanged={applyChange}
          onEdit={(l) => setSell(l)}
          onReport={(l, done) => setReportFor({ ...l, done })}
          onRate={(l, done) => setRateFor({ ...l, done })}
          onBuy={(l) => setBuyFor(l)}
        />
      )}
      {chat && <ChatOverlay chat={chat} me={user} onClose={() => setChat(null)} />}
      <SellSheet open={!!sell} editing={sell && sell !== 'new' ? sell : null} rules={rules} onClose={() => setSell(null)} onSaved={onSaved} />
      <ReportSheet listing={reportFor} onClose={() => setReportFor(null)} onDone={() => reportFor?.done?.()} />
      <BuySheet listing={buyFor} onClose={() => setBuyFor(null)} />
      <DisputeSheet order={disputeFor} onClose={() => setDisputeFor(null)} onDone={updateOrder} />
      <CancelSheet order={cancelFor} onClose={() => setCancelFor(null)} onDone={updateOrder} />
      <WalletSheet open={sheet === 'wallet'} wallet={wallet} onClose={() => setSheet(null)} onWithdraw={() => setSheet('withdraw')} onBank={() => setSheet('bank')} />
      <WithdrawSheet open={sheet === 'withdraw'} wallet={wallet} onClose={() => setSheet(null)} onDone={loadWallet} onBank={() => setSheet('bank')} />
      <BankSheet open={sheet === 'bank'} currentBank={wallet?.bank} onClose={() => setSheet(null)} onSaved={() => { loadWallet(); setSheet('withdraw'); }} />
      <RateSheet listing={rateFor} onClose={() => setRateFor(null)} onDone={(r, rev) => rateFor?.done?.(r, rev)} />
    </>
  );

  if (isDesktop) {
    const SECTIONS = [
      { id: 'browse', label: 'Browse',  icon: LayoutGrid, hint: 'Everything your neighbours are selling' },
      { id: 'orders', label: 'Orders',  icon: Receipt,    hint: 'What you bought and its status', badge: toConfirm },
      { id: 'mine',   label: 'Selling', icon: Store,      hint: 'Your listings, sales and wallet', badge: pending },
      { id: 'saved',  label: 'Saved',   icon: Heart,      hint: 'Listings you liked' },
    ];
    return (
      <div className="max-w-[1400px] mx-auto space-y-5 pb-10">
        {/* ── Banner ── */}
        <div className="dash-rise relative overflow-hidden rounded-2xl px-6 py-5"
          style={{ background: 'linear-gradient(120deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)', boxShadow: '0 16px 32px -18px rgba(49,46,129,0.8)' }}>
          <div className="dash-blob absolute -top-20 right-72 w-56 h-56 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(129,140,248,0.35)' }} />
          <div className="relative flex items-center gap-6">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 border border-white/15 flex-shrink-0"><ShoppingBag size={22} className="text-indigo-200" /></div>
              <div className="min-w-0">
                <h1 className="text-[22px] font-semibold text-white" style={{ letterSpacing: '-0.025em' }}>Marketplace</h1>
                <p className="text-[13px] text-indigo-100/75 flex items-center gap-1.5"><ShieldCheck size={13} /> Neighbours only · protected by estate management</p>
              </div>
            </div>
            <div className="relative flex-1 max-w-xl ml-auto">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => { setQ(e.target.value); setTab('browse'); }} placeholder="Search food, services, items…"
                className="w-full rounded-xl bg-white text-slate-900 placeholder:text-slate-400 pl-10 pr-10 py-2.5 text-[14px] outline-none shadow-sm focus:ring-4 focus:ring-indigo-300/40" />
              {q && <button onClick={() => setQ('')} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={16} /></button>}
            </div>
            <button onClick={startSell}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-indigo-700 bg-white hover:-translate-y-0.5 transition-all flex-shrink-0"
              style={{ boxShadow: '0 8px 18px -8px rgba(0,0,0,0.35)' }}>
              <Plus size={15} /> Sell something
            </button>
          </div>
        </div>

        {rules?.suspended && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-3 flex gap-2.5 text-[13px] text-red-800">
            <Ban size={16} className="shrink-0 mt-0.5" />
            <div><p className="font-semibold">You can't list items right now</p><p>{rules.suspended.reason}{rules.suspended.until ? ` · until ${new Date(rules.suspended.until).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}</p></div>
          </div>
        )}

        <div className="grid grid-cols-[230px_minmax(0,1fr)] gap-5 items-start">
          {/* ── Rail ── */}
          <aside className="sticky top-0 space-y-4">
            <nav className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-2" style={{ animationDelay: '60ms' }}>
              {SECTIONS.map(({ id, label, icon: Icon, hint, badge }) => {
                const on = tab === id;
                return (
                  <button key={id} onClick={() => setTab(id)}
                    className={`group relative w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${on ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                    {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-indigo-500" />}
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}><Icon size={14} /></span>
                    <span className="flex-1 min-w-0">
                      <span className={`flex items-center justify-between text-[13px] ${on ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {label}
                        {badge > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-amber-400 text-amber-950">{badge}</span>}
                      </span>
                      <span className="block text-[11px] text-slate-400 leading-snug mt-0.5">{hint}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
            {tab === 'browse' && (
              <div className="dash-rise rounded-2xl bg-white border border-slate-200/70 p-2" style={{ animationDelay: '120ms' }}>
                <div className="px-2 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Categories</div>
                {[['', 'All', '✨'], ...CATEGORIES.map((c) => [c, CAT[c].label, CAT[c].emoji])].map(([id, label, emoji]) => (
                  <button key={id || 'all'} onClick={() => setCat(id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${cat === id ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <span className="text-[15px]">{emoji}</span>{label}
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* ── Main ── */}
          <div className="min-w-0">
            {tab === 'browse' && (
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] text-slate-500">{loading ? 'Loading…' : `${listings.length} listing${listings.length === 1 ? '' : 's'}${cat ? ` in ${CAT[cat]?.label}` : ''}`}</p>
                <div className="flex p-1 rounded-xl bg-white border border-slate-200">
                  {SORTS.map((o) => (
                    <button key={o.id} onClick={() => setSort(o.id)}
                      className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors ${sort === o.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {content}
          </div>
        </div>
        {overlays}
      </div>
    );
  }

  return (
    <div className="animate-fade-in -mx-4 md:mx-0 -mt-4 md:mt-0 pb-10">
      {/* Hero */}
      <div className="px-4 md:px-6 pt-5 pb-4 md:rounded-3xl text-white" style={{ background: 'linear-gradient(135deg,#4F46E5 0%,#6366F1 55%,#7C3AED 100%)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight flex items-center gap-2"><ShoppingBag size={21} /> Marketplace</h1>
            <p className="text-[13px] text-indigo-100 mt-0.5 flex items-center gap-1"><ShieldCheck size={13} /> Neighbours only · protected by estate management</p>
          </div>
          <button onClick={startSell} className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white text-indigo-700 font-bold text-sm px-4 py-2 shadow active:scale-95 transition-transform">
            <Plus size={16} /> Sell
          </button>
        </div>
        <div className="relative mt-4">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setTab('browse'); }} placeholder="Search food, services, items…"
            className="w-full rounded-2xl bg-white text-slate-900 placeholder:text-slate-400 pl-10 pr-10 py-3 text-[15px] outline-none shadow-sm" />
          {q && <button onClick={() => setQ('')} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={16} /></button>}
        </div>
        <div className="flex gap-1 mt-3 bg-white/15 rounded-xl p-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-1.5 rounded-lg text-[13px] font-semibold transition-colors relative ${tab === t.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-white/90'}`}>
              {t.label}
              {t.id === 'orders' && toConfirm > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold px-1">{toConfirm}</span>}
              {t.id === 'mine' && pending > 0 && <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-400 text-amber-950 text-[10px] font-bold px-1">{pending}</span>}
            </button>
          ))}
        </div>
      </div>

      {rules?.suspended && (
        <div className="mx-4 md:mx-0 mt-3 rounded-2xl bg-red-50 border border-red-200 p-3 flex gap-2.5 text-sm text-red-800">
          <Ban size={17} className="shrink-0 mt-0.5" />
          <div><p className="font-semibold">You can't list items right now</p><p>{rules.suspended.reason}{rules.suspended.until ? ` · until ${new Date(rules.suspended.until).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}</p></div>
        </div>
      )}

      {tab === 'browse' && (
        <div className="sticky -top-4 md:-top-6 lg:-top-8 z-10 bg-[#F8FAFC]/95 backdrop-blur pt-3 pb-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 md:px-0">
            {[['', 'All', '✨'], ...CATEGORIES.map((c) => [c, CAT[c].label, CAT[c].emoji])].map(([id, label, emoji]) => (
              <button key={id || 'all'} onClick={() => setCat(id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-colors ${cat === id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>
                <span>{emoji}</span>{label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between px-4 md:px-0 mt-2.5">
            <p className="text-[13px] text-slate-500">{loading ? 'Loading…' : `${listings.length} listing${listings.length === 1 ? '' : 's'}`}</p>
            <div className="relative">
              <button onClick={() => setShowSort((s) => !s)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                <SlidersHorizontal size={14} /> {sortLabel}
              </button>
              {showSort && (
                <div className="absolute right-0 top-7 z-20 w-48 rounded-xl bg-white shadow-xl border border-slate-100 overflow-hidden">
                  {SORTS.map((s) => (
                    <button key={s.id} onClick={() => { setSort(s.id); setShowSort(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm ${sort === s.id ? 'text-indigo-700 font-semibold bg-indigo-50' : 'text-slate-700'}`}>{s.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {content}

      {/* Floating Sell button (mobile) */}
      <button onClick={startSell} aria-label="Sell something"
        className={`${tab === 'orders' ? 'hidden' : 'sm:hidden'} fixed right-4 z-30 inline-flex items-center gap-2 rounded-full text-white font-bold px-5 py-3.5 shadow-lg shadow-indigo-600/30 active:scale-95 transition-transform`}
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))', background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
        <Plus size={19} strokeWidth={2.6} /> Sell
      </button>

      {overlays}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl bg-white border border-slate-200 p-3.5 flex gap-3 animate-pulse">
          <div className="w-14 h-14 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2 py-1"><div className="h-3 w-24 bg-slate-200 rounded" /><div className="h-4 w-3/4 bg-slate-200 rounded" /><div className="h-3 w-1/2 bg-slate-100 rounded" /></div>
        </div>
      ))}
    </div>
  );
}

function Empty({ title, body, cta, onCta }) {
  return (
    <div className="text-center py-14 px-6">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 flex items-center justify-center mb-4"><ShoppingBag size={28} className="text-indigo-500" /></div>
      <p className="font-bold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">{body}</p>
      {cta && <button onClick={onCta} className="mt-5 inline-flex items-center gap-1.5 rounded-full text-white font-semibold text-sm px-5 py-2.5" style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}><Plus size={16} /> {cta}</button>}
    </div>
  );
}

