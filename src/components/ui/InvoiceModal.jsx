import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, CheckCircle2, Clock, XCircle, MinusCircle } from 'lucide-react';
import { paymentAPI } from '../../api';
import toast from 'react-hot-toast';
import { Z_INDEX } from './Portal';

const fmt = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUS_META = {
  paid:    { label: 'PAID',    icon: CheckCircle2, color: '#059669', bg: '#D1FAE5' },
  pending: { label: 'PENDING', icon: Clock,        color: '#D97706', bg: '#FEF3C7' },
  overdue: { label: 'OVERDUE', icon: XCircle,      color: '#DC2626', bg: '#FEE2E2' },
  waived:  { label: 'WAIVED',  icon: MinusCircle,  color: '#6B7280', bg: '#F3F4F6' },
};

const METHOD_LABELS = {
  cash: 'Cash', bank_transfer: 'Bank Transfer',
  paystack: 'Paystack (Online)', manual: 'Manual Entry',
};

const FREQ_LABELS = {
  one_time: 'One-time', monthly: 'Monthly',
  quarterly: 'Quarterly', annual: 'Annual',
};

function InvoiceDocument({ inv }) {
  const statusMeta = STATUS_META[inv.status] || STATUS_META.pending;
  const StatusIcon = statusMeta.icon;
  const isReceipt = inv.status === 'paid';

  return (
    <div id="invoice-print-area" style={{
      background: '#fff',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#1e293b',
      width: '100%',
      maxWidth: 760,
      margin: '0 auto',
    }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', minHeight: 130 }}>

        {/* Left: estate brand */}
        <div style={{
          flex: 1, background: '#0F172A', padding: '20px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          {/* Logo placeholder / estate initials */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {inv.estate.logoUrl ? (
              <img src={inv.estate.logoUrl} alt="logo"
                style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg,#10B981,#059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 800, color: '#fff',
              }}>
                {inv.estate.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                {inv.estate.name}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Estate Management
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6 }}>
              {inv.estate.address}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
              Code: <span style={{ color: '#10B981', fontWeight: 700 }}>{inv.estate.estateCode}</span>
            </div>
          </div>
        </div>

        {/* Right: hero image with overlay title */}
        <div style={{
          flex: 1.2, position: 'relative', overflow: 'hidden', minHeight: 130,
        }}>
          <img
            src={`${window.location.origin}/estate-hero.jpeg`}
            alt="estate"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(15,23,42,0.7) 0%, rgba(15,23,42,0.2) 100%)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '16px 20px',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {isReceipt ? 'RECEIPT' : 'INVOICE'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: '0.04em' }}>
              {isReceipt ? 'Payment Confirmation' : 'Payment Request'}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10,
              background: statusMeta.bg, color: statusMeta.color,
              fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
              width: 'fit-content', letterSpacing: '0.04em',
            }}>
              <StatusIcon size={10} />
              {statusMeta.label}
            </div>
          </div>
        </div>
      </div>

      {/* ── BILL TO + INVOICE META ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #E2E8F0' }}>

        {/* Bill To */}
        <div style={{ flex: 1, padding: '18px 24px', borderRight: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
            Bill To
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{inv.resident.name}</div>
          {inv.resident.unit !== 'N/A' && (
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>Unit: {inv.resident.unit}</div>
          )}
          <div style={{ fontSize: 12, color: '#64748B' }}>{inv.estate.name}</div>
          {inv.resident.email && (
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{inv.resident.email}</div>
          )}
          {inv.resident.phone && (
            <div style={{ fontSize: 11, color: '#94A3B8' }}>{inv.resident.phone}</div>
          )}
        </div>

        {/* Invoice details grid */}
        <div style={{ flex: 1, padding: '18px 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {[
                ['Invoice No:', inv.invoiceNumber],
                ['Date Issued:', formatDate(inv.date)],
                ['Due Date:', formatDate(inv.dueDate)],
                inv.paidAt && ['Date Paid:', formatDate(inv.paidAt)],
                inv.method && ['Payment Method:', METHOD_LABELS[inv.method] || inv.method],
                inv.recordedBy && ['Recorded By:', inv.recordedBy],
              ].filter(Boolean).map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '4px 0', color: '#94A3B8', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: 12 }}>
                    {label}
                  </td>
                  <td style={{ padding: '4px 0', color: '#0F172A', fontWeight: inv.invoiceNumber === value ? 700 : 500 }}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── LINE ITEMS TABLE ── */}
      <div style={{ padding: '0 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#0F172A' }}>
              {['Description', 'Freq.', 'Qty', 'Unit Price', 'VAT %', 'Amount'].map(h => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: h === 'Description' ? 'left' : 'right',
                  color: '#fff', fontWeight: 700, fontSize: 11,
                  letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inv.items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#F8FAFC' : '#fff' }}>
                <td style={{ padding: '12px 16px', color: '#0F172A' }}>
                  <div style={{ fontWeight: 600 }}>{item.description}</div>
                  {item.detail && (
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{item.detail}</div>
                  )}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748B', fontSize: 12 }}>
                  {FREQ_LABELS[item.frequency] || '—'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0F172A' }}>{item.quantity}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0F172A' }}>{fmt(item.unitPrice)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#64748B' }}>{item.vat}%</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0F172A', fontWeight: 700 }}>
                  {fmt(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── SUMMARY ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 16px 0' }}>
        <table style={{ width: 260, borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            <tr>
              <td style={{ padding: '5px 12px', color: '#64748B' }}>Subtotal</td>
              <td style={{ padding: '5px 12px', textAlign: 'right', color: '#0F172A' }}>{fmt(inv.subtotal)}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 12px', color: '#64748B' }}>VAT (0%)</td>
              <td style={{ padding: '5px 12px', textAlign: 'right', color: '#0F172A' }}>{fmt(0)}</td>
            </tr>
            <tr style={{ borderTop: '2px solid #0F172A' }}>
              <td style={{ padding: '10px 12px', fontWeight: 800, fontSize: 15, color: '#0F172A' }}>TOTAL</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 800, fontSize: 15, color: '#10B981' }}>
                {fmt(inv.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── NOTES ── */}
      {inv.notes && (
        <div style={{ margin: '12px 16px', padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, borderLeft: '3px solid #10B981' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 12, color: '#64748B' }}>{inv.notes}</div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{
        margin: '16px 0 0', padding: '14px 24px',
        background: '#F8FAFC', borderTop: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 11, color: '#94A3B8' }}>
          Powered by <span style={{ color: '#10B981', fontWeight: 700 }}>Area Connector Technologies</span>{'  ·  '}RC 9607864
        </div>
        <div style={{ fontSize: 11, color: '#CBD5E1' }}>
          {inv.invoiceNumber}
        </div>
      </div>
    </div>
  );
}

export default function InvoiceModal({ paymentId, onClose }) {
  const [inv, setInv] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!paymentId) return;
    setLoading(true);
    paymentAPI.getInvoice(paymentId)
      .then(({ data }) => setInv(data.data))
      .catch(() => { toast.error('Could not load invoice'); onClose(); })
      .finally(() => setLoading(false));
  }, [paymentId, onClose]);

  const handlePrint = () => {
    const el = document.getElementById('invoice-print-area');
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${inv?.invoiceNumber || 'Invoice'}</title>
  <base href="${window.location.origin}/">
  <style>
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      box-sizing: border-box;
    }
    html, body {
      margin: 0; padding: 0;
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
    }
    @page {
      margin: 0;
      size: A4 portrait;
    }
    @media print {
      html, body { margin: 0; padding: 0; }
    }
    img { max-width: 100%; }
  </style>
</head>
<body>${el.outerHTML}</body>
</html>`);
    win.document.close();
    win.focus();
    // Wait for every image (hero + logo) to finish loading before printing,
    // otherwise the PDF is captured with blank image slots.
    const imgs = Array.from(win.document.images);
    Promise.all(imgs.map(img => img.complete
      ? Promise.resolve()
      : new Promise(res => { img.onload = res; img.onerror = res; })
    )).then(() => {
      setTimeout(() => { win.print(); win.close(); }, 100);
    });
  };

  if (!paymentId) return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: Z_INDEX.drawer,
        background: 'rgba(15,23,42,0.48)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          width: '100%', maxWidth: 800, boxShadow: '0 24px 64px rgba(15,23,42,0.25)',
          marginTop: 8,
        }}
      >
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: '#0F172A', borderBottom: '1px solid #1E293B',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {loading ? 'Loading…' : inv?.status === 'paid' ? `Receipt — ${inv.invoiceNumber}` : `Invoice — ${inv?.invoiceNumber}`}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {!loading && inv && (
              <>
                <button
                  onClick={handlePrint}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, border: 'none',
                    background: '#1E293B', color: '#94A3B8', fontSize: 12,
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <Printer size={13} /> Print
                </button>
                <button
                  onClick={handlePrint}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 8, border: 'none',
                    background: '#10B981', color: '#fff', fontSize: 12,
                    fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <Download size={13} /> Download PDF
                </button>
              </>
            )}
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 8, border: 'none',
                background: '#1E293B', color: '#94A3B8', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
            Loading invoice…
          </div>
        ) : inv ? (
          <InvoiceDocument inv={inv} />
        ) : null}
      </div>
    </div>,
    document.body
  );
}
