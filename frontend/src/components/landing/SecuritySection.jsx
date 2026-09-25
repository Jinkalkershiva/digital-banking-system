import React from 'react';

export default function SecuritySection() {
  const securityPillars = [
    {
      icon: '🛡️',
      title: 'Spring Cloud Gateway Edge Shield',
      desc: 'Centralized security filter intercepts all external traffic on port 8080, authenticating JWT headers before any request reaches downstream microservices.',
      tag: 'NETTY WEBFLUX',
      color: '#38bdf8',
    },
    {
      icon: '🔐',
      title: 'BCrypt Salted Passwords (12 Rounds)',
      desc: 'Customer and administrative credentials are cryptographically salted and hashed using 12 computational rounds in SpringSecEx. Zero plaintext passwords.',
      tag: 'HMAC-SHA384 JWT',
      color: '#06b6d4',
    },
    {
      icon: '⏱️',
      title: 'Ephemeral 300s OTP Storage',
      desc: 'Two-factor transaction OTPs are generated on demand and stored in Redis with a strict 300-second TTL. Attempt counters prevent brute-force attacks (lockout after 3 failures).',
      tag: 'REDIS TTL',
      color: '#10b981',
    },
    {
      icon: '🚨',
      title: 'Autonomous Fraud Rate Limiting',
      desc: 'Redis sliding-window counters track transaction frequency per account (max 5/min). Single-transfer drain checks trigger 2FA if funds exceed 90% of account balance.',
      tag: 'SLIDING WINDOW',
      color: '#ef4444',
    },
    {
      icon: '👑',
      title: 'Strict Role-Based Access (RBAC)',
      desc: 'Privileged operations (account freeze, user management, refund execution, rule modifications) are restricted to Spring Security principals with authority ROLE_ADMIN.',
      tag: 'ROLE_ADMIN GUARD',
      color: '#f59e0b',
    },
    {
      icon: '🗄️',
      title: 'Isolated Database Schemas (ACID)',
      desc: 'Microservices maintain isolated MySQL schemas (auth_db, account_db, payment_db) ensuring strict domain isolation and preventing shared database bottlenecks.',
      tag: 'ACID ISOLATION',
      color: '#8b5cf6',
    },
  ];

  return (
    <section id="security" className="dgb-section">
      <div className="dgb-container">
        <div className="dgb-section-header">
          <div
            className="dgb-section-pill"
            style={{
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <span>🔒 Cryptographic & Layered Defense</span>
          </div>
          <h2 className="dgb-section-title">
            Enterprise-Grade Banking Security
          </h2>
          <p className="dgb-section-desc">
            DGBASE combines perimeter rate-limiting, cryptographic identity tokens,
            in-memory 2FA challenges, and real-time fraud scoring to protect customer assets.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {securityPillars.map((p, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--dgb-navy-card)',
                border: '1px solid var(--dgb-navy-border)',
                borderRadius: '16px',
                padding: '1.75rem',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = p.color;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--dgb-navy-border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: `${p.color}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.3rem',
                    }}
                  >
                    {p.icon}
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: p.color,
                      backgroundColor: `${p.color}15`,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                    }}
                  >
                    {p.tag}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: '0.86rem', color: 'var(--dgb-text-muted)', lineHeight: '1.6', margin: 0 }}>
                  {p.desc}
                </p>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#34d399' }}>
                <span>✓</span> Verified Production Pattern
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
