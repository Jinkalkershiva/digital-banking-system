import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AlertMessage from '../components/AlertMessage';
import { authApi, accountApi } from '../api/axios';

export default function Register({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    accountHolderName: '',
    email: '',
    phone: '',
    accountType: 'SAVINGS',
    initialDeposit: '1000',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdAccount, setCreatedAccount] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (parseFloat(formData.initialDeposit) <= 0 || isNaN(parseFloat(formData.initialDeposit))) {
      setError('Initial deposit must be greater than 0.');
      return;
    }

    setLoading(true);

    // Clear any stale/expired tokens before fresh registration
    localStorage.removeItem('token');
    localStorage.removeItem('apex_user');

    try {
      // 1. Create User in SpringSecEx (Public Registration)
      const authRes = await authApi.register({
        username: formData.username.trim(),
        password: formData.password,
        email: formData.email.trim(),
      });

      let authUser = null;
      if (authRes.data && authRes.data.token) {
        localStorage.setItem('token', authRes.data.token);
        localStorage.setItem('apex_user', JSON.stringify(authRes.data));
        authUser = authRes.data;
      }

      // 2. Create Digital Bank Account in account-service (Public Account Opening)
      const accountPayload = {
        accountHolderName: formData.accountHolderName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        accountType: formData.accountType,
        initialDeposit: parseFloat(formData.initialDeposit),
      };

      const res = await accountApi.createAccount(accountPayload);
      if (res.data) {
        const fullAccountData = {
          ...res.data,
          user: authUser,
          isAdmin: false,
        };
        setCreatedAccount(fullAccountData);
        if (onLoginSuccess) {
          onLoginSuccess(fullAccountData);
        }
      }
    } catch (err) {
      setError(
        err.friendlyMessage ||
          'Failed to complete registration. Please ensure backend services are reachable.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ maxWidth: '620px' }}>
        <div className="auth-header">
          <div className="auth-logo">🏦</div>
          <h2 className="form-title">Open a Bank Account</h2>
          <p className="form-subtitle">Create your digital banking credentials and instant account</p>
        </div>

        {createdAccount ? (
          <div>
            <div className="alert-box alert-success" style={{ padding: '1.25rem', borderRadius: '8px' }}>
              <div>
                <strong style={{ fontSize: '1.05rem' }}>🎉 Account Created Successfully!</strong>
                <p style={{ marginTop: '0.6rem', fontSize: '0.95rem' }}>
                  Your new Account Number is: <strong>{createdAccount.accountNumber}</strong>
                </p>
                <p style={{ fontSize: '0.88rem', marginTop: '0.3rem', opacity: 0.9 }}>
                  Initial Balance: <strong>₹{createdAccount.balance}</strong> | Type: <strong>{createdAccount.accountType}</strong> | Status: <strong>{createdAccount.status}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="btn-primary"
              style={{ marginTop: '1.5rem', width: '100%', padding: '0.85rem' }}
            >
              Go to Banking Dashboard &rarr;
            </button>
          </div>
        ) : (
          <>
            <AlertMessage type="error" message={error} onClose={() => setError(null)} />

            <form onSubmit={handleRegister}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="username">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    className="form-input"
                    placeholder="e.g. john_doe"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoFocus
                  />
                  <span className="input-helper">Minimum 3 characters</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password">
                    Password
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      style={{ paddingRight: '2.5rem' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '0.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-secondary, #64748b)',
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <span className="input-helper">Minimum 6 characters</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="accountHolderName">
                  Full Legal Name
                </label>
                <input
                  id="accountHolderName"
                  name="accountHolderName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Johnathan Doe"
                  value={formData.accountHolderName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone">
                    Phone Number
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    className="form-input"
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="accountType">
                    Account Type
                  </label>
                  <select
                    id="accountType"
                    name="accountType"
                    className="form-select"
                    value={formData.accountType}
                    onChange={handleChange}
                  >
                    <option value="SAVINGS">Savings Account</option>
                    <option value="CURRENT">Current Account</option>
                    <option value="FIXED_DEPOSIT">Fixed Deposit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="initialDeposit">
                    Initial Deposit (₹)
                  </label>
                  <input
                    id="initialDeposit"
                    name="initialDeposit"
                    type="number"
                    min="1"
                    step="0.01"
                    className="form-input"
                    placeholder="1000"
                    value={formData.initialDeposit}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '0.75rem' }}>
                {loading ? 'Opening Account & Creating Credentials...' : 'Submit & Open Account'}
              </button>
            </form>

            <div className="auth-footer">
              Already have an account? <Link to="/login">Sign In</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
