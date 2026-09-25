import React from 'react';
import AdminHeader from './AdminHeader';

export default function AdminLayout({
  currentUser,
  onRefresh,
  refreshing,
  onLogout,
  title,
  subtitle,
  actions,
  children,
}) {
  return (
    <div className="admin-page-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 0.5rem' }}>
      <AdminHeader
        currentUser={currentUser}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onLogout={onLogout}
        title={title}
        subtitle={subtitle}
        actions={actions}
      />
      <div className="admin-content-body">{children}</div>
    </div>
  );
}
