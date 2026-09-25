import React from 'react';

export default function AdminPagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
}) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 0 0 0',
        borderTop: '1px solid #f1f5f9',
        fontSize: '0.85rem',
        color: '#64748b',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}
    >
      <div>
        Showing <strong>{start}</strong> to <strong>{end}</strong> of <strong>{totalItems}</strong> entries
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: currentPage <= 1 ? '#f8fafc' : '#ffffff',
            color: currentPage <= 1 ? '#94a3b8' : '#1e293b',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          Previous
        </button>

        <span style={{ padding: '0 0.5rem', fontWeight: 600, color: '#0f172a' }}>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            backgroundColor: currentPage >= totalPages ? '#f8fafc' : '#ffffff',
            color: currentPage >= totalPages ? '#94a3b8' : '#1e293b',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
