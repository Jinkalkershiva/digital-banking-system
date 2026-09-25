import React from 'react';
import AdminStatusBadge from './AdminStatusBadge';

export default function AdminTransactionStatus({ status, failureReason }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' }}>
      <AdminStatusBadge status={status} />
      {failureReason && (
        <span
          style={{
            fontSize: '0.7rem',
            color: '#dc2626',
            maxWidth: '180px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={failureReason}
        >
          {failureReason}
        </span>
      )}
    </div>
  );
}
