import React from 'react';

export default function TransactionItem({ transaction, currentAccountNumber, savingModeActive, spendingLimit }) {
  const isCredit = transaction.receiverAccountNumber === currentAccountNumber;
  const isOutgoing = transaction.senderAccountNumber === currentAccountNumber;

  // Determine Saving Mode Visual States:
  // Credit: YELLOW
  // Normal outgoing/sent: GREEN
  // Over-limit outgoing: RED
  let savingModeClass = '';
  let amountColorClass = '';

  if (savingModeActive) {
    if (isCredit) {
      savingModeClass = 'tx-state-credit';
      amountColorClass = 'tx-amount-credit';
    } else if (isOutgoing) {
      const isOverLimit = spendingLimit && Number(transaction.amount) > Number(spendingLimit);
      if (isOverLimit) {
        savingModeClass = 'tx-state-overlimit';
        amountColorClass = 'tx-amount-overlimit';
      } else {
        savingModeClass = 'tx-state-normal';
        amountColorClass = 'tx-amount-normal';
      }
    }
  }

  const formattedAmount = Number(transaction.amount || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const formattedDate = transaction.createdAt
    ? new Date(transaction.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent';

  return (
    <tr className={savingModeClass}>
      <td>
        <span className="tx-id-badge">{transaction.id?.substring(0, 8)}...</span>
        <div className="tx-meta">{formattedDate}</div>
      </td>
      <td>
        <div className="tx-desc">{transaction.description || transaction.type || 'Transfer'}</div>
        <div className="tx-meta">
          {isCredit ? `From: ${transaction.senderAccountNumber}` : `To: ${transaction.receiverAccountNumber}`}
        </div>
      </td>
      <td>
        <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
          {transaction.type || 'TRANSFER'}
        </span>
      </td>
      <td>
        <span className={`badge badge-${transaction.status || 'PENDING'}`}>
          {transaction.status === 'PENDING_VERIFICATION' ? 'VERIFY OTP' : transaction.status || 'PENDING'}
        </span>
        {transaction.status === 'FLAGGED' && (
          <div style={{ fontSize: '0.75rem', color: '#e11d48', marginTop: '0.2rem', fontWeight: 600 }}>
            Fraud Alert / Refunded
          </div>
        )}
        {transaction.status === 'REFUNDED' && (
          <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.2rem', fontWeight: 600 }}>
            Refunded
          </div>
        )}
      </td>
      <td style={{ textAlign: 'right' }}>
        <span className={amountColorClass || (isCredit ? 'tx-amount-normal' : '')}>
          {isCredit ? `+${formattedAmount}` : `-${formattedAmount}`}
        </span>
      </td>
    </tr>
  );
}
