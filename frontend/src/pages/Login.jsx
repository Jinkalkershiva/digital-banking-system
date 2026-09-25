import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AlertMessage from '../components/AlertMessage';
import { authApi, accountApi } from '../api/axios';

export default function Login({ onLoginSuccess }) {
  const [loginMode, setLoginMode] = useState('credentials'); // 'credentials' | 'accountNumber'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authApi.login({
        username: username.trim(),
        password: password,
      });

      if (res.data && res.data.token) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('apex_user', JSON.stringify(res.data));

        const userRole = res.data.role || 'ROLE_USER';

        if (userRole === 'ROLE_ADMIN' || userRole === 'ADMIN') {
          onLoginSuccess({
            ...res.data,
            isAdmin: true,
          });
          navigate('/admin/dashboard');
          return;
        }

        // Regular user: attempt to fetch digital banking account by email
        try {
          const accRes = await accountApi.getAccountByEmail(res.data.email);
          if (accRes.data) {
            onLoginSuccess({
              ...accRes.data,
              user: res.data,
              isAdmin: false,
            });
            navigate('/');
            return;
          }
        } catch (accErr) {
          console.warn('No linked account found for email, opening dashboard with user context', accErr);
        }

        // Fallback user session
        onLoginSuccess({
          accountNumber: 'N/A',
          accountHolderName: res.data.username,
          email: res.data.email,
          balance: 0,
          status: 'ACTIVE',
          user: res.data,
          isAdmin: false,
        });
        navigate('/');
      } else {
        setError('Login failed. Please check credentials.');
      }
    } catch (err) {
      setError(
        err.friendlyMessage ||
          'Authentication failed. Verify credentials or check if SpringSecEx and Gateway are running.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAccountNumberLogin = async (e) => {
    e.preventDefault();
    if (!accountNumber.trim()) {
      setError('Please enter your account number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await accountApi.getAccount(accountNumber.trim());
      if (res.data) {
        onLoginSuccess({
          ...res.data,
          isAdmin: false,
        });
        navigate('/');
      } else {
        setError('Account details could not be loaded.');
      }
    } catch (err) {
      setError(
        err.friendlyMessage ||
          'Could not find account. Ensure your account number is correct or register.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setUsername('admin');
    setPassword('Admin@12345');
    setLoginMode('credentials');
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🏛️</div>
          <h2 className="form-title">Apex Digital Bank</h2>
          <p className="form-subtitle">Enterprise Online Banking & Administration</p>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => { setLoginMode('credentials'); setError(null); }}
            className={`btn-secondary ${loginMode === 'credentials' ? 'btn-primary' : ''}`}
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
          >
            🔐 User / Admin Login
          </button>
          <button
            type="button"
            onClick={() => { setLoginMode('accountNumber'); setError(null); }}
            className={`btn-secondary ${loginMode === 'accountNumber' ? 'btn-primary' : ''}`}
            style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
          >
            💳 Direct Account Number
          </button>
        </div>

        <AlertMessage type="error" message={error} onClose={() => setError(null)} />

        {loginMode === 'credentials' ? (
          <form onSubmit={handleCredentialsLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="e.g. admin or john_doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Authenticating via SpringSecEx...' : 'Sign In with JWT'}
            </button>

            <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={fillDemoAdmin}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '0.8rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Auto-fill Default Admin (admin / Admin@12345)
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAccountNumberLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="accountNumber">
                Account Number
              </label>
              <input
                id="accountNumber"
                type="text"
                className="form-input"
                placeholder="e.g. 000000000012"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                autoFocus
              />
              <span className="input-helper">
                Enter your 12-digit digital banking account number to access services directly.
              </span>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Verifying Account...' : 'Sign In with Account Number'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Don't have an account yet?{' '}
          <Link to="/register">Open a New Account</Link>
        </div>
      </div>
    </div>
  );
}
