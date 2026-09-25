import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function LandingNavbar({ currentAccount, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin =
    currentAccount?.isAdmin === true ||
    currentAccount?.role === 'ROLE_ADMIN' ||
    currentAccount?.role === 'ADMIN' ||
    currentAccount?.user?.role === 'ROLE_ADMIN' ||
    currentAccount?.user?.role === 'ADMIN';

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="dgb-navbar">
      <div className="dgb-container">
        <div className="dgb-nav-inner">
          {/* DGBASE Logo / Wordmark */}
          <Link to="/" className="dgb-brand-link" aria-label="DGBASE Home">
            <div className="dgb-brand-emblem">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="3" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <line x1="6" y1="15" x2="6.01" y2="15" strokeWidth="3" />
                <line x1="10" y1="15" x2="14" y2="15" />
              </svg>
            </div>
            <div className="dgb-brand-name">
              <span>DGBASE</span>
              <span className="dgb-brand-tag">FINTECH</span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="dgb-nav-links" aria-label="Main Navigation">
            <button onClick={() => scrollToSection('features')} className="dgb-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              Features
            </button>
            <button onClick={() => scrollToSection('architecture')} className="dgb-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              Architecture
            </button>
            <button onClick={() => scrollToSection('saga-flow')} className="dgb-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              SAGA Flow
            </button>
            <button onClick={() => scrollToSection('security')} className="dgb-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              Security
            </button>
            <button onClick={() => scrollToSection('tech-stack')} className="dgb-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              Tech Stack
            </button>
            <button onClick={() => scrollToSection('challenges')} className="dgb-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              Challenges Solved
            </button>
            <button onClick={() => scrollToSection('admin-center')} className="dgb-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              Admin Center
            </button>
          </nav>

          {/* Right Action CTAs */}
          <div className="dgb-nav-actions">
            <a
              href="https://github.com/Jinkalkershiva/digital-banking-system"
              target="_blank"
              rel="noopener noreferrer"
              className="dgb-btn-ghost"
              aria-label="GitHub Repository"
              title="View on GitHub"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span>GitHub</span>
            </a>

            {currentAccount ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Link
                  to={isAdmin ? '/admin/dashboard' : '/'}
                  className={isAdmin ? 'dgb-btn-primary' : 'dgb-btn-emerald'}
                >
                  <span>{isAdmin ? '👑 Admin Center' : '📊 Customer Dashboard'}</span>
                </Link>
                {onLogout && (
                  <button onClick={onLogout} className="dgb-btn-ghost" title="Exit Session">
                    Exit
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Link to="/login" className="dgb-btn-ghost">
                  Sign In
                </Link>
                <Link to="/register" className="dgb-btn-primary">
                  Open Account
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
