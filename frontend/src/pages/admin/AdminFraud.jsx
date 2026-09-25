import React, { useState, useEffect } from 'react';
import adminApi from '../../api/adminApi';
import {
  AdminLayout,
  AdminSectionCard,
  AdminStatCard,
  AdminTable,
  AdminModal,
  AdminFraudAlert,
  AdminStatusBadge,
  AdminLoadingState,
  AdminErrorState,
} from '../../components/admin';

export default function AdminFraud() {
  const [rules, setRules] = useState({
    maxTransactionsPerMinute: 5,
    suspiciousAmountMultiplier: 5.0,
    maxBalancePercentage: 0.90,
  });
  const [liveEvents, setLiveEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    maxTransactionsPerMinute: 5,
    suspiciousAmountMultiplier: 5.0,
    maxBalancePercentage: 0.90,
  });

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [rulesRes, eventsRes] = await Promise.allSettled([
        adminApi.getFraudRules(),
        adminApi.getFraudEvents(),
      ]);

      if (rulesRes.status === 'fulfilled' && rulesRes.value?.data) {
        setRules(rulesRes.value.data);
        setFormData(rulesRes.value.data);
      }

      if (eventsRes.status === 'fulfilled' && eventsRes.value?.data) {
        setLiveEvents(eventsRes.value.data);
      }
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load fraud engine telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveRules = async (e) => {
    e.preventDefault();
    setSavingRules(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedPayload = {
        maxTransactionsPerMinute: parseInt(formData.maxTransactionsPerMinute, 10),
        suspiciousAmountMultiplier: parseFloat(formData.suspiciousAmountMultiplier),
        maxBalancePercentage: parseFloat(formData.maxBalancePercentage),
      };

      const res = await adminApi.updateFraudRules(updatedPayload);
      setRules(res.data);
      setSuccess('Fraud detection rules updated dynamically in memory and deployed instantly!');
      setIsEditModalOpen(false);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to update fraud detection rules.');
    } finally {
      setSavingRules(false);
    }
  };

  const eventColumns = [
    {
      header: 'Event ID / Tx ID',
      accessor: 'id',
      render: (ev) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.85rem', color: '#4338ca' }}>
          {ev.transactionId || ev.id}
        </span>
      ),
    },
    {
      header: 'Account',
      accessor: 'accountNumber',
      render: (ev) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{ev.accountNumber}</span>,
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (ev) => (
        <span style={{ fontWeight: 700, color: 'var(--status-failed-text)' }}>
          ₹{parseFloat(ev.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Rule Breached',
      accessor: 'reason',
      render: (ev) => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
          }}
        >
          {ev.reason || 'HIGH_RISK_ANOMALY'}
        </span>
      ),
    },
    {
      header: 'Risk Score',
      accessor: 'score',
      render: (ev) => (
        <span style={{ fontWeight: 700, color: '#dc2626' }}>
          {ev.score || 85}/100
        </span>
      ),
    },
    {
      header: 'Action Executed',
      accessor: 'actionTaken',
      render: (ev) => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
          }}
        >
          {ev.actionTaken || '2FA OTP Challenge'}
        </span>
      ),
    },
    {
      header: 'Timestamp',
      accessor: 'timestamp',
      render: (ev) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'Recent'}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout
      onRefresh={() => fetchData(true)}
      refreshing={refreshing}
      title="🛡️ Autonomous Fraud Rules Engine & Telemetry"
      subtitle="Dynamic Redis Sliding-Window Anomaly Scoring • Real-time Rule Reconfiguration • SAGA Compensations"
      actions={
        <button
          onClick={() => {
            setFormData(rules);
            setIsEditModalOpen(true);
          }}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.85rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          }}
        >
          ⚙️ Edit Active Rules
        </button>
      }
    >
      {error && (
        <AdminErrorState
          title="Fraud Engine Error"
          message={error}
          onRetry={() => fetchData(false)}
        />
      )}

      {success && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '1rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {success}
        </div>
      )}

      {/* Overview Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <AdminStatCard
          title="Velocity Limit"
          value={`${rules.maxTransactionsPerMinute} / min`}
          subtitle="Sliding Window Rate Limit"
          icon="⏱️"
          gradient="rgba(59, 130, 246, 0.08)"
          trend="Redis Key TTL"
          trendPositive={true}
        />

        <AdminStatCard
          title="Spike Multiplier"
          value={`${rules.suspiciousAmountMultiplier}x`}
          subtitle="Relative to Rolling Average"
          icon="📈"
          gradient="rgba(245, 158, 11, 0.08)"
          trend="Anomaly Trigger"
          trendPositive={true}
        />

        <AdminStatCard
          title="Balance Drain Limit"
          value={`${Math.round(rules.maxBalancePercentage * 100)}%`}
          subtitle="Single Transfer Drain Cap"
          icon="🚨"
          gradient="rgba(239, 68, 68, 0.08)"
          trend="Feign REST Verified"
          trendPositive={true}
        />

        <AdminStatCard
          title="Recent Fraud Events"
          value={liveEvents.length}
          subtitle="Flagged Anomalies"
          icon="🛡️"
          gradient="rgba(139, 92, 246, 0.08)"
          trend="Live Interceptions"
          trendPositive={liveEvents.length === 0}
        />
      </div>

      {/* Interactive Active Rule Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Rule 1: Velocity Rule */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.5rem',
            border: '1px solid var(--border-color)',
            borderTop: '5px solid #3b82f6',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>⏱️ Velocity Burst Check</h3>
            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
              ACTIVE
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
            Monitors rapid successive transfers per customer account using Redis sliding TTL counter keys.
          </p>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div><strong>Active Threshold:</strong> Max {rules.maxTransactionsPerMinute} transfers / 60 seconds</div>
            <div><strong>Redis Key Pattern:</strong> <code>fraud:velocity:&#123;accountNumber&#125;</code></div>
            <div><strong>Action Triggered:</strong> Immediate transaction flagging & OTP escalation</div>
          </div>
        </div>

        {/* Rule 2: Amount Spike Rule */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.5rem',
            border: '1px solid var(--border-color)',
            borderTop: '5px solid #f59e0b',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>📈 Amount Anomaly Spike</h3>
            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
              ACTIVE
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
            Detects sudden atypical spending spikes relative to historical customer rolling averages.
          </p>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div><strong>Active Threshold:</strong> &gt; {rules.suspiciousAmountMultiplier}x Historical Rolling Average</div>
            <div><strong>Redis Key Pattern:</strong> <code>fraud:avg_amount:&#123;accountNumber&#125;</code></div>
            <div><strong>Action Triggered:</strong> 2FA OTP Challenge (<code>verification.required</code>)</div>
          </div>
        </div>

        {/* Rule 3: Balance Drainage Rule */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '1.5rem',
            border: '1px solid var(--border-color)',
            borderTop: '5px solid #ef4444',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary)' }}>🚨 Balance Drainage Rule</h3>
            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
              ACTIVE
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
            Prevents catastrophic account wipeouts by checking single transfer ratio against current ledger balance.
          </p>
          <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div><strong>Active Threshold:</strong> Single transfer &gt; {Math.round(rules.maxBalancePercentage * 100)}% Account Balance</div>
            <div><strong>Verification Method:</strong> OpenFeign REST Query to Account Service</div>
            <div><strong>Action Triggered:</strong> Mandatory 6-Digit OTP Verification Challenge</div>
          </div>
        </div>
      </div>

      {/* Live Fraud Event Telemetry Stream */}
      <AdminSectionCard
        title="Live Fraud Interception & Risk Events"
        subtitle="Real-time anomalies detected and challenged by the Fraud Detection Microservice"
        icon="🚨"
      >
        {loading && !refreshing ? (
          <AdminLoadingState message="Loading live fraud events..." />
        ) : liveEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem' }}>🛡️</span>
            <strong>No active fraud events detected.</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              All transactions are currently passing velocity and anomaly checks within standard parameters.
            </p>
          </div>
        ) : (
          <AdminTable
            columns={eventColumns}
            data={liveEvents}
            emptyMessage="No fraud events recorded."
          />
        )}
      </AdminSectionCard>

      {/* SAGA Architecture Breakdown */}
      <AdminSectionCard
        title="Distributed SAGA Orchestration Architecture"
        subtitle="Kafka Event Bus State Transitions during Anomaly Interception"
        icon="⚡"
      >
        <div style={{ fontSize: '0.9rem', lineHeight: '1.8', color: 'var(--text-main)' }}>
          <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li>
              <strong>1. Fund Hold & Initiation:</strong> <code>transaction-service</code> records transfer intent, temporarily deducts sender funds, and broadcasts <code>transaction.initiated</code> to Kafka.
            </li>
            <li>
              <strong>2. Autonomous Fraud Evaluation:</strong> <code>fraud-detection-service</code> consumes the event, querying Redis sliding-window keys and checking the 90% balance drain threshold.
            </li>
            <li>
              <strong>3. Clean Flow:</strong> If risk score is below threshold, <code>fraud.check.clean</code> is published &rarr; <code>transaction-service</code> immediately credits recipient.
            </li>
            <li>
              <strong>4. Verification Challenge Flow:</strong> If suspicious, <code>verification.required</code> is published &rarr; <code>notification-service</code> delivers a 6-digit OTP to the user's registered phone/email.
            </li>
            <li>
              <strong>5. SAGA Idempotent Compensation:</strong> If OTP fails 3 times or expires, <code>fraud.detected</code> is broadcast &rarr; <code>transaction-service</code> executes idempotent refund to restore sender balance with zero double-credit risk.
            </li>
          </ol>
        </div>
      </AdminSectionCard>

      {/* Dynamic Rule Edit Modal */}
      {isEditModalOpen && (
        <AdminModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="⚙️ Dynamic Fraud Rule Configuration"
          subtitle="Modify in-memory threshold parameters across the Fraud Detection Microservice cluster"
        >
          <form onSubmit={handleSaveRules} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Max Transactions Per Minute (Velocity Limit)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.maxTransactionsPerMinute}
                onChange={(e) =>
                  setFormData({ ...formData, maxTransactionsPerMinute: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9rem',
                }}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Maximum successive transfers permitted from a single account before triggering OTP.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Suspicious Amount Multiplier (Anomaly Spike)
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="20.0"
                value={formData.suspiciousAmountMultiplier}
                onChange={(e) =>
                  setFormData({ ...formData, suspiciousAmountMultiplier: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9rem',
                }}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Transfer amounts exceeding this factor of historical rolling average will trigger OTP challenge.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Max Balance Percentage (Drain Protection)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.10"
                max="1.0"
                value={formData.maxBalancePercentage}
                onChange={(e) =>
                  setFormData({ ...formData, maxBalancePercentage: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9rem',
                }}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Value between 0.10 and 1.0 (e.g. 0.90 = 90% of total account balance).
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingRules}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: savingRules ? 'not-allowed' : 'pointer',
                }}
              >
                {savingRules ? 'Deploying Rules...' : 'Save & Deploy Dynamically'}
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </AdminLayout>
  );
}
