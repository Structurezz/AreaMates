import { useState, useEffect, useRef } from 'react';
import {
  Scale, Gavel, Users, FileText, Clock, CheckCircle2, XCircle,
  AlertTriangle, Shield, Plus, ArrowLeft, Upload,
  Send, Briefcase, Star, ThumbsUp, ThumbsDown, Minus,
  Banknote, Eye, RotateCcw, Lock, TrendingUp, Siren,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { courtAPI } from '../api';
import toast from 'react-hot-toast';

// ── helpers ─────────────────────────────────────────────────────────────────

const fmt = n => '₦' + Number(n || 0).toLocaleString('en-NG');

const PRIMARY = '#6366F1';
const PRIMARY_DARK = '#4F46E5';

const STATUS_META = {
  filed:              { label: 'Filed',              color: '#64748B', bg: '#F1F5F9' },
  open:               { label: 'Open',               color: '#2563EB', bg: '#EFF6FF' },
  in_hearing:         { label: 'In Hearing',         color: '#D97706', bg: '#FFFBEB' },
  jury_deliberation:  { label: 'Jury Deliberating',  color: '#7C3AED', bg: '#F5F3FF' },
  judge_deliberation: { label: 'Judge Deliberating', color: '#DC2626', bg: '#FEF2F2' },
  verdict_delivered:  { label: 'Verdict Delivered',  color: '#065F46', bg: '#D1FAE5' },
  settled:            { label: 'Settled',            color: '#059669', bg: '#ECFDF5' },
  appealing:          { label: 'Appealing',          color: '#B45309', bg: '#FEF3C7' },
  closed:             { label: 'Closed',             color: '#94A3B8', bg: '#F8FAFC' },
};

const TYPE_LABELS = {
  noise_complaint:      'Noise Complaint',
  property_damage:      'Property Damage',
  harassment:           'Harassment',
  payment_dispute:      'Payment Dispute',
  marketplace_violation:'Marketplace Violation',
  community_rules:      'Community Rules',
  eviction_dispute:     'Eviction Dispute',
  boundary_dispute:     'Boundary Dispute',
  other:                'Other',
};

const AI_PERSONAS = {
  adaeze: { name: 'Barrister Adaeze Okafor', role: 'Prosecution Counsel',   initials: 'AO', color: '#DC2626' },
  emeka:  { name: 'Counsel Emeka Nwosu',     role: 'Defense Counsel',        initials: 'EN', color: '#2563EB' },
  chidi:  { name: 'Solicitor Chidi Eze',     role: 'Settlement Mediator',    initials: 'CE', color: '#7C3AED' },
  ngozi:  { name: 'Attorney Ngozi Adeyemi',  role: 'Constitutional Counsel', initials: 'NA', color: '#059669' },
};

const JUDGE = { name: 'Judge Orizu', initials: 'JO', color: '#B45309' };

const EVENT_META = {
  case_filed:                { label: 'Case Filed',              icon: FileText,   color: '#64748B' },
  case_opened:               { label: 'Case Opened',             icon: Gavel,      color: '#2563EB' },
  lawyer_hired_prosecution:  { label: 'Prosecutor Engaged',      icon: Briefcase,  color: '#DC2626' },
  lawyer_hired_defense:      { label: 'Defense Counsel Engaged', icon: Briefcase,  color: '#2563EB' },
  opening_statement:         { label: 'Opening Statement',       icon: FileText,   color: '#0F172A' },
  rebuttal:                  { label: 'Rebuttal',                icon: RotateCcw,  color: '#7C3AED' },
  evidence_submitted:        { label: 'Evidence Submitted',      icon: Upload,     color: '#D97706' },
  cross_examination:         { label: 'Cross Examination',       icon: Eye,        color: '#0284C7' },
  closing_argument:          { label: 'Closing Argument',        icon: FileText,   color: '#0F172A' },
  jury_summoned:             { label: 'Jury Summoned',           icon: Users,      color: '#7C3AED' },
  jury_deliberation_started: { label: 'Jury Deliberating',       icon: Clock,      color: '#7C3AED' },
  jury_vote_cast:            { label: 'Jury Vote Cast',          icon: CheckCircle2, color: '#059669' },
  judge_deliberation:        { label: 'Judge Deliberating',      icon: Gavel,      color: '#B45309' },
  jury_verdict:              { label: 'Jury Verdict',            icon: Users,      color: '#7C3AED' },
  verdict_delivered:         { label: 'Verdict Delivered',       icon: Gavel,      color: '#B45309' },
  fine_issued:               { label: 'Fine Issued',             icon: Banknote,   color: '#DC2626' },
  fine_paid:                 { label: 'Fine Paid',               icon: CheckCircle2, color: '#059669' },
  settlement_proposed:       { label: 'Settlement Proposed',     icon: TrendingUp, color: '#7C3AED' },
  settlement_accepted:       { label: 'Settlement Accepted',     icon: CheckCircle2, color: '#059669' },
  settlement_rejected:       { label: 'Settlement Rejected',     icon: XCircle,    color: '#DC2626' },
  appeal_filed:              { label: 'Appeal Filed',            icon: RotateCcw,  color: '#D97706' },
  appeal_ruled:              { label: 'Appeal Ruled',            icon: Gavel,      color: '#B45309' },
  case_closed:               { label: 'Case Closed',             icon: Lock,       color: '#94A3B8' },
  punishment_enforced:       { label: 'Punishment Enforced',     icon: Shield,     color: '#DC2626' },
};

const SEVERITY_COLORS = {
  minor:    { text: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  moderate: { text: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  major:    { text: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  critical: { text: '#7C2D12', bg: '#FFF7ED', border: '#FED7AA' },
};

const PUNISHMENT_LABELS = {
  none:                 'No Punishment',
  warning:              'Formal Warning',
  fine:                 'Financial Penalty',
  marketplace_ban:      'Marketplace Ban',
  lounge_suspension:    'Lounge Suspension',
  community_suspension: 'Community Suspension',
  estate_ban:           'Estate Ban',
};

function Avatar({ initials, color, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3,
      background: color + '22', border: `2px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <span style={{ color, fontSize: size * 0.33, fontWeight: 800 }}>{initials}</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.filed;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
      color: m.color, background: m.bg, border: `1px solid ${m.color}33`,
    }}>{m.label}</span>
  );
}

// ── Courtroom banner ─────────────────────────────────────────────────────────

function CourtroomBanner({ stats }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #1E1B3A 100%)',
      borderRadius: 20, padding: '28px 28px', marginBottom: 24,
      border: '1px solid #3730A3', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(180,83,9,0.06)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ background: 'rgba(180,83,9,0.2)', border: '1px solid rgba(180,83,9,0.4)', borderRadius: 12, padding: '8px 10px' }}>
              <Scale size={22} color="#F59E0B" />
            </div>
            <div>
              <div style={{ color: '#A5B4FC', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                AreaConnect Court of Justice
              </div>
              <div style={{ color: '#E0E7FF', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                The Honourable Court
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <div style={{ background: 'rgba(180,83,9,0.15)', borderRadius: 8, padding: '3px 10px' }}>
              <span style={{ color: '#D97706', fontSize: 11, fontWeight: 600 }}>Presiding: Judge Orizu</span>
            </div>
            <div style={{ color: '#6366F1', fontSize: 11 }}>· Every Resident Has a Voice</div>
          </div>
        </div>
        {stats && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Cases',  value: stats.total ?? 0,                           color: '#A5B4FC' },
              { label: 'In Hearing',   value: stats.byStatus?.in_hearing ?? 0,             color: '#FBBF24' },
              { label: 'Verdicts',     value: stats.byStatus?.verdict_delivered ?? 0,      color: '#34D399' },
              { label: 'Settled',      value: stats.byStatus?.settled ?? 0,                color: '#C4B5FD' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ color: s.color, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: '#6366F1', fontSize: 10, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <p style={{ color: '#4338CA', fontSize: 11, fontStyle: 'italic', margin: 0 }}>
          "Every resident has the right to be heard, represented, and judged fairly. File your case with confidence."
        </p>
      </div>
    </div>
  );
}

// ── Case card ────────────────────────────────────────────────────────────────

function CaseCard({ c, onClick, userId }) {
  const sev = SEVERITY_COLORS[c.severity] || SEVERITY_COLORS.minor;
  const isMine = c.plaintiff?.userId === userId || c.plaintiff?.userId?._id === userId ||
                 c.defendant?.userId === userId || c.defendant?.userId?._id === userId;
  const isJuror = c.jury?.members?.some(m => m === userId || m?._id === userId || m?.toString() === userId);

  return (
    <button onClick={onClick} className="w-full text-left transition-all"
      style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 18px', marginBottom: 10 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = PRIMARY; e.currentTarget.style.boxShadow = `0 2px 12px ${PRIMARY}15`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{c.caseNumber}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 999,
              color: sev.text, background: sev.bg, border: `1px solid ${sev.border}` }}>{c.severity?.toUpperCase()}</span>
            {isMine && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 999, color: PRIMARY, background: '#EEF2FF', border: `1px solid ${PRIMARY}30` }}>My Case</span>}
            {isJuror && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 999, color: '#7C3AED', background: '#F5F3FF', border: '1px solid #DDD6FE' }}>⚖ Juror</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>{c.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B', flexWrap: 'wrap' }}>
            <span>{c.plaintiff?.name || 'Unknown'}</span>
            <span style={{ color: '#DC2626', fontWeight: 800 }}>vs</span>
            <span>{c.defendant?.isEstate ? 'Estate Management' : (c.defendant?.name || 'Unknown')}</span>
            <span style={{ color: '#CBD5E1' }}>·</span>
            <span style={{ color: '#94A3B8' }}>{TYPE_LABELS[c.type] || c.type}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <StatusBadge status={c.status} />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            {new Date(c.filedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
      {(c.proceedings?.length > 0 || c.fine?.status === 'pending') && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {c.proceedings?.length > 0 && <><Clock size={11} color="#94A3B8" /><span style={{ fontSize: 11, color: '#94A3B8' }}>{c.proceedings.length} proceedings</span></>}
          {c.jury?.members?.length > 0 && <><span style={{ color: '#CBD5E1' }}>·</span><Users size={11} color="#7C3AED" /><span style={{ fontSize: 11, color: '#7C3AED' }}>{c.jury.members.length} jurors</span></>}
          {c.fine?.status === 'pending' && <><span style={{ color: '#CBD5E1' }}>·</span><Banknote size={11} color="#DC2626" /><span style={{ fontSize: 11, color: '#DC2626' }}>Fine pending</span></>}
        </div>
      )}
    </button>
  );
}

// ── File Dispute form ────────────────────────────────────────────────────────

function FileDisputeForm({ onFiled, residents }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', type: '', severity: 'moderate',
    charges: [''], plaintiffStatement: '',
    defendantUserId: '', isDefendantEstate: false,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setCharge = (i, v) => { const c = [...form.charges]; c[i] = v; set('charges', c); };
  const addCharge = () => set('charges', [...form.charges, '']);
  const removeCharge = (i) => set('charges', form.charges.filter((_, idx) => idx !== i));

  const submit = async () => {
    setLoading(true);
    try {
      await courtAPI.fileCase({ ...form, charges: form.charges.filter(c => c.trim()) });
      toast.success('Case filed. The court has received your complaint.');
      onFiled();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to file case');
    } finally { setLoading(false); }
  };

  const canStep0 = form.title.trim() && form.type && form.severity;
  const canStep1 = form.isDefendantEstate || form.defendantUserId;
  const canStep2 = form.charges.some(c => c.trim()) && form.plaintiffStatement.trim().length >= 30;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['Case Details', 'Defendant', 'Your Statement'].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: 3, borderRadius: 2, marginBottom: 6, background: i <= step ? PRIMARY : '#E2E8F0' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: i === step ? PRIMARY : '#94A3B8' }}>{s}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Case Title</label>
            <input className="input-field" placeholder="Brief title of your complaint" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Type of Dispute</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <button key={val} onClick={() => set('type', val)}
                  style={{ padding: '8px 12px', borderRadius: 10, textAlign: 'left', fontSize: 12, fontWeight: 600,
                    border: form.type === val ? `1.5px solid ${PRIMARY}` : '1px solid #E2E8F0',
                    background: form.type === val ? '#EEF2FF' : '#FAFAFA',
                    color: form.type === val ? PRIMARY_DARK : '#475569' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Severity</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['minor', 'moderate', 'major', 'critical'].map(s => {
                const sc = SEVERITY_COLORS[s];
                return (
                  <button key={s} onClick={() => set('severity', s)}
                    style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                      border: form.severity === s ? `1.5px solid ${sc.border}` : '1px solid #E2E8F0',
                      background: form.severity === s ? sc.bg : '#FAFAFA',
                      color: form.severity === s ? sc.text : '#94A3B8' }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={() => setStep(1)} disabled={!canStep0}
            style={{ padding: '11px 0', borderRadius: 12, background: canStep0 ? `linear-gradient(135deg,${PRIMARY},${PRIMARY_DARK})` : '#E2E8F0',
              color: canStep0 ? '#fff' : '#94A3B8', fontWeight: 700, fontSize: 14, border: 'none', cursor: canStep0 ? 'pointer' : 'not-allowed' }}>
            Continue →
          </button>
        </div>
      )}

      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button onClick={() => set('isDefendantEstate', !form.isDefendantEstate)}
            style={{ padding: 14, borderRadius: 12, textAlign: 'left',
              border: form.isDefendantEstate ? '1.5px solid #DC2626' : '1px solid #E2E8F0',
              background: form.isDefendantEstate ? '#FEF2F2' : '#FAFAFA', cursor: 'pointer' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: form.isDefendantEstate ? '#DC2626' : '#0F172A', marginBottom: 3 }}>
              {form.isDefendantEstate ? '✓ ' : ''}Filing against Estate Management
            </div>
            <div style={{ fontSize: 12, color: '#64748B' }}>Dispute a decision, fine, or action made by management</div>
          </button>
          {!form.isDefendantEstate && (
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Select Defendant</label>
              <select className="input-field" value={form.defendantUserId} onChange={e => set('defendantUserId', e.target.value)}>
                <option value="">— Select a resident —</option>
                {residents.map(r => <option key={r._id} value={r._id}>{r.name}{r.unit ? ` — ${r.unit}` : ''}</option>)}
              </select>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(0)} style={{ flex: '0 0 auto', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Back</button>
            <button onClick={() => setStep(2)} disabled={!canStep1}
              style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: canStep1 ? `linear-gradient(135deg,${PRIMARY},${PRIMARY_DARK})` : '#E2E8F0',
                color: canStep1 ? '#fff' : '#94A3B8', fontWeight: 700, fontSize: 14, border: 'none', cursor: canStep1 ? 'pointer' : 'not-allowed' }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Charges</label>
            {form.charges.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <input className="input-field" placeholder={`Charge ${i + 1}…`} value={c} onChange={e => setCharge(i, e.target.value)} style={{ flex: 1 }} />
                {form.charges.length > 1 && (
                  <button onClick={() => removeCharge(i)} style={{ padding: '0 12px', borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}>
                    <XCircle size={14} />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addCharge} style={{ fontSize: 12, color: PRIMARY, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', paddingLeft: 0 }}>+ Add charge</button>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Your Opening Statement</label>
            <textarea className="input-field" rows={5} placeholder="Describe the incident in detail. Include dates, times, witnesses, and how it affected you..."
              value={form.plaintiffStatement} onChange={e => set('plaintiffStatement', e.target.value)} style={{ resize: 'vertical' }} />
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{form.plaintiffStatement.length} chars (min. 30)</div>
          </div>
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
            <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 12, color: '#92400E' }}>Filing a false claim is a punishable offence under the Estate Community Code. Ensure all information is truthful.</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ flex: '0 0 auto', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Back</button>
            <button onClick={submit} disabled={!canStep2 || loading}
              style={{ flex: 1, padding: '11px 0', borderRadius: 12,
                background: canStep2 && !loading ? 'linear-gradient(135deg,#DC2626,#B91C1C)' : '#E2E8F0',
                color: canStep2 && !loading ? '#fff' : '#94A3B8', fontWeight: 700, fontSize: 14, border: 'none',
                cursor: canStep2 && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading
                ? <><svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Filing…</>
                : <><Gavel size={14} /> File with the Court</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Proceeding entry ─────────────────────────────────────────────────────────

function ProceedingEntry({ p }) {
  const meta = EVENT_META[p.event] || { label: p.event, icon: FileText, color: '#64748B' };
  const Icon = meta.icon;
  const isJudge = p.actorName?.toLowerCase().includes('judge') || p.actorName?.toLowerCase().includes('orizu');

  return (
    <div style={{ display: 'flex', gap: 12, paddingBottom: 16, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 20, top: 40, bottom: 0, width: 1.5, background: '#F1F5F9' }} />
      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: meta.color + '15', border: `1.5px solid ${meta.color}30`, zIndex: 1 }}>
        <Icon size={16} color={meta.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.label}</span>
          {p.actorName && <span style={{ fontSize: 11, color: '#64748B' }}>— {p.actorName}</span>}
          {p.isAI && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: '#EDE9FE', color: '#7C3AED', border: '1px solid #DDD6FE' }}>AI</span>}
          {isJudge && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>⚖️ Judge</span>}
          <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 'auto' }}>
            {new Date(p.timestamp).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {p.content && (
          <div style={{
            background: isJudge ? 'linear-gradient(135deg,#FFF7ED,#FFFBEB)' : p.isAI ? '#F8FAFC' : '#FAFAFA',
            border: isJudge ? '1px solid #FDE68A' : '1px solid #F1F5F9',
            borderRadius: 10, padding: '10px 14px', marginTop: 4,
            fontSize: 13, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap',
          }}>
            {isJudge && <span style={{ color: '#B45309', fontWeight: 700, display: 'block', marginBottom: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>⚖️ Judge Orizu</span>}
            {p.content}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Verdict display ──────────────────────────────────────────────────────────

function VerdictDisplay({ verdict, fine, caseObj, onPayFine, payingFine, userId }) {
  if (!verdict?.decision) return null;
  const isGuilty = verdict.decision === 'guilty';
  const isNotGuilty = verdict.decision === 'not_guilty';
  const isDismissed = verdict.decision === 'dismissed';
  const isDefendant = caseObj.defendant?.userId === userId || caseObj.defendant?.userId?._id === userId;

  return (
    <div style={{
      background: isGuilty ? 'linear-gradient(135deg,#1C0A0A,#2D0A0A)' : isNotGuilty ? 'linear-gradient(135deg,#052E16,#064E3B)' : 'linear-gradient(135deg,#0F172A,#1E293B)',
      borderRadius: 16, padding: 24, marginBottom: 20,
      border: isGuilty ? '1px solid #DC2626' : isNotGuilty ? '1px solid #10B981' : '1px solid #334155',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ background: isGuilty ? '#DC262620' : '#10B98120', borderRadius: 10, padding: '8px 10px' }}>
          <Gavel size={20} color={isGuilty ? '#DC2626' : isNotGuilty ? '#10B981' : '#64748B'} />
        </div>
        <div>
          <div style={{ color: '#94A3B8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Judge Orizu Delivers</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: isGuilty ? '#FCA5A5' : isNotGuilty ? '#6EE7B7' : '#94A3B8' }}>
            {isGuilty ? 'GUILTY' : isNotGuilty ? 'NOT GUILTY' : verdict.decision.toUpperCase().replace('_', ' ')}
          </div>
        </div>
      </div>

      {verdict.summary && (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 13, color: '#CBD5E1', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {verdict.summary}
        </div>
      )}

      {isGuilty && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {verdict.fine > 0 && (
            <div style={{ flex: 1, background: '#DC262618', border: '1px solid #DC262640', borderRadius: 12, padding: '12px 14px', minWidth: 140 }}>
              <div style={{ color: '#FCA5A5', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Fine Imposed</div>
              <div style={{ color: '#FCA5A5', fontSize: 20, fontWeight: 800 }}>{fmt(verdict.fine)}</div>
              {fine?.status === 'pending' && fine.dueDate && (
                <div style={{ color: '#F87171', fontSize: 11, marginTop: 2 }}>Due {new Date(fine.dueDate).toLocaleDateString('en-NG')}</div>
              )}
              {fine?.status === 'paid' && <div style={{ color: '#6EE7B7', fontSize: 11, marginTop: 2 }}>✓ Paid</div>}
            </div>
          )}
          {verdict.punishment !== 'none' && (
            <div style={{ flex: 1, background: '#7C2D1218', border: '1px solid #7C2D1240', borderRadius: 12, padding: '12px 14px', minWidth: 140 }}>
              <div style={{ color: '#FCA5A5', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Punishment</div>
              <div style={{ color: '#FBBF24', fontSize: 13, fontWeight: 700 }}>{PUNISHMENT_LABELS[verdict.punishment]}</div>
              {verdict.punishmentDurationDays > 0 && <div style={{ color: '#F87171', fontSize: 11, marginTop: 2 }}>{verdict.punishmentDurationDays} days</div>}
            </div>
          )}
        </div>
      )}

      {isGuilty && fine?.status === 'pending' && fine.amount > 0 && isDefendant && (
        <button onClick={onPayFine} disabled={payingFine}
          style={{ width: '100%', padding: '12px 0', borderRadius: 12,
            background: 'linear-gradient(135deg,#DC2626,#B91C1C)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none',
            cursor: payingFine ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {payingFine
            ? <><svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Processing…</>
            : <><Banknote size={16} /> Pay Fine — {fmt(fine.amount)}</>}
        </button>
      )}
      {isGuilty && fine?.status === 'paid' && (
        <div style={{ padding: '10px 14px', borderRadius: 12, background: '#06452618', border: '1px solid #10B98140', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span style={{ color: '#6EE7B7', fontSize: 13, fontWeight: 600 }}>Fine paid on {fine.paidAt ? new Date(fine.paidAt).toLocaleDateString('en-NG') : '—'}</span>
        </div>
      )}
    </div>
  );
}

// ── Case detail ──────────────────────────────────────────────────────────────

function CaseDetail({ caseId, onBack, user }) {
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('proceedings');
  const [argText, setArgText] = useState('');
  const [argSide, setArgSide] = useState('prosecution');
  const [submittingArg, setSubmittingArg] = useState(false);
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [evidenceContent, setEvidenceContent] = useState('');
  const [evidenceSide, setEvidenceSide] = useState('neutral');
  const [submittingEvid, setSubmittingEvid] = useState(false);
  const [juryVote, setJuryVote] = useState('');
  const [juryReason, setJuryReason] = useState('');
  const [submittingVote, setSubmittingVote] = useState(false);
  const [hiringLawyer, setHiringLawyer] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [selectedLawyerSide, setSelectedLawyerSide] = useState(null);
  const [payingFine, setPayingFine] = useState(false);
  const [settlementTerms, setSettlementTerms] = useState('');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [submittingSettlement, setSubmittingSettlement] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const procRef = useRef(null);

  const load = async () => {
    try {
      const res = await courtAPI.getCase(caseId);
      setC(res.data.case);
    } catch { toast.error('Failed to load case'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [caseId]);
  useEffect(() => { if (procRef.current) procRef.current.scrollTop = procRef.current.scrollHeight; }, [c?.proceedings?.length]);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80 }}><svg className="animate-spin" width={32} height={32} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={PRIMARY} strokeWidth="2.5" strokeOpacity=".2"/><path d="M12 2a10 10 0 0 1 10 10" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round"/></svg></div>;
  if (!c) return <div style={{ padding: 32, color: '#94A3B8' }}>Case not found.</div>;

  const userId = user?._id;
  const isPlaintiff = c.plaintiff?.userId === userId || c.plaintiff?.userId?._id === userId;
  const isDefendant = !c.defendant?.isEstate && (c.defendant?.userId === userId || c.defendant?.userId?._id === userId);
  const isJuror = c.jury?.members?.some(m => m === userId || m?._id === userId || m?.toString() === userId);
  const hasVoted = c.jury?.votes?.some(v => v.userId === userId || v.userId?._id === userId || v.userId?.toString() === userId);
  const canAct = !['settled','closed'].includes(c.status);

  const hireAILawyer = async () => {
    if (!selectedPersona || !selectedLawyerSide) return;
    setHiringLawyer(true);
    try {
      await courtAPI.hireLawyer(c._id, { side: selectedLawyerSide, persona: selectedPersona });
      toast.success('Lawyer engaged — opening argument submitted!');
      setSelectedPersona(null); setSelectedLawyerSide(null); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to hire lawyer'); }
    finally { setHiringLawyer(false); }
  };

  const submitArg = async () => {
    if (!argText.trim()) return;
    setSubmittingArg(true);
    try {
      await courtAPI.submitArgument(c._id, { content: argText, side: argSide });
      toast.success('Argument submitted'); setArgText(''); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmittingArg(false); }
  };

  const submitEvid = async () => {
    if (!evidenceLabel.trim() || !evidenceContent.trim()) return;
    setSubmittingEvid(true);
    try {
      await courtAPI.submitEvidence(c._id, { label: evidenceLabel, content: evidenceContent, side: evidenceSide });
      toast.success('Evidence admitted'); setEvidenceLabel(''); setEvidenceContent(''); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmittingEvid(false); }
  };

  const castVote = async () => {
    if (!juryVote) return;
    setSubmittingVote(true);
    try {
      await courtAPI.castJuryVote(c._id, { vote: juryVote, reasoning: juryReason });
      toast.success('Jury vote cast. Thank you for your service.'); setJuryVote(''); setJuryReason(''); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmittingVote(false); }
  };

  const payFine = async () => {
    setPayingFine(true);
    try {
      await courtAPI.payFine(c._id);
      toast.success('Fine paid. Court record updated.'); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Insufficient balance. Please top up your wallet.'); }
    finally { setPayingFine(false); }
  };

  const proposeSettlement = async () => {
    setSubmittingSettlement(true);
    try {
      await courtAPI.proposeSettlement(c._id, { action: 'propose', terms: settlementTerms, amount: Number(settlementAmount) || 0 });
      toast.success('Settlement proposed'); setSettlementTerms(''); setSettlementAmount(''); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmittingSettlement(false); }
  };

  const respondSettlement = async (action) => {
    try {
      await courtAPI.proposeSettlement(c._id, { action });
      toast.success(action === 'accept' ? 'Settlement accepted. Case resolved.' : 'Settlement rejected.');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const fileAppeal = async () => {
    if (!appealReason.trim()) return;
    setSubmittingAppeal(true);
    try {
      await courtAPI.fileAppeal(c._id, { reason: appealReason });
      toast.success('Appeal filed. Judge Orizu will reconsider.'); setAppealReason(''); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSubmittingAppeal(false); }
  };

  const sev = SEVERITY_COLORS[c.severity] || SEVERITY_COLORS.minor;
  const DETAIL_TABS = [
    { id: 'proceedings', label: 'Proceedings', count: c.proceedings?.length },
    { id: 'evidence',    label: 'Evidence',    count: c.evidence?.length },
    { id: 'jury',        label: 'Jury',        count: c.jury?.members?.length },
    { id: 'actions',     label: 'Actions' },
  ];

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={15} /> All Cases
      </button>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1E1B4B,#312E81)', borderRadius: 18, padding: '20px 22px', marginBottom: 16, border: '1px solid #3730A3' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>{c.caseNumber}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: sev.text, background: sev.bg + 'cc', border: `1px solid ${sev.border}` }}>{c.severity?.toUpperCase()}</span>
              <span style={{ fontSize: 11, color: '#6366F1' }}>{TYPE_LABELS[c.type]}</span>
            </div>
            <div style={{ color: '#E0E7FF', fontSize: 17, fontWeight: 800, marginBottom: 10 }}>{c.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar initials={(c.plaintiff?.name || 'P')[0].toUpperCase()} color="#10B981" size={26} />
                <div><div style={{ color: '#94A3B8', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Plaintiff</div><div style={{ color: '#E0E7FF', fontSize: 12, fontWeight: 600 }}>{c.plaintiff?.name || 'Unknown'}</div></div>
              </div>
              <div style={{ color: '#DC2626', fontWeight: 900, fontSize: 14, padding: '0 6px' }}>VS</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar initials={c.defendant?.isEstate ? 'ES' : (c.defendant?.name || 'D')[0].toUpperCase()} color="#DC2626" size={26} />
                <div><div style={{ color: '#94A3B8', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Defendant</div><div style={{ color: '#E0E7FF', fontSize: 12, fontWeight: 600 }}>{c.defendant?.isEstate ? 'Estate Management' : (c.defendant?.name || 'Unknown')}</div></div>
              </div>
            </div>
          </div>
          <StatusBadge status={c.status} />
        </div>

        {c.charges?.length > 0 && (
          <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#6366F1', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>Charges</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {c.charges.map((ch, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999, background: '#DC262618', color: '#FCA5A5', border: '1px solid #DC262630' }}>{i + 1}. {ch}</span>
              ))}
            </div>
          </div>
        )}

        {/* Lawyers row */}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { side: 'prosecution', lawyer: c.lawyers?.prosecution, sideColor: '#DC2626', label: 'Prosecution' },
            { side: 'defense',     lawyer: c.lawyers?.defense,     sideColor: '#2563EB', label: 'Defense' },
          ].map(({ side, lawyer, sideColor, label }) => {
            const persona = lawyer?.aiPersona ? AI_PERSONAS[lawyer.aiPersona] : null;
            return (
              <div key={side} style={{ flex: 1, minWidth: 150, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 12px', border: `1px solid ${sideColor}30` }}>
                <div style={{ color: sideColor, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
                {persona
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Avatar initials={persona.initials} color={persona.color} size={26} /><div><div style={{ color: '#E0E7FF', fontSize: 11, fontWeight: 700 }}>{persona.name}</div><div style={{ color: '#6366F1', fontSize: 10 }}>AI · {persona.role}</div></div></div>
                  : <div style={{ color: '#475569', fontSize: 11, fontStyle: 'italic' }}>Self-represented</div>}
              </div>
            );
          })}
          <div style={{ flex: 1, minWidth: 150, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '8px 12px', border: '1px solid #B4530930' }}>
            <div style={{ color: '#B45309', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Presiding Judge</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Avatar initials={JUDGE.initials} color={JUDGE.color} size={26} /><div><div style={{ color: '#E0E7FF', fontSize: 11, fontWeight: 700 }}>{JUDGE.name}</div><div style={{ color: '#6366F1', fontSize: 10 }}>AI Judge</div></div></div>
          </div>
        </div>
      </div>

      {c.verdict?.decision && (
        <VerdictDisplay verdict={c.verdict} fine={c.fine} caseObj={c} onPayFine={payFine} payingFine={payingFine} userId={userId} />
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: '#F8FAFC', borderRadius: 12, padding: 4, border: '1px solid #E2E8F0' }}>
        {DETAIL_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ flex: 1, padding: '8px 0', borderRadius: 9, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: activeTab === t.id ? '#fff' : 'transparent',
              color: activeTab === t.id ? '#0F172A' : '#64748B',
              boxShadow: activeTab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {t.label}{t.count != null ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {activeTab === 'proceedings' && (
        <div>
          {c.plaintiffStatement && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Plaintiff's Opening Statement</div>
              <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.7 }}>{c.plaintiffStatement}</div>
            </div>
          )}
          <div ref={procRef} style={{ maxHeight: 440, overflowY: 'auto', paddingRight: 4 }}>
            {c.proceedings?.length === 0
              ? <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>No proceedings yet. The court is in recess.</div>
              : c.proceedings.map((p, i) => <ProceedingEntry key={p._id || i} p={p} />)}
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div>
          {c.evidence?.length === 0
            ? <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>No evidence on record.</div>
            : c.evidence.map((e, i) => (
              <div key={i} style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    color: e.side === 'prosecution' ? '#DC2626' : e.side === 'defense' ? '#2563EB' : '#64748B',
                    background: e.side === 'prosecution' ? '#FEF2F2' : e.side === 'defense' ? '#EFF6FF' : '#F1F5F9' }}>{e.side?.toUpperCase()}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{e.label}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>{new Date(e.submittedAt).toLocaleDateString('en-NG')}</span>
                </div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{e.content}</div>
              </div>
            ))}
        </div>
      )}

      {activeTab === 'jury' && (
        <div>
          {c.jury?.tally && (c.jury.tally.guilty > 0 || c.jury.tally.notGuilty > 0) && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Jury Tally</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[{l:'Guilty',v:c.jury.tally.guilty,c:'#DC2626'},{l:'Not Guilty',v:c.jury.tally.notGuilty,c:'#059669'},{l:'Abstain',v:c.jury.tally.abstain,c:'#64748B'}].map(t => (
                  <div key={t.l} style={{ flex: 1, textAlign: 'center', padding: '12px 0', background: t.c + '10', borderRadius: 10, border: `1px solid ${t.c}25` }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: t.c }}>{t.v}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.c, textTransform: 'uppercase', marginTop: 2 }}>{t.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!c.jury?.members?.length
            ? <div style={{ textAlign: 'center', color: '#94A3B8', padding: '40px 0', fontSize: 13 }}>Jury not yet summoned.</div>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {c.jury.members.map((m, i) => {
                  const vote = c.jury?.votes?.find(v => v.userId === (m._id || m) || v.userId?._id === (m._id || m));
                  const revealed = ['verdict_delivered','closed','settled'].includes(c.status);
                  return (
                    <div key={i} style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
                      <Avatar initials={`J${i + 1}`} color="#7C3AED" size={34} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', marginTop: 8 }}>{m.name || `Juror ${i + 1}`}</div>
                      {vote && revealed
                        ? <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, marginTop: 4, display: 'inline-block',
                            background: vote.vote === 'guilty' ? '#FEF2F2' : vote.vote === 'not_guilty' ? '#ECFDF5' : '#F1F5F9',
                            color: vote.vote === 'guilty' ? '#DC2626' : vote.vote === 'not_guilty' ? '#059669' : '#64748B' }}>
                            {vote.vote.replace('_', ' ').toUpperCase()}</span>
                        : <span style={{ fontSize: 10, color: vote ? '#10B981' : '#94A3B8', display: 'block', marginTop: 4 }}>{vote ? 'Voted' : 'Pending'}</span>}
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      )}

      {activeTab === 'actions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Jury duty */}
          {isJuror && !hasVoted && ['open','in_hearing','jury_deliberation'].includes(c.status) && (
            <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#4C1D95', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={16} color="#7C3AED" /> You've Been Summoned — Jury Duty
              </div>
              <div style={{ fontSize: 12, color: '#6D28D9', marginBottom: 14 }}>Your estate community has selected you to serve as a juror. Your vote helps determine justice.</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {[{v:'guilty',l:'Guilty',i:ThumbsDown,c:'#DC2626'},{v:'not_guilty',l:'Not Guilty',i:ThumbsUp,c:'#059669'},{v:'abstain',l:'Abstain',i:Minus,c:'#64748B'}].map(o => (
                  <button key={o.v} onClick={() => setJuryVote(o.v)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 11, fontWeight: 700, fontSize: 11,
                      border: juryVote === o.v ? `1.5px solid ${o.c}` : '1px solid #E2E8F0',
                      background: juryVote === o.v ? o.c + '15' : '#fff', color: juryVote === o.v ? o.c : '#64748B',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <o.i size={16} />{o.l}
                  </button>
                ))}
              </div>
              <textarea className="input-field" rows={2} placeholder="Reasoning (optional)..." value={juryReason}
                onChange={e => setJuryReason(e.target.value)} style={{ resize: 'none', marginBottom: 10 }} />
              <button onClick={castVote} disabled={!juryVote || submittingVote}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  background: juryVote ? `linear-gradient(135deg,#7C3AED,#5B21B6)` : '#E2E8F0',
                  color: juryVote ? '#fff' : '#94A3B8', border: 'none', cursor: juryVote ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Scale size={14} /> Cast My Vote
              </button>
            </div>
          )}
          {isJuror && hasVoted && (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={18} color="#10B981" />
              <span style={{ color: '#065F46', fontWeight: 600, fontSize: 13 }}>Your jury vote has been recorded. The court thanks you for your service.</span>
            </div>
          )}

          {/* Hire AI Lawyer */}
          {canAct && (isPlaintiff || isDefendant) && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>Hire an AI Lawyer</div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>Let a specialist argue your case with the full force of law.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 12 }}>
                {Object.entries(AI_PERSONAS).map(([key, p]) => (
                  <button key={key} onClick={() => setSelectedPersona(selectedPersona === key ? null : key)}
                    style={{ padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                      border: selectedPersona === key ? `1.5px solid ${p.color}` : '1px solid #E2E8F0',
                      background: selectedPersona === key ? p.color + '10' : '#fff', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar initials={p.initials} color={p.color} size={28} />
                      <div><div style={{ fontSize: 11, fontWeight: 700, color: p.color }}>{p.name}</div><div style={{ fontSize: 10, color: '#94A3B8' }}>{p.role}</div></div>
                    </div>
                  </button>
                ))}
              </div>
              {selectedPersona && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {isPlaintiff && (
                    <button onClick={() => setSelectedLawyerSide('prosecution')}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontWeight: 700, fontSize: 12,
                        border: selectedLawyerSide === 'prosecution' ? '1.5px solid #DC2626' : '1px solid #E2E8F0',
                        background: selectedLawyerSide === 'prosecution' ? '#FEF2F2' : '#FAFAFA',
                        color: selectedLawyerSide === 'prosecution' ? '#DC2626' : '#64748B', cursor: 'pointer' }}>As Prosecution</button>
                  )}
                  {isDefendant && (
                    <button onClick={() => setSelectedLawyerSide('defense')}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontWeight: 700, fontSize: 12,
                        border: selectedLawyerSide === 'defense' ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                        background: selectedLawyerSide === 'defense' ? '#EFF6FF' : '#FAFAFA',
                        color: selectedLawyerSide === 'defense' ? '#2563EB' : '#64748B', cursor: 'pointer' }}>As Defense</button>
                  )}
                </div>
              )}
              {selectedPersona && selectedLawyerSide && (
                <button onClick={hireAILawyer} disabled={hiringLawyer}
                  style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                    background: `linear-gradient(135deg,${PRIMARY},${PRIMARY_DARK})`, color: '#fff', border: 'none', cursor: hiringLawyer ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {hiringLawyer
                    ? <><svg className="animate-spin" width={14} height={14} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/></svg>Briefing counsel…</>
                    : <><Briefcase size={14} /> Hire {AI_PERSONAS[selectedPersona].name}</>}
                </button>
              )}
            </div>
          )}

          {/* Submit argument */}
          {canAct && (isPlaintiff || isDefendant) && c.status !== 'filed' && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 12 }}>Submit an Argument</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {[{v:'prosecution',l:'Prosecution',c:'#DC2626'},{v:'defense',l:'Defense',c:'#2563EB'}].map(s => (
                  <button key={s.v} onClick={() => setArgSide(s.v)}
                    style={{ flex: 1, padding: '7px 0', borderRadius: 10, fontWeight: 600, fontSize: 12,
                      border: argSide === s.v ? `1.5px solid ${s.c}` : '1px solid #E2E8F0',
                      background: argSide === s.v ? s.c + '12' : '#fff', color: argSide === s.v ? s.c : '#64748B', cursor: 'pointer' }}>
                    {s.l}
                  </button>
                ))}
              </div>
              <textarea className="input-field" rows={4} placeholder="Your argument or rebuttal…" value={argText}
                onChange={e => setArgText(e.target.value)} style={{ resize: 'vertical', marginBottom: 10 }} />
              <button onClick={submitArg} disabled={!argText.trim() || submittingArg}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  background: argText.trim() ? 'linear-gradient(135deg,#0F172A,#1E293B)' : '#E2E8F0',
                  color: argText.trim() ? '#fff' : '#94A3B8', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Send size={14} /> Submit to Court
              </button>
            </div>
          )}

          {/* Submit evidence */}
          {canAct && (isPlaintiff || isDefendant) && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 12 }}>Submit Evidence</div>
              <input className="input-field" placeholder="Evidence label (e.g. WhatsApp Screenshot, Payment Record...)" value={evidenceLabel}
                onChange={e => setEvidenceLabel(e.target.value)} style={{ marginBottom: 8 }} />
              <textarea className="input-field" rows={3} placeholder="Describe the evidence..." value={evidenceContent}
                onChange={e => setEvidenceContent(e.target.value)} style={{ resize: 'vertical', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {['prosecution','defense','neutral'].map(s => (
                  <button key={s} onClick={() => setEvidenceSide(s)}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 9, fontWeight: 600, fontSize: 11, textTransform: 'capitalize',
                      border: evidenceSide === s ? `1.5px solid ${PRIMARY}` : '1px solid #E2E8F0',
                      background: evidenceSide === s ? '#EEF2FF' : '#FAFAFA', color: evidenceSide === s ? PRIMARY_DARK : '#64748B', cursor: 'pointer' }}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={submitEvid} disabled={!evidenceLabel.trim() || !evidenceContent.trim() || submittingEvid}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  background: evidenceLabel.trim() && evidenceContent.trim() ? 'linear-gradient(135deg,#D97706,#B45309)' : '#E2E8F0',
                  color: evidenceLabel.trim() && evidenceContent.trim() ? '#fff' : '#94A3B8', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Upload size={14} /> Admit to Evidence
              </button>
            </div>
          )}

          {/* Settlement */}
          {canAct && (isPlaintiff || isDefendant) && c.status !== 'filed' && (
            <div style={{ background: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>Propose Settlement</div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>Reach an agreement without a full verdict.</div>
              {c.settlement?.status === 'proposed' ? (
                <div>
                  <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '12px 14px', marginBottom: 10, border: '1px solid #DDD6FE' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', marginBottom: 4 }}>SETTLEMENT PROPOSED</div>
                    <div style={{ fontSize: 13, color: '#334155', marginBottom: 6 }}>{c.settlement.terms}</div>
                    {c.settlement.amount > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: '#7C3AED' }}>Amount: {fmt(c.settlement.amount)}</div>}
                  </div>
                  {((isPlaintiff || isDefendant) && String(c.settlement.proposedById) !== userId) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => respondSettlement('accept')} style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: 'linear-gradient(135deg,#059669,#047857)', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer' }}>Accept</button>
                      <button onClick={() => respondSettlement('reject')} style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: 12, border: '1px solid #FECACA', cursor: 'pointer' }}>Reject</button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <textarea className="input-field" rows={3} placeholder="Propose settlement terms..." value={settlementTerms} onChange={e => setSettlementTerms(e.target.value)} style={{ resize: 'none', marginBottom: 8 }} />
                  <input className="input-field" type="number" placeholder="Settlement amount (₦) — optional" value={settlementAmount} onChange={e => setSettlementAmount(e.target.value)} style={{ marginBottom: 10 }} />
                  <button onClick={proposeSettlement} disabled={!settlementTerms.trim() || submittingSettlement}
                    style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                      background: settlementTerms.trim() ? `linear-gradient(135deg,${PRIMARY},${PRIMARY_DARK})` : '#E2E8F0',
                      color: settlementTerms.trim() ? '#fff' : '#94A3B8', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <TrendingUp size={14} /> Propose Settlement
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Appeal */}
          {(isPlaintiff || isDefendant) && c.status === 'verdict_delivered' && !c.appeal?.filed && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#92400E', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RotateCcw size={15} color="#D97706" /> Appeal the Verdict
              </div>
              <div style={{ fontSize: 12, color: '#B45309', marginBottom: 12 }}>Disagree with Judge Orizu? State your grounds and request reconsideration.</div>
              <textarea className="input-field" rows={3} placeholder="Your grounds for appeal..." value={appealReason} onChange={e => setAppealReason(e.target.value)} style={{ resize: 'none', marginBottom: 10 }} />
              <button onClick={fileAppeal} disabled={!appealReason.trim() || submittingAppeal}
                style={{ width: '100%', padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 13,
                  background: appealReason.trim() ? 'linear-gradient(135deg,#D97706,#B45309)' : '#E2E8F0',
                  color: appealReason.trim() ? '#fff' : '#94A3B8', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <RotateCcw size={14} /> File Appeal
              </button>
            </div>
          )}
          {c.appeal?.filed && (
            <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400E', marginBottom: 4 }}>Appeal: {c.appeal.status?.toUpperCase()}</div>
              <div style={{ fontSize: 12, color: '#B45309' }}>{c.appeal.reason}</div>
            </div>
          )}

          {!canAct && !isJuror && !isPlaintiff && !isDefendant && (
            <div style={{ textAlign: 'center', color: '#94A3B8', padding: '32px 0', fontSize: 13 }}>
              You are an observer in this case. Only the plaintiff, defendant, and jurors may act.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Courtroom page ──────────────────────────────────────────────────────

export default function Courtroom() {
  const { user } = useAuth();
  const [tab, setTab] = useState('active');
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  const loadCases = async (filter) => {
    setLoading(true);
    try {
      const params = {};
      if (filter === 'active') params.status = 'open,in_hearing,jury_deliberation,judge_deliberation,filed';
      else if (filter === 'mine') params.mine = true;
      else if (filter === 'records') params.status = 'verdict_delivered,settled,closed';
      const res = await courtAPI.listCases(params);
      setCases(res.data.cases || []);
    } catch { setCases([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    courtAPI.getStats().then(r => setStats(r.data.stats)).catch(() => {});
    courtAPI.getMembers().then(r => {
      setResidents((r.data.data || []).map(res => ({
        _id: res._id,
        name: res.name,
        unit: res.unitId ? `${res.unitId.block ? res.unitId.block + ' ' : ''}${res.unitId.unitNumber}` : null,
      })).filter(res => res._id !== user?._id));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== 'file' && !selectedCaseId) loadCases(tab);
  }, [tab, selectedCaseId]);

  if (selectedCaseId) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <CaseDetail caseId={selectedCaseId} onBack={() => { setSelectedCaseId(null); loadCases(tab); }} user={user} />
      </div>
    );
  }

  const TABS = [
    { id: 'active',  label: 'Active Cases' },
    { id: 'file',    label: '+ File Dispute' },
    { id: 'mine',    label: 'My Cases' },
    { id: 'records', label: 'Hall of Records' },
  ];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <CourtroomBanner stats={stats} />

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F8FAFC', borderRadius: 14, padding: 4, border: '1px solid #E2E8F0' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t.id ? (t.id === 'file' ? `linear-gradient(135deg,${PRIMARY},${PRIMARY_DARK})` : '#fff') : 'transparent',
              color: tab === t.id ? (t.id === 'file' ? '#fff' : '#0F172A') : '#64748B',
              boxShadow: tab === t.id && t.id !== 'file' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'file' && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', padding: '24px 24px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>File a Dispute</div>
            <div style={{ fontSize: 13, color: '#64748B' }}>Bring your complaint before Judge Orizu and the AreaConnect Court. Every resident deserves to be heard.</div>
          </div>
          <FileDisputeForm onFiled={() => { setTab('mine'); loadCases('mine'); }} residents={residents} />
        </div>
      )}

      {tab !== 'file' && (
        <div>
          {loading
            ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}><svg className="animate-spin" width={28} height={28} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={PRIMARY} strokeWidth="2.5" strokeOpacity=".2"/><path d="M12 2a10 10 0 0 1 10 10" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round"/></svg></div>
            : cases.length === 0
              ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ background: '#EEF2FF', borderRadius: '50%', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Scale size={28} color={PRIMARY} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', marginBottom: 6 }}>
                    {tab === 'active' ? 'No Active Cases' : tab === 'mine' ? 'No Cases Yet' : 'No Records'}
                  </div>
                  <div style={{ fontSize: 13, color: '#94A3B8', maxWidth: 280, margin: '0 auto 16px' }}>
                    {tab === 'mine' ? "You haven't filed or been named in any cases." : "No cases matching this filter."}
                  </div>
                  {tab === 'mine' && (
                    <button onClick={() => setTab('file')}
                      style={{ padding: '10px 24px', borderRadius: 12, background: `linear-gradient(135deg,${PRIMARY},${PRIMARY_DARK})`, color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <Plus size={14} /> File a Dispute
                    </button>
                  )}
                </div>
              )
              : cases.map(c => <CaseCard key={c._id} c={c} onClick={() => setSelectedCaseId(c._id)} userId={user?._id} />)
          }
        </div>
      )}

      {/* Court guide */}
      <div style={{ marginTop: 32, background: '#1E1B4B', borderRadius: 16, padding: '20px 24px', border: '1px solid #3730A3' }}>
        <div style={{ color: '#A5B4FC', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Your Rights in Court</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
          {[
            { icon: Scale,     title: 'Right to File',      desc: 'Any resident can bring a dispute before the court at any time.' },
            { icon: Briefcase, title: 'Right to Counsel',   desc: 'Hire AI lawyers Adaeze, Emeka, Chidi, or Ngozi for expert representation.' },
            { icon: Star,      title: 'Jury of Your Peers', desc: '5 randomly selected estate residents hear the case and cast votes.' },
            { icon: Gavel,     title: 'Fair Verdict',       desc: 'Judge Orizu weighs all evidence and arguments before ruling.' },
            { icon: TrendingUp,title: 'Settle Amicably',    desc: 'Propose a settlement at any point to resolve the dispute peacefully.' },
            { icon: RotateCcw, title: 'Right of Appeal',    desc: "Disagree with the verdict? File an appeal with Judge Orizu's reconsideration." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: 10 }}>
              <div style={{ background: '#312E81', borderRadius: 8, padding: '6px', flexShrink: 0, height: 'fit-content' }}>
                <Icon size={14} color="#A5B4FC" />
              </div>
              <div>
                <div style={{ color: '#E0E7FF', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{title}</div>
                <div style={{ color: '#4338CA', fontSize: 11, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
