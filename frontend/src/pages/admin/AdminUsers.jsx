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
  AdminStatusBadge,
  AdminLoadingState,
  AdminErrorState,
} from '../../components/admin';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const pageSize = 10;

  const fetchUsers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await adminApi.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load user list from SpringSecEx.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const totalUsers = users.length;
  const adminCount = users.filter(
    (u) => u.role === 'ROLE_ADMIN' || u.role === 'ADMIN'
  ).length;
  const customerCount = totalUsers - adminCount;

  const filteredUsers = users.filter((u) => {
    const matchesRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'ADMIN' && (u.role === 'ROLE_ADMIN' || u.role === 'ADMIN')) ||
      (roleFilter === 'USER' && (u.role === 'ROLE_USER' || u.role === 'USER' || !u.role));

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.email && u.email.toLowerCase().includes(term)) ||
      (u.role && u.role.toLowerCase().includes(term));

    return matchesRole && matchesSearch;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns = [
    {
      header: 'User ID',
      accessor: 'id',
      render: (u) => <span style={{ fontWeight: 700, color: 'var(--primary)' }}>#{u.id}</span>,
    },
    {
      header: 'Username',
      accessor: 'username',
      render: (u) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>
            {u.role === 'ROLE_ADMIN' || u.role === 'ADMIN' ? '👑' : '👤'}
          </span>
          <span style={{ fontWeight: 600 }}>{u.username}</span>
        </div>
      ),
    },
    {
      header: 'Email Address',
      accessor: 'email',
      render: (u) => <span>{u.email}</span>,
    },
    {
      header: 'Authority / Role',
      accessor: 'role',
      render: (u) => (
        <span
          style={{
            padding: '0.25rem 0.6rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            backgroundColor:
              u.role === 'ROLE_ADMIN' || u.role === 'ADMIN' ? '#fef3c7' : '#e0e7ff',
            color:
              u.role === 'ROLE_ADMIN' || u.role === 'ADMIN' ? '#92400e' : '#3730a3',
          }}
        >
          {u.role || 'ROLE_USER'}
        </span>
      ),
    },
    {
      header: 'Password Hash Protection',
      render: () => (
        <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
          🔒 BCrypt (12 rounds)
        </span>
      ),
    },
    {
      header: 'Registered Date',
      accessor: 'createdAt',
      render: (u) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'System Seeded'}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (u) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUser(u);
          }}
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.8rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            backgroundColor: '#ffffff',
            color: 'var(--primary)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          View Details
        </button>
      ),
    },
  ];

  const filterOptions = [
    { label: 'All Users', value: 'ALL', count: totalUsers },
    { label: 'Customers (ROLE_USER)', value: 'USER', count: customerCount },
    { label: 'Administrators (ROLE_ADMIN)', value: 'ADMIN', count: adminCount },
  ];

  return (
    <AdminLayout
      onRefresh={() => fetchUsers(true)}
      refreshing={refreshing}
      title="👥 User Identity Registry"
      subtitle="SpringSecEx Authentication Core • BCrypt 12 Hashed Credentials & Principal Authorities"
    >
      {error && (
        <AdminErrorState
          title="User Registry Error"
          message={error}
          onRetry={() => fetchUsers(false)}
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
          title="Total Registered Users"
          value={totalUsers}
          subtitle="SpringSecEx Identities"
          icon="👥"
          gradient="rgba(59, 130, 246, 0.08)"
          trend="MySQL auth_db"
          trendPositive={true}
        />

        <AdminStatCard
          title="Customer Accounts"
          value={customerCount}
          subtitle="ROLE_USER Principals"
          icon="👤"
          gradient="rgba(16, 185, 129, 0.08)"
          trend="Standard Access"
          trendPositive={true}
        />

        <AdminStatCard
          title="System Administrators"
          value={adminCount}
          subtitle="ROLE_ADMIN Privileged"
          icon="👑"
          gradient="rgba(245, 158, 11, 0.08)"
          trend="Full Privileges"
          trendPositive={true}
        />

        <AdminStatCard
          title="Security Encryption"
          value="BCrypt (12)"
          subtitle="Zero Plaintext Storage"
          icon="🛡️"
          gradient="rgba(139, 92, 246, 0.08)"
          trend="Salted Hashes"
          trendPositive={true}
        />
      </div>

      {/* Main Table Card */}
      <AdminSectionCard
        title="Identity Registry & Roles"
        subtitle="Manage user authentication credentials and system access permissions"
        icon="📋"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
          <AdminSearch
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder="Search users by username, email, or role..."
          />
          <AdminFilterBar
            filters={filterOptions}
            activeFilter={roleFilter}
            onSelect={(val) => {
              setRoleFilter(val);
              setCurrentPage(1);
            }}
          />
        </div>

        {loading && !refreshing ? (
          <AdminLoadingState message="Loading user identity store..." />
        ) : (
          <>
            <AdminTable
              columns={columns}
              data={paginatedUsers}
              onRowClick={(u) => setSelectedUser(u)}
              emptyMessage="No users found matching search criteria."
            />
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
            />
          </>
        )}
      </AdminSectionCard>

      {/* User Details Modal */}
      {selectedUser && (
        <AdminModal
          isOpen={Boolean(selectedUser)}
          onClose={() => setSelectedUser(null)}
          title={`User Identity: ${selectedUser.username}`}
          subtitle="SpringSecEx Principal Credentials & Authorities"
          maxWidth="560px"
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
                <span style={{ color: 'var(--text-muted)' }}>User ID:</span>{' '}
                <strong>#{selectedUser.id}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Authority:</span>{' '}
                <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                  {selectedUser.role || 'ROLE_USER'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Username:</span>{' '}
                <strong>{selectedUser.username}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Email Address:</span>{' '}
                <strong>{selectedUser.email}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Password Hash:</span>{' '}
                <code style={{ fontSize: '0.75rem', color: '#059669' }}>$2a$12$... (BCrypt Secured)</code>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Created At:</span>{' '}
                <span>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : 'Seeded'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                onClick={() => setSelectedUser(null)}
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
    </AdminLayout>
  );
}
