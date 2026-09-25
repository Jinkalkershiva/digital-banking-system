import React from 'react';

export default function AdminHeader({
  currentUser,
  onRefresh,
  refreshing = false,
  onLogout,
  title = 'Executive Banking Control Center',
  subtitle = 'System Administration • Role: ADMIN • Real-time Microservices Telemetry',
  actions,
}) {
  const username = currentUser?.username || currentUser?.user?.username || 'admin';
  const role = currentUser?.role || currentUser?.user?.role || 'ROLE_ADMIN';

  return (
    <header
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '1.5rem 2rem',
        marginBottom: '2rem',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Top Session Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          paddingBottom: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
              <rect x="2" y="5" width="20" height="14" rx="3" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.05rem', color: '#f8fafc' }}>
            DGBASE <span style={{ color: '#38bdf8', fontSize: '0.8rem', fontWeight: 700, padding: '0.15rem 0.5rem', background: 'rgba(56, 189, 248, 0.15)', borderRadius: '6px' }}>ADMIN</span>
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.4)', margin: '0 0.25rem' }}>•</span>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Identity Store:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>SpringSecEx</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.85rem',
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
            <span style={{ fontWeight: 600 }}>{username}</span>
            <span
              style={{
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.15rem 0.45rem',
                borderRadius: '4px',
              }}
            >
              {role}
            </span>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.35rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ef4444';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.color = '#fca5a5';
              }}
            >
              Exit Session
            </button>
          )}
        </div>
      </div>

      {/* Main Title & Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
            {title}
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>
            {subtitle}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {actions}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1.15rem',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => !refreshing && (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseLeave={(e) => !refreshing && (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s ease' }}>
                🔄
              </span>
              <span>{refreshing ? 'Refreshing Telemetry...' : 'Refresh Telemetry'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
