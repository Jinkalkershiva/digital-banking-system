import React from 'react';

export default function AdminStatusBadge({ status, size = 'normal' }) {
  if (!status) return null;

  const s = String(status).toUpperCase();

  let bg = '#f1f5f9';
  let text = '#475569';
  let icon = '●';

  switch (s) {
    case 'COMPLETED':
    case 'SUCCESS':
    case 'ACTIVE':
    case 'CAPTURED':
    case 'UP':
    case 'ONLINE':
    case 'REFUNDED':
    case 'COMPENSATED':
      bg = '#dcfce7';
      text = '#15803d';
      icon = '🟢';
      break;

    case 'PROCESSING':
    case 'PENDING':
    case 'PENDING_VERIFICATION':
    case 'REFUND_PENDING':
    case 'AUTHORIZED':
    case 'DEGRADED':
    case 'CREATED':
      bg = '#fef3c7';
      text = '#b45309';
      icon = '🟡';
      break;

    case 'FLAGGED':
    case 'FAILED':
    case 'BLOCKED':
    case 'DOWN':
    case 'OFFLINE':
    case 'REFUND_FAILED':
    case 'CANCELLED':
      bg = '#fee2e2';
      text = '#b91c1c';
      icon = '🔴';
      break;

    default:
      bg = '#e0e7ff';
      text = '#4338ca';
      icon = '🔵';
  }

  const padding = size === 'small' ? '0.15rem 0.5rem' : '0.25rem 0.65rem';
  const fontSize = size === 'small' ? '0.7rem' : '0.75rem';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding,
        borderRadius: '9999px',
        fontSize,
        fontWeight: 700,
        letterSpacing: '0.02em',
        backgroundColor: bg,
        color: text,
        border: `1px solid ${bg === '#f1f5f9' ? '#cbd5e1' : 'transparent'}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: '0.65rem' }}>{icon}</span>
      <span>{s}</span>
    </span>
  );
}
