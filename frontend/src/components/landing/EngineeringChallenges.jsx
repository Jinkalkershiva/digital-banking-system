import React from 'react';

export default function EngineeringChallenges() {
  const challenges = [
    {
      title: 'Distributed Transactions without 2PC Locking',
      problem: 'Coordinating fund transfer across independent account, fraud, and notification databases without heavy two-phase commit database locks.',
      solution: 'Implemented the SAGA Choreography pattern using Apache Kafka event streaming with atomic escrow debit and idempotent compensating rollbacks.',
      color: '#3b82f6',
      icon: '🔄',
    },
    {
      title: 'Real-Time Sliding Velocity Limiting',
      problem: 'Detecting rapid-fire transaction burst attacks without slowing down legitimate customer transfer requests.',
      solution: 'Used Redis sliding-window TTL keys (fraud:velocity:{acc}) with 60-second expiration, providing sub-20ms rate evaluation.',
      color: '#ef4444',
      icon: '⏱️',
    },
    {
      title: 'Zero Double-Credit Idempotent Refunds',
      problem: 'Preventing duplicate balance crediting during network retries or duplicate Kafka compensation messages.',
      solution: 'Added explicit SAGA status checking (TransactionStatus.FLAGGED / FAILED) in transaction-service, guaranteeing strictly once-only balance restoration.',
      color: '#ec4899',
      icon: '↩️',
    },
    {
      title: 'Cross-Service Redis Binary Serializer Mismatch',
      problem: 'Default Spring RedisTemplate writing JDK binary serialization prefixes (\\xac\\xed), breaking plain string OTP lookups.',
      solution: 'Configured custom RedisConfig beans with StringRedisSerializer on keys and values in both transaction-service and fraud-detection-service.',
      color: '#10b981',
      icon: '⚡',
    },
    {
      title: 'Spring Boot 3 OpenFeign Parameter Erasure',
      problem: 'Missing parameter names in @PathVariable and @RequestParam causing 500 reflection errors during inter-service balance checks.',
      solution: 'Bound all Feign client parameters explicitly (@PathVariable("accountNumber"), @RequestParam("amount")), ensuring robust inter-service RPC.',
      color: '#f59e0b',
      icon: '🔗',
    },
    {
      title: 'Dynamic Rule Reconfiguration without Restarts',
      problem: 'Updating fraud velocity thresholds, multipliers, and balance drain caps required redeploying the fraud microservice.',
      solution: 'Implemented atomic in-memory dynamic rule state with thread-safe getters and PUT /api/v1/fraud/rules management endpoints.',
      color: '#06b6d4',
      icon: '⚙️',
    },
  ];

  return (
    <section id="challenges" className="dgb-section">
      <div className="dgb-container">
        <div className="dgb-section-header">
          <div
            className="dgb-section-pill"
            style={{
              background: 'rgba(99, 102, 241, 0.12)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            <span>💡 Deep-Dive Engineering</span>
          </div>
          <h2 className="dgb-section-title">
            Engineering Challenges Solved
          </h2>
          <p className="dgb-section-desc">
            Building a distributed fintech core requires solving complex distributed systems,
            data consistency, caching, and serialization challenges.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {challenges.map((c, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--dgb-navy-card)',
                border: '1px solid var(--dgb-navy-border)',
                borderRadius: '16px',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = c.color;
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--dgb-navy-border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>{c.icon}</span>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>{c.title}</h3>
                </div>

                <div style={{ marginBottom: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#f87171', marginBottom: '0.2rem' }}>
                    Challenge / Risk:
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--dgb-text-muted)', lineHeight: '1.5' }}>
                    {c.problem}
                  </p>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#34d399', marginBottom: '0.2rem' }}>
                    Engineering Solution:
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#e2e8f0', lineHeight: '1.5' }}>
                    {c.solution}
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: c.color, fontFamily: 'monospace' }}>
                <span>SOLVED IN CODEBASE</span>
                <span>✓ Production Grade</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
