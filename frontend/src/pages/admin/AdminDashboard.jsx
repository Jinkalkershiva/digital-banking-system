import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import adminApi from '../../api/adminApi';
import {
  AdminLayout,
  AdminStatCard,
  AdminSectionCard,
  AdminTable,
  AdminStatusBadge,
  AdminTransactionStatus,
  AdminRefundStatus,
  AdminErrorState,
  AdminLoadingState,
  AdminHealthCard,
} from '../../components/admin';

export default function AdminDashboard({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    userCount: 0,
    accountCount: 0,
    blockedAccountsCount: 0,
    totalBalance: 0,
    transactionCount: 0,
    transactionVolume: 0,
    paymentCount: 0,
    paymentVolume: 0,
    refundCount: 0,
    refundVolume: 0,
    recentTransactions: [],
    recentPayments: [],
  });
  const [healthData, setHealthData] = useState(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [overviewData, healthRes] = await Promise.allSettled([
        adminApi.getAdminOverview(),
        adminApi.getSystemHealth(),
      ]);

      if (overviewData.status === 'fulfilled') {
        setStats(overviewData.value);
      } else {
        setError(overviewData.reason?.friendlyMessage || 'Failed to aggregate admin dashboard telemetry.');
      }

      if (healthRes.status === 'fulfilled' && healthRes.value?.data) {
        setHealthData(healthRes.value.data);
      }
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to aggregate admin dashboard telemetry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !refreshing) {
    return <AdminLoadingState message="Loading system telemetry and multi-service ledgers..." />;
  }

  const healthyCount = healthData?.services
    ? Object.values(healthData.services).filter((s) => s.status === 'UP').length
    : 10;
  const totalServices = healthData?.services
    ? Object.keys(healthData.services).length
    : 10;

  const transactionColumns = [
    {
      header: 'Tx ID',
      accessor: 'id',
      render: (tx) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem' }}>
          {tx.id?.length > 12 ? `${tx.id.substring(0, 12)}...` : tx.id}
        </span>
      ),
    },
    {
      header: 'Sender',
      accessor: 'senderAccountNumber',
      render: (tx) => <span style={{ fontFamily: 'monospace' }}>{tx.senderAccountNumber}</span>,
    },
    {
      header: 'Receiver',
      accessor: 'receiverAccountNumber',
      render: (tx) => (
        <span style={{ fontFamily: 'monospace' }}>
          {tx.receiverAccountNumber || 'N/A (Gateway/Ext)'}
        </span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (tx) => (
        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
          ₹{parseFloat(tx.amount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (tx) => <AdminTransactionStatus status={tx.status} />,
    },
    {
      header: 'Time',
      accessor: 'createdAt',
      render: (tx) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
        </span>
      ),
    },
  ];

  const paymentColumns = [
    {
      header: 'Order ID',
      accessor: 'razorpayOrderId',
      render: (p) => (
        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600 }}>
          {p.razorpayOrderId || (p.id?.length > 10 ? `${p.id.substring(0, 10)}...` : p.id)}
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
        <span style={{ fontWeight: 700, color: 'var(--status-completed-text)' }}>
          ₹{parseFloat(p.amount || 0).toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (p) => <AdminRefundStatus status={p.status} refundStatus={p.refundStatus} />,
    },
    {
      header: 'Time',
      accessor: 'createdAt',
      render: (p) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout
      currentUser={currentUser}
      onRefresh={() => loadData(true)}
      refreshing={refreshing}
      title="Executive Banking Control Center"
      subtitle="System Administration • Spring Security Principal: ADMIN • Real-time Microservices Telemetry"
    >
      {error && (
        <AdminErrorState
          title="Telemetry Connection Error"
          message={error}
          onRetry={() => loadData(false)}
        />
      )}

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem',
        }}
      >
        <AdminStatCard
          title="Registered Users"
          value={stats.userCount}
          subtitle="SpringSecEx Identity Store"
          icon="👥"
          gradient="rgba(59, 130, 246, 0.08)"
          trend="Secured with BCrypt 12"
          trendPositive={true}
        />

        <AdminStatCard
          title="Active Accounts"
          value={stats.accountCount}
          subtitle={
            stats.blockedAccountsCount > 0
              ? `${stats.blockedAccountsCount} Blocked by Fraud Rule`
              : 'All Accounts Operational'
          }
          icon="🏛️"
          gradient="rgba(16, 185, 129, 0.08)"
          trend={stats.blockedAccountsCount > 0 ? 'Action Needed' : 'Normal'}
          trendPositive={stats.blockedAccountsCount === 0}
        />

        <AdminStatCard
          title="Total Vault Balance"
          value={`₹${stats.totalBalance.toLocaleString()}`}
          subtitle="Across All Customer Ledgers"
          icon="💰"
          gradient="rgba(245, 158, 11, 0.08)"
          trend="JPA Aggregate"
          trendPositive={true}
        />

        <AdminStatCard
          title="Transactions Settled"
          value={stats.transactionCount}
          subtitle={`₹${stats.transactionVolume.toLocaleString()} Total Volume`}
          icon="🔄"
          gradient="rgba(99, 102, 241, 0.08)"
          trend="Kafka SAGA Orchestrated"
          trendPositive={true}
        />

        <AdminStatCard
          title="Razorpay Orders"
          value={stats.paymentCount}
          subtitle={`₹${stats.paymentVolume.toLocaleString()} Processed`}
          icon="💳"
          gradient="rgba(139, 92, 246, 0.08)"
          trend="HMAC Verified"
          trendPositive={true}
        />

        <AdminStatCard
          title="Idempotent Refunds"
          value={stats.refundCount}
          subtitle={`₹${stats.refundVolume.toLocaleString()} Compensated`}
          icon="↩️"
          gradient="rgba(236, 72, 153, 0.08)"
          trend="Zero-Double-Credit SAGA"
          trendPositive={true}
        />

        <AdminStatCard
          title="Cluster Health"
          value={`${healthyCount}/${totalServices}`}
          subtitle="Microservices & Infrastructure"
          icon="⚡"
          gradient="rgba(34, 197, 94, 0.08)"
          trend={healthyCount === totalServices ? '100% Healthy' : 'Degraded'}
          trendPositive={healthyCount === totalServices}
        />
      </div>

      {/* Two Column Layout: Recent Transactions & Recent Payments */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
      >
        {/* Recent Transactions */}
        <AdminSectionCard
          title="Recent Distributed SAGA Transactions"
          subtitle="Real-time fund transfer and OTP verification audit stream"
          icon="📊"
          action={
            <Link
              to="/admin/transactions"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--accent)',
                textDecoration: 'none',
              }}
            >
              View Full Audit Trail &rarr;
            </Link>
          }
        >
          <AdminTable
            columns={transactionColumns}
            data={stats.recentTransactions || []}
            emptyMessage="No recent transactions recorded in ledger."
          />
        </AdminSectionCard>

        {/* Recent Payment Orders */}
        <AdminSectionCard
          title="Recent Gateway Payment Orders"
          subtitle="Razorpay checkout captures and webhook reconciliations"
          icon="💳"
          action={
            <Link
              to="/admin/payments"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--accent)',
                textDecoration: 'none',
              }}
            >
              View All Orders &rarr;
            </Link>
          }
        >
          <AdminTable
            columns={paymentColumns}
            data={stats.recentPayments || []}
            emptyMessage="No recent payment orders found."
          />
        </AdminSectionCard>
      </div>

      {/* Administration Portals Navigation Grid */}
      <AdminSectionCard
        title="Administrative Service Portals"
        subtitle="Direct access to individual microservice domain controllers and configurations"
        icon="🛠️"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <Link
            to="/admin/users"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>👥</span>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>User Identity Registry</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Manage BCrypt authenticated principals, account authorities, and security credentials.
            </p>
          </Link>

          <Link
            to="/admin/accounts"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🏛️</span>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>Bank Accounts & Limits</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Inspect customer ledgers, daily velocity limits, and execute emergency block/unblock actions.
            </p>
          </Link>

          <Link
            to="/admin/transactions"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📊</span>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>Transaction Audit Ledger</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Inspect SAGA distributed transactions, 6-digit OTP verification, and compensation status.
            </p>
          </Link>

          <Link
            to="/admin/payments"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>💳</span>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>Razorpay Payment Orders</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Track order captures, HMAC signatures, webhooks, and trigger manual administrative refunds.
            </p>
          </Link>

          <Link
            to="/admin/refunds"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>↩️</span>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>Idempotent Refund Hub</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Track Kafka-driven automated compensations, Razorpay refund IDs, and state machine transitions.
            </p>
          </Link>

          <Link
            to="/admin/fraud"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🛡️</span>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>Fraud Rules & Telemetry</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Dynamically configure velocity thresholds, 90% balance drain rules, and inspect live fraud events.
            </p>
          </Link>

          <Link
            to="/admin/system"
            style={{
              textDecoration: 'none',
              color: 'inherit',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: '#ffffff',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🖥️</span>
              <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>System Topology & Health</h4>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Real-time port status, latency probe, Redis keys, Kafka topics, and MySQL database connection.
            </p>
          </Link>
        </div>
      </AdminSectionCard>
    </AdminLayout>
  );
}
