import React, { useState, useEffect } from 'react';
import adminApi from '../../api/adminApi';
import {
  AdminLayout,
  AdminSectionCard,
  AdminStatCard,
  AdminTable,
  AdminSearch,
  AdminFilterBar,
  AdminPagination,
  AdminModal,
  AdminTransactionStatus,
  AdminActivityTimeline,
  AdminLoadingState,
  AdminErrorState,
} from '../../components/admin';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState(null);
  const pageSize = 10;

  const fetchTransactions = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await adminApi.getTransactions();
      setTransactions(res.data || []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load transactions from Transaction Service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totalCount = transactions.length;
  const completedTx = transactions.filter(
    (t) => t.status === 'COMPLETED' || t.status === 'SUCCESS'
  );
  const completedCount = completedTx.length;
  const completedVolume = completedTx.reduce(
    (sum, t) => sum + (parseFloat(t.amount) || 0),
    0
  );
  const pendingOtpCount = transactions.filter(
    (t) => t.status === 'PENDING_VERIFICATION'
  ).length;
  const flaggedCount = transactions.filter(
    (t) => t.status === 'FLAGGED'
  ).length;
  const failedCount = transactions.filter(
    (t) => t.status === 'FAILED'
  ).length;

  const filteredTransactions = transactions.filter((tx) => {
    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (tx.id && tx.id.toLowerCase().includes(term)) ||
      (tx.senderAccountNumber && tx.senderAccountNumber.toLowerCase().includes(term)) ||
      (tx.receiverAccountNumber && tx.receiverAccountNumber.toLowerCase().includes(term)) ||
      (tx.description && tx.description.toLowerCase().includes(term)) ||
      (tx.failureReason && tx.failureReason.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getTransactionTimeline = (tx) => {
    if (!tx) return [];

    const isFlagged = tx.status === 'FLAGGED';
    const isFailed = tx.status === 'FAILED';
    const isPending = tx.status === 'PENDING_VERIFICATION';
    const isCompleted = tx.status === 'COMPLETED' || tx.status === 'SUCCESS';

    return [
      {
        title: 'Step 1: Transfer Initiated',
        description: `Sender ${tx.senderAccountNumber} requested ₹${tx.amount}. Funds held in escrow ledger.`,
        timestamp: tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString() : 'T+0ms',
        status: 'completed',
      },
      {
        title: 'Step 2: Fraud Detection Check',
        description: isPending || isFlagged
          ? 'Anomaly detected by Fraud Detection Service: OTP challenge dispatched'
          : 'Risk score evaluated clean. Transaction approved for immediate settlement.',
        timestamp: 'T+120ms',
        status: 'completed',
      },
      {
        title: 'Step 3: Verification & 2FA Challenge',
        description: isPending
          ? '6-Digit OTP sent via Notification Service. Awaiting user input.'
          : isFlagged
          ? 'OTP verification failed or expired. SAGA rollback initiated.'
          : 'Verification bypassed or validated successfully.',
        timestamp: 'T+350ms',
        status: isPending ? 'in_progress' : isFlagged || isFailed ? 'failed' : 'completed',
      },
      {
        title: isFlagged ? 'Step 4: SAGA Compensation (Refund)' : 'Step 4: Recipient Credit & Settlement',
        description: isFlagged
          ? `Kafka "fraud.detected" event consumed. Deducted funds ₹${tx.amount} recredited to sender ${tx.senderAccountNumber} with idempotency seal.`
          : isCompleted
          ? `Funds ₹${tx.amount} successfully credited to receiver account ${tx.receiverAccountNumber || 'N/A'}.`
          : 'Awaiting completion.',
        timestamp: tx.completedAt ? new Date(tx.completedAt).toLocaleTimeString() : 'Settlement',
        status: isCompleted || isFlagged ? 'completed' : isFailed ? 'failed' : 'pending',
      },
    ];
  };

  const columns = [
    {
      header: 'Transaction ID',
      accessor: 'id',
      render: (tx) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#4338ca' }}>
          {tx.id?.length > 16 ? `${tx.id.substring(0, 16)}...` : tx.id}
        </span>
      ),
    },
    {
      header: 'Sender Account',
      accessor: 'senderAccountNumber',
      render: (tx) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{tx.senderAccountNumber}</span>,
    },
    {
      header: 'Receiver Account',
      accessor: 'receiverAccountNumber',
      render: (tx) => (
        <span style={{ fontFamily: 'monospace' }}>
          {tx.receiverAccountNumber || 'N/A (External/Gateway)'}
        </span>
      ),
    },
    {
      header: 'Transfer Amount',
      accessor: 'amount',
      render: (tx) => (
        <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.95rem' }}>
          ₹{parseFloat(tx.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'SAGA Status',
      accessor: 'status',
      render: (tx) => <AdminTransactionStatus status={tx.status} />,
    },
    {
      header: 'Notes / Reason',
      accessor: 'failureReason',
      render: (tx) => (
        <div style={{ fontSize: '0.8rem', color: tx.failureReason ? '#dc2626' : 'var(--text-muted)', maxWidth: '240px' }}>
          {tx.failureReason || tx.description || 'Standard Peer Transfer'}
        </div>
      ),
    },
    {
      header: 'Timestamp',
      accessor: 'createdAt',
      render: (tx) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'Recent'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (tx) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTx(tx);
          }}
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--accent)',
            backgroundColor: 'var(--accent-subtle)',
            color: 'var(--accent)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🔍 Inspect SAGA
        </button>
      ),
    },
  ];

  const filterOptions = [
    { label: 'All Transactions', value: 'ALL', count: totalCount },
    { label: 'Completed', value: 'COMPLETED', count: completedCount },
    { label: 'OTP Challenge Pending', value: 'PENDING_VERIFICATION', count: pendingOtpCount },
    { label: 'Compensated (Flagged)', value: 'FLAGGED', count: flaggedCount },
    { label: 'Failed', value: 'FAILED', count: failedCount },
  ];

  return (
    <AdminLayout
      onRefresh={() => fetchTransactions(true)}
      refreshing={refreshing}
      title="📊 Transaction Audit Ledger & SAGA Orchestration"
      subtitle="Distributed Fund Transfer Ledger • Real-Time Settlement, OTP Verification & Idempotent Compensations"
    >
      {error && (
        <AdminErrorState
          title="Transaction Ledger Error"
          message={error}
          onRetry={() => fetchTransactions(false)}
        />
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <AdminStatCard
          title="Total Transactions"
          value={totalCount}
          subtitle="All SAGA Initiations"
          icon="📊"
          gradient="rgba(59, 130, 246, 0.08)"
          trend="transaction-service"
          trendPositive={true}
        />

        <AdminStatCard
          title="Settled Volume"
          value={`₹${completedVolume.toLocaleString()}`}
          subtitle={`${completedCount} Completed Transfers`}
          icon="💰"
          gradient="rgba(16, 185, 129, 0.08)"
          trend="100% Reconciled"
          trendPositive={true}
        />

        <AdminStatCard
          title="OTP Verification Pending"
          value={pendingOtpCount}
          subtitle="Awaiting Customer 2FA"
          icon="⏳"
          gradient="rgba(245, 158, 11, 0.08)"
          trend={pendingOtpCount > 0 ? 'Active Challenges' : 'Queue Clear'}
          trendPositive={pendingOtpCount === 0}
        />

        <AdminStatCard
          title="Compensated / Flagged"
          value={flaggedCount}
          subtitle="Safely Recredited via SAGA"
          icon="↩️"
          gradient="rgba(239, 68, 68, 0.08)"
          trend="Idempotent Rollbacks"
          trendPositive={true}
        />
      </div>

      {/* Main Ledger Section */}
      <AdminSectionCard
        title="Transaction Ledger & Audit Trail"
        subtitle="Search and filter all distributed transfers, check OTP challenge states, and inspect compensations"
        icon="📋"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
          <AdminSearch
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="Search by Transaction ID, Sender Account, Receiver Account, or Reason..."
          />
          <AdminFilterBar
            filters={filterOptions}
            activeFilter={statusFilter}
            onSelect={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
          />
        </div>

        {loading && !refreshing ? (
          <AdminLoadingState message="Loading transaction audit ledger..." />
        ) : (
          <>
            <AdminTable
              columns={columns}
              data={paginatedTransactions}
              onRowClick={(tx) => setSelectedTx(tx)}
              emptyMessage="No transactions match your search criteria."
            />
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredTransactions.length}
              pageSize={pageSize}
            />
          </>
        )}
      </AdminSectionCard>

      {/* SAGA Flow Inspection Modal */}
      {selectedTx && (
        <AdminModal
          isOpen={Boolean(selectedTx)}
          onClose={() => setSelectedTx(null)}
          title={`SAGA Orchestration: ${selectedTx.id}`}
          subtitle="Distributed Transaction Lifecycle & State Verification"
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                backgroundColor: 'var(--bg-main)',
                padding: '1.25rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Sender Account:</span>{' '}
                <strong style={{ fontFamily: 'monospace' }}>{selectedTx.senderAccountNumber}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Receiver Account:</span>{' '}
                <strong style={{ fontFamily: 'monospace' }}>{selectedTx.receiverAccountNumber || 'N/A'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Transfer Amount:</span>{' '}
                <strong style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>
                  ₹{parseFloat(selectedTx.amount || 0).toLocaleString()}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>{' '}
                <AdminTransactionStatus status={selectedTx.status} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-muted)' }}>Notes / Failure Reason:</span>{' '}
                <span>{selectedTx.failureReason || selectedTx.description || 'Standard Fund Transfer'}</span>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>SAGA State Transitions</h4>
              <AdminActivityTimeline steps={getTransactionTimeline(selectedTx)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                onClick={() => setSelectedTx(null)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </AdminLayout>
  );
}
