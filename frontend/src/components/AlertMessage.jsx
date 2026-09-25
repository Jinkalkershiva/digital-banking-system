import React from 'react';

export default function AlertMessage({ type = 'info', message, onClose }) {
  if (!message) return null;

  const typeClass = `alert-${type}`;

  return (
    <div className={`alert-box ${typeClass}`}>
      <div style={{ flex: 1 }}>{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.1rem',
            cursor: 'pointer',
            opacity: 0.7,
            marginLeft: '0.5rem',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}
