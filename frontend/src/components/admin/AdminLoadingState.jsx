import React from 'react';

export default function AdminLoadingState({
  message = 'Loading banking ledger telemetry...',
  rows = 4,
}) {
  return (
    <div
      style={{
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        margin: '1rem 0',
      }}
    >
      <div
        className="spinner"
        style={{
          width: '36px',
          height: '36px',
          borderWidth: '3px',
          borderColor: '#e2e8f0',
          borderTopColor: '#3b82f6',
          marginBottom: '1rem',
        }}
      ></div>
      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>
        {message}
      </p>
    </div>
  );
}
