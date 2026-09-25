import React from 'react';

export default function AdminMetricCard({
  title,
  value,
  subtext,
  icon,
  color = '#2563eb',
}) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
      }}
    >
      {icon && (
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: `${color}15`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', marginTop: '0.1rem' }}>
          {value}
        </div>
        {subtext && (
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.1rem' }}>
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
