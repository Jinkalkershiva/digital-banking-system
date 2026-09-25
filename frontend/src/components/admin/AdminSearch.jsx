import React from 'react';

export default function AdminSearch({
  value,
  onChange,
  placeholder = 'Search records...',
  style = {},
}) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        minWidth: '280px',
        ...style,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: '0.85rem',
          color: '#94a3b8',
          fontSize: '0.95rem',
          pointerEvents: 'none',
        }}
      >
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '0.6rem 2.2rem 0.6rem 2.4rem',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          fontSize: '0.875rem',
          outline: 'none',
          transition: 'all 0.15s ease',
          backgroundColor: '#f8fafc',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#3b82f6';
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#cbd5e1';
          e.currentTarget.style.backgroundColor = '#f8fafc';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          style={{
            position: 'absolute',
            right: '0.65rem',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.8rem',
            padding: '0.2rem',
          }}
          title="Clear search"
        >
          ✖
        </button>
      )}
    </div>
  );
}
