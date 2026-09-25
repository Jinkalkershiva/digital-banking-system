import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function HeroSection({ onExploreClick }) {
  const [activeTab, setActiveTab] = useState('live');

  const scrollToArchitecture = () => {
    const el = document.getElementById('architecture');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="dgb-hero-section">
      <div className="dgb-container">
        <div className="dgb-hero-grid">
          {/* Left Column: Hero Narrative */}
          <div>
            <div className="dgb-hero-pill">
              <span className="dgb-pulse-dot"></span>
              <span>Java 21 • Spring Boot 3 • Kafka • React 19 • Redis • Distributed SAGA</span>
            </div>

            <h1 className="dgb-hero-title">
              <span className="dgb-gradient-text">DGBASE</span>
              <br />
              <span style={{ fontSize: '0.6em', fontWeight: 700, color: '#94a3b8', letterSpacing: '-0.01em' }}>
                Digital Banking System
              </span>
            </h1>

            <div className="dgb-hero-tagline">
              "Digital Banking, Engineered for the Future."
            </div>

            <p className="dgb-hero-desc">
              A production-style digital banking platform built with Spring Boot microservices, React,
              Kafka, Redis, secure authentication, fraud detection, and payment processing. Engineered
              for high-throughput ledger consistency and zero double-credit SAGA compensations.
            </p>

            <div className="dgb-hero-actions">
              <Link to="/register" className="dgb-btn-primary" style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}>
                <span>⚡ Explore Platform</span>
              </Link>
              <button
                onClick={scrollToArchitecture}
                className="dgb-btn-ghost"
                style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }}
              >
                <span>🏛️ View Architecture</span>
              </button>
              <a
                href="https://github.com/Jinkalkershiva/digital-banking-system"
                target="_blank"
                rel="noopener noreferrer"
                className="dgb-btn-ghost"
                style={{ padding: '0.75rem 1.25rem', fontSize: '0.95rem' }}
              >
                <span>💻 GitHub</span>
              </a>
              <Link
                to="/admin/dashboard"
                className="dgb-btn-ghost"
                style={{
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  color: '#fbbf24',
                  padding: '0.75rem 1.25rem',
                  fontSize: '0.95rem',
                }}
              >
                <span>👑 Admin Center</span>
              </Link>
            </div>

            {/* Quick Metrics Ribbon */}
            <div className="dgb-hero-metrics-ribbon">
              <div className="dgb-ribbon-item">
                <h4>7 Services</h4>
                <p>Microservices Core</p>
              </div>
              <div className="dgb-ribbon-item">
                <h4>100% SAGA</h4>
                <p>Event Consistency</p>
              </div>
              <div className="dgb-ribbon-item">
                <h4>&lt; 20ms</h4>
                <p>Redis Velocity Check</p>
              </div>
              <div className="dgb-ribbon-item">
                <h4>0% Double Credit</h4>
                <p>Idempotent Refunds</p>
              </div>
            </div>
          </div>

          {/* Right Column: Animated Fintech Visual & Service Ecosystem */}
          <div className="dgb-hero-visual-wrap">
            {/* Floating Orbit Service Badges */}
            <div className="dgb-orbit-service dgb-orbit-1">
              <span style={{ fontSize: '1rem' }}>🛡️</span>
              <div>
                <div>Fraud Detection</div>
                <div style={{ fontSize: '0.65rem', color: '#38bdf8' }}>Redis Velocity: 5/min</div>
              </div>
            </div>

            <div className="dgb-orbit-service dgb-orbit-2">
              <span style={{ fontSize: '1rem' }}>📨</span>
              <div>
                <div>Apache Kafka 7.4</div>
                <div style={{ fontSize: '0.65rem', color: '#c084fc' }}>SAGA Event Bus (:9092)</div>
              </div>
            </div>

            <div className="dgb-orbit-service dgb-orbit-3">
              <span style={{ fontSize: '1rem' }}>⚡</span>
              <div>
                <div>API Gateway</div>
                <div style={{ fontSize: '0.65rem', color: '#34d399' }}>JWT Filter (:8080)</div>
              </div>
            </div>

            {/* Futuristic Banking Card */}
            <div className="dgb-card-canvas">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '36px', height: '26px', background: 'linear-gradient(135deg, #fcd34d, #f59e0b)', borderRadius: '5px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}></div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.1em' }}>DGBASE PLATINUM</span>
                </div>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', borderRadius: '4px', fontWeight: 700 }}>
                  ACTIVE LEDGER
                </span>
              </div>

              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Live Vault Balance
                </div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em', margin: '0.2rem 0' }}>
                  ₹1,248,500<span style={{ fontSize: '1.2rem', color: '#94a3b8' }}>.00</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>●</span> OpenFeign Multi-Service Reconciled
                </div>
              </div>

              {/* Card Bottom: Account & Network */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Account Holder</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>ACME CORP VAULT</div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#cbd5e1' }}>ACC: 100294820194</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>AUTH CORE</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#818cf8' }}>BCrypt + JWT</div>
                </div>
              </div>

              {/* Mini Interactive SAGA Pulse Stream inside card */}
              <div
                style={{
                  marginTop: '1.25rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  borderRadius: '10px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }}></span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>SAGA Event Stream</span>
                </div>
                <span style={{ fontFamily: 'monospace', color: '#a78bfa', fontSize: '0.72rem' }}>
                  transaction.initiated &rarr; fraud.clean
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
