// Nkechi — the estate's AI neighbour — drawn as a small illustrated mascot
// (gele headwrap, gold earrings, a 🌸 on the wrap) plus the chat sticker packs.

let uid = 0;

export function NkechiMascot({ size = 40, wave = false, bob = false, ring = true }) {
  const id = `nk${++uid}`;
  return (
    <span className={`relative inline-block flex-shrink-0 ${bob ? 'nk-bob' : ''}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-label="Nkechi">
        <defs>
          <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF3C7" /><stop offset="100%" stopColor="#FCE7F3" />
          </linearGradient>
          <linearGradient id={`${id}gele`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F97316" /><stop offset="55%" stopColor="#EC4899" /><stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          <linearGradient id={`${id}dress`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10B981" /><stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
          <clipPath id={`${id}clip`}><circle cx="60" cy="60" r="58" /></clipPath>
        </defs>
        {ring && <circle cx="60" cy="60" r="58" fill={`url(#${id}bg)`} />}
        <g clipPath={`url(#${id}clip)`}>
          {/* shoulders + dress */}
          <path d="M18 120 C22 92 40 86 60 86 C80 86 98 92 102 120 Z" fill={`url(#${id}dress)`} />
          <path d="M44 88 L60 104 L76 88" fill="none" stroke="#FDE68A" strokeWidth="3" strokeLinecap="round" />
          {/* neck */}
          <rect x="52" y="74" width="16" height="14" rx="6" fill="#7C4A21" />
          {/* face */}
          <ellipse cx="60" cy="62" rx="21" ry="23" fill="#8D5524" />
          {/* earrings */}
          <circle cx="38.5" cy="70" r="3.2" fill="#FBBF24" />
          <circle cx="81.5" cy="70" r="3.2" fill="#FBBF24" />
          {/* eyes */}
          <g className="nk-blink">
            <ellipse cx="51.5" cy="61" rx="2.8" ry="3.4" fill="#1F2937" />
            <ellipse cx="68.5" cy="61" rx="2.8" ry="3.4" fill="#1F2937" />
            <circle cx="52.4" cy="59.8" r="0.9" fill="#fff" />
            <circle cx="69.4" cy="59.8" r="0.9" fill="#fff" />
          </g>
          {/* brows */}
          <path d="M47 55 Q51.5 52.5 56 54.5" stroke="#3B2314" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M64 54.5 Q68.5 52.5 73 55" stroke="#3B2314" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* blush + smile */}
          <circle cx="46" cy="69" r="3.6" fill="#F472B6" opacity="0.35" />
          <circle cx="74" cy="69" r="3.6" fill="#F472B6" opacity="0.35" />
          <path d="M52 71.5 Q60 79 68 71.5" stroke="#3B1A0B" strokeWidth="2.2" fill="#fff" strokeLinecap="round" strokeLinejoin="round" />
          {/* gele (headwrap) */}
          <path d="M34 50 C30 30 46 18 62 20 C80 20 92 32 86 50 C78 42 70 40 60 40 C50 40 41 43 34 50 Z" fill={`url(#${id}gele)`} />
          <path d="M62 20 C70 8 90 10 96 22 C88 20 80 24 76 30 Z" fill="#F472B6" />
          <path d="M60 22 C50 10 32 12 26 26 C34 23 42 26 46 31 Z" fill="#FB923C" />
          <path d="M40 40 Q60 30 82 40" stroke="#FDE68A" strokeWidth="1.6" fill="none" opacity="0.8" />
          <path d="M44 33 Q62 25 80 33" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.45" />
          {/* flower on the gele */}
          <g transform="translate(80 36)">
            {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-4.2" rx="2.6" ry="4" fill="#FBCFE8" transform={`rotate(${r})`} />)}
            <circle r="2.2" fill="#F59E0B" />
          </g>
        </g>
        {/* waving hand */}
        {wave && (
          <g className="nk-wave" style={{ transformBox: 'fill-box' }}>
            <path d="M92 96 C94 86 98 80 102 78" stroke="#8D5524" strokeWidth="7" strokeLinecap="round" fill="none" />
            <circle cx="103" cy="75" r="7" fill="#8D5524" />
            <path d="M99 69 L98 65 M103 68 L103 63.5 M107 69 L108.5 65" stroke="#8D5524" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}
      </svg>
    </span>
  );
}

/* ── Sticker packs ──────────────────────────────────────────────────── */

export const STICKER_PACKS = [
  {
    id: 'naija', label: 'Naija vibes', icon: '🇳🇬',
    stickers: [
      { id: 'ehn',          emoji: '😳', label: 'Ehn!?',              from: '#FDE68A', to: '#FB923C', tilt: -4 },
      { id: 'oya',          emoji: '👉🏾', label: 'Oya!',               from: '#A7F3D0', to: '#10B981', tilt: 3 },
      { id: 'no-wahala',    emoji: '😎', label: 'No wahala',          from: '#BAE6FD', to: '#3B82F6', tilt: -2 },
      { id: 'chai',         emoji: '🤦🏾‍♀️', label: 'Chai!',             from: '#FBCFE8', to: '#EC4899', tilt: 4 },
      { id: 'well-done',    emoji: '👏🏾', label: 'Well done o!',       from: '#FEF08A', to: '#EAB308', tilt: -3 },
      { id: 'abeg',         emoji: '🙏🏾', label: 'Abeg',               from: '#DDD6FE', to: '#8B5CF6', tilt: 2 },
      { id: 'cant-breathe', emoji: '😂', label: "I can't breathe",    from: '#FED7AA', to: '#F97316', tilt: -5 },
      { id: 'gist-me',      emoji: '👀', label: 'Gist me!',           from: '#E9D5FF', to: '#C026D3', tilt: 3 },
      { id: 'light-is-back',emoji: '💡', label: 'Light don come!',    from: '#FEF9C3', to: '#F59E0B', tilt: -2 },
      { id: 'good-morning', emoji: '☀️', label: 'Good morning estate', from: '#FDE68A', to: '#F97316', tilt: 2 },
      { id: 'happy-friday', emoji: '🎉', label: 'Happy Friday!',      from: '#FBCFE8', to: '#A855F7', tilt: -3 },
      { id: 'welcome',      emoji: '🏡', label: 'Welcome neighbour!', from: '#BBF7D0', to: '#059669', tilt: 3 },
      { id: 'thank-you',    emoji: '💚', label: 'Thank you!',         from: '#A7F3D0', to: '#0D9488', tilt: -2 },
      { id: 'stay-safe',    emoji: '🛡️', label: 'Stay safe o',        from: '#BFDBFE', to: '#2563EB', tilt: 2 },
      { id: 'na-wa',        emoji: '🫨', label: 'Na wa o',            from: '#FECACA', to: '#EF4444', tilt: -4 },
      { id: 'enjoy',        emoji: '🥳', label: 'Enjoy yourself!',    from: '#FDE68A', to: '#EC4899', tilt: 3 },
    ],
  },
  {
    id: 'nkechi', label: 'Nkechi', icon: '🌸',
    stickers: [
      { id: 'nkechi-hi',     nkechi: true, wave: true, label: 'Hello my dear!',       from: '#FEF3C7', to: '#F472B6', tilt: -3 },
      { id: 'nkechi-gist',   nkechi: true, label: 'Tell me everything!',  from: '#FCE7F3', to: '#C026D3', tilt: 3, badge: '👀' },
      { id: 'nkechi-love',   nkechi: true, label: 'I love this estate',   from: '#FEE2E2', to: '#F43F5E', tilt: -2, badge: '💖' },
      { id: 'nkechi-peace',  nkechi: true, label: 'Peace o, peace!',      from: '#DCFCE7', to: '#10B981', tilt: 2, badge: '🕊️' },
      { id: 'nkechi-shock',  nkechi: true, label: 'Ehn?! See life!',      from: '#FFEDD5', to: '#F97316', tilt: -4, badge: '😱' },
      { id: 'nkechi-party',  nkechi: true, wave: true, label: 'Oya, make we party!', from: '#EDE9FE', to: '#8B5CF6', tilt: 3, badge: '🎶' },
    ],
  },
];

const ALL = Object.fromEntries(STICKER_PACKS.flatMap((p) => p.stickers.map((s) => [s.id, s])));
export const stickerById = (id) => ALL[id] || null;

export function Sticker({ id, size = 132, animate = true }) {
  const s = stickerById(id);
  if (!s) return <span className="text-[13px] italic text-slate-400">[sticker]</span>;
  return (
    <div className={`relative select-none sticker-float ${animate ? 'sticker-pop' : ''}`}
      style={{ width: size, '--tilt': `${s.tilt || 0}deg`, transform: `rotate(${s.tilt || 0}deg)` }} title={s.label}>
      <div className="relative mx-auto flex items-center justify-center rounded-[28%]"
        style={{
          width: size * 0.82, height: size * 0.82,
          background: `radial-gradient(circle at 30% 25%, #FFFFFF 0%, ${s.from} 45%, ${s.to} 100%)`,
          boxShadow: `0 12px 24px -12px ${s.to}, inset 0 -6px 0 ${s.to}33`,
          border: '4px solid #fff',
        }}>
        {s.nkechi
          ? <NkechiMascot size={size * 0.66} wave={s.wave} ring={false} />
          : <span style={{ fontSize: size * 0.42, lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.18))' }}>{s.emoji}</span>}
        {s.badge && (
          <span className="absolute -top-2 -right-2 rounded-full bg-white flex items-center justify-center shadow"
            style={{ width: size * 0.26, height: size * 0.26, fontSize: size * 0.15 }}>{s.badge}</span>
        )}
      </div>
      <div className="relative -mt-3 text-center">
        <span className="inline-block px-2.5 py-1 rounded-full bg-white font-extrabold leading-tight"
          style={{ fontSize: Math.max(10, size * 0.1), color: s.to, boxShadow: '0 4px 10px -4px rgba(15,23,42,0.35)', letterSpacing: '-0.01em' }}>
          {s.label}
        </span>
      </div>
    </div>
  );
}
