import React, { useState, useEffect } from 'react';
import Loading from '../components/Loading';
import AlertMessage from '../components/AlertMessage';
import { transactionApi } from '../api/axios';

export default function Notifications({ currentAccount }) {
  const [flaggedTransactions, setFlaggedTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSecurityAlerts = async () => {
    if (!currentAccount?.accountNumber) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Connect to real transaction history endpoint
      const res = await transactionApi.getTransactionHistory(currentAccount.accountNumber);
      const allTx = Array.isArray(res.data) ? res.data : [];

      // Filter transactions with security/fraud implications
      const alerts = allTx.filter(
        (tx) => tx.status === 'FLAGGED' || tx.status === 'PENDING_VERIFICATION' || tx.status === 'FAILED'
      );
      setFlaggedTransactions(alerts);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load security audit events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityAlerts();
  }, [currentAccount?.accountNumber]);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Security & Fraud Notification Center</h1>
          <p className="dashboard-subtitle">
            Real-time events synchronized with Kafka Fraud-Detection and Notification Microservices
          </p>
        </div>

        <button onClick={fetchSecurityAlerts} className="btn-secondary">
          Refresh Alerts
        </button>
      </div>

      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}
      >
        <strong>Architecture Integration:</strong> The <code>notification-service</code> (port 8085) and <code>fraud-detection-service</code> (port 8084) evaluate transactions via Apache Kafka topics (<code>transaction.initiated</code>, <code>fraud.detected</code>, <code>verification.required</code>). Transactions marked <code>FLAGGED</code> or <code>PENDING_VERIFICATION</code> trigger automatic alerts below.
      </div>

      <AlertMessage type="error" message={error} onClose={() => setError(null)} />

      {loading ? (
        <Loading message="Scanning ledger for security alerts..." />
      ) : flaggedTransactions.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🛡️</div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 700 }}>
            No Active Security Alerts
          </h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Your account activity is clean. No suspicious patterns or flagged transactions detected.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {flaggedTransactions.map((tx) => (
            <div
              key={tx.id}
              className="card-panel"
              style={{
                borderLeft: tx.status === 'FLAGGED' ? '4px solid #e11d48' : '4px solid #f59e0b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span className={`badge badge-${tx.status}`}>{tx.status}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    ID: {tx.id}
                  </span>
                </div>

                <div style={{ marginTop: '0.6rem', fontWeight: 600, fontSize: '0.95rem' }}>
                  {tx.status === 'FLAGGED'
                    ? '⚠️ Fraud Detected — SAGA Compensating Transaction Triggered'
                    : '🔑 Two-Factor OTP Required for Authorization'}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Amount: <strong>${tx.amount}</strong> | Counterparty: {tx.receiverAccountNumber} | Reason:{' '}
                  {tx.failureReason || 'High frequency or unusual transaction pattern.'}
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'Recent Event'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
