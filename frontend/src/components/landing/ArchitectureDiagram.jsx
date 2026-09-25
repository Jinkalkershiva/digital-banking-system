import React, { useState } from 'react';

export default function ArchitectureDiagram() {
  const [selectedNode, setSelectedNode] = useState('gateway');

  const nodes = {
    frontend: {
      name: 'DGBASE Frontend',
      tech: 'React 19 • Vite 6 • React Router DOM',
      port: ':5173',
      role: 'Single-page banking client and Executive Admin Control Center with centralized Axios interceptors.',
      endpoints: ['/', '/login', '/register', '/transfer', '/admin/*'],
      color: '#38bdf8',
    },
    gateway: {
      name: 'API Gateway Service',
      tech: 'Spring Cloud Gateway • Netty WebFlux',
      port: ':8080',
      role: 'Single point of ingress. Validates JWT signatures, enriches downstream headers (X-User-Id, X-User-Role), and manages Redis rate limits.',
      endpoints: ['/api/v1/** (All routes)', 'GET /api/v1/system/health'],
      color: '#3b82f6',
    },
    auth: {
      name: 'SpringSecEx (Auth Core)',
      tech: 'Spring Security • BCrypt (12) • JWT',
      port: ':8088',
      role: 'User identity store, salted password hashing, JWT token generation (HMAC-SHA384), and default ROLE_ADMIN seeding.',
      endpoints: ['POST /api/v1/auth/register', 'POST /api/v1/auth/login', 'GET /api/v1/auth/users'],
      color: '#06b6d4',
    },
    account: {
      name: 'Account Service',
      tech: 'Spring Boot 3 • Spring Data JPA • MySQL',
      port: ':8081',
      role: 'Manages customer bank accounts, balances, daily limits, and atomic balance debit/credit operations (SAGA Step 1 & 4).',
      endpoints: ['POST /api/v1/accounts', 'GET /api/v1/accounts/{num}', 'PUT /api/v1/accounts/{num}/block'],
      color: '#10b981',
    },
    transaction: {
      name: 'Transaction Service',
      tech: 'SAGA Orchestrator • Kafka Consumer • Redis',
      port: ':8082',
      role: 'Orchestrates distributed money transfers, 6-digit OTP verification challenges, and idempotent SAGA compensation rollbacks.',
      endpoints: ['POST /api/v1/transactions/transfer', 'POST /api/v1/transactions/{id}/verify'],
      color: '#6366f1',
    },
    payment: {
      name: 'Payment Service',
      tech: 'Razorpay Client • HMAC-SHA256 • Kafka',
      port: ':8083',
      role: 'Processes Razorpay checkout orders, verifies webhook signatures, and triggers automated gateway refunds on compensation events.',
      endpoints: ['POST /api/v1/payments', 'POST /api/v1/payments/verify-signature', 'POST /api/v1/payments/webhook'],
      color: '#f59e0b',
    },
    fraud: {
      name: 'Fraud Detection Service',
      tech: 'Redis Sliding Window • OpenFeign REST',
      port: ':8084',
      role: 'Real-time anomaly scoring evaluating velocity (5/min), historical spikes (5x multiplier), and 90% balance drain limits.',
      endpoints: ['GET /api/v1/fraud/rules', 'PUT /api/v1/fraud/rules', 'GET /api/v1/fraud/events'],
      color: '#ef4444',
    },
    notification: {
      name: 'Notification Service',
      tech: 'JavaMailSender (SMTP) • Kafka Consumer',
      port: ':8085',
      role: 'Asynchronously consumes Kafka security events to deliver 6-digit OTPs, transfer receipts, and fraud alerts via Email/SMS.',
      endpoints: ['Kafka topic: transaction.otp.generated', 'Kafka topic: transaction.completed'],
      color: '#8b5cf6',
    },
    kafka: {
      name: 'Apache Kafka Event Bus',
      tech: 'Kafka 7.4.0 • Zookeeper :2181',
      port: ':9092',
      role: 'High-throughput asynchronous distributed message bus for SAGA events, eliminating synchronous service blocking.',
      endpoints: ['Topics: transaction.initiated, fraud.check.clean, verification.required, fraud.detected'],
      color: '#a855f7',
    },
    redis: {
      name: 'Redis In-Memory Cache',
      tech: 'Redis 7.0 • StringRedisSerializer',
      port: ':6379',
      role: 'Stores ephemeral 6-digit OTPs (300s TTL), sliding window velocity counters (60s), and gateway rate limiting tokens.',
      endpoints: ['Keys: otp:{account}, fraud:velocity:{account}, fraud:avg_amount:{account}'],
      color: '#ec4899',
    },
    mysql: {
      name: 'MySQL 8.0 Relational DB',
      tech: 'InnoDB Engine • ACID Transactions',
      port: ':3306',
      role: 'Relational ACID storage with isolated schemas (auth_db, account_db, payment_db) ensuring multi-ledger data integrity.',
      endpoints: ['Schemas: auth_db, account_db, payment_db'],
      color: '#0284c7',
    },
  };

  const current = nodes[selectedNode];

  return (
    <div className="dgb-arch-wrapper">
      {/* Interactive Top Event Packet Simulation Stream */}
      <div className="dgb-event-flow-stream">
        <div className="dgb-flow-step">
          <span style={{ color: '#38bdf8' }}>1. Client Transfer Request</span>
        </div>
        <span className="dgb-flow-arrow">&rarr;</span>
        <div className="dgb-flow-step">
          <span style={{ color: '#3b82f6' }}>2. Gateway :8080 (JWT Verified)</span>
        </div>
        <span className="dgb-flow-arrow">&rarr;</span>
        <div className="dgb-flow-step">
          <span style={{ color: '#6366f1' }}>3. Transaction Engine :8082</span>
        </div>
        <span className="dgb-flow-arrow">&rarr;</span>
        <div className="dgb-flow-step">
          <span style={{ color: '#ef4444' }}>4. Fraud Anomaly Check :8084</span>
        </div>
        <span className="dgb-flow-arrow">&rarr;</span>
        <div className="dgb-flow-step">
          <span style={{ color: '#a855f7' }}>5. Kafka Event Bus :9092</span>
        </div>
        <span className="dgb-flow-arrow">&rarr;</span>
        <div className="dgb-flow-step">
          <span style={{ color: '#8b5cf6' }}>6. OTP Alert :8085</span>
        </div>
      </div>

      {/* Layer 1: Client Layer */}
      <div className="dgb-arch-layer">
        <div className="dgb-arch-layer-label">
          <span>🖥️ Layer 1 — Client & User Interface</span>
        </div>
        <div className="dgb-arch-node-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div
            className={`dgb-arch-node ${selectedNode === 'frontend' ? 'active' : ''}`}
            onClick={() => setSelectedNode('frontend')}
          >
            <div className="dgb-node-header">
              <span style={{ fontSize: '1.2rem' }}>⚛️</span>
              <div>
                <div className="dgb-node-name">DGBASE Frontend (React 19 / Vite)</div>
                <div className="dgb-node-port">:5173 • Single-Page App & Admin Portal</div>
              </div>
            </div>
            <div className="dgb-node-role">
              Unified client with role-based routing (`ROLE_USER` & `ROLE_ADMIN`), Axios request interceptors, and live SAGA inspector.
            </div>
          </div>
        </div>
      </div>

      {/* Layer 2: API Gateway Layer */}
      <div className="dgb-arch-layer">
        <div className="dgb-arch-layer-label">
          <span>🌐 Layer 2 — API Gateway & Security Ingress</span>
        </div>
        <div className="dgb-arch-node-grid" style={{ gridTemplateColumns: '1fr' }}>
          <div
            className={`dgb-arch-node ${selectedNode === 'gateway' ? 'active' : ''}`}
            onClick={() => setSelectedNode('gateway')}
          >
            <div className="dgb-node-header">
              <span style={{ fontSize: '1.2rem' }}>🛡️</span>
              <div>
                <div className="dgb-node-name">API Gateway Service (Spring Cloud Gateway)</div>
                <div className="dgb-node-port">:8080 • JWT Filter & Route Aggregator</div>
              </div>
            </div>
            <div className="dgb-node-role">
              Global Netty filter validates HMAC-SHA384 JWT tokens, adds X-User headers, enforces Redis rate limits, and exposes `/system/health`.
            </div>
          </div>
        </div>
      </div>

      {/* Layer 3: Core Microservices Layer */}
      <div className="dgb-arch-layer">
        <div className="dgb-arch-layer-label">
          <span>⚙️ Layer 3 — Core Financial Microservices Ecosystem (Java 21 / Spring Boot 3)</span>
        </div>
        <div className="dgb-arch-node-grid">
          <div
            className={`dgb-arch-node ${selectedNode === 'auth' ? 'active' : ''}`}
            onClick={() => setSelectedNode('auth')}
          >
            <div className="dgb-node-header">
              <span>🔑</span>
              <div>
                <div className="dgb-node-name">Auth Service</div>
                <div className="dgb-node-port">:8088 • SpringSecEx</div>
              </div>
            </div>
            <div className="dgb-node-role">BCrypt (12) salted hashing, JWT minting & principal store.</div>
          </div>

          <div
            className={`dgb-arch-node ${selectedNode === 'account' ? 'active' : ''}`}
            onClick={() => setSelectedNode('account')}
          >
            <div className="dgb-node-header">
              <span>🏛️</span>
              <div>
                <div className="dgb-node-name">Account Service</div>
                <div className="dgb-node-port">:8081 • JPA Ledgers</div>
              </div>
            </div>
            <div className="dgb-node-role">Account balances, daily limits, debit/credit atomic ledgers.</div>
          </div>

          <div
            className={`dgb-arch-node ${selectedNode === 'transaction' ? 'active' : ''}`}
            onClick={() => setSelectedNode('transaction')}
          >
            <div className="dgb-node-header">
              <span>🔄</span>
              <div>
                <div className="dgb-node-name">Transaction Service</div>
                <div className="dgb-node-port">:8082 • SAGA Orchestrator</div>
              </div>
            </div>
            <div className="dgb-node-role">Distributed SAGA transfers, 2FA OTP verification, rollbacks.</div>
          </div>

          <div
            className={`dgb-arch-node ${selectedNode === 'payment' ? 'active' : ''}`}
            onClick={() => setSelectedNode('payment')}
          >
            <div className="dgb-node-header">
              <span>💳</span>
              <div>
                <div className="dgb-node-name">Payment Service</div>
                <div className="dgb-node-port">:8083 • Razorpay API</div>
              </div>
            </div>
            <div className="dgb-node-role">Razorpay checkout orders, HMAC signatures, automated refunds.</div>
          </div>

          <div
            className={`dgb-arch-node ${selectedNode === 'fraud' ? 'active' : ''}`}
            onClick={() => setSelectedNode('fraud')}
          >
            <div className="dgb-node-header">
              <span>🛡️</span>
              <div>
                <div className="dgb-node-name">Fraud Detection</div>
                <div className="dgb-node-port">:8084 • Dynamic Rules</div>
              </div>
            </div>
            <div className="dgb-node-role">Sliding Redis velocity (5/min), 5x spikes, 90% balance drain.</div>
          </div>

          <div
            className={`dgb-arch-node ${selectedNode === 'notification' ? 'active' : ''}`}
            onClick={() => setSelectedNode('notification')}
          >
            <div className="dgb-node-header">
              <span>📨</span>
              <div>
                <div className="dgb-node-name">Notification Service</div>
                <div className="dgb-node-port">:8085 • SMTP & SMS</div>
              </div>
            </div>
            <div className="dgb-node-role">Asynchronous OTP email/SMS delivery and transfer receipts.</div>
          </div>
        </div>
      </div>

      {/* Layer 4: Event Streaming & Data Infrastructure */}
      <div className="dgb-arch-layer" style={{ marginBottom: 0 }}>
        <div className="dgb-arch-layer-label">
          <span>💾 Layer 4 — Data Persistence & Asynchronous Event Streaming</span>
        </div>
        <div className="dgb-arch-node-grid">
          <div
            className={`dgb-arch-node ${selectedNode === 'kafka' ? 'active' : ''}`}
            onClick={() => setSelectedNode('kafka')}
          >
            <div className="dgb-node-header">
              <span>📬</span>
              <div>
                <div className="dgb-node-name">Apache Kafka 7.4</div>
                <div className="dgb-node-port">:9092 • SAGA Event Bus</div>
              </div>
            </div>
            <div className="dgb-node-role">Asynchronous topic partitions for SAGA clean/dirty events.</div>
          </div>

          <div
            className={`dgb-arch-node ${selectedNode === 'redis' ? 'active' : ''}`}
            onClick={() => setSelectedNode('redis')}
          >
            <div className="dgb-node-header">
              <span>⚡</span>
              <div>
                <div className="dgb-node-name">Redis 7.0 Cache</div>
                <div className="dgb-node-port">:6379 • In-Memory Store</div>
              </div>
            </div>
            <div className="dgb-node-role">300s OTP TTL keys, sliding 60s velocity counters, rate limits.</div>
          </div>

          <div
            className={`dgb-arch-node ${selectedNode === 'mysql' ? 'active' : ''}`}
            onClick={() => setSelectedNode('mysql')}
          >
            <div className="dgb-node-header">
              <span>🗄️</span>
              <div>
                <div className="dgb-node-name">MySQL 8.0 Databases</div>
                <div className="dgb-node-port">:3306 • ACID Ledgers</div>
              </div>
            </div>
            <div className="dgb-node-role">auth_db, account_db, and payment_db isolated schemas.</div>
          </div>
        </div>
      </div>

      {/* Node Inspector Drawer */}
      {current && (
        <div
          style={{
            marginTop: '2rem',
            background: 'rgba(11, 17, 32, 0.95)',
            border: `1px solid ${current.color}40`,
            borderRadius: '14px',
            padding: '1.5rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '1.2rem', color: current.color }}>●</span>
              <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#ffffff' }}>{current.name}</h4>
              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: current.color, fontWeight: 700 }}>
                {current.port}
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--dgb-text-muted)', margin: '0 0 0.85rem 0', lineHeight: '1.5' }}>
              {current.role}
            </p>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              <strong>Technology Stack:</strong> {current.tech}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: current.color, marginBottom: '0.5rem' }}>
              Primary Interface / Endpoints
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {current.endpoints.map((ep, idx) => (
                <li key={idx}>
                  <code style={{ fontSize: '0.75rem', color: '#93c5fd' }}>{ep}</code>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
