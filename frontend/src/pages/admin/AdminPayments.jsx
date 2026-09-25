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
  AdminRefundStatus,
  AdminLoadingState,
  AdminErrorState,
} from '../../components/admin';

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refundLoading, setRefundLoading] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [refundModal, setRefundModal] = useState({
    isOpen: false,
    payment: null,
    reason: 'Administrative manual refund',
  });
  const pageSize = 10;

  const fetchPayments = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await adminApi.getPayments();
      setPayments(res.data || []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load payments from Payment Service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalOrders = payments.length;
  const capturedPayments = payments.filter(
    (p) => p.status === 'COMPLETED' || p.status === 'CAPTURED'
  );
  const capturedCount = capturedPayments.length;
  const capturedVolume = capturedPayments.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0
  );
  const refundedPayments = payments.filter(
    (p) => p.status === 'REFUNDED' || p.refundStatus === 'REFUNDED'
  );
  const refundCount = refundedPayments.length;
  const refundVolume = refundedPayments.reduce(
    (sum, p) => sum + (parseFloat(p.amount) || 0),
    0
  );
  const pendingCount = payments.filter(
    (p) => p.status === 'CREATED' || p.status === 'PENDING_VERIFICATION' || p.status === 'AUTHORIZED'
  ).length;

  const handleOpenRefundModal = (payment) => {
    setRefundModal({
      isOpen: true,
      payment,
      reason: 'Administrative manual refund',
    });
  };

  const handleExecuteRefund = async (e) => {
    e.preventDefault();
    const { payment, reason } = refundModal;
    if (!payment) return;

    setRefundLoading((prev) => ({ ...prev, [payment.id]: true }));
    setError(null);
    setSuccess(null);
    setRefundModal({ isOpen: false, payment: null, reason: '' });

    try {
      const res = await adminApi.refundPayment(payment.id, { reason });
      setSuccess(
        `Refund executed successfully for order ${payment.razorpayOrderId}. Refund Status: ${
          res.data?.refundStatus || 'REFUNDED'
        }`
      );
      await fetchPayments(true);
    } catch (err) {
      setError(err.friendlyMessage || `Refund failed for payment ${payment.id}`);
    } finally {
      setRefundLoading((prev) => ({ ...prev, [payment.id]: false }));
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      p.status === statusFilter ||
      p.refundStatus === statusFilter ||
      (statusFilter === 'COMPLETED' && (p.status === 'COMPLETED' || p.status === 'CAPTURED'));

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (p.id && p.id.toLowerCase().includes(term)) ||
      (p.razorpayOrderId && p.razorpayOrderId.toLowerCase().includes(term)) ||
      (p.razorpayPaymentId && p.razorpayPaymentId.toLowerCase().includes(term)) ||
      (p.accountNumber && p.accountNumber.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredPayments.length / pageSize) || 1;
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns = [
    {
      header: 'Internal ID',
      accessor: 'id',
      render: (p) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem', color: '#4338ca' }}>
          {p.id?.length > 14 ? `${p.id.substring(0, 14)}...` : p.id}
        </span>
      ),
    },
    {
      header: 'Razorpay Order ID',
      accessor: 'razorpayOrderId',
      render: (p) => <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.razorpayOrderId}</span>,
    },
    {
      header: 'Razorpay Payment ID',
      accessor: 'razorpayPaymentId',
      render: (p) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {p.razorpayPaymentId || <span style={{ color: 'var(--text-muted)' }}>Not captured</span>}
        </span>
      ),
    },
    {
      header: 'Account',
      accessor: 'accountNumber',
      render: (p) => <span style={{ fontFamily: 'monospace' }}>{p.accountNumber}</span>,
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (p) => (
        <span style={{ fontWeight: 700, color: 'var(--status-completed-text)', fontSize: '0.95rem' }}>
          ₹{parseFloat(p.amount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Payment Status',
      accessor: 'status',
      render: (p) => <AdminRefundStatus status={p.status} refundStatus={p.refundStatus} />,
    },
    {
      header: 'Refund Reference / Notes',
      render: (p) => (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '240px' }}>
          {p.razorpayRefundId && (
            <div style={{ fontWeight: 700, color: '#3730a3', fontFamily: 'monospace' }}>
              Ref: {p.razorpayRefundId}
            </div>
          )}
          <div>{p.failureReason || p.description || 'Standard Checkout'}</div>
        </div>
      ),
    },
    {
      header: 'Admin Actions',
      render: (p) => {
        const isRefundable =
          (p.status === 'COMPLETED' || p.status === 'CAPTURED') &&
          p.refundStatus !== 'REFUNDED' &&
          p.refundStatus !== 'REFUND_PENDING' &&
          Boolean(p.razorpayPaymentId);

        return (
          <div>
            {isRefundable ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenRefundModal(p);
                }}
                disabled={refundLoading[p.id]}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                }}
              >
                {refundLoading[p.id] ? 'Processing...' : '↩️ Trigger Refund'}
              </button>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {p.refundStatus === 'REFUNDED' ? 'Settled / Refunded' : 'N/A'}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const filterOptions = [
    { label: 'All Orders', value: 'ALL', count: totalOrders },
    { label: 'Captured', value: 'COMPLETED', count: capturedCount },
    { label: 'Refunded', value: 'REFUNDED', count: refundCount },
    { label: 'Pending / Created', value: 'CREATED', count: pendingCount },
  ];

  return (
    <AdminLayout
      onRefresh={() => fetchPayments(true)}
      refreshing={refreshing}
      title="💳 Razorpay Payment Orders & Gateway Ledger"
      subtitle="Payment Service Orders • Webhook Capture Tracking, HMAC Signature Verification & Manual Refunds"
    >
      {error && (
        <AdminErrorState
          title="Payment Ledger Error"
          message={error}
          onRetry={() => fetchPayments(false)}
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
          title="Total Payment Orders"
          value={totalOrders}
          subtitle="Razorpay Checkout Intents"
          icon="💳"
          gradient="rgba(59, 130, 246, 0.08)"
          trend="payment-service"
          trendPositive={true}
        />

        <AdminStatCard
          title="Captured Volume"
          value={`₹${capturedVolume.toFixed(2)}`}
          subtitle={`${capturedCount} Captured Orders`}
          icon="💰"
          gradient="rgba(16, 185, 129, 0.08)"
          trend="Webhook Verified"
          trendPositive={true}
        />

        <AdminStatCard
          title="Refunded Volume"
          value={`₹${refundVolume.toFixed(2)}`}
          subtitle={`${refundCount} Gateway Refunds`}
          icon="↩️"
          gradient="rgba(236, 72, 153, 0.08)"
          trend="Reconciled"
          trendPositive={true}
        />

        <AdminStatCard
          title="Pending Checkouts"
          value={pendingCount}
          subtitle="Uncaptured or Created"
          icon="⏳"
          gradient="rgba(245, 158, 11, 0.08)"
        />
      </div>

      {/* Main Table Card */}
      <AdminSectionCard
        title="Gateway Orders Ledger"
        subtitle="Search and filter all payment transactions, check webhook status, and issue administrative refunds"
        icon="📋"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
          <AdminSearch
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="Search by Payment ID, Razorpay Order ID, Razorpay Payment ID, or Account..."
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
          <AdminLoadingState message="Loading payment orders..." />
        ) : (
          <>
            <AdminTable
              columns={columns}
              data={paginatedPayments}
              emptyMessage="No payment orders match your search criteria."
            />
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredPayments.length}
              pageSize={pageSize}
            />
          </>
        )}
      </AdminSectionCard>

      {/* Manual Refund Trigger Modal */}
      {refundModal.isOpen && (
        <AdminModal
          isOpen={refundModal.isOpen}
          onClose={() => setRefundModal({ isOpen: false, payment: null, reason: '' })}
          title="↩️ Trigger Administrative Gateway Refund"
          subtitle={`Initiate an immediate Razorpay refund for Order ${refundModal.payment?.razorpayOrderId}`}
          maxWidth="560px"
        >
          <form onSubmit={handleExecuteRefund} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-main)',
                padding: '1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div><strong>Gateway Payment ID:</strong> {refundModal.payment?.razorpayPaymentId}</div>
              <div><strong>Target Account:</strong> {refundModal.payment?.accountNumber}</div>
              <div><strong>Refund Amount:</strong> ₹{parseFloat(refundModal.payment?.amount || 0).toFixed(2)}</div>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                Reason for Refund (Audit Logging)
              </label>
              <textarea
                value={refundModal.reason}
                onChange={(e) => setRefundModal({ ...refundModal, reason: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9rem',
                }}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                This reason will be recorded in the MySQL payment ledger and attached to the Razorpay refund payload.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setRefundModal({ isOpen: false, payment: null, reason: '' })}
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
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Confirm Refund
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </AdminLayout>
  );
}
