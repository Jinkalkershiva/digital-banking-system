import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BalanceCard from '../components/BalanceCard';
import TransactionList from '../components/TransactionList';
import Loading from '../components/Loading';
import AlertMessage from '../components/AlertMessage';
import { accountApi, transactionApi } from '../api/axios';

export default function Dashboard({ currentAccount }) {
  const navigate = useNavigate();
  const [account, setAccount] = useState(currentAccount);
  const [balance, setBalance] = useState(currentAccount?.balance ?? null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ==========================================
  // Saving Mode Feature State (Step 10)
  // ==========================================
  const [savingModeActive, setSavingModeActive] = useState(() => {
    return localStorage.getItem('apex_saving_mode') === 'true';
  });
  const [spendingLimit, setSpendingLimit] = useState(() => {
    return Number(localStorage.getItem('apex_spending_limit')) || 500;
  });
  const [limitInput, setLimitInput] = useState(spendingLimit);
  const [isEditingLimit, setIsEditingLimit] = useState(false);

  const fetchDashboardData = async () => {
    if (!currentAccount?.accountNumber) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch real account details
      const accRes = await accountApi.getAccount(currentAccount.accountNumber);
      setAccount(accRes.data);

      // 2. Fetch real balance
      const balRes = await accountApi.getBalance(currentAccount.accountNumber);
      setBalance(balRes.data);

      // 3. Fetch real transaction history
      const txRes = await transactionApi.getTransactionHistory(currentAccount.accountNumber);
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(
        err.friendlyMessage ||
          'Could not load complete dashboard data. Ensure backend services are running.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentAccount?.accountNumber]);

  const toggleSavingMode = () => {
    const nextVal = !savingModeActive;
    setSavingModeActive(nextVal);
    localStorage.setItem('apex_saving_mode', String(nextVal));
  };

  const handleSaveLimit = (e) => {
    e.preventDefault();
    const val = Number(limitInput);
    if (val > 0) {
      setSpendingLimit(val);
      localStorage.setItem('apex_spending_limit', String(val));
      setIsEditingLimit(false);
    }
  };

  // Calculate today's outgoing spending for saving mode
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOutgoingSpending = transactions
    .filter((tx) => {
      if (tx.senderAccountNumber !== currentAccount?.accountNumber) return false;
      if (tx.status === 'FAILED' || tx.status === 'FLAGGED' || tx.status === 'REFUNDED') return false;
      if (!tx.createdAt) return true;
      return new Date(tx.createdAt) >= todayStart;
    })
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const remainingDailyLimit = Math.max(0, spendingLimit - todayOutgoingSpending);
  const isOverLimit = savingModeActive && todayOutgoingSpending > spendingLimit;
  const progressPercent = Math.min(100, Math.round((todayOutgoingSpending / spendingLimit) * 100));

  if (loading && !account) {
    return <Loading message="Loading your digital banking dashboard..." />;
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Welcome back, {account?.accountHolderName || 'Valued Customer'}
          </h1>
          <p className="dashboard-subtitle">
            Account #{account?.accountNumber} | Managed by Apex Cloud Banking Engine
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          Refresh Data
        </button>
      </div>

      <AlertMessage type="error" message={error} onClose={() => setError(null)} />

      {account?.status === 'BLOCKED' && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <strong>ACCOUNT BLOCKED:</strong> Your account is currently blocked by the fraud prevention system. Outgoing transfers and card payments are disabled.
        </div>
      )}

      {/* Grid: Balance Card & Quick Actions */}
      <div className="dashboard-grid">
        <BalanceCard account={account} balance={balance} />

        <div className="card-panel">
          <div className="panel-header">
            <h3 className="panel-title">Quick Services</h3>
          </div>

          <div className="action-buttons-grid">
            <button className="action-btn" onClick={() => navigate('/transfer')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              Transfer Funds
            </button>

            <button className="action-btn" onClick={() => navigate('/payment')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              Card Payment
            </button>

            <button className="action-btn" onClick={() => navigate('/transactions')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              View Statement
            </button>

            <button className="action-btn" onClick={() => navigate('/profile')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Account Details
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          SAVING MODE UI COMPONENT (Step 10 Requirement)
         ========================================================= */}
      <div className={`saving-mode-card ${savingModeActive ? 'active' : ''}`}>
        <div className="saving-mode-header">
          <div className="saving-mode-info">
            <div style={{ fontSize: '1.75rem' }}>🛡️</div>
            <div>
              <div className="saving-mode-title">
                Smart Saving Mode
                <span className="badge" style={{ backgroundColor: savingModeActive ? '#dbeafe' : '#f1f5f9', color: savingModeActive ? '#1e40af' : '#64748b' }}>
                  {savingModeActive ? 'ACTIVE' : 'STANDBY'}
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Enforce daily spending guardrails and visual financial tracking.
              </p>
            </div>
          </div>

          <label className="switch-label">
            <span>{savingModeActive ? 'Saving Mode ON' : 'Saving Mode OFF'}</span>
            <div className="switch">
              <input
                type="checkbox"
                checked={savingModeActive}
                onChange={toggleSavingMode}
              />
              <span className="slider"></span>
            </div>
          </label>
        </div>

        {/* Backend Note */}
        <div
          style={{
            fontSize: '0.8rem',
            color: '#475569',
            backgroundColor: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '6px',
            padding: '0.5rem 0.75rem',
            marginBottom: '1rem',
          }}
        >
          ℹ️ <strong>Architecture Note:</strong> Backend Saving Mode APIs are planned for a future sprint. Frontend guardrails and visual states are active.
        </div>

        {savingModeActive && (
          <div>
            <div className="saving-mode-grid">
              {/* Daily Limit */}
              <div className="saving-stat-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="saving-stat-label">Daily Spending Limit</span>
                  <button
                    onClick={() => setIsEditingLimit(!isEditingLimit)}
                    style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}
                  >
                    {isEditingLimit ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {isEditingLimit ? (
                  <form onSubmit={handleSaveLimit} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      type="number"
                      min="10"
                      className="form-input"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}
                      value={limitInput}
                      onChange={(e) => setLimitInput(e.target.value)}
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                      Save
                    </button>
                  </form>
                ) : (
                  <div className="saving-stat-value">${spendingLimit.toFixed(2)}</div>
                )}
              </div>

              {/* Today's Spending */}
              <div className="saving-stat-box">
                <span className="saving-stat-label">Today's Outgoing Spending</span>
                <div className={`saving-stat-value ${isOverLimit ? 'warning' : ''}`}>
                  ${todayOutgoingSpending.toFixed(2)}
                </div>
                <div className="saving-progress-bar">
                  <div
                    className={`saving-progress-fill ${isOverLimit ? 'progress-danger' : 'progress-safe'}`}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Remaining Daily Limit */}
              <div className="saving-stat-box">
                <span className="saving-stat-label">Remaining Daily Budget</span>
                <div className={`saving-stat-value ${isOverLimit ? 'warning' : ''}`}>
                  ${remainingDailyLimit.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.75rem', color: isOverLimit ? 'var(--saving-overlimit)' : 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {isOverLimit ? '⚠️ Over-limit budget exceeded' : `${100 - progressPercent}% budget remaining`}
                </div>
              </div>
            </div>

            {/* Warning when spending exceeds the limit */}
            {isOverLimit && (
              <div className="limit-exceeded-alert">
                <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                <div>
                  <strong>Over-Limit Spending Warning:</strong> You have spent{' '}
                  <strong>${todayOutgoingSpending.toFixed(2)}</strong> today, exceeding your daily limit of{' '}
                  <strong>${spendingLimit.toFixed(2)}</strong> by{' '}
                  <strong>${(todayOutgoingSpending - spendingLimit).toFixed(2)}</strong>!
                </div>
              </div>
            )}

            {/* Visual States Legend */}
            <div className="saving-mode-badge-legend">
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Visual Indicator Legend:</span>
              <div className="legend-item">
                <span className="legend-dot dot-credit"></span>
                <span>Credit Received (Yellow)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot dot-normal"></span>
                <span>Normal Outgoing (Green)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot dot-overlimit"></span>
                <span>Over-Limit Outgoing (Red)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions Table */}
      <TransactionList
        transactions={transactions.slice(0, 5)}
        currentAccountNumber={account?.accountNumber}
        title="Recent Activity"
        savingModeActive={savingModeActive}
        spendingLimit={spendingLimit}
        showFilters={false}
      />
    </div>
  );
}
