import React, { useState } from 'react';
import TransactionItem from './TransactionItem';

export default function TransactionList({
  transactions = [],
  currentAccountNumber,
  title = 'Recent Transactions',
  savingModeActive = false,
  spendingLimit = 1000,
  showFilters = true,
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');

  const filteredTransactions = transactions.filter((tx) => {
    if (filterStatus === 'ALL') return true;
    return tx.status === filterStatus;
  });

  return (
    <div className="transactions-container">
      <div className="table-header-bar">
        <h3 className="table-title">{title}</h3>

        {showFilters && (
          <div className="table-actions">
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="PENDING_VERIFICATION">Verification Required</option>
              <option value="FLAGGED">Flagged (Fraud)</option>
              <option value="REFUNDED">Refunded</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        )}
      </div>

      <div className="table-responsive">
        {filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h4>No transactions found</h4>
            <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>
              {transactions.length === 0
                ? 'No activity recorded on this account yet.'
                : 'No transactions match the selected filter.'}
            </p>
          </div>
        ) : (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Transaction / Date</th>
                <th>Description / Counterparty</th>
                <th>Type</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <TransactionItem
                  key={tx.id || Math.random()}
                  transaction={tx}
                  currentAccountNumber={currentAccountNumber}
                  savingModeActive={savingModeActive}
                  spendingLimit={spendingLimit}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
