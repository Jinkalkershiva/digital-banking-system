import React from 'react';

export default function BalanceCard({ account, balance }) {
  const displayBalance = balance !== null && balance !== undefined ? Number(balance).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  }) : '$0.00';

  return (
    <div className="balance-card">
      <div className="card-top">
        <div className="bank-chip"></div>
        <div className="card-type-label">
          {account?.accountType || 'SAVINGS'} ACCOUNT
        </div>
      </div>

      <div className="card-middle">
        <div className="balance-label">Available Balance</div>
        <div className="balance-amount">{displayBalance}</div>
      </div>

      <div className="card-bottom">
        <div className="account-num-group">
          <span className="account-num-label">Account Number</span>
          <span className="account-num-value">{account?.accountNumber || '•••• •••• ••••'}</span>
        </div>
        <div>
          <span className="card-holder-name">{account?.accountHolderName || 'APEX VALUED CLIENT'}</span>
          {account?.status && (
            <span
              className={`badge badge-${account.status}`}
              style={{ display: 'block', marginTop: '0.25rem', textAlign: 'center' }}
            >
              {account.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
