import React, { useState, useEffect } from 'react';
import TransactionList from '../components/TransactionList';
import Loading from '../components/Loading';
import AlertMessage from '../components/AlertMessage';
import { transactionApi } from '../api/axios';

export default function Transactions({ currentAccount }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTransactions = async () => {
    if (!currentAccount?.accountNumber) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Connect to real endpoint: GET /api/v1/transactions/account/{accountNumber}
      const res = await transactionApi.getTransactionHistory(currentAccount.accountNumber);
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(
        err.friendlyMessage ||
          'Failed to load transaction statement. Ensure Transaction Service is online.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [currentAccount?.accountNumber]);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Account Activity & Statements</h1>
          <p className="dashboard-subtitle">
            Audited transaction ledger for Account #{currentAccount?.accountNumber}
          </p>
        </div>

        <button onClick={fetchTransactions} className="btn-secondary">
          Refresh Statement
        </button>
      </div>

      <AlertMessage type="error" message={error} onClose={() => setError(null)} />

      {loading ? (
        <Loading message="Fetching transaction history from ledger..." />
      ) : (
        <TransactionList
          transactions={transactions}
          currentAccountNumber={currentAccount?.accountNumber}
          title={`All Recorded Transactions (${transactions.length})`}
          showFilters={true}
        />
      )}
    </div>
  );
}
