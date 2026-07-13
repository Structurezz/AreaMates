import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { campaignAPI } from '../../api';

export default function CampaignModal() {
  const [campaign, setCampaign] = useState(null);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await campaignAPI.getActive('modal');
        const list = res.data?.data || [];
        const first = list.find((c) => !c._viewer?.seen) || list[0];
        if (!cancelled && first) {
          setCampaign(first);
          setVisible(true);
          campaignAPI.markSeen(first._id).catch(() => {});
        }
      } catch {
        // silent
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!visible || !campaign) return null;

  const c = campaign.content || {};
  const theme = c.theme || {};
  const bg = theme.backgroundColor || '#0F172A';
  const primary = theme.primaryColor || '#EC4899';
  const accent = theme.accentColor || '#F472B6';
  const text = theme.textColor || '#FFFFFF';

  const close = () => {
    setVisible(false);
    campaignAPI.dismiss(campaign._id).catch(() => {});
  };

  const cta = () => {
    campaignAPI.click(campaign._id).catch(() => {});
    campaignAPI.dismiss(campaign._id).catch(() => {});
    setVisible(false);
    if (!c.ctaUrl) return;
    if (c.ctaUrl.startsWith('http')) {
      window.open(c.ctaUrl, '_blank', 'noreferrer');
    } else {
      navigate(c.ctaUrl);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 16, backdropFilter: 'blur(6px)',
      }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, background: bg, color: text,
          borderRadius: 20, overflow: 'hidden', position: 'relative',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{
          position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%',
          background: `radial-gradient(circle, ${primary}55 0%, transparent 70%)`, pointerEvents: 'none',
        }} />

        <button
          onClick={close}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', color: text,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2,
          }}
        >
          <X size={16} />
        </button>

        <div style={{ padding: 32, position: 'relative' }}>
          {c.badge && (
            <span style={{
              display: 'inline-block',
              fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: primary, background: `${primary}22`,
              padding: '5px 12px', borderRadius: 6, marginBottom: 16,
            }}>{c.badge}</span>
          )}

          {c.imageUrl && (
            <div style={{ marginBottom: 20, borderRadius: 14, overflow: 'hidden' }}>
              <img src={c.imageUrl} alt="" style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover' }} />
            </div>
          )}

          <h2 style={{
            fontSize: 28, fontWeight: 800, lineHeight: 1.1,
            letterSpacing: '-0.03em', marginBottom: 10,
          }}>{c.headline}</h2>

          {c.subheadline && (
            <p style={{ fontSize: 15, opacity: 0.8, marginBottom: 18 }}>{c.subheadline}</p>
          )}

          {c.body && (
            <p style={{
              fontSize: 14, opacity: 0.75, lineHeight: 1.65, marginBottom: 26, whiteSpace: 'pre-wrap',
            }}>{c.body}</p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            {c.ctaText && (
              <button
                onClick={cta}
                style={{
                  flex: 1, padding: '14px 22px', border: 'none',
                  background: `linear-gradient(135deg, ${primary}, ${accent})`,
                  color: text, fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em',
                  borderRadius: 12, cursor: 'pointer',
                }}
              >
                {c.ctaText}
              </button>
            )}
            <button
              onClick={close}
              style={{
                padding: '14px 20px', border: 'none', background: 'rgba(255,255,255,0.08)',
                color: text, fontWeight: 600, fontSize: 14, borderRadius: 12, cursor: 'pointer',
              }}
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
