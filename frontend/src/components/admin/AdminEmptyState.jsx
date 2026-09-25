import React from 'react';

export default function AdminEmptyState({
  icon = '📭',
  title = 'No Data Available',
  message = 'There are no records to display for the selected criteria.',
  action,
}) {
  return (
    <div
      style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1',
        margin: '1rem 0',
      }}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{icon}</div>
      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
        {title}
      </h4>
      <p style={{ margin: '0.5rem 0 1rem 0', fontSize: '0.875rem', color: '#64748b', maxWidth: '400px' }}>
        {message}
      </p>
      {action}
    </div>
  );
}
