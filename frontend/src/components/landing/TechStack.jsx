import React from 'react';

export default function TechStack() {
  const technologies = [
    {
      name: 'Java 21 LTS',
      role: 'Core Backend Language',
      category: 'Backend',
      icon: '☕',
      color: '#f59e0b',
    },
    {
      name: 'Spring Boot 3.x',
      role: 'Microservices Framework',
      category: 'Backend',
      icon: '🍃',
      color: '#10b981',
    },
    {
      name: 'Spring Cloud Gateway',
      role: 'Netty Reactive Ingress',
      category: 'Backend',
      icon: '🌐',
      color: '#3b82f6',
    },
    {
      name: 'Spring Security',
      role: 'JWT & BCrypt (12) RBAC',
      category: 'Security',
      icon: '🔒',
      color: '#06b6d4',
    },
    {
      name: 'Apache Kafka 7.4',
      role: 'Distributed SAGA Event Bus',
      category: 'Messaging',
      icon: '📨',
      color: '#a855f7',
    },
    {
      name: 'Redis 7.0',
      role: 'In-Memory Cache & OTP TTL',
      category: 'Cache',
      icon: '⚡',
      color: '#ef4444',
    },
    {
      name: 'MySQL 8.0',
      role: 'ACID Relational Storage',
      category: 'Database',
      icon: '🗄️',
      color: '#0284c7',
    },
    {
      name: 'React 19',
      role: 'Client SPA & Admin UI',
      category: 'Frontend',
      icon: '⚛️',
      color: '#38bdf8',
    },
    {
      name: 'Vite 6',
      role: 'Modern Frontend Bundler',
      category: 'Frontend',
      icon: '⚡',
      color: '#fbbf24',
    },
    {
      name: 'OpenFeign',
      role: 'Declarative REST Client',
      category: 'Backend',
      icon: '🔗',
      color: '#6366f1',
    },
    {
      name: 'Razorpay API',
      role: 'Payment Orders & Webhooks',
      category: 'Payments',
      icon: '💳',
      color: '#14b8a6',
    },
    {
      name: 'Docker Compose',
      role: 'Containerized Infrastructure',
      category: 'DevOps',
      icon: '🐳',
      color: '#3b82f6',
    },
  ];

  return (
    <section id="tech-stack" className="dgb-section">
      <div className="dgb-container">
        <div className="dgb-section-header">
          <div
            className="dgb-section-pill"
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <span>🛠️ Verified Tech Stack</span>
          </div>
          <h2 className="dgb-section-title">
            Technology Behind DGBASE
          </h2>
          <p className="dgb-section-desc">
            DGBASE is built exclusively on modern, verified open-source technologies and enterprise frameworks.
            No vaporware or unverified claims.
          </p>
        </div>

        <div className="dgb-tech-grid">
          {technologies.map((t, idx) => (
            <div
              key={idx}
              className="dgb-tech-card"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = t.color;
                e.currentTarget.style.boxShadow = `0 10px 25px -5px ${t.color}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--dgb-navy-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span className="dgb-tech-icon">{t.icon}</span>
              <div className="dgb-tech-name">{t.name}</div>
              <div className="dgb-tech-role">{t.role}</div>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: '0.6rem',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: t.color,
                  backgroundColor: `${t.color}15`,
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                }}
              >
                {t.category}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
