import React from 'react';
import { NavLink } from 'react-router-dom';

export default function AdminSidebar() {
  const navItems = [
    { to: '/admin/dashboard', icon: '📊', label: 'Control Center' },
    { to: '/admin/users', icon: '👥', label: 'User Registry' },
    { to: '/admin/accounts', icon: '🏛️', label: 'Bank Accounts' },
    { to: '/admin/transactions', icon: '🔄', label: 'Transaction Audit' },
    { to: '/admin/payments', icon: '💳', label: 'Payment Orders' },
    { to: '/admin/refunds', icon: '↩️', label: 'Refund & SAGA Hub' },
    { to: '/admin/fraud', icon: '🛡️', label: 'Fraud Rule Engine' },
    { to: '/admin/system', icon: '🖥️', label: 'System Topology' },
  ];

  return (
    <aside className="sidebar" style={{ backgroundColor: '#0f172a', borderRight: '1px solid #1e293b' }}>
      <div
        className="sidebar-header"
        style={{
          backgroundColor: '#1e293b',
          borderBottom: '1px solid #334155',
          padding: '1.25rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span style={{ fontSize: '1.25rem' }}>👑</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.02em' }}>
            DGBASE Banking
          </span>
          <span style={{ color: '#38bdf8', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ADMINISTRATION
          </span>
        </div>
      </div>

      <nav className="sidebar-menu" style={{ padding: '1rem 0.5rem' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin/dashboard'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              margin: '0.25rem 0',
              color: isActive ? '#ffffff' : '#94a3b8',
              backgroundColor: isActive ? '#2563eb' : 'transparent',
              fontWeight: isActive ? 700 : 500,
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            })}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            <span className="link-label" style={{ fontSize: '0.875rem' }}>
              {item.label}
            </span>
          </NavLink>
        ))}

        <NavLink
          to="/showcase"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            margin: '0.75rem 0 0.25rem 0',
            color: '#38bdf8',
            borderTop: '1px solid #1e293b',
            textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🚀</span>
          <span className="link-label" style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            Showcase Landing
          </span>
        </NavLink>
      </nav>

      <div
        className="sidebar-footer"
        style={{
          padding: '1rem',
          borderTop: '1px solid #1e293b',
          fontSize: '0.75rem',
          color: '#64748b',
          backgroundColor: '#090d16',
        }}
      >
        <p style={{ margin: 0, color: '#38bdf8', fontWeight: 700 }}>DGBASE Admin Portal</p>
        <p style={{ margin: '0.2rem 0 0 0' }}>SAGA & Microservices Core</p>
      </div>
    </aside>
  );
}
