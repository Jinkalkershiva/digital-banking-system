import React, { useState, useEffect } from 'react';
import AlertMessage from '../components/AlertMessage';
import Loading from '../components/Loading';
import { accountApi } from '../api/axios';

export default function Profile({ currentAccount, onAccountUpdated }) {
  const [account, setAccount] = useState(currentAccount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [isBlocking, setIsBlocking] = useState(false);

  const fetchProfile = async () => {
    if (!currentAccount?.accountNumber) return;
    setLoading(true);
    setError(null);
    try {
      const res = await accountApi.getAccount(currentAccount.accountNumber);
      setAccount(res.data);
      if (onAccountUpdated) onAccountUpdated(res.data);
    } catch (err) {
      setError(err.friendlyMessage || 'Could not refresh account details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [currentAccount?.accountNumber]);

  const handleBlockAccount = async () => {
    if (!window.confirm('Are you sure you want to freeze/block this account? This will prevent outgoing transactions.')) {
      return;
    }

    setIsBlocking(true);
    setError(null);
    setActionSuccess(null);

    try {
      // Connect to real endpoint: PUT /api/v1/accounts/{accountNumber}/block
      const res = await accountApi.blockAccount(account.accountNumber);
      setActionSuccess(res.data || 'Account successfully blocked.');
      fetchProfile();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to block account.');
    } finally {
      setIsBlocking(false);
    }
  };

  if (loading && !account) {
    return <Loading message="Loading profile specifications..." />;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Account & Profile Information</h1>
          <p className="dashboard-subtitle">
            KYC details, limits, and security configuration
          </p>
        </div>
      </div>

      <AlertMessage type="error" message={error} onClose={() => setError(null)} />
      <AlertMessage type="success" message={actionSuccess} onClose={() => setActionSuccess(null)} />

      <div className="card-panel" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
              {account?.accountHolderName || 'Account Holder'}
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Client ID: {account?.id || 'N/A'}
            </span>
          </div>

          <span className={`badge badge-${account?.status || 'ACTIVE'}`}>
            {account?.status || 'ACTIVE'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Account Number
            </label>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, fontFamily: 'monospace', marginTop: '0.2rem' }}>
              {account?.accountNumber}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Account Type
            </label>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '0.2rem' }}>
              {account?.accountType || 'SAVINGS'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Email Address
            </label>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {account?.email || 'N/A'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Phone Number
            </label>
            <div style={{ fontSize: '0.95rem', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {account?.phone || 'N/A'}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Current Balance
            </label>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent)', marginTop: '0.2rem' }}>
              ${Number(account?.balance || 0).toFixed(2)}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
              Daily Limit Configured
            </label>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)', marginTop: '0.2rem' }}>
              ${Number(account?.dailyTransactionLimit || 1000).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Security Actions Card */}
      <div className="card-panel" style={{ borderLeft: '4px solid #ef4444' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>
          Emergency Security Controls
        </h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          If you suspect unauthorized activity or fraud, you can immediately freeze your account using the backend security endpoint.
        </p>

        {account?.status === 'BLOCKED' ? (
          <div className="badge badge-BLOCKED" style={{ padding: '0.5rem 1rem' }}>
            Account is Currently Frozen / Blocked
          </div>
        ) : (
          <button
            onClick={handleBlockAccount}
            className="btn-danger"
            disabled={isBlocking}
          >
            {isBlocking ? 'Freezing Account...' : 'Emergency: Block / Freeze Account'}
          </button>
        )}
      </div>
    </div>
  );
}
