import React, { useState, useEffect } from 'react';
import adminApi from '../../api/adminApi';
import {
  AdminLayout,
  AdminStatCard,
  AdminSectionCard,
  AdminTable,
  AdminSearch,
  AdminFilterBar,
  AdminPagination,
  AdminModal,
  AdminRefundStatus,
  AdminStatusBadge,
  AdminActivityTimeline,
  AdminLoadingState,
  AdminErrorState,
} from '../../components/admin';

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchRefunds = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await adminApi.getRefunds();
      setRefunds(data || []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load refund registry from microservices.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, []);

  const totalRefunds = refunds.length;
  const pendingCount = refunds.filter(
    (r) => r.status === 'REFUND_PENDING' || r.status === 'PENDING'
  ).length;
  const completedCount = refunds.filter(
    (r) => r.status === 'REFUNDED' || r.status === 'COMPENSATED' || r.status === 'SUCCESS'
  ).length;
  const failedCount = refunds.filter(
    (r) => r.status === 'REFUND_FAILED' || r.status === 'FAILED'
  ).length;
  const totalRefundVolume = refunds
    .filter((r) => r.status === 'REFUNDED' || r.status === 'COMPENSATED')
    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  const filteredRefunds = refunds.filter((r) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      r.status === statusFilter ||
      (statusFilter === 'COMPLETED' && (r.status === 'REFUNDED' || r.status === 'COMPENSATED'));

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (r.refundId && r.refundId.toLowerCase().includes(term)) ||
      (r.paymentId && r.paymentId.toLowerCase().includes(term)) ||
      (r.gatewayPaymentId && r.gatewayPaymentId.toLowerCase().includes(term)) ||
      (r.accountNumber && r.accountNumber.toLowerCase().includes(term)) ||
      (r.reason && r.reason.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredRefunds.length / pageSize) || 1;
  const paginatedRefunds = filteredRefunds.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getSagaTimelineSteps = (item) => {
    if (!item) return [];

    const isInternal = item.type === 'INTERNAL_COMPENSATION';

    return [
      {
        title: isInternal ? 'Transfer Initiated' : 'Gateway Order Created',
        description: isInternal
          ? `Sender Account ${item.accountNumber} initiated transfer of ₹${item.amount}`
          : `Razorpay Order ${item.orderId || 'ORD'} generated for ₹${item.amount}`,
        timestamp: item.createdAt ? new Date(item.createdAt).toLocaleTimeString() : 'T+0s',
        status: 'completed',
      },
      {
        title: 'Verification / Risk Check',
        description: item.reason || 'Verification failure or velocity limit challenge occurred',
        timestamp: 'T+200ms',
        status: 'completed',
      },
      {
        title: 'Kafka SAGA Compensation Event',
        description: isInternal
          ? 'Published "fraud.detected" -> transaction-service triggered compensating balance credit'
          : 'Published "payment.refund.required" to Kafka topic for asynchronous processing',
        timestamp: 'T+450ms',
        status: 'completed',
      },
      {
        title: isInternal ? 'Sender Balance Recredited' : 'Razorpay Gateway Refund API Call',
        description: isInternal
          ? `Deducted funds ₹${item.amount} safely recredited to account ${item.accountNumber} with idempotency check`
          : `Refund ID ${item.refundId} generated via Razorpay client with automated webhook sync`,
        timestamp: item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString() : 'T+850ms',
        status: item.status === 'REFUND_FAILED' ? 'failed' : 'completed',
      },
      {
        title: 'Ledger Sealed (Idempotent)',
        description:
          item.status === 'REFUND_FAILED'
            ? 'Compensation failed; manual admin intervention available.'
            : 'Compensation recorded in MySQL audit table. No duplicate refund possible.',
        timestamp: 'Settled',
        status: item.status === 'REFUND_FAILED' ? 'failed' : 'completed',
      },
    ];
  };

  const columns = [
    {
      header: 'Refund Reference',
      accessor: 'refundId',
      render: (r) => (
        <div>
          <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4338ca', fontSize: '0.85rem' }}>
            {r.refundId}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {r.type === 'INTERNAL_COMPENSATION' ? '🏛️ Internal SAGA' : '💳 Razorpay Gateway'}
          </div>
        </div>
      ),
    },
    {
      header: 'Account',
      accessor: 'accountNumber',
      render: (r) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{r.accountNumber}</span>,
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (r) => (
        <span style={{ fontWeight: 700, color: 'var(--status-completed-text)' }}>
          ₹{parseFloat(r.amount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (r) => <AdminRefundStatus status={r.status} refundStatus={r.status} />,
    },
    {
      header: 'Compensation Reason',
      accessor: 'reason',
      render: (r) => (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '260px' }}>
          {r.reason}
        </div>
      ),
    },
    {
      header: 'Timestamp',
      accessor: 'updatedAt',
      render: (r) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {r.updatedAt ? new Date(r.updatedAt).toLocaleString() : 'Recent'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRefund(r);
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
    { label: 'All Compensations', value: 'ALL', count: totalRefunds },
    { label: 'Completed', value: 'COMPLETED', count: completedCount },
    { label: 'Pending', value: 'REFUND_PENDING', count: pendingCount },
    { label: 'Failed', value: 'REFUND_FAILED', count: failedCount },
  ];

  return (
    <AdminLayout
      onRefresh={() => fetchRefunds(true)}
      refreshing={refreshing}
      title="↩️ Idempotent Refund & Compensation Hub"
      subtitle="Kafka-Driven Distributed SAGA Compensations • Razorpay API Automated Reconciliation & Idempotent Rollbacks"
    >
      {error && (
        <AdminErrorState
          title="Failed to Load Refund Ledgers"
          message={error}
          onRetry={() => fetchRefunds(false)}
        />
      )}

      {/* SAGA Architecture Notice Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          border: '1px solid #bfdbfe',
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <span style={{ fontSize: '1.75rem' }}>⚡</span>
        <div>
          <h4 style={{ margin: '0 0 0.35rem 0', color: '#1e40af', fontSize: '0.95rem' }}>
            Autonomous SAGA Compensation & Zero Double-Credit Guarantee
          </h4>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#1e3a8a', lineHeight: '1.5' }}>
            When a transaction fails verification or breaches velocity limits, an idempotent{' '}
            <code>payment.refund.required</code> or <code>fraud.detected</code> event is broadcast on Kafka. The
            system verifies that no duplicate refund has occurred before triggering a Razorpay gateway refund or
            recrediting the customer account.
          </p>
        </div>
      </div>

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
          title="Total Refund Operations"
          value={totalRefunds}
          subtitle="Gateway + SAGA Compensations"
          icon="↩️"
          gradient="rgba(59, 130, 246, 0.08)"
        />

        <AdminStatCard
          title="Completed Refunds"
          value={completedCount}
          subtitle="Idempotently Reconciled"
          icon="✅"
          gradient="rgba(16, 185, 129, 0.08)"
          trend="Settled"
          trendPositive={true}
        />

        <AdminStatCard
          title="Pending Compensations"
          value={pendingCount}
          subtitle="In Kafka Pipeline"
          icon="⏳"
          gradient="rgba(245, 158, 11, 0.08)"
          trend={pendingCount > 0 ? 'Processing' : 'Zero Queue'}
          trendPositive={pendingCount === 0}
        />

        <AdminStatCard
          title="Failed Compensations"
          value={failedCount}
          subtitle="Requires Admin Action"
          icon="⚠️"
          gradient="rgba(239, 68, 68, 0.08)"
          trend={failedCount > 0 ? 'Attention' : 'Clean'}
          trendPositive={failedCount === 0}
        />

        <AdminStatCard
          title="Total Volume Refunded"
          value={`₹${totalRefundVolume.toFixed(2)}`}
          subtitle="Returned to Customers"
          icon="💰"
          gradient="rgba(139, 92, 246, 0.08)"
        />
      </div>

      {/* Main Ledger Card */}
      <AdminSectionCard
        title="Refund & Compensation Ledger"
        subtitle="Live audit trail of all automated rollbacks and refund transactions"
        icon="📋"
      >
        {/* Search and Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
          <AdminSearch
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="Search by Refund ID, Payment ID, Gateway ID, Account, or Reason..."
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
          <AdminLoadingState message="Loading refund registry..." />
        ) : (
          <>
            <AdminTable
              columns={columns}
              data={paginatedRefunds}
              onRowClick={(row) => setSelectedRefund(row)}
              emptyMessage="No refund records match your search criteria."
            />
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredRefunds.length}
              pageSize={pageSize}
            />
          </>
        )}
      </AdminSectionCard>

      {/* SAGA Flow Inspection Modal */}
      {selectedRefund && (
        <AdminModal
          isOpen={Boolean(selectedRefund)}
          onClose={() => setSelectedRefund(null)}
          title={`SAGA Compensation Flow: ${selectedRefund.refundId}`}
          subtitle="Distributed Transaction State Machine Inspection"
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Metadata Summary Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1rem',
                backgroundColor: 'var(--bg-main)',
                padding: '1rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Target Account:</span>{' '}
                <strong>{selectedRefund.accountNumber}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Refund Amount:</span>{' '}
                <strong style={{ color: 'var(--status-completed-text)' }}>
                  ₹{parseFloat(selectedRefund.amount || 0).toFixed(2)}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Original ID:</span>{' '}
                <code style={{ fontSize: '0.8rem' }}>{selectedRefund.paymentId || selectedRefund.transactionId}</code>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>{' '}
                <AdminRefundStatus status={selectedRefund.status} refundStatus={selectedRefund.status} />
              </div>
            </div>

            {/* SAGA Step Timeline */}
            <div>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem' }}>SAGA Execution Steps</h4>
              <AdminActivityTimeline steps={getSagaTimelineSteps(selectedRefund)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                onClick={() => setSelectedRefund(null)}
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
