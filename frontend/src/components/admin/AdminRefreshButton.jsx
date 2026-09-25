import React from 'react';

export default function AdminRefreshButton({
  onClick,
  refreshing = false,
  label = 'Refresh',
  size = 'normal',
}) {
  const isSmall = size === 'small';

  return (
    <button
      onClick={onClick}
      disabled={refreshing}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: isSmall ? '0.35rem 0.75rem' : '0.5rem 1rem',
        borderRadius: '8px',
        fontSize: isSmall ? '0.8rem' : '0.85rem',
        fontWeight: 600,
        backgroundColor: '#ffffff',
        color: '#334155',
        border: '1px solid #cbd5e1',
        cursor: refreshing ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e) => {
        if (!refreshing) {
          e.currentTarget.style.backgroundColor = '#f8fafc';
          e.currentTarget.style.borderColor = '#94a3b8';
        }
      }}
      onMouseLeave={(e) => {
        if (!refreshing) {
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.borderColor = '#cbd5e1';
        }
      }}
    >
      <span
        style={{
          display: 'inline-block',
          transform: refreshing ? 'rotate(360deg)' : 'none',
          transition: 'transform 0.5s ease',
        }}
      >
        🔄
      </span>
      <span>{refreshing ? 'Updating...' : label}</span>
    </button>
  );
}
