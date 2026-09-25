import React, { useState } from 'react';

export default function TransactionFlow() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: 1,
      title: 'Transfer Initiation',
      shortRole: 'Client & Gateway Ingress',
      desc: 'Customer submits a fund transfer request (sender, recipient, amount). The API Gateway (:8080) validates the JWT token and forwards enriched headers to transaction-service.',
      service: 'API Gateway (:8080)',
      topic: 'POST /api/v1/transactions/transfer',
      state: 'INITIATED',
      color: '#38bdf8',
    },
    {
      num: 2,
      title: 'Sender Balance Hold (SAGA Step 1)',
      shortRole: 'Account Service Escrow',
      desc: 'Transaction Service (:8082) executes an atomic OpenFeign call to Account Service (:8081) to deduct the transfer amount from the sender ledger into escrow.',
      service: 'Account Service (:8081)',
      topic: 'PUT /api/v1/accounts/{sender}/deduct',
      state: 'PROCESSING',
      color: '#3b82f6',
    },
    {
      num: 3,
      title: 'Kafka Event Broadcast',
      shortRole: 'Event Bus Streaming',
      desc: 'Transaction Service broadcasts the "transaction.initiated" event onto Apache Kafka (:9092) for asynchronous downstream processing without HTTP thread blocking.',
      service: 'Kafka Bus (:9092)',
      topic: 'Topic: transaction.initiated',
      state: 'PROCESSING',
      color: '#8b5cf6',
    },
    {
      num: 4,
      title: 'Autonomous Fraud Analysis',
      shortRole: 'Fraud Engine & Redis',
      desc: 'Fraud Detection Service (:8084) consumes the event. Evaluates rolling velocity in Redis (max 5/min), 5x rolling average multiplier, and 90% balance depletion limits.',
      service: 'Fraud Service (:8084)',
      topic: 'Redis Key: fraud:velocity:{acc}',
      state: 'EVALUATING',
      color: '#ef4444',
    },
    {
      num: 5,
      title: '2FA OTP Verification Challenge',
      shortRole: 'Ephemeral 300s OTP Store',
      desc: 'If risk triggers are tripped, Fraud Service publishes "verification.required". Transaction Service generates a secure 6-digit OTP stored in Redis with 300-second TTL.',
      service: 'Transaction & Redis (:6379)',
      topic: 'Topic: verification.required',
      state: 'PENDING_VERIFICATION',
      color: '#f59e0b',
    },
    {
      num: 6,
      title: 'Multi-Channel Notification',
      shortRole: 'Notification Dispatcher',
      desc: 'Notification Service (:8085) consumes "transaction.otp.generated" and dispatches the 6-digit OTP code to the customer registered email (SMTP) and phone number.',
      service: 'Notification Service (:8085)',
      topic: 'SMTP / Twilio SMS Dispatch',
      state: 'AWAITING_CUSTOMER_OTP',
      color: '#c084fc',
    },
    {
      num: 7,
      title: 'Recipient Credit & Settlement',
      shortRole: 'Final SAGA Settlement',
      desc: 'Upon valid OTP verification (or instant approval on clean risk), Account Service credits the recipient account balance, and status transitions to COMPLETED.',
      service: 'Account Service (:8081)',
      topic: 'Topic: transaction.completed',
      state: 'COMPLETED',
      color: '#10b981',
    },
    {
      num: 8,
      title: 'Idempotent SAGA Compensation',
      shortRole: 'Zero Double-Credit Rollback',
      desc: 'If OTP verification fails 3 times or user cancels, "fraud.detected" is broadcast. Transaction Service executes an idempotent refund recrediting the sender balance.',
      service: 'SAGA Orchestrator (:8082)',
      topic: 'Topic: fraud.detected & refund',
      state: 'FLAGGED / COMPENSATED',
      color: '#ec4899',
    },
  ];

  const current = steps[activeStep];

  return (
    <section id="saga-flow" className="dgb-section">
      <div className="dgb-container">
        <div className="dgb-section-header">
          <div
            className="dgb-section-pill"
            style={{
              background: 'rgba(6, 182, 212, 0.12)',
              color: '#22d3ee',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          >
            <span>🔄 Distributed SAGA Workflow</span>
          </div>
          <h2 className="dgb-section-title">
            How a Distributed SAGA Transaction Works
          </h2>
          <p className="dgb-section-desc">
            Explore the 8-stage distributed state machine. Click any step to inspect the exact
            inter-service payloads, Kafka event topics, and idempotency guarantees.
          </p>
        </div>

        {/* Step Selector Timeline Grid */}
        <div className="dgb-timeline-container" style={{ marginBottom: '2rem' }}>
          {steps.map((s, idx) => (
            <div
              key={s.num}
              className="dgb-step-card"
              onClick={() => setActiveStep(idx)}
              style={{
                cursor: 'pointer',
                borderColor: activeStep === idx ? s.color : 'var(--dgb-navy-border)',
                background: activeStep === idx ? '#13233f' : 'var(--dgb-navy-card)',
                boxShadow: activeStep === idx ? `0 8px 24px ${s.color}30` : 'none',
              }}
            >
              <div
                className="dgb-step-number"
                style={{
                  backgroundColor: `${s.color}20`,
                  color: s.color,
                  borderColor: `${s.color}50`,
                }}
              >
                {s.num}
              </div>
              <h3 className="dgb-step-title">{s.title}</h3>
              <p className="dgb-step-desc">{s.shortRole}</p>
              <span className="dgb-step-tag" style={{ color: s.color }}>
                {s.state}
              </span>
            </div>
          ))}
        </div>

        {/* Interactive Step Detail Card */}
        <div
          style={{
            background: 'var(--dgb-navy-card)',
            border: `1px solid ${current.color}50`,
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: `0 15px 35px -10px ${current.color}25`,
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '2rem',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.4rem', color: current.color }}>●</span>
              <h3 style={{ margin: 0, fontSize: '1.35rem', color: '#ffffff' }}>
                Stage {current.num}: {current.title}
              </h3>
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--dgb-text-muted)', lineHeight: '1.7', margin: '0 0 1.25rem 0' }}>
              {current.desc}
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--dgb-text-dim)' }}>Executing Node: </span>
                <strong style={{ color: '#ffffff' }}>{current.service}</strong>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--dgb-text-dim)' }}>State Transition: </span>
                <strong style={{ color: current.color }}>{current.state}</strong>
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#070d19',
              borderRadius: '12px',
              padding: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 700 }}>
              // EVENT INTERFACE & PAYLOAD
            </div>
            <div style={{ color: current.color, marginBottom: '0.5rem' }}>
              {current.topic}
            </div>
            <div style={{ color: '#cbd5e1', lineHeight: '1.6' }}>
              {`{\n  "transactionId": "tx_948201948",\n  "status": "${current.state}",\n  "sagaStep": ${current.num},\n  "idempotent": true\n}`}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
