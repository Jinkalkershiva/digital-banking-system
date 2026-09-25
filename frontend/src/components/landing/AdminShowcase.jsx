import React from 'react';
import { Link } from 'react-router-dom';

export default function AdminShowcase() {
  const adminModules = [
    {
      title: '📊 Executive Control Center',
      desc: 'Centralized overview aggregating real-time users, active ledgers, vault liquidity, SAGA volume, and cluster health status.',
      route: '/admin/dashboard',
      color: '#3b82f6',
    },
    {
      title: '↩️ Idempotent Refund Hub',
      desc: 'Kafka-driven SAGA compensation tracker, Razorpay gateway refund reconciliations, and step-by-step state machine inspector.',
      route: '/admin/refunds',
      color: '#ec4899',
    },
    {
      title: '🛡️ Dynamic Fraud Engine',
      desc: 'Inspect live fraud anomalies and update in-memory velocity (5/min), spike multiplier (5x), and 90% balance drain rules without node restarts.',
      route: '/admin/fraud',
      color: '#ef4444',
    },
    {
      title: '🖥️ System Topology & Health',
      desc: 'Real-time TCP/HTTP port probing across Gateway, Auth, Account, Transaction, Payment, Fraud, Notification, Kafka, Redis, and MySQL.',
      route: '/admin/system',
      color: '#10b981',
    },
    {
      title: '👥 User Identity Registry',
      desc: 'Inspect BCrypt-hashed credentials, account creation timestamps, and enforce ROLE_ADMIN and ROLE_USER principal authorities.',
      route: '/admin/users',
      color: '#06b6d4',
    },
    {
      title: '🏛️ Bank Accounts & Limits',
      desc: 'Manage customer accounts, inspect ledger balances, daily limits, and execute emergency account freeze / unblock actions.',
      route: '/admin/accounts',
      color: '#f59e0b',
    },
  ];

  return (
    <section id="admin-center" className="dgb-section">
      <div className="dgb-container">
        <div className="dgb-section-header">
          <div
            className="dgb-section-pill"
            style={{
              background: 'rgba(236, 72, 153, 0.12)',
              color: '#f472b6',
              border: '1px solid rgba(236, 72, 153, 0.3)',
            }}
          >
            <span>👑 Management Core</span>
          </div>
          <h2 className="dgb-section-title">
            DGBASE Admin Control Center
          </h2>
          <p className="dgb-section-desc">
            An executive administrative suite empowering banking administrators to monitor
            microservice ledgers, inspect SAGA compensations, and reconfigure fraud rules live.
          </p>
        </div>

        {/* Modules Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}
        >
          {adminModules.map((m, idx) => (
            <Link
              key={idx}
              to={m.route}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                background: 'var(--dgb-navy-card)',
                border: '1px solid var(--dgb-navy-border)',
                borderRadius: '14px',
                padding: '1.5rem',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = m.color;
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 10px 25px -5px ${m.color}25`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--dgb-navy-border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
                  {m.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--dgb-text-muted)', lineHeight: '1.6', margin: 0 }}>
                  {m.desc}
                </p>
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: m.color, fontWeight: 700 }}>
                <span>Launch Portal</span>
                <span>&rarr;</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Big CTA Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0b1120 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5)',
          }}
        >
          <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#ffffff', marginBottom: '0.6rem' }}>
            Ready to inspect the Executive Control Center?
          </h3>
          <p style={{ color: 'var(--dgb-text-muted)', maxWidth: '600px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
            Log in with the seeded administrator identity (`admin` / `Admin@12345`) to access
            the full suite of live microservices management tools.
          </p>
          <Link
            to="/admin/dashboard"
            className="dgb-btn-primary"
            style={{ padding: '0.75rem 2rem', fontSize: '1rem', display: 'inline-flex' }}
          >
            <span>👑 Explore Admin Control Center</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
