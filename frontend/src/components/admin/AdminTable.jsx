import React from 'react';
import AdminEmptyState from './AdminEmptyState';
import AdminLoadingState from './AdminLoadingState';

export default function AdminTable({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found matching your criteria.',
  onRowClick,
}) {
  if (loading) {
    return <AdminLoadingState message="Loading ledger records..." />;
  }

  if (!data || data.length === 0) {
    return <AdminEmptyState message={emptyMessage} />;
  }

  return (
    <div style={{ width: '100%', overflowX: 'auto', borderRadius: '10px' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left',
          fontSize: '0.875rem',
        }}
      >
        <thead>
          <tr
            style={{
              backgroundColor: '#f8fafc',
              borderBottom: '2px solid #e2e8f0',
              color: '#475569',
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
            }}
          >
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                style={{
                  padding: '0.85rem 1rem',
                  width: col.width || 'auto',
                  textAlign: col.align || 'left',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              style={{
                borderBottom: '1px solid #f1f5f9',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={col.key || colIdx}
                  style={{
                    padding: '0.85rem 1rem',
                    verticalAlign: 'middle',
                    textAlign: col.align || 'left',
                    color: '#1e293b',
                  }}
                >
                  {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
