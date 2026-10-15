import { useRef, useState } from 'react';
import { format, addDays } from 'date-fns';
import { Zap, CalendarClock, CalendarDays, Users, UserCheck, Package, Wrench, Heart, MoreHorizontal, Mail, FileText, RefreshCw, QrCode, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { visitorAPI } from '../../api';

const ACCENT = '#6366F1';

const PURPOSES = [
  { label: 'Family',     Icon: Users,          color: '#EC4899', tint: '#FDF2F8' },
  { label: 'Friend',     Icon: UserCheck,      color: '#6366F1', tint: '#EEF2FF' },
  { label: 'Delivery',   Icon: Package,        color: '#F59E0B', tint: '#FFFBEB' },
  { label: 'Contractor', Icon: Wrench,         color: '#F97316', tint: '#FFF7ED' },
  { label: 'Medical',    Icon: Heart,          color: '#EF4444', tint: '#FEF2F2' },
  { label: 'Other',      Icon: MoreHorizontal, color: '#64748B', tint: '#F1F5F9' },
];
const DURATIONS = [[30, '30 min'], [60, '1 hr'], [120, '2 hrs'], [240, '4 hrs'], [480, 'All day']];
const ymd = (d) => format(d, 'yyyy-MM-dd');

/**
 * Invite a visitor: an instant pass (arriving now — valid immediately) or a
 * scheduled one. Used full-screen on phones and in the desktop drawer.
 */
export default function InviteForm({ onCreated, onCancel, sticky = false }) {
  const [mode, setMode] = useState('instant');
  const [form, setForm] = useState({
    visitorName: '', visitorPhone: '', visitorEmail: '', purpose: '',
    day: ymd(addDays(new Date(), 1)), time: '10:00', duration: 120, notes: '',
  });
  const [other, setOther] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const instant = mode === 'instant';
  const dateRef = useRef(null);
  const customDay = ![ymd(new Date()), ymd(addDays(new Date(), 1))].includes(form.day);
  // Open the native calendar. showPicker() works on modern Chrome/Safari/Firefox;
  // older browsers fall back to focusing/clicking the input.
  const openPicker = () => {
    const el = dateRef.current;
    if (!el) return;
    try { if (typeof el.showPicker === 'function') { el.showPicker(); return; } } catch { /* not allowed → fallback */ }
    el.style.pointerEvents = 'auto';
    el.focus();
    el.click();
    setTimeout(() => { el.style.pointerEvents = 'none'; }, 500);
  };

  const pickPurpose = (label) => {
    if (label === 'Other') { setOther(true); set('purpose', ''); } else { setOther(false); set('purpose', label); }
  };

  const when = instant
    ? `Valid now · for ${DURATIONS.find(([v]) => v === form.duration)?.[1] || `${form.duration} min`}`
    : (() => { try { return `${format(new Date(`${form.day}T${form.time}`), 'EEE d MMM · h:mm a')} · ${DURATIONS.find(([v]) => v === form.duration)?.[1]}`; } catch { return ''; } })();
  const ready = form.visitorName.trim() && form.purpose.trim() && (instant || (form.day && form.time));

  const submit = async (e) => {
    e?.preventDefault();
    if (!ready) return toast.error(!form.visitorName.trim() ? 'Enter your visitor\'s name' : 'Pick a reason for the visit');
    setSaving(true);
    try {
      const { data } = await visitorAPI.preRegister({
        visitorName: form.visitorName.trim(),
        visitorPhone: form.visitorPhone.trim() || undefined,
        visitorEmail: form.visitorEmail.trim() || undefined,
        purpose: form.purpose.trim(),
        instant,
        expectedDate: instant ? new Date().toISOString() : new Date(`${form.day}T${form.time}`).toISOString(),
        expectedDuration: form.duration,
        notes: form.notes.trim() || undefined,
      });
      toast.success(instant ? 'Instant pass ready — share it with your visitor' : 'Visitor pass created');
      onCreated(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Couldn\'t create the pass');
    } finally { setSaving(false); }
  };

  const chip = (on) => `rounded-xl border text-[13px] font-semibold transition-colors ${on ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-600'}`;

  return (
    <form onSubmit={submit} className="flex flex-col min-h-full">
      <div className="space-y-6 flex-1">
        {/* Instant vs scheduled */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100">
          {[['instant', Zap, 'Instant pass', 'Arriving now'], ['schedule', CalendarClock, 'Schedule', 'Later or another day']].map(([id, Icon, label, sub]) => (
            <button key={id} type="button" onClick={() => setMode(id)}
              className={`rounded-xl px-3 py-2.5 text-left transition-all ${mode === id ? 'bg-white shadow-sm' : ''}`}>
              <span className={`flex items-center gap-1.5 text-sm font-bold ${mode === id ? 'text-slate-900' : 'text-slate-500'}`}>
                <Icon size={15} style={{ color: id === 'instant' ? '#F59E0B' : ACCENT }} fill={id === 'instant' ? '#FCD34D' : 'none'} /> {label}
              </span>
              <span className="block text-[11px] text-slate-400 mt-0.5">{sub}</span>
            </button>
          ))}
        </div>

        {instant && (
          <div className="flex gap-2.5 rounded-2xl p-3.5 text-[13px]" style={{ background: '#EEF2FF', color: '#3730A3' }}>
            <Zap size={17} className="shrink-0 mt-0.5" style={{ color: '#F59E0B' }} fill="#FCD34D" />
            <p>The pass works <b>immediately</b>. Security can let your visitor in as soon as they show the code — no waiting for approval.</p>
          </div>
        )}

        {/* Who */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Who's coming</h3>
          <input autoFocus value={form.visitorName} onChange={(e) => set('visitorName', e.target.value)} placeholder="Visitor's full name"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[16px] font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-300" />
          <input type="tel" inputMode="tel" value={form.visitorPhone} onChange={(e) => set('visitorPhone', e.target.value)} placeholder="Phone number (we'll text them the code)"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none focus:bg-white focus:border-indigo-300" />
          {showEmail ? (
            <input type="email" value={form.visitorEmail} onChange={(e) => set('visitorEmail', e.target.value)} placeholder="Email (optional)"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-[15px] text-slate-900 outline-none focus:bg-white focus:border-indigo-300" />
          ) : (
            <button type="button" onClick={() => setShowEmail(true)} className="text-[13px] font-semibold text-indigo-600 inline-flex items-center gap-1.5"><Mail size={14} style={{ color: '#0EA5E9' }} /> Add email too</button>
          )}
        </section>

        {/* Why */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Reason for visit</h3>
          <div className="grid grid-cols-3 gap-2">
            {PURPOSES.map(({ label, Icon, color, tint }) => {
              const on = other ? label === 'Other' : form.purpose === label;
              return (
                <button key={label} type="button" onClick={() => pickPurpose(label)}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-[13px] font-semibold transition-all active:scale-[0.97]"
                  style={on ? { background: tint, borderColor: color, color } : { background: '#fff', borderColor: '#E2E8F0', color: '#475569' }}>
                  <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: on ? color : tint }}>
                    <Icon size={18} style={{ color: on ? '#fff' : color }} />
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
          {other && <input autoFocus value={form.purpose} onChange={(e) => set('purpose', e.target.value)} placeholder="What's the visit for?"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] outline-none focus:bg-white focus:border-indigo-300" />}
        </section>

        {/* When */}
        <section>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">{instant ? 'Pass valid for' : 'When'}</h3>
          {!instant && (
            <div className="space-y-2.5 mb-3">
              <div className="grid grid-cols-3 gap-2">
                {[['Today', ymd(new Date())], ['Tomorrow', ymd(addDays(new Date(), 1))]].map(([label, d]) => (
                  <button key={label} type="button" onClick={() => set('day', d)} className={`${chip(form.day === d)} py-2.5`} style={form.day === d ? { background: ACCENT } : undefined}>{label}</button>
                ))}
                <button type="button" onClick={openPicker}
                  className={`${chip(customDay)} py-2.5 relative flex items-center justify-center gap-1.5`}
                  style={customDay ? { background: ACCENT } : undefined}>
                  <CalendarDays size={14} style={{ color: customDay ? '#fff' : ACCENT }} />
                  {customDay ? format(new Date(`${form.day}T00:00`), 'd MMM') : 'Pick date'}
                  {/* Real date input, kept in the layout (not display:none) so the picker can open from it */}
                  <input ref={dateRef} type="date" min={ymd(new Date())} value={form.day} tabIndex={-1} aria-hidden="true"
                    onChange={(e) => e.target.value && set('day', e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" />
                </button>
              </div>
              <input type="time" value={form.time} onChange={(e) => set('time', e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-300" aria-label="Arrival time" />
            </div>
          )}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {DURATIONS.map(([v, label]) => (
              <button key={v} type="button" onClick={() => set('duration', v)} className={`${chip(form.duration === v)} shrink-0 px-3.5 py-2`} style={form.duration === v ? { background: ACCENT } : undefined}>{label}</button>
            ))}
          </div>
        </section>

        {/* Notes */}
        <section>
          {showNotes ? (
            <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Note for security (e.g. silver Camry, dropping off a parcel)"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] outline-none focus:bg-white focus:border-indigo-300 resize-none" />
          ) : (
            <button type="button" onClick={() => setShowNotes(true)} className="text-[13px] font-semibold text-slate-500 inline-flex items-center gap-1.5"><FileText size={14} style={{ color: '#8B5CF6' }} /> Add a note for security</button>
          )}
        </section>
      </div>

      {/* Summary + submit */}
      <div className={`${sticky ? 'sticky bottom-0 -mx-4 px-4 pt-3 bg-white/95 backdrop-blur border-t border-slate-100' : 'pt-5'} mt-6`}
        style={sticky ? { paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' } : undefined}>
        {ready && (
          <p className="text-[12px] text-slate-500 mb-2 flex items-center gap-1.5 truncate">
            <ShieldCheck size={13} className="text-indigo-500 shrink-0" /> {form.visitorName.trim()} · {form.purpose} · {when}
          </p>
        )}
        <div className="flex gap-2">
          {onCancel && <button type="button" onClick={onCancel} className="px-5 py-3.5 rounded-2xl border border-slate-200 font-semibold text-slate-600">Cancel</button>}
          <button type="submit" disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-white disabled:opacity-60 active:scale-[0.99] transition-transform"
            style={{ background: 'linear-gradient(135deg,#6366F1,#4F46E5)' }}>
            {saving ? <><RefreshCw size={16} className="animate-spin" /> Creating…</> : instant ? <><Zap size={16} /> Create instant pass</> : <><QrCode size={16} /> Create pass</>}
          </button>
        </div>
      </div>
    </form>
  );
}
