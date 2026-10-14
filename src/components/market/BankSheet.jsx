import { useEffect, useMemo, useState } from 'react';
import { Search, Landmark, CheckCircle2, RefreshCw, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import BottomSheet from '../payments/BottomSheet';

// Add / change the payout account. Pick a bank from a searchable list, type
// the 10-digit NUBAN and the account name is looked up automatically.
export default function BankSheet({ open, onClose, onSaved, currentBank }) {
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolved, setResolved] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBankCode(''); setAccountNumber(''); setResolved(null); setResolveError(''); setQuery(''); setPicking(false);
    if (banks.length) return;
    setLoadingBanks(true);
    api.get('/marketplace/wallet/banks')
      .then(({ data }) => setBanks(data.data || []))
      .catch(() => toast.error('Failed to fetch banks'))
      .finally(() => setLoadingBanks(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-verify once we have a bank and a full 10-digit account number
  useEffect(() => {
    setResolved(null); setResolveError('');
    if (!bankCode || accountNumber.length !== 10) return;
    let cancelled = false;
    setResolving(true);
    api.post('/marketplace/wallet/resolve', { bankCode, accountNumber })
      .then(({ data }) => { if (!cancelled) setResolved(data.data); })
      .catch((err) => { if (!cancelled) setResolveError(err.response?.data?.message || 'Could not verify this account'); })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [bankCode, accountNumber]);

  const selectedBank = banks.find(b => String(b.code) === String(bankCode));
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? banks.filter(b => b.name.toLowerCase().includes(q)) : banks;
  }, [banks, query]);

  const save = async () => {
    setSaving(true);
    try {
      await api.post('/marketplace/wallet/bank', { bankCode, accountNumber });
      toast.success('Bank account saved');
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save bank account');
    } finally { setSaving(false); }
  };

  // ── Bank picker ─────────────────────────────────────────────────────
  if (picking) {
    return (
      <BottomSheet open={open} onClose={onClose} title="Select bank">
        <button onClick={() => setPicking(false)} className="flex items-center gap-1 text-sm text-slate-500 mb-3 -mt-1">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="relative mb-3 sticky top-0 bg-white pb-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search banks"
            className="input-field pl-10 py-3"
          />
        </div>
        {loadingBanks ? (
          <div className="py-10 flex justify-center"><RefreshCw size={18} className="animate-spin text-slate-400" /></div>
        ) : (
          <ul className="divide-y divide-slate-100 -mx-1">
            {filtered.map(b => (
              <li key={`${b.code}-${b.name}`}>
                <button
                  onClick={() => { setBankCode(String(b.code)); setPicking(false); }}
                  className="w-full flex items-center gap-3 px-1 py-3 text-left hover:bg-slate-50 rounded-lg"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">
                    {b.name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm text-slate-800">{b.name}</span>
                  {String(b.code) === String(bankCode) && <Check size={16} className="text-indigo-600" />}
                </button>
              </li>
            ))}
            {!filtered.length && <li className="py-8 text-center text-sm text-slate-400">No bank matches “{query}”</li>}
          </ul>
        )}
      </BottomSheet>
    );
  }

  // ── Account form ────────────────────────────────────────────────────
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={currentBank?.recipientCode ? 'Change bank account' : 'Add bank account'}
      subtitle="Withdrawals are paid into this account"
      footer={
        <button onClick={save} disabled={!resolved || saving} className="btn-primary w-full py-3.5 gap-2 text-base">
          {saving ? <><RefreshCw size={16} className="animate-spin" /> Saving…</> : 'Save account'}
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Bank</label>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="input-field w-full flex items-center gap-3 py-3 text-left"
          >
            <Landmark size={16} className="text-slate-400 shrink-0" />
            <span className={`flex-1 truncate ${selectedBank ? 'text-slate-900' : 'text-slate-400'}`}>
              {selectedBank?.name || (loadingBanks ? 'Loading banks…' : 'Select your bank')}
            </span>
            <ChevronLeft size={16} className="rotate-180 text-slate-400" />
          </button>
        </div>

        <div>
          <label htmlFor="acct-no" className="text-xs font-semibold text-slate-500 mb-1.5 block">Account number</label>
          <input
            id="acct-no"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            placeholder="10-digit account number"
            value={accountNumber}
            onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
            className="input-field py-3 text-lg tracking-[0.2em] font-semibold"
          />
          <div className="text-[11px] text-slate-400 mt-1 text-right">{accountNumber.length}/10</div>
        </div>

        {resolving && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 text-sm text-slate-500">
            <RefreshCw size={14} className="animate-spin" /> Verifying account…
          </div>
        )}
        {resolved && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 size={20} className="text-indigo-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-bold text-emerald-900 truncate">{resolved.accountName}</div>
              <div className="text-xs text-emerald-700">Account verified · make sure this is your name</div>
            </div>
          </div>
        )}
        {resolveError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            <AlertCircle size={14} className="shrink-0" /> {resolveError}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
