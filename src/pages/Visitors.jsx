import { useEffect, useState } from 'react';
import { visitorAPI } from '../api';
import Badge, { visitorStatusBadge } from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import { UserCheck, Plus, Download, QrCode, X, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function VisitorPassModal({ visitor, onClose }) {
  if (!visitor) return null;
  return (
    <Modal open={!!visitor} onClose={onClose} title="Visitor Pass">
      <div className="text-center space-y-6">
        <div>
          <div className="text-2xl font-display font-bold text-white mb-0.5">{visitor.visitorName}</div>
          <div className="text-white/50 text-sm">{visitor.purpose}</div>
        </div>

        <div className="glass-card-gold p-6 inline-block">
          <div className="text-xs text-white/50 uppercase tracking-widest mb-2">Access Code</div>
          <div className="visitor-code text-5xl font-bold text-gold">{visitor.visitorCode}</div>
        </div>

        {visitor.qrCodeUrl && (
          <div>
            <img
              src={visitor.qrCodeUrl}
              alt="QR Code"
              className="w-48 h-48 mx-auto rounded-xl"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <p className="text-white/40 text-xs mt-2">Scan at the security gate</p>
          </div>
        )}

        <div className="text-sm text-white/60 space-y-1">
          <div>Expected: <span className="text-white">{format(new Date(visitor.expectedDate), 'PPP · p')}</span></div>
          {visitor.hostResidentId && (
            <div>Host: <span className="text-white">{visitor.hostResidentId.name}</span></div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function NewVisitorForm({ onClose, onSuccess }) {
  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    visitorName: '', visitorPhone: '', visitorEmail: '',
    purpose: '', expectedDate: tomorrow(), expectedTime: '10:00',
    expectedDuration: 60, notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // null | 'date' | 'time'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const expectedDate = form.expectedDate && form.expectedTime
        ? new Date(`${form.expectedDate}T${form.expectedTime}`).toISOString()
        : form.expectedDate;
      const { data } = await visitorAPI.preRegister({ ...form, expectedDate });
      toast.success('Visitor pass created!');
      onSuccess(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-sm text-white/60 mb-1.5 block">Visitor Full Name *</label>
          <input className="input-field" value={form.visitorName}
            onChange={(e) => set('visitorName', e.target.value)} required />
        </div>
        <div>
          <label className="text-sm text-white/60 mb-1.5 block">Phone Number</label>
          <input className="input-field" value={form.visitorPhone}
            onChange={(e) => set('visitorPhone', e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-white/60 mb-1.5 block">Email</label>
          <input type="email" className="input-field" value={form.visitorEmail}
            onChange={(e) => set('visitorEmail', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-sm text-white/60 mb-1.5 block">Purpose of Visit *</label>
          <input className="input-field" value={form.purpose}
            onChange={(e) => set('purpose', e.target.value)} required />
        </div>
      </div>

      {/* Date & Time pickers */}
      <div>
        <label className="text-sm text-white/60 mb-1.5 block">Expected Date & Time *</label>
        <div className="flex gap-2">
          {/* Date pill */}
          <button type="button" onClick={() => setActivePicker(p => p === 'date' ? null : 'date')}
            className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              activePicker === 'date'
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                : form.expectedDate
                  ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                  : 'border-white/10 text-white/35 hover:border-white/20'
            }`}>
            <Calendar size={14} className="shrink-0" />
            {form.expectedDate
              ? new Date(form.expectedDate + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
              : 'Select date'}
          </button>
          {/* Time pill */}
          <button type="button" onClick={() => setActivePicker(p => p === 'time' ? null : 'time')}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              activePicker === 'time'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : form.expectedTime
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                  : 'border-white/10 text-white/35 hover:border-white/20'
            }`}>
            <Clock size={14} className="shrink-0" />
            {form.expectedTime || 'Time'}
          </button>
        </div>

        {activePicker === 'date' && (
          <div className="mt-2 rounded-xl border border-blue-500/20 bg-white/4 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Calendar size={13} className="text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-white">Select Date</span>
              <button type="button" onClick={() => setActivePicker(null)} className="ml-auto text-white/30 hover:text-white/60">
                <X size={14} />
              </button>
            </div>
            <input type="date" min={new Date().toISOString().split('T')[0]}
              value={form.expectedDate}
              onChange={(e) => { set('expectedDate', e.target.value); setActivePicker(null); }}
              className="input-field w-full cursor-pointer" autoFocus />
          </div>
        )}

        {activePicker === 'time' && (
          <div className="mt-2 rounded-xl border border-amber-500/20 bg-white/4 backdrop-blur-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Clock size={13} className="text-amber-400" />
              </div>
              <span className="text-sm font-semibold text-white">Select Time</span>
              <button type="button" onClick={() => setActivePicker(null)} className="ml-auto text-white/30 hover:text-white/60">
                <X size={14} />
              </button>
            </div>
            <input type="time"
              value={form.expectedTime}
              onChange={(e) => { set('expectedTime', e.target.value); setActivePicker(null); }}
              className="input-field w-full cursor-pointer" autoFocus />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-sm text-white/60 mb-1.5 block">Duration (mins)</label>
          <input type="number" className="input-field" value={form.expectedDuration}
            onChange={(e) => set('expectedDuration', e.target.value)} min={15} max={1440} />
        </div>
        <div className="col-span-2">
          <label className="text-sm text-white/60 mb-1.5 block">Notes (optional)</label>
          <textarea className="input-field resize-none" rows={2} value={form.notes}
            onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>

      <p className="text-xs text-white/40">
        The visitor will receive their access code via email/SMS automatically.
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1 gap-2">
          <QrCode size={14} />
          {saving ? 'Generating pass...' : 'Create Visitor Pass'}
        </button>
      </div>
    </form>
  );
}

export default function ResidentVisitors() {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await visitorAPI.getAll();
      setVisitors(data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-1">My Visitor Passes</h1>
          <p className="text-white/50 text-sm">Pre-register guests and manage their access</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary gap-2">
          <Plus size={16} /> Invite Visitor
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Spinner /></div>
      ) : visitors.length === 0 ? (
        <EmptyState icon={UserCheck} title="No visitors registered" message="Create a visitor pass for your guests" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visitors.map((v) => (
            <div key={v._id} className="glass-card p-5 hover:border-gold/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-gold font-semibold">
                  {v.visitorName[0]}
                </div>
                <Badge variant={visitorStatusBadge(v.status)}>{v.status}</Badge>
              </div>
              <div className="font-medium text-white mb-0.5">{v.visitorName}</div>
              <div className="text-white/50 text-sm mb-3">{v.purpose}</div>
              <div className="visitor-code text-gold text-lg mb-3">{v.visitorCode}</div>
              <div className="text-xs text-white/30 mb-4">
                {format(new Date(v.expectedDate), 'MMM d, yyyy · p')}
              </div>
              <button
                onClick={() => setSelectedVisitor(v)}
                className="btn-outline w-full text-sm gap-2"
              >
                <QrCode size={15} /> View Pass
              </button>
            </div>
          ))}
        </div>
      )}

      {/* New visitor modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Invite a Visitor" size="lg">
        <NewVisitorForm
          onClose={() => setShowNew(false)}
          onSuccess={(v) => {
            setShowNew(false);
            setSelectedVisitor(v);
            load();
          }}
        />
      </Modal>

      <VisitorPassModal visitor={selectedVisitor} onClose={() => setSelectedVisitor(null)} />
    </div>
  );
}
