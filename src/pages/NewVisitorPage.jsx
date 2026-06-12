import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { visitorAPI } from '../api';
import {
  ChevronLeft, QrCode, Phone, Mail, Calendar, Clock,
  UserCheck, Package, Wrench, Heart, Users, MoreHorizontal,
  FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

const ACCENT      = '#6366F1';
const ACCENT_DARK = '#4F46E5';

const PURPOSES = [
  { label: 'Family',     Icon: Users      },
  { label: 'Friend',     Icon: UserCheck  },
  { label: 'Delivery',   Icon: Package    },
  { label: 'Contractor', Icon: Wrench     },
  { label: 'Medical',    Icon: Heart      },
  { label: 'Other',      Icon: MoreHorizontal },
];

const DURATIONS = [
  { label: '30m',     value: 30  },
  { label: '1h',      value: 60  },
  { label: '2h',      value: 120 },
  { label: '4h',      value: 240 },
  { label: 'All day', value: 480 },
];

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

export default function NewVisitorPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    visitorName: '', visitorPhone: '', visitorEmail: '',
    purpose: '', expectedDate: tomorrow(), expectedTime: '10:00',
    expectedDuration: 60, notes: '',
  });
  const [customPurpose, setCustomPurpose] = useState(false);
  const [showNotes, setShowNotes]         = useState(false);
  const [saving, setSaving]               = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const selectPurpose = (label) => {
    if (label === 'Other') { setCustomPurpose(true); set('purpose', ''); }
    else { setCustomPurpose(false); set('purpose', label); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.visitorName.trim()) { toast.error('Visitor name is required'); return; }
    if (!form.purpose && !customPurpose) { toast.error('Select a purpose'); return; }
    setSaving(true);
    try {
      const expectedDate = new Date(`${form.expectedDate}T${form.expectedTime || '10:00'}`).toISOString();
      const { data } = await visitorAPI.preRegister({
        visitorName:      form.visitorName.trim(),
        visitorPhone:     form.visitorPhone.trim() || undefined,
        visitorEmail:     form.visitorEmail.trim() || undefined,
        purpose:          form.purpose,
        expectedDate,
        expectedDuration: Number(form.expectedDuration) || 60,
        notes:            form.notes.trim() || undefined,
      });
      toast.success('Visitor pass created!');
      navigate(`/visitors/${data.data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create pass');
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
        <button onClick={() => navigate('/visitors')}
          className="p-1.5 rounded-lg transition-all"
          style={{ color: '#94A3B8' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.color = ACCENT; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}>
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-semibold flex-1" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>
          Invite a Visitor
        </h1>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-5">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto pb-8">

          {/* Visitor details */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
              Visitor Details
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>
                  Full Name <span style={{ color: ACCENT }}>*</span>
                </label>
                <input className="input-field" placeholder="e.g. John Adeyemi"
                  value={form.visitorName} onChange={e => set('visitorName', e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
                    <Phone size={12} /> Phone
                  </label>
                  <input className="input-field" placeholder="+234…"
                    value={form.visitorPhone} onChange={e => set('visitorPhone', e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
                    <Mail size={12} /> Email
                  </label>
                  <input type="email" className="input-field" placeholder="optional"
                    value={form.visitorEmail} onChange={e => set('visitorEmail', e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
              Purpose of Visit <span style={{ color: ACCENT }}>*</span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PURPOSES.map(({ label, Icon }) => {
                const isSelected = customPurpose ? label === 'Other' : form.purpose === label;
                return (
                  <button key={label} type="button" onClick={() => selectPurpose(label)}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all"
                    style={isSelected
                      ? { background: 'rgba(99,102,241,0.08)', borderColor: ACCENT, color: ACCENT_DARK }
                      : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#64748B' }}>
                    <Icon size={16} />{label}
                  </button>
                );
              })}
            </div>
            {customPurpose && (
              <input className="input-field mt-2" placeholder="Describe the visit purpose…"
                value={form.purpose} onChange={e => set('purpose', e.target.value)} required autoFocus />
            )}
          </div>

          {/* Schedule */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
              Visit Schedule <span style={{ color: ACCENT }}>*</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
                  <Calendar size={12} /> Date
                </label>
                <input type="date" className="input-field" min={new Date().toISOString().split('T')[0]}
                  value={form.expectedDate} onChange={e => set('expectedDate', e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
                  <Clock size={12} /> Time
                </label>
                <input type="time" className="input-field"
                  value={form.expectedTime} onChange={e => set('expectedTime', e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-sm font-medium mb-2 block" style={{ color: '#475569' }}>Duration</label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map(({ label, value }) => {
                  const isSelected = form.expectedDuration === value;
                  return (
                    <button key={value} type="button" onClick={() => set('expectedDuration', value)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-all"
                      style={isSelected
                        ? { background: ACCENT, borderColor: ACCENT, color: 'white' }
                        : { background: '#F8FAFC', borderColor: '#E2E8F0', color: '#475569' }}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <button type="button" onClick={() => setShowNotes(v => !v)}
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: showNotes ? ACCENT : '#94A3B8' }}>
              <FileText size={14} />
              {showNotes ? 'Hide notes' : 'Add notes (optional)'}
              {showNotes ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showNotes && (
              <textarea className="input-field resize-none mt-2" rows={3}
                placeholder="Any special instructions for security…"
                value={form.notes} onChange={e => set('notes', e.target.value)} />
            )}
          </div>

          {/* Hint */}
          <div className="flex items-start gap-2.5 rounded-xl p-3"
            style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.14)' }}>
            <QrCode size={14} style={{ color: ACCENT, flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: '#64748B' }}>
              A unique access code and QR code will be generated for your visitor.
            </p>
          </div>

          {/* Submit */}
          <button type="submit"
            disabled={saving || !form.visitorName || (!form.purpose && !customPurpose)}
            className="btn-primary w-full gap-2 py-3 text-base">
            <QrCode size={16} />
            {saving ? 'Generating pass…' : 'Create Visitor Pass'}
          </button>

        </form>
      </div>
    </div>
  );
}
