import React from 'react';

export default function AdminStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  colorScheme = 'blue',
  onClick,
}) {
  const schemes = {
    blue: {
      bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.02) 100%)',
      border: 'rgba(59, 130, 246, 0.2)',
      iconBg: 'rgba(59, 130, 246, 0.15)',
      accent: '#2563eb',
    },
    purple: {
      bg: 'linear-gradient(135deg, rgba(147, 51, 234, 0.08) 0%, rgba(126, 34, 206, 0.02) 100%)',
      border: 'rgba(147, 51, 234, 0.2)',
      iconBg: 'rgba(147, 51, 234, 0.15)',
      accent: '#9333ea',
    },
    green: {
      bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.02) 100%)',
      border: 'rgba(16, 185, 129, 0.2)',
      iconBg: 'rgba(16, 185, 129, 0.15)',
      accent: '#059669',
    },
    amber: {
      bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.02) 100%)',
      border: 'rgba(245, 158, 11, 0.2)',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      accent: '#d97706',
    },
    emerald: {
      bg: 'linear-gradient(135deg, rgba(20, 184, 166, 0.08) 0%, rgba(13, 148, 136, 0.02) 100%)',
      border: 'rgba(20, 184, 166, 0.2)',
      iconBg: 'rgba(20, 184, 166, 0.15)',
      accent: '#0d9488',
    },
    rose: {
      bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(225, 29, 72, 0.02) 100%)',
      border: 'rgba(244, 63, 94, 0.2)',
      iconBg: 'rgba(244, 63, 94, 0.15)',
      accent: '#e11d48',
    },
  };

  const scheme = schemes[colorScheme] || schemes.blue;

  return (
    <div
      onClick={onClick}
      style={{
        background: scheme.bg,
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        border: `1px solid ${scheme.border}`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.06)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.03)';
        }
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </span>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-primary, #0f172a)', marginTop: '0.35rem', letterSpacing: '-0.02em' }}>
            {value}
          </div>
        </div>
        {icon && (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: scheme.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary, #64748b)' }}>
          {subtitle}
        </span>
        {trend && (
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: scheme.accent }}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
