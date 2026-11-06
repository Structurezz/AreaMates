import { useEffect, useState } from 'react';
import { CheckCircle, Lock, UserCheck, Package, Radio, Vote, Wallet, Megaphone } from 'lucide-react';

// Shared frame for the login and sign-up pages: phones get a clean light page,
// desktop gets the split screen with the live resident preview. Forms inside
// use the theme-aware `ax-*` classes. (Login.jsx keeps its own desktop frame.)

// Phone: "clean light" — white page, a thin brand strip + soft glow at the
// top, big inputs (16px text so iOS doesn't zoom). Scoped to `.ax-m` so the
// desktop panel (rendered alongside, hidden by CSS) is untouched.
const MOBILE_CSS = `
  .am-input {
    width: 100%; height: 52px; padding: 0 16px; border-radius: 14px;
    background: #fff; border: 1.5px solid #E4E7EC; color: #101828;
    font-size: 16px; outline: none; box-sizing: border-box; -webkit-appearance: none; appearance: none;
    transition: border-color .15s, box-shadow .15s;
  }
  .am-input:focus { border-color: #6366F1; box-shadow: 0 0 0 4px rgba(99,102,241,.16); }
  .am-input::placeholder { color: #98A2B3; }
  .ax-m .ax-title { font-size: 27px; font-weight: 700; letter-spacing: -0.025em; line-height: 1.15; color: #101828; }
  .ax-m .ax-sub { font-size: 15px; line-height: 1.5; color: #475467; }
  .ax-m .ax-label { font-size: 13.5px; font-weight: 600; color: #344054; margin-bottom: 7px; }
  .ax-m .ax-btn { height: 52px; border-radius: 14px; font-size: 16px; background: #4F46E5;
    box-shadow: 0 10px 22px -10px rgba(79,70,229,.65), inset 0 -2px 0 rgba(0,0,0,.1); }
  .ax-m .ax-btn:active:not(:disabled) { transform: scale(.99); }
  .ax-m .ax-error { border-radius: 12px; font-size: 14px; }
  .ax-m .ax-stay { background: #EEF2FF; border: 1px solid #C7D2FE; color: #3730A3; border-radius: 12px; font-size: 14px; }
  @keyframes amRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
`;

const DESKTOP_CSS = `
  @keyframes rlFeedIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
  @keyframes rlFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
  @keyframes rlPing { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.4); opacity: 0; } }
  @keyframes rlRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  .rl-input { width: 100%; height: 44px; padding: 0 14px; border-radius: 10px; border: 1px solid #D0D5DD; background: #fff;
    font-size: 14px; color: #101828; outline: none; transition: border-color .15s, box-shadow .15s; box-shadow: 0 1px 2px rgba(16,24,40,.05); }
  .rl-input:focus { border-color: #6366F1; box-shadow: 0 0 0 4px rgba(99,102,241,.14); }
  .rl-input::placeholder { color: #98A2B3; }
`;

const FORM_CSS = `
  .ax-label { display: block; margin-bottom: 6px; }
  .ax-light .ax-label { font-size: 13px; font-weight: 500; color: #344054; }
  .ax-dark  .ax-label { font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.45); margin-bottom: 8px; }
  .ax-light .ax-title { font-size: 28px; font-weight: 600; letter-spacing: -0.02em; color: #101828; }
  .ax-dark  .ax-title { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; color: #fff; }
  .ax-light .ax-sub { font-size: 14.5px; color: #475467; }
  .ax-dark  .ax-sub { font-size: 13px; color: rgba(255,255,255,.4); }
  .ax-light .ax-strong { color: #101828; }
  .ax-dark  .ax-strong { color: #fff; }
  .ax-light .ax-muted { color: #667085; }
  .ax-dark  .ax-muted { color: rgba(255,255,255,.5); }
  .ax-light .ax-faint { color: #98A2B3; }
  .ax-dark  .ax-faint { color: rgba(255,255,255,.35); }
  .ax-light .ax-link { color: #4F46E5; font-weight: 600; }
  .ax-dark  .ax-link { color: #818CF8; font-weight: 600; }
  .ax-light .ax-panel-soft { background: #F9FAFB; border: 1px solid #EAECF0; }
  .ax-dark  .ax-panel-soft { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.09); }
  .ax-light .ax-error { background: #FEF3F2; border: 1px solid #FECDCA; color: #B42318; }
  .ax-dark  .ax-error { background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.25); color: #FCA5A5; }
  .ax-btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; color: #fff; font-weight: 600;
    transition: background .15s, opacity .15s; }
  .ax-btn:disabled { opacity: .5; cursor: not-allowed; }
  .ax-light .ax-btn { height: 44px; border-radius: 10px; font-size: 14.5px; background: #4F46E5; box-shadow: 0 1px 2px rgba(16,24,40,.05), inset 0 -2px 0 rgba(0,0,0,.1); }
  .ax-light .ax-btn:hover:not(:disabled) { background: #4338CA; }
  .ax-dark  .ax-btn { height: 50px; border-radius: 14px; font-size: 15px; background: linear-gradient(135deg,#6366F1,#4F46E5); box-shadow: 0 6px 24px rgba(99,102,241,.4); }
  .ax-light .ax-seg { background: #F2F4F7; border: 1px solid #EAECF0; }
  .ax-dark  .ax-seg { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09); }
  .ax-light .ax-seg-on { background: #fff; color: #101828; box-shadow: 0 1px 3px rgba(16,24,40,.1); }
  .ax-dark  .ax-seg-on { background: rgba(99,102,241,.25); color: #fff; }
  .ax-light .ax-seg-off { color: #667085; }
  .ax-dark  .ax-seg-off { color: rgba(255,255,255,.5); }
`;

