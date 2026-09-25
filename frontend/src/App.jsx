import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transfer from './pages/Transfer';
import Transactions from './pages/Transactions';
import Payment from './pages/Payment';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';

// Admin Portal Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAccounts from './pages/admin/AdminAccounts';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminPayments from './pages/admin/AdminPayments';
import AdminRefunds from './pages/admin/AdminRefunds';
import AdminFraud from './pages/admin/AdminFraud';
import AdminSystem from './pages/admin/AdminSystem';

import './styles/global.css';
import './styles/dashboard.css';
import './styles/forms.css';
import './styles/transactions.css';

export default function App() {
  const [currentAccount, setCurrentAccount] = useState(() => {
    const saved = localStorage.getItem('apex_active_account');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const handleLoginSuccess = (accountData) => {
    setCurrentAccount(accountData);
    localStorage.setItem('apex_active_account', JSON.stringify(accountData));
  };

  const handleLogout = () => {
    setCurrentAccount(null);
    localStorage.removeItem('apex_active_account');
    localStorage.removeItem('token');
    localStorage.removeItem('apex_user');
  };

  const handleAccountUpdated = (updatedData) => {
    setCurrentAccount(updatedData);
    localStorage.setItem('apex_active_account', JSON.stringify(updatedData));
  };

  const isAdmin =
    currentAccount?.isAdmin === true ||
    currentAccount?.role === 'ROLE_ADMIN' ||
    currentAccount?.role === 'ADMIN' ||
    currentAccount?.user?.role === 'ROLE_ADMIN' ||
    currentAccount?.user?.role === 'ADMIN';

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Auth Routes */}
        <Route
          path="/login"
          element={
            currentAccount ? (
              <Navigate to={isAdmin ? '/admin/dashboard' : '/'} replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        <Route
          path="/register"
          element={
            currentAccount ? (
              <Navigate to={isAdmin ? '/admin/dashboard' : '/'} replace />
            ) : (
              <Register onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* Authenticated Application Shell */}
        <Route
          path="/*"
          element={
            currentAccount ? (
              <div className="app-container">
                <Sidebar isAdmin={isAdmin} />
                <div className="main-content">
                  <Navbar
                    currentAccount={currentAccount}
                    onLogout={handleLogout}
                  />
                  <main className="content-wrapper">
                    {isAdmin ? (
                      /* Admin Route Tree */
                      <Routes>
                        <Route
                          path="/"
                          element={<Navigate to="/admin/dashboard" replace />}
                        />
                        <Route
                          path="/admin"
                          element={<Navigate to="/admin/dashboard" replace />}
                        />
                        <Route
                          path="/admin/dashboard"
                          element={<AdminDashboard currentUser={currentAccount} />}
                        />
                        <Route
                          path="/admin/users"
                          element={<AdminUsers />}
                        />
                        <Route
                          path="/admin/accounts"
                          element={<AdminAccounts />}
                        />
                        <Route
                          path="/admin/transactions"
                          element={<AdminTransactions />}
                        />
                        <Route
                          path="/admin/payments"
                          element={<AdminPayments />}
                        />
                        <Route
                          path="/admin/refunds"
                          element={<AdminRefunds />}
                        />
                        <Route
                          path="/admin/fraud"
                          element={<AdminFraud />}
                        />
                        <Route
                          path="/admin/system"
                          element={<AdminSystem />}
                        />
                        <Route
                          path="*"
                          element={<Navigate to="/admin/dashboard" replace />}
                        />
                      </Routes>
                    ) : (
                      /* User Route Tree */
                      <Routes>
                        <Route
                          path="/"
                          element={<Dashboard currentAccount={currentAccount} />}
                        />
                        <Route
                          path="/transfer"
                          element={
                            <Transfer
                              currentAccount={currentAccount}
                              onTransferSuccess={() => {}}
                              onAccountUpdated={handleAccountUpdated}
                            />
                          }
                        />
                        <Route
                          path="/transactions"
                          element={<Transactions currentAccount={currentAccount} />}
                        />
                        <Route
                          path="/payment"
                          element={<Payment currentAccount={currentAccount} />}
                        />
                        <Route
                          path="/profile"
                          element={
                            <Profile
                              currentAccount={currentAccount}
                              onAccountUpdated={handleAccountUpdated}
                            />
                          }
                        />
                        <Route
                          path="/notifications"
                          element={<Notifications currentAccount={currentAccount} />}
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    )}
                  </main>
                </div>
              </div>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
