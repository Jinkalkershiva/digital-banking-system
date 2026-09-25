import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="dgb-footer">
      <div className="dgb-container">
        <div className="dgb-footer-grid">
          {/* Brand Col */}
          <div className="dgb-footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
                  <rect x="2" y="5" width="20" height="14" rx="3" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>DGBASE</h3>
            </div>
            <p>
              Digital Banking System, engineered for the future. A production-style,
              event-driven microservices banking platform with distributed SAGA consistency.
            </p>
            <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              Built by <strong>Shiva Jinkalker</strong> • MIT Licensed
            </div>
          </div>

          {/* Architecture Links */}
          <div className="dgb-footer-col">
            <h4>Architecture</h4>
            <ul className="dgb-footer-links">
              <li>
                <button onClick={() => scrollToSection('architecture')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
                  Microservices Map
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('saga-flow')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
                  SAGA State Machine
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('security')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
                  Security & Identity
                </button>
              </li>
              <li>
                <button onClick={() => scrollToSection('challenges')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
                  Challenges Solved
                </button>
              </li>
            </ul>
          </div>

          {/* Platform Access */}
          <div className="dgb-footer-col">
            <h4>Portals</h4>
            <ul className="dgb-footer-links">
              <li>
                <Link to="/login">Customer Sign In</Link>
              </li>
              <li>
                <Link to="/register">Open Digital Account</Link>
              </li>
              <li>
                <Link to="/admin/dashboard" style={{ color: '#fbbf24' }}>
                  👑 Admin Control Center
                </Link>
              </li>
              <li>
                <button onClick={scrollToTop} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
                  Back to Top &uarr;
                </button>
              </li>
            </ul>
          </div>

          {/* Open Source & Docs */}
          <div className="dgb-footer-col">
            <h4>Engineering & Code</h4>
            <ul className="dgb-footer-links">
              <li>
                <a
                  href="https://github.com/Jinkalkershiva/digital-banking-system"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub Repository &rarr;
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Jinkalkershiva/digital-banking-system#readme"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Architecture README
                </a>
              </li>
              <li>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Java 21 • Spring Boot 3 • Kafka • React 19
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="dgb-footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} DGBASE — Digital Banking System. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
              All Microservices Operational
            </span>
            <a
              href="https://github.com/Jinkalkershiva/digital-banking-system"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              GitHub / Jinkalkershiva
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
