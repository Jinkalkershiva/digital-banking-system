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
  AdminConfirmDialog,
  AdminLoadingState,
  AdminErrorState,
} from '../../components/admin';

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    account: null,
    action: null,
  });
  const pageSize = 10;

  const fetchAccounts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await adminApi.getAccounts();
      setAccounts(res.data || []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load accounts from Account Service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const totalAccounts = accounts.length;
  const blockedCount = accounts.filter((a) => a.status === 'BLOCKED').length;
  const activeCount = accounts.filter((a) => a.status === 'ACTIVE').length;
  const totalBalance = accounts.reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);
  const avgBalance = totalAccounts > 0 ? Math.round(totalBalance / totalAccounts) : 0;

  const handleOpenConfirm = (account, action) => {
    setConfirmDialog({
      isOpen: true,
      account,
      action,
    });
  };

  const handleExecuteAction = async () => {
    const { account, action } = confirmDialog;
    if (!account) return;

    setActionLoading((prev) => ({ ...prev, [account.accountNumber]: true }));
    setError(null);
    setSuccess(null);
    setConfirmDialog({ isOpen: false, account: null, action: null });

    try {
      if (action === 'BLOCK') {
        await adminApi.blockAccount(account.accountNumber);
        setSuccess(`Account ${account.accountNumber} (${account.accountHolderName}) has been BLOCKED.`);
      } else {
        await adminApi.unblockAccount(account.accountNumber);
        setSuccess(`Account ${account.accountNumber} (${account.accountHolderName}) has been UNBLOCKED.`);
      }
      await fetchAccounts(true);
    } catch (err) {
      setError(err.friendlyMessage || `Failed to modify status for account ${account.accountNumber}`);
    } finally {
      setActionLoading((prev) => ({ ...prev, [account.accountNumber]: false }));
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesStatus = statusFilter === 'ALL' || acc.status === statusFilter;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (acc.accountNumber && acc.accountNumber.toLowerCase().includes(term)) ||
      (acc.accountHolderName && acc.accountHolderName.toLowerCase().includes(term)) ||
      (acc.email && acc.email.toLowerCase().includes(term));

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredAccounts.length / pageSize) || 1;
  const paginatedAccounts = filteredAccounts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns = [
    {
      header: 'Account Number',
      accessor: 'accountNumber',
      render: (a) => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>
          {a.accountNumber}
        </span>
      ),
    },
    {
      header: 'Account Holder',
      accessor: 'accountHolderName',
      render: (a) => <span style={{ fontWeight: 600 }}>{a.accountHolderName}</span>,
    },
    {
      header: 'Contact Info',
      render: (a) => (
        <div style={{ fontSize: '0.85rem' }}>
          <div>{a.email}</div>
          <div style={{ color: 'var(--text-muted)' }}>{a.phone}</div>
        </div>
      ),
    },
    {
      header: 'Account Type',
      accessor: 'accountType',
      render: (a) => (
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.2rem 0.5rem',
            borderRadius: '6px',
            backgroundColor: '#e0e7ff',
            color: '#3730a3',
          }}
        >
          {a.accountType}
        </span>
      ),
    },
    {
      header: 'Ledger Balance',
      accessor: 'balance',
      render: (a) => (
        <span style={{ fontWeight: 700, color: 'var(--status-completed-text)', fontSize: '0.95rem' }}>
          ₹{parseFloat(a.balance || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Daily Limit',
      accessor: 'dailyTransactionLimit',
      render: (a) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          ₹{parseFloat(a.dailyTransactionLimit || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (a) => (
        <span
          style={{
            padding: '0.25rem 0.6rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor: a.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
            color: a.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
          }}
        >
          ● {a.status}
        </span>
      ),
    },
    {
      header: 'Admin Actions',
      render: (a) => (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleOpenConfirm(a, a.status === 'ACTIVE' ? 'BLOCK' : 'UNBLOCK');
            }}
            disabled={actionLoading[a.accountNumber]}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              backgroundColor: a.status === 'ACTIVE' ? '#fee2e2' : '#dcfce7',
              color: a.status === 'ACTIVE' ? '#b91c1c' : '#15803d',
            }}
          >
            {actionLoading[a.accountNumber]
              ? 'Updating...'
              : a.status === 'ACTIVE'
              ? '🚫 Block'
              : '✅ Unblock'}
          </button>
        </div>
      ),
    },
  ];

  const filterOptions = [
    { label: 'All Accounts', value: 'ALL', count: totalAccounts },
    { label: 'Active', value: 'ACTIVE', count: activeCount },
    { label: 'Blocked by Admin/Fraud', value: 'BLOCKED', count: blockedCount },
  ];

  return (
    <AdminLayout
      onRefresh={() => fetchAccounts(true)}
      refreshing={refreshing}
      title="🏛️ Digital Bank Accounts & Ledgers"
      subtitle="Account Service Financial Ledgers • Daily Velocity Limits & Emergency Fraud Freeze"
    >
      {error && (
        <AdminErrorState
          title="Account Ledger Error"
          message={error}
          onRetry={() => fetchAccounts(false)}
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
          title="Total Accounts"
          value={totalAccounts}
          subtitle="JPA Managed Accounts"
          icon="🏛️"
          gradient="rgba(59, 130, 246, 0.08)"
          trend="account-service"
          trendPositive={true}
        />

        <AdminStatCard
          title="Total Vault Liquidity"
          value={`₹${totalBalance.toLocaleString()}`}
          subtitle="Aggregate Customer Balance"
          icon="💰"
          gradient="rgba(16, 185, 129, 0.08)"
          trend="Ledger Reserve"
          trendPositive={true}
        />

        <AdminStatCard
          title="Average Account Balance"
          value={`₹${avgBalance.toLocaleString()}`}
          subtitle="Mean Liquidity per Holder"
          icon="📊"
          gradient="rgba(245, 158, 11, 0.08)"
        />

        <AdminStatCard
          title="Blocked Accounts"
          value={blockedCount}
          subtitle={blockedCount > 0 ? 'Requires Risk Review' : 'All Accounts Clean'}
          icon="🚫"
          gradient="rgba(239, 68, 68, 0.08)"
          trend={blockedCount > 0 ? 'Fraud/Admin Lock' : 'Zero Blocked'}
          trendPositive={blockedCount === 0}
        />
      </div>

      {/* Main Ledger Section */}
      <AdminSectionCard
        title="Bank Accounts Ledger"
        subtitle="Search and manage customer checking/savings accounts, balances, and operational states"
        icon="📋"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
          <AdminSearch
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="Search accounts by account number, holder name, or email..."
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
          <AdminLoadingState message="Loading bank accounts..." />
        ) : (
          <>
            <AdminTable
              columns={columns}
              data={paginatedAccounts}
              onRowClick={(a) => setSelectedAccount(a)}
              emptyMessage="No accounts match your search criteria."
            />
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredAccounts.length}
              pageSize={pageSize}
            />
          </>
        )}
      </AdminSectionCard>

      {/* Account Details Modal */}
      {selectedAccount && (
        <AdminModal
          isOpen={Boolean(selectedAccount)}
          onClose={() => setSelectedAccount(null)}
          title={`Account Details: ${selectedAccount.accountNumber}`}
          subtitle="Account Service Ledger Record"
          maxWidth="600px"
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
                fontSize: '0.9rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Account Number:</span>{' '}
                <strong style={{ fontFamily: 'monospace' }}>{selectedAccount.accountNumber}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>{' '}
                <span style={{ fontWeight: 700, color: selectedAccount.status === 'ACTIVE' ? '#15803d' : '#b91c1c' }}>
                  {selectedAccount.status}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Holder Name:</span>{' '}
                <strong>{selectedAccount.accountHolderName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Account Type:</span>{' '}
                <strong>{selectedAccount.accountType}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Available Balance:</span>{' '}
                <strong style={{ color: 'var(--status-completed-text)', fontSize: '1rem' }}>
                  ₹{parseFloat(selectedAccount.balance || 0).toLocaleString()}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Daily Transfer Limit:</span>{' '}
                <strong>₹{parseFloat(selectedAccount.dailyTransactionLimit || 0).toLocaleString()}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>{' '}
                <span>{selectedAccount.email}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Phone:</span>{' '}
                <span>{selectedAccount.phone}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setSelectedAccount(null)}
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
                Close
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Confirmation Dialog for Block/Unblock */}
      <AdminConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, account: null, action: null })}
        onConfirm={handleExecuteAction}
        title={confirmDialog.action === 'BLOCK' ? 'Confirm Account Freeze' : 'Confirm Account Unblock'}
        message={
          confirmDialog.action === 'BLOCK'
            ? `Are you sure you want to BLOCK account ${confirmDialog.account?.accountNumber} (${confirmDialog.account?.accountHolderName})? The user will not be able to initiate transfers or payments.`
            : `Are you sure you want to UNBLOCK account ${confirmDialog.account?.accountNumber} (${confirmDialog.account?.accountHolderName})? All banking capabilities will be immediately restored.`
        }
        confirmText={confirmDialog.action === 'BLOCK' ? 'Yes, Block Account' : 'Yes, Unblock Account'}
        danger={confirmDialog.action === 'BLOCK'}
      />
    </AdminLayout>
  );
}
