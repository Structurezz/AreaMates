import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Megaphone } from 'lucide-react';
import { campaignAPI } from '../../api';
import Portal from '../ui/Portal';

// Admin-run campaigns, delivered in three in-app slots:
// modal (once per visit), dashboard_banner and lounge_feed.

const shown = new Set(); // ids already counted as an impression this session

function useCampaign(placement, pickUnseen = false) {
  const [c, setC] = useState(null);
  useEffect(() => {
    let off = false;
    campaignAPI.getActive(placement).then((res) => {
      const list = res.data?.data || [];
      const first = (pickUnseen && list.find((x) => !x._viewer?.seen)) || list[0];
      if (off || !first) return;
      setC(first);
      if (!shown.has(`${placement}:${first._id}`)) {
        shown.add(`${placement}:${first._id}`);
        campaignAPI.markSeen(first._id).catch(() => {});
      }
    }).catch(() => {});
    return () => { off = true; };
  }, [placement, pickUnseen]);
  return [c, setC];
}

function useActions(c, hide) {
  const navigate = useNavigate();
  const dismiss = () => { hide(); campaignAPI.dismiss(c._id).catch(() => {}); };
  const open = () => {
    campaignAPI.click(c._id).catch(() => {});
    hide();
    const url = c.content?.ctaUrl;
    if (!url) return;
    if (/^https?:/.test(url)) window.open(url, '_blank', 'noreferrer'); else navigate(url);
  };
  return { dismiss, open };
}

const themeOf = (c) => {
  const t = c?.content?.theme || {};
  return { primary: t.primaryColor || '#059669', accent: t.accentColor || '#34D399', bg: t.backgroundColor || '#0B1220', text: t.textColor || '#FFFFFF' };
};

export function CampaignModal() {
  const [c, setC] = useCampaign('modal', true);
  const { dismiss, open } = useActions(c || {}, () => setC(null));
  if (!c) return null;
  const k = c.content || {};
  const t = themeOf(c);
  return (
    <Portal>
      <div onClick={dismiss} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, borderRadius: 20, overflow: 'hidden', background: '#fff', boxShadow: '0 24px 60px rgba(15,23,42,0.35)' }}>
          <div style={{ position: 'relative', background: t.bg, color: t.text, padding: '26px 24px 22px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -70, right: -70, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${t.primary}66 0%, transparent 70%)` }} />
            <button onClick={dismiss} aria-label="Close" style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: 99, border: 'none', background: 'rgba(255,255,255,0.12)', color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={15} /></button>
            <div style={{ position: 'relative' }}>
              {k.badge && <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.text, background: `${t.primary}`, padding: '4px 10px', borderRadius: 99, marginBottom: 12 }}>{k.badge}</span>}
              <h2 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', color: t.text, margin: 0 }}>{k.headline}</h2>
              {k.subheadline && <p style={{ fontSize: 14, opacity: 0.8, marginTop: 8 }}>{k.subheadline}</p>}
            </div>
          </div>
          {k.imageUrl && <img src={k.imageUrl} alt="" style={{ width: '100%', maxHeight: 190, objectFit: 'cover', display: 'block' }} />}
          <div style={{ padding: '18px 24px 22px' }}>
            {k.body && <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '0 0 18px' }}>{k.body}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              {k.ctaText && <button onClick={open} style={{ flex: 1, height: 46, border: 'none', borderRadius: 12, cursor: 'pointer', background: `linear-gradient(135deg, ${t.primary}, ${t.accent})`, color: '#fff', fontWeight: 700, fontSize: 14.5, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{k.ctaText} <ArrowRight size={15} /></button>}
              <button onClick={dismiss} style={{ height: 46, padding: '0 18px', borderRadius: 12, cursor: 'pointer', border: '1px solid #E2E8F0', background: '#fff', color: '#475569', fontWeight: 600, fontSize: 14 }}>Not now</button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

export function CampaignBanner({ style }) {
  const [c, setC] = useCampaign('dashboard_banner');
  const { dismiss, open } = useActions(c || {}, () => setC(null));
  if (!c) return null;
  const k = c.content || {};
  const t = themeOf(c);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 44px 14px 16px', borderRadius: 16, background: t.bg, color: t.text, overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', right: -40, top: -60, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${t.primary}55 0%, transparent 70%)`, pointerEvents: 'none' }} />
      {k.imageUrl
        ? <img src={k.imageUrl} alt="" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', flexShrink: 0, position: 'relative' }} />
        : <span style={{ width: 42, height: 42, borderRadius: 12, background: `${t.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}><Megaphone size={19} color="#fff" /></span>}
      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {k.badge && <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.accent, margin: 0 }}>{k.badge}</p>}
        <p style={{ fontSize: 15, fontWeight: 700, margin: 0, color: t.text, lineHeight: 1.3 }}>{k.headline}</p>
        {k.subheadline && <p style={{ fontSize: 12.5, opacity: 0.75, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{k.subheadline}</p>}
      </div>
      {k.ctaText && <button onClick={open} style={{ position: 'relative', flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#fff', color: '#0F172A', fontWeight: 700, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{k.ctaText}<ArrowRight size={13} /></button>}
      <button onClick={dismiss} aria-label="Dismiss" style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 99, border: 'none', background: 'rgba(255,255,255,0.12)', color: t.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={13} /></button>
    </div>
  );
}

export function CampaignFeedCard() {
  const [c, setC] = useCampaign('lounge_feed');
  const { dismiss, open } = useActions(c || {}, () => setC(null));
  if (!c) return null;
  const k = c.content || {};
  const t = themeOf(c);
  return (
    <article className="bg-white sm:rounded-2xl sm:border sm:border-slate-200 overflow-hidden">
      <header className="flex items-center gap-2.5 px-4 py-3">
        <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: t.primary }}><Megaphone size={16} color="#fff" /></span>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-slate-900">AreaConnect</p>
          <p className="text-[11.5px] text-slate-400">Sponsored · from the AreaConnect team</p>
        </div>
        <button onClick={dismiss} aria-label="Hide" className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100"><X size={16} /></button>
      </header>
      {k.imageUrl
        ? <img src={k.imageUrl} alt="" className="w-full max-h-[360px] object-cover" />
        : (
          <div className="relative px-5 py-7 overflow-hidden" style={{ background: t.bg, color: t.text }}>
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${t.primary}66 0%, transparent 70%)` }} />
            {k.badge && <p className="relative text-[10px] font-extrabold tracking-[0.14em] uppercase" style={{ color: t.accent }}>{k.badge}</p>}
            <p className="relative text-[21px] font-extrabold leading-tight tracking-tight mt-1" style={{ color: t.text }}>{k.headline}</p>
          </div>
        )}
      <div className="px-4 py-3">
        {k.imageUrl && <p className="text-[15px] font-bold text-slate-900">{k.headline}</p>}
        {(k.subheadline || k.body) && <p className="text-[13.5px] text-slate-600 mt-0.5 whitespace-pre-wrap line-clamp-4">{k.subheadline || k.body}</p>}
        {k.ctaText && (
          <button onClick={open} className="mt-3 w-full h-10 rounded-xl text-[14px] font-semibold text-white inline-flex items-center justify-center gap-1.5" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }}>
            {k.ctaText} <ArrowRight size={14} />
          </button>
        )}
      </div>
    </article>
  );
}
