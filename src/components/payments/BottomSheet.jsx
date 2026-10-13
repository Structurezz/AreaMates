import { X } from 'lucide-react';
import { useEffect } from 'react';
import Portal, { Z, useScrollLock } from '../ui/Portal';

// Drop-in replacement for <Modal> that behaves like a native banking app:
// slides up from the bottom on phones (thumb-reachable, full width) and is a
// centred dialog from the sm breakpoint up.
export default function BottomSheet({ open, onClose, title, subtitle, children, footer }) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
    <div className={`fixed inset-0 ${Z.drawer} flex items-end sm:items-center justify-center sm:p-4`} onClick={onClose}>
      <div className="overlay-backdrop" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-panel relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]"
        style={{ boxShadow: '0 -8px 40px rgba(15,23,42,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-slate-200" />
        </div>

        {title && (
          <div className="flex items-start justify-between gap-3 px-5 pt-2 sm:pt-5 pb-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 -mr-1 shrink-0 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="px-5 pb-5 overflow-y-auto flex-1">{children}</div>

        {footer && (
          <div
            className="px-5 pt-3 border-t border-slate-100 bg-white rounded-b-2xl"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
    </Portal>
  );
}
