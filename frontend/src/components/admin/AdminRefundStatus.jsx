import React from 'react';
import AdminStatusBadge from './AdminStatusBadge';

export default function AdminRefundStatus({ status, type, refundId }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <AdminStatusBadge status={status} />
        {type && (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '0.1rem 0.35rem',
              borderRadius: '4px',
              backgroundColor: type === 'GATEWAY_REFUND' ? '#ede9fe' : '#e0f2fe',
              color: type === 'GATEWAY_REFUND' ? '#6d28d9' : '#0369a1',
            }}
          >
            {type === 'GATEWAY_REFUND' ? 'RAZORPAY' : 'INTERNAL SAGA'}
          </span>
        )}
      </div>
      {refundId && (
        <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#4338ca', fontWeight: 600 }}>
          {refundId}
        </span>
      )}
    </div>
  );
}
