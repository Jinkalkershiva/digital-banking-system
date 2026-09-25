import React from 'react';

export default function AdminFraudAlert({
  ruleName,
  reason,
  accountNumber,
  amount,
  timestamp,
}) {
  return (
    <div
      style={{
        backgroundColor: '#fff1f2',
        border: '1px solid #fecdd3',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: '#ffe4e6',
          color: '#e11d48',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
          flexShrink: 0,
        }}
      >
        🛡️
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <strong style={{ fontSize: '0.9rem', color: '#9f1239' }}>{ruleName || 'Fraud Rule Triggered'}</strong>
            {accountNumber && (
              <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#be123c', backgroundColor: '#ffe4e6', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                Acc #{accountNumber}
              </span>
            )}
          </div>
          {timestamp && (
            <span style={{ fontSize: '0.75rem', color: '#9f1239', opacity: 0.8 }}>
              {typeof timestamp === 'string' && timestamp.includes('T')
                ? new Date(timestamp).toLocaleTimeString()
                : timestamp}
            </span>
          )}
        </div>

        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.825rem', color: '#be123c', lineHeight: 1.4 }}>
          {reason}
        </p>

        {amount !== undefined && (
          <div style={{ marginTop: '0.4rem', fontSize: '0.8rem', fontWeight: 700, color: '#e11d48' }}>
            Amount: ₹{Number(amount || 0).toFixed(2)}
          </div>
        )}
      </div>
    </div>
  );
}
