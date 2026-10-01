import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { visitorAPI } from '../../api';
import { UserCheck, Clock, X, Shield, CheckCircle2, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * EarlyEntryModal — fires when the guard scans a visitor who's too early.
 * Resident sees who it is and can tap "Allow entry now" to grant the guard
 * permission to check them in immediately.
 */
export default function EarlyEntryModal() {
  const { subscribe } = useSocket() || {};
  const [request, setRequest] = useState(null);
  const [sending, setSending] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!subscribe) return;
    const unsub = subscribe('visitor_early_arrival', (payload) => {
      setRequest(payload);
      // Soft chime
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio('data:audio/wav;base64,UklGRkIDAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YR4DAAD//wIA/v8DAP3/BQD6/wgA9f8NAO//FADm/x4A3P8qANH/OADD/0gAtP9ZAKT/awCT/34Agv+SAHD/pgBf/7oATv/OAD3/4gAu//UAIP8IATP/DQFJ/w0BWv8IAWf/+gBw/+UAdv/HAHj/ogB5/3cAef9FAHn/EAB4/9f/eP+c/3n/X/97/yP/f//q/oX/tv6N/4j+l/9h/qT/Qf6z/yn+xP8Z/tf/E/7q/xf+/v8l/hAAPP4iAFz+MgCG/kAAtf5LAOj+UwAf/1cAV/9XAJD/UwDK/0wAAgBCADsANgBwACoAoAAeAM4AEgD4AAcAHwH9/0IB9f9iAfD/fQHt/5MB7P+kAe3/sQHv/7gB9P+6AfkAtwEABKUAAJoBAQAC/zb8Af8y/Pn+ivzw/vP86f5a/eT+xP3h/i/+4v6a/un+/f73/k7/CP+Y/x7/0v83/wIAU/8qAHP/SwCT/2kAtf+DANf/mQD4/6oAGQC4ADgAwQBWAMcAcQDJAIsAyAChAMMAtQC7AMUArwDRAKAA2wCOAOAAegDiAGMA4ABKANsALgDRABEAwwDyALEA0gCbAOIAggDuAGUA9gBFAPkAIgD4AP//8ADY/+UArv/UAIH/vwBS/6YAIP+KAOz+ywEBoHm/MIBAAA5sKgDJT24AlBF6AI3SgQCWmYMAs2WAALE2eAC0DGwAwuhbAMvJRgDUr0wAwJoBAJuJVgBnfI0A/XMKAARvFACpbTEA3W5RAFxyBwBHd4oA2n02AO6FBwBKj3AAtJm9AEWlAwDWseEBWL8NA8rNiNNi3q7B9+j2tXT1');
        }
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(() => {});
      } catch { /* audio may fail in silent browsers */ }
    });
    return unsub;
  }, [subscribe]);

  const handleAllow = async () => {
    if (!request || sending) return;
    setSending(true);
    try {
      await visitorAPI.approveEarly(request.visitorId);
      toast.success(`${request.visitorName} will be let in now.`, { duration: 5000 });
      setRequest(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve');
    } finally {
      setSending(false);
    }
  };

  const handleDeny = () => {
    toast(`${request?.visitorName} will have to wait for the expected time.`, { icon: '⏳' });
    setRequest(null);
  };

  if (!request) return null;

  const earlyText = (() => {
    const mins = request.minsEarly || 0;
    if (mins < 60) return `${mins} min early`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m early` : `${h}h early`;
  })();

  const expectedTime = request.expectedDate
    ? new Date(request.expectedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      background: 'rgba(0,0,0,0.70)',
      backdropFilter: 'blur(6px)',
      animation: 'fade-in 0.2s ease-out',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 380,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(99,102,241,0.25)',
        border: '2px solid #6366F1',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          padding: '22px 20px 18px', textAlign: 'center', position: 'relative',
        }}>
          <button
            onClick={handleDeny}
            style={{
              position: 'absolute', top: 12, right: 12,
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: 8, width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          ><X size={14} /></button>
          <div style={{
            width: 56, height: 56, borderRadius: 99,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px',
          }}>
            <UserCheck size={26} color="#fff" />
          </div>
          <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>
            Visitor at the gate — early
          </h2>
          <div style={{ color: 'rgba(255,255,255,0.80)', fontSize: 12, fontWeight: 600, marginTop: 4 }}>
            {earlyText}{expectedTime ? ` · expected ${expectedTime}` : ''}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px 20px' }}>
          {/* Visitor card */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: 14, borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(99,102,241,0.02))',
            border: '1px solid rgba(99,102,241,0.18)',
            marginBottom: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'rgba(99,102,241,0.15)',
              color: '#4F46E5', fontWeight: 800, fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {(request.visitorName || '?')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>{request.visitorName}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{request.purpose || 'Visit'}</div>
              {request.visitorPhone && (
                <a href={`tel:${request.visitorPhone}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: '#6366F1', marginTop: 4, textDecoration: 'none', fontWeight: 600,
                }}>
                  <Phone size={10} /> {request.visitorPhone}
                </a>
              )}
            </div>
          </div>

          <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 16px', textAlign: 'center' }}>
            Guard scanned the pass. They're ready to let your guest in as soon as you approve.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleDeny}
              style={{
                flex: 1, padding: '12px', background: '#F1F5F9',
                color: '#64748B', border: 'none', borderRadius: 12,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}
            >Not now</button>
            <button
              onClick={handleAllow}
              disabled={sending}
              style={{
                flex: 2, padding: '12px',
                background: sending ? '#94A3B8' : 'linear-gradient(135deg, #10B981, #059669)',
                color: '#fff', border: 'none', borderRadius: 12,
                fontSize: 14, fontWeight: 800, cursor: sending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: sending ? 'none' : '0 8px 20px rgba(16,185,129,0.35)',
              }}
            >
              <CheckCircle2 size={15} />
              {sending ? 'Approving…' : 'Allow entry now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