/* ── Phone: clean light page ── */
export function MobileAuthShell({ children }) {
  return (
    <div className="ax-light ax-m min-h-[100dvh] flex flex-col bg-white relative"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
      <style>{FORM_CSS + MOBILE_CSS}</style>

      {/* Decorative: thin brand strip + soft glow, top only (clipped box so nothing scrolls sideways) */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-[240px] overflow-hidden pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'linear-gradient(90deg,#A5B4FC,#6366F1 45%,#4F46E5 75%,#EC4899)' }}/>
        <div className="absolute" style={{ top: -140, right: -90, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.20) 0%, rgba(99,102,241,0) 70%)' }}/>
        <div className="absolute" style={{ top: -110, left: -120, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,.08) 0%, rgba(236,72,153,0) 70%)' }}/>
      </div>

      <header className="relative flex items-center gap-2.5 px-5 pt-5">
        <img src="/icon-192.png" alt="" className="w-8 h-8 rounded-[9px]" style={{ boxShadow: '0 4px 12px -4px rgba(79,70,229,.45)' }}/>
        <div className="leading-tight">
          <div className="text-[16px] font-bold tracking-tight text-[#101828]">Area<span style={{ color: '#4F46E5' }}>Mates</span></div>
          <div className="text-[11px] font-medium text-[#667085]">For residents</div>
        </div>
      </header>

      {/* Only the form block is vertically centred in the space below; the page grows and scrolls when it is taller */}
      <div className="relative flex-1 flex flex-col w-full max-w-[440px] mx-auto px-5 pb-6">
        <div className="flex-1 flex flex-col justify-center py-8">
          <main style={{ animation: 'amRise .5s cubic-bezier(.22,1,.36,1) both' }}>
            {children}
          </main>
        </div>

        <p className="mt-8 text-center text-[11px] text-[#98A2B3] tracking-[0.02em]">
          Powered by <span className="font-semibold text-[#667085]">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
        </p>
      </div>
    </div>
  );
}

/* ── Desktop: split screen with a live resident preview ── */
const FEED = [
  { icon: UserCheck, tone: '#34D399', title: 'Your visitor has arrived',  sub: 'Ada Obi · checked in at Gate A' },
  { icon: Package,   tone: '#FBBF24', title: 'Package at the gate',       sub: 'Jumia delivery · held by Guard Musa' },
  { icon: Radio,     tone: '#F472B6', title: 'Lounge is live',            sub: 'Friday night podcast · 23 listening' },
  { icon: Vote,      tone: '#60A5FA', title: 'New estate poll',           sub: 'Repaint the main gate? · 61% yes' },
  { icon: Wallet,    tone: '#A5B4FC', title: 'Payment received',          sub: 'Service charge · ₦25,000' },
  { icon: Megaphone, tone: '#FB923C', title: 'Announcement',              sub: 'Water maintenance on Saturday' },
];

function useTicker(n, ms) {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % n), ms); return () => clearInterval(t); }, [n, ms]);
  return i;
}

