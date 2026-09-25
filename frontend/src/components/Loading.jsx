import React from 'react';

export default function Loading({ message = 'Loading banking data...' }) {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p style={{ fontWeight: 500 }}>{message}</p>
    </div>
  );
}
