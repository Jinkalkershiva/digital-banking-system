import React from 'react';

export default function Navbar({ currentAccount, onLogout }) {
  const isAdmin = currentAccount?.isAdmin || currentAccount?.role === 'ROLE_ADMIN' || currentAccount?.role === 'ADMIN';

  return (
    <header className="navbar">
      <div className="nav-left">
        <div className="nav-title">
          <svg className="bank-logo" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7v2h20V7L12 2zm-8 7h2v11H4V9zm6 0h2v11h-2V9zm6 0h2v11h-2V9zm4 0h2v11h-2V9zM2 20h20v2H2v-2z" />
          </svg>
          <span>Apex Digital Bank</span>
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
        </div>
      </div>

      <div className="nav-right">
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
