import React from 'react';

export default function AdminErrorState({
  title = 'Failed to Load Telemetry',
  message = 'An unexpected error occurred while communicating with the backend microservices.',
  onRetry,
}) {
  return (
    <div
      style={{
        padding: '1.5rem',
        borderRadius: '12px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        margin: '1rem 0',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#fee2e2',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem',
          flexShrink: 0,
        }}
      >
        ⚠️
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#991b1b' }}>
          {title}
        </h4>
        <p style={{ margin: '0.35rem 0 0.85rem 0', fontSize: '0.875rem', color: '#b91c1c', lineHeight: 1.5 }}>
          {message}
        </p>

        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '0.4rem 0.9rem',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>🔄</span>
            <span>Retry Request</span>
          </button>
        )}
      </div>
    </div>
  );
}
