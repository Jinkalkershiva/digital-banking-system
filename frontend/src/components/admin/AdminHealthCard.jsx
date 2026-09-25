import React from 'react';
import AdminStatusBadge from './AdminStatusBadge';

export default function AdminHealthCard({
  overallStatus = 'UP',
  totalServices = 10,
  healthyServices = 10,
  executionTimeMs,
  onRefresh,
  loading = false,
}) {
  const isAllHealthy = overallStatus === 'UP';

  return (
    <div
      style={{
        background: isAllHealthy
          ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)'
          : 'linear-gradient(135deg, #991b1b 0%, #b91c1c 100%)',
        color: '#ffffff',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        marginBottom: '1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
          }}
        >
          {isAllHealthy ? '🟢' : '⚠️'}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
              System Topology: {overallStatus}
            </h3>
            <span
              style={{
                backgroundColor: 'rgba(255,255,255,0.25)',
                color: '#ffffff',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {healthyServices}/{totalServices} Online
            </span>
          </div>

          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
            Live telemetry aggregated across API Gateway, Microservices, Redis, Kafka & MySQL.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {executionTimeMs !== undefined && (
          <span style={{ fontSize: '0.8rem', opacity: 0.85, fontFamily: 'monospace' }}>
            Telemetry latency: {executionTimeMs}ms
          </span>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>🔄</span>
            <span>{loading ? 'Probing...' : 'Probe All Services'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
