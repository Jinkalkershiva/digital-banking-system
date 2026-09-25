import React from 'react';

export default function AdminFilterBar({
  filters = [],
  activeFilter,
  onFilterChange,
  style = {},
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {filters.map((f) => {
        const key = typeof f === 'string' ? f : f.key;
        const label = typeof f === 'string' ? f : f.label;
        const count = typeof f === 'object' ? f.count : undefined;
        const isActive = activeFilter === key;

        return (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: `1px solid ${isActive ? '#3b82f6' : '#e2e8f0'}`,
              backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : '#ffffff',
              color: isActive ? '#1d4ed8' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{label}</span>
            {count !== undefined && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '9999px',
                  backgroundColor: isActive ? '#3b82f6' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#64748b',
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
