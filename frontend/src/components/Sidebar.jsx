import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar({ isAdmin }) {
  if (isAdmin) {
    return (
      <aside className="sidebar">
        <div className="sidebar-header" style={{ backgroundColor: '#1e293b' }}>
          <span style={{ color: '#38bdf8' }}>👑 ADMIN CONTROL</span>
        </div>

        <nav className="sidebar-menu">
          <NavLink
            to="/admin/dashboard"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ marginRight: '0.5rem' }}>📊</span>
            <span className="link-label">Admin Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/users"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ marginRight: '0.5rem' }}>👥</span>
            <span className="link-label">User Registry</span>
          </NavLink>

          <NavLink
            to="/admin/accounts"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ marginRight: '0.5rem' }}>🏛️</span>
            <span className="link-label">Bank Accounts</span>
          </NavLink>

          <NavLink
            to="/admin/transactions"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ marginRight: '0.5rem' }}>🔄</span>
            <span className="link-label">Transactions</span>
          </NavLink>

          <NavLink
            to="/admin/payments"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ marginRight: '0.5rem' }}>💳</span>
            <span className="link-label">Gateway Payments</span>
          </NavLink>

          <NavLink
            to="/admin/refunds"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ marginRight: '0.5rem' }}>↩️</span>
            <span className="link-label">Idempotent Refunds</span>
          </NavLink>

          <NavLink
            to="/admin/fraud"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ marginRight: '0.5rem' }}>🛡️</span>
            <span className="link-label">Fraud Rules</span>
          </NavLink>

          <NavLink
            to="/admin/system"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ marginRight: '0.5rem' }}>🖥️</span>
            <span className="link-label">System Topology</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <p style={{ color: '#38bdf8' }}>Apex Admin Portal</p>
          <p style={{ marginTop: '0.2rem', color: '#64748b' }}>Role: ROLE_ADMIN</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>ONLINE BANKING</span>
      </div>

      <nav className="sidebar-menu">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <span className="link-label">Dashboard</span>
        </NavLink>

        <NavLink
          to="/transfer"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="17 1 21 5 17 9"></polyline>
            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
            <polyline points="7 23 3 19 7 15"></polyline>
            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
          </svg>
          <span className="link-label">Transfer Money</span>
        </NavLink>

        <NavLink
          to="/transactions"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span className="link-label">Transactions</span>
        </NavLink>

        <NavLink
          to="/payment"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
            <line x1="1" y1="10" x2="23" y2="10"></line>
          </svg>
          <span className="link-label">Payments</span>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span className="link-label">Account & Profile</span>
        </NavLink>

        <NavLink
          to="/notifications"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className="link-label">Security Alerts</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <p>Apex Core v1.0</p>
        <p style={{ marginTop: '0.2rem', color: '#475569' }}>Microservices Engine</p>
      </div>
    </aside>
  );
}