function ResidentPreview() {
  const tick = useTicker(FEED.length, 2600);
  const rows = [0, 1, 2].map((k) => FEED[(tick - k + FEED.length * 4) % FEED.length]);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div style={{ animation: 'rlFloat 7s ease-in-out infinite' }}
      className="w-full max-w-[440px] rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 h-9 border-b border-white/[0.07]">
        {['#F97066', '#FDB022', '#32D583'].map((c) => <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, opacity: .8 }} />)}
        <span className="ml-3 text-[11px] text-white/35">area-mates.areaconnect.pro</span>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold text-white" style={{ background: 'linear-gradient(135deg,#818CF8,#4F46E5)' }}>F4</span>
            <div>
              <p className="text-[11px] text-white/45">{greet}</p>
              <p className="text-[14.5px] font-semibold" style={{ color: '#fff' }}>Flat 4B · Greenfield Estate</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-indigo-200">
            <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-indigo-300" style={{ animation: 'rlPing 1.6s ease-out infinite' }} /><span className="relative w-2 h-2 rounded-full bg-indigo-300" /></span>
            Live
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[['Visitors today', '2', '#34D399'], ['Next dues', '₦25k', '#A5B4FC'], ['Neighbours online', '18', '#FBBF24']].map(([l, v, c]) => (
            <div key={l} className="rounded-xl bg-white/[0.05] border border-white/[0.07] px-3 py-2.5">
              <p className="text-[10.5px] text-white/45 truncate">{l}</p>
              <p className="mt-0.5 text-[18px] font-semibold tabular-nums" style={{ color: c }}>{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/35">For you</p>
        <div className="space-y-1.5">
          {rows.map((r, k) => (
            <div key={`${tick}-${k}`} className="flex items-center gap-3 rounded-lg px-2.5 py-2"
              style={{ background: k === 0 ? 'rgba(255,255,255,.07)' : 'transparent', opacity: 1 - k * 0.25, animation: k === 0 ? 'rlFeedIn .5s cubic-bezier(.22,1,.36,1)' : undefined }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${r.tone}22`, color: r.tone }}><r.icon size={14} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium text-white/90 truncate">{r.title}</span>
                <span className="block text-[11px] text-white/45 truncate">{r.sub}</span>
              </span>
              <span className="text-[10.5px] text-white/30">{k === 0 ? 'now' : `${k * 4}m`}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DesktopAuthShell({ topRight, children, headline, sub, points }) {
  return (
    <div className="ax-light h-screen min-h-[640px] grid grid-cols-[1.1fr_1fr] bg-white overflow-hidden">
      <style>{DESKTOP_CSS + FORM_CSS}</style>

      <aside className="relative overflow-hidden flex flex-col px-14 py-10 text-white h-full"
        style={{ background: 'radial-gradient(90% 70% at 85% 10%, rgba(99,102,241,.35) 0%, transparent 60%), radial-gradient(70% 60% at 0% 100%, rgba(79,70,229,.22) 0%, transparent 60%), #0A0F24' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at 60% 40%, #000 0%, transparent 75%)' }} />

        <div className="relative flex items-center gap-3">
          <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl" />
          <div className="leading-tight">
            <div className="text-[17px] font-bold tracking-tight" style={{ color: '#fff' }}>Area<span style={{ color: '#A5B4FC' }}>Mates</span></div>
            <div className="text-[11px] text-white/45">For residents</div>
          </div>
        </div>

        <div className="relative flex-1 min-h-0 flex flex-col justify-center py-6" style={{ animation: 'rlRise .8s cubic-bezier(.22,1,.36,1) both' }}>
          <div className="text-[34px] leading-[1.12] font-semibold tracking-tight max-w-[470px]" style={{ color: '#fff' }}>
            {headline || <>Home, <span style={{ color: '#A5B4FC' }}>a little closer.</span></>}
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-white/60 max-w-[430px]">
            {sub || 'Let visitors in, pay dues, hear from your estate and meet your neighbours — all from one place.'}
          </p>
          {points && (
            <div className="mt-5 space-y-2">
              {points.map((p) => (
                <div key={p} className="flex items-center gap-2.5 text-[13px] text-white/70"><CheckCircle size={14} className="text-indigo-300" /> {p}</div>
              ))}
            </div>
          )}
          <div className="mt-7"><ResidentPreview /></div>
        </div>

        <div className="relative flex gap-8 text-[12px] text-white/45">
          {[['Instant', 'visitor passes'], ['Paystack', 'secure dues'], ['Lounge', 'podcasts & chat']].map(([a, b]) => (
            <div key={a}><p className="text-[15px] font-semibold text-white/90">{a}</p><p>{b}</p></div>
          ))}
        </div>
      </aside>

      <main className="flex flex-col px-10 py-8 h-full overflow-y-auto">
        <div className="flex justify-end text-[13px] text-[#475467]">{topRight}</div>
        <div className="flex-1 flex items-center justify-center py-6">
          <div className="w-full max-w-[400px]" style={{ animation: 'rlRise .6s .1s cubic-bezier(.22,1,.36,1) both' }}>
            {children}
          </div>
        </div>
        <div className="flex items-center justify-between text-[11.5px] text-[#98A2B3]">
          <span className="flex items-center gap-1.5"><Lock size={12} /> Encrypted connection</span>
          <span>Powered by <span className="font-semibold text-[#667085]">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864</span>
        </div>
      </main>
    </div>
  );
}
