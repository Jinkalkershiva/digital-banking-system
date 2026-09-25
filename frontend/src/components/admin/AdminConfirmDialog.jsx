import React from 'react';
import AdminModal from './AdminModal';

export default function AdminConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed with this administrative operation?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDestructive = false,
  loading = false,
}) {
  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="480px"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isDestructive ? '#ef4444' : '#3b82f6',
              color: '#ffffff',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {loading && <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></span>}
            <span>{confirmText}</span>
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div
          style={{
            fontSize: '1.75rem',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: isDestructive ? '#fee2e2' : '#e0e7ff',
            color: isDestructive ? '#dc2626' : '#4338ca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isDestructive ? '⚠️' : 'ℹ️'}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
      </div>
    </AdminModal>
  );
}
