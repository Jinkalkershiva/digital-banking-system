import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar({ currentAccount, onLogout }) {
  const isAdmin = currentAccount?.isAdmin || currentAccount?.role === 'ROLE_ADMIN' || currentAccount?.role === 'ADMIN';

  return (
    <header className="navbar">
      <div className="nav-left">
        <Link to="/" className="nav-title" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '0.65rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
              <rect x="2" y="5" width="20" height="14" rx="3" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em' }}>DGBASE</span>
          <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '0.4rem', fontWeight: 600 }}>FINTECH</span>
          {isAdmin && (
            <span
              style={{
                marginLeft: '0.75rem',
                padding: '0.2rem 0.5rem',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              ADMIN
            </span>
          )}
        </Link>
      </div>

      <div className="nav-right">
        <Link
          to="/showcase"
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--accent)',
            textDecoration: 'none',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            background: 'var(--accent-subtle)',
            marginRight: '0.5rem',
          }}
          title="View Engineering Showcase Landing Page"
        >
          🚀 Showcase
        </Link>

        {currentAccount && (
          <div className="user-profile-badge">
            <div className="avatar-circle">
              {isAdmin
                ? '👑'
                : currentAccount.accountHolderName
                ? currentAccount.accountHolderName.charAt(0).toUpperCase()
                : 'U'}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                {isAdmin
                  ? currentAccount.username || 'System Administrator'
                  : currentAccount.accountHolderName || 'Account Holder'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {isAdmin
                  ? 'ROLE_ADMIN (SpringSecEx)'
                  : `Acc: ${currentAccount.accountNumber || 'N/A'}`}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          className="btn-secondary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
          title="Switch Account / Logout"
        >
          Exit Session
        </button>
      </div>
    </header>
  );
}
