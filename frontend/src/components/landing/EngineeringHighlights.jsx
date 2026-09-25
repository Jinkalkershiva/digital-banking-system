import React from 'react';

export default function EngineeringHighlights() {
  const highlights = [
    {
      id: 'security',
      title: 'Security & Identity Core',
      badge: 'SpringSecEx • BCrypt 12',
      icon: '🔒',
      theme: 'card-theme-security',
      accentColor: '#06b6d4',
      desc: 'Cryptographic user authentication generating HMAC-SHA384 signed JWT tokens. Passwords secured with 12-round BCrypt salt. Strict ROLE_ADMIN and ROLE_USER role-based access control.',
      bullets: [
        'Signed JWT token minting & validation',
        'Spring Security SecurityFilterChain',
        'Automatic Admin identity seeding',
      ],
      tag: 'PORT 8088 / AUTH_DB',
    },
    {
      id: 'transactions',
      title: 'Distributed SAGA Transfers',
      badge: 'SAGA Orchestrator',
      icon: '🔄',
      theme: 'card-theme-transactions',
      accentColor: '#3b82f6',
      desc: 'Multi-step distributed fund transfer orchestration across account, fraud, and notification domains. Automatic escrow balance debit with idempotent compensating rollbacks.',
      bullets: [
        'Atomic sender fund escrow debit',
        'Zero double-credit compensation guard',
        'Real-time transaction audit ledger',
      ],
      tag: 'PORT 8082 / SAGA ENGINE',
    },
    {
      id: 'fraud',
      title: 'Dynamic Fraud Rule Engine',
      badge: 'Redis Sliding Windows',
      icon: '🛡️',
      theme: 'card-theme-fraud',
      accentColor: '#ef4444',
      desc: 'Autonomous transaction anomaly detection evaluating rolling velocity (5/min), historical spending spikes (5x multiplier), and 90% balance depletion thresholds in real time.',
      bullets: [
        'Redis sliding window rate counters (60s)',
        'OpenFeign account balance query',
        'In-memory dynamic rule updates (PUT)',
      ],
      tag: 'PORT 8084 / ANOMALY SCORING',
    },
    {
      id: 'events',
      title: 'Event-Driven Streaming',
      badge: 'Apache Kafka 7.4',
      icon: '📨',
      theme: 'card-theme-events',
      accentColor: '#8b5cf6',
      desc: 'Asynchronous pub/sub event bus decoupling microservices. Streams transaction.initiated, fraud.check.clean, verification.required, and fraud.detected events with zero blocking.',
      bullets: [
        'Topic partitioning & consumer groups',
        'Clean vs dirty event dispatching',
        'Asynchronous multi-channel notification',
      ],
      tag: 'PORT 9092 / EVENT BUS',
    },
    {
      id: 'performance',
      title: 'In-Memory Cache & OTP',
      badge: 'Redis 7.0 Cache',
      icon: '⚡',
      theme: 'card-theme-performance',
      accentColor: '#10b981',
      desc: 'Sub-millisecond in-memory storage for 6-digit transaction 2FA OTP codes with 300-second TTL. StringRedisSerializer guarantees clean cross-service serialization without JDK binary bloat.',
      bullets: [
        '300s OTP expiration & 3-attempt lockout',
        'Spring Cloud Gateway IP rate limiting',
        'StringRedisSerializer key compatibility',
      ],
      tag: 'PORT 6379 / IN-MEMORY',
    },
    {
      id: 'payments',
      title: 'Gateway Payments & Refunds',
      badge: 'Razorpay API + Webhooks',
      icon: '💳',
      theme: 'card-theme-payments',
      accentColor: '#f59e0b',
      desc: 'Direct Razorpay payment gateway integration supporting checkout order creation, HMAC-SHA256 signature verification, asynchronous webhook capture, and idempotent gateway refunds.',
      bullets: [
        'Official order creation & capture sync',
        'HMAC-SHA256 webhook signature check',
        'Kafka-driven automated refund execution',
      ],
      tag: 'PORT 8083 / PAYMENT_DB',
    },
  ];

  return (
    <section id="features" className="dgb-section">
      <div className="dgb-container">
        <div className="dgb-section-header">
          <div className="dgb-section-pill" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            <span>⚡ Architecture Capabilities</span>
          </div>
          <h2 className="dgb-section-title">
            Built Like a Real Banking Platform
          </h2>
          <p className="dgb-section-desc">
            DGBASE is engineered to mirror the resilience, security, and distributed consistency
            required by modern tier-1 fintech systems and digital banking cores.
          </p>
        </div>

        {/* 6 Coordinated Engineering Cards */}
        <div className="dgb-highlight-grid">
          {highlights.map((item) => (
            <div key={item.id} className={`dgb-highlight-card ${item.theme}`}>
              <div>
                <div className="dgb-highlight-top">
                  <div className="dgb-card-icon">{item.icon}</div>
                  <span
                    className="dgb-card-badge"
                    style={{
                      backgroundColor: `${item.accentColor}20`,
                      color: item.accentColor,
                      border: `1px solid ${item.accentColor}40`,
                    }}
                  >
                    {item.badge}
                  </span>
                </div>

                <h3 className="dgb-card-title">{item.title}</h3>
                <p className="dgb-card-desc">{item.desc}</p>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {item.bullets.map((b, idx) => (
                    <li key={idx} style={{ fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ color: item.accentColor, fontWeight: 900 }}>✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="dgb-card-footer">
                <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: item.accentColor }}>
                  {item.tag}
                </span>
                <span style={{ color: 'var(--dgb-text-dim)', fontSize: '0.75rem' }}>Production Verified</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
