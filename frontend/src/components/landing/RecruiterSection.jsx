import React from 'react';

export default function RecruiterSection() {
  const points = [
    {
      title: 'Microservices Domain Boundaries',
      desc: '7 decoupled Spring Boot microservices with distinct database schemas and responsibilities.',
    },
    {
      title: 'Event-Driven SAGA Orchestration',
      desc: 'Asynchronous message streaming via Apache Kafka 7.4 with topic partitioning and consumer groups.',
    },
    {
      title: 'Cryptographic Authentication & RBAC',
      desc: 'Signed HMAC-SHA384 JWT tokens with BCrypt 12 salted hashes and strict ROLE_ADMIN protection.',
    },
    {
      title: 'Real Payment Gateway Integration',
      desc: 'Razorpay order creation, HMAC-SHA256 signature verification, and automated refund pipelines.',
    },
    {
      title: 'Autonomous Fraud Anomaly Scoring',
      desc: 'Redis sliding-window velocity checks, rolling average spikes, and 90% balance drain protection.',
    },
    {
      title: 'Zero Double-Credit Idempotency',
      desc: 'Deterministic state machine preventing duplicate ledger adjustments during SAGA rollbacks.',
    },
    {
      title: 'High-Performance In-Memory Caching',
      desc: 'Sub-millisecond Redis 7.0 cache for 300s OTP TTL and gateway edge rate limiting.',
    },
    {
      title: 'Spring Cloud Gateway Edge Ingress',
      desc: 'Netty WebFlux reactive reverse proxy with global JWT authentication and downstream header enrichment.',
    },
    {
      title: 'Containerized Infrastructure',
      desc: 'Full Docker Compose stack managing MySQL 8.0, Redis, Kafka, and Zookeeper.',
    },
    {
      title: 'Modular React 19 Frontend Architecture',
      desc: 'Modern Single-Page Application featuring a 24-component Reusable Admin Component Library.',
    },
  ];

  return (
    <section className="dgb-section">
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
            <span>💼 Recruiter & Tech Lead Summary</span>
          </div>
          <h2 className="dgb-section-title">
            Why DGBASE Demonstrates Production Engineering
          </h2>
          <p className="dgb-section-desc">
            A quick checklist of enterprise architectural patterns, distributed consistency guarantees,
            and clean code principles implemented across this repository.
          </p>
        </div>

        <div className="dgb-recruiter-grid">
          {points.map((p, idx) => (
            <div key={idx} className="dgb-check-item">
              <div className="dgb-check-icon">✓</div>
              <div>
                <h4 className="dgb-check-title">{p.title}</h4>
                <p className="dgb-check-desc">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
