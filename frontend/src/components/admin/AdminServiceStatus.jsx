import React from 'react';
import AdminStatusBadge from './AdminStatusBadge';

export default function AdminServiceStatus({
  name,
  port,
  protocol,
  routePrefix,
  role,
  status = 'UP',
  responseTimeMs,
  details,
}) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            {name}
          </h4>
          <AdminStatusBadge status={status} />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {port && (
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
              }}
            >
              :{port}
            </span>
          )}
          {protocol && (
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {protocol}
            </span>
          )}
        </div>

        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.825rem', color: '#475569', lineHeight: 1.4 }}>
          {role}
        </p>
      </div>

      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '0.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: '#94a3b8',
        }}
      >
        <span>{routePrefix || details || 'Operational'}</span>
        {responseTimeMs !== undefined && (
          <span style={{ fontFamily: 'monospace', fontWeight: 600, color: responseTimeMs < 100 ? '#16a34a' : '#ea580c' }}>
            {responseTimeMs}ms
          </span>
        )}
      </div>
    </div>
  );
}
