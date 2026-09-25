import React from 'react';

export default function AdminSectionCard({
  title,
  subtitle,
  icon,
  badge,
  actions,
  children,
  style = {},
}) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid var(--color-border, #e2e8f0)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        padding: '1.5rem',
        marginBottom: '1.75rem',
        ...style,
      }}
    >
      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--color-border, #e2e8f0)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {icon && (
              <span
                style={{
                  fontSize: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  color: '#2563eb',
                }}
              >
                {icon}
              </span>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--color-primary, #0f172a)' }}>
                  {title}
                </h3>
                {badge}
              </div>
              {subtitle && (
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-secondary, #64748b)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>{actions}</div>}
        </div>
      )}

      {children}
    </div>
  );
}
