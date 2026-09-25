import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AlertMessage from '../components/AlertMessage';
import { accountApi, transactionApi } from '../api/axios';

export default function Transfer({ currentAccount, onTransferSuccess, onAccountUpdated }) {
  const navigate = useNavigate();

  // Transfer form fields
  const [formData, setFormData] = useState({
    senderAccountNumber: currentAccount?.accountNumber || '',
    receiverAccountNumber: '',
    amount: '',
    description: '',
  });

  // Balance tracking
  const [balance, setBalance] = useState(currentAccount?.balance ?? null);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // PROCESSING state & polling
  const [processingTransaction, setProcessingTransaction] = useState(null);
  const [pollAttempt, setPollAttempt] = useState(0);

  // PENDING_VERIFICATION state & OTP verification modal
  const [pendingOtpTransaction, setPendingOtpTransaction] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [otpCountdown, setOtpCountdown] = useState(300); // 5 minutes in seconds

  // Resend OTP state
  const [resendingOtp, setResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // In-app Toast notifications stack
  const [toasts, setToasts] = useState([]);

  // Final outcome states
  const [successResult, setSuccessResult] = useState(null);
  const [refundResult, setRefundResult] = useState(null);

  // Component refs for clean timer lifecycle & focus management
  const pollTimerRef = useRef(null);
  const otpTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const otpInputRef = useRef(null);

  // Helper: show auto-dismissing in-app toast notification
  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  // ----------------------------------------------------
  // Masking helpers for secure contact display
  // ----------------------------------------------------
  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return 's****@gmail.com';
    const [user, domain] = email.split('@');
    if (user.length <= 1) return `${user}****@${domain}`;
    return `${user.charAt(0)}****@${domain}`;
  };

  const maskPhone = (phone) => {
    if (!phone) return '+91 ******1234';
    const clean = phone.trim();
    if (clean.length < 6) return '******';
    const last4 = clean.slice(-4);
    const prefix = clean.startsWith('+') ? clean.slice(0, 3) + ' ' : '';
    return `${prefix}******${last4}`;
  };

  // ----------------------------------------------------
  // Refresh Account Balance & Profile from Backend
  // ----------------------------------------------------
  const refreshAccountBalance = useCallback(async () => {
    if (!currentAccount?.accountNumber) return;
    try {
      const balRes = await accountApi.getBalance(currentAccount.accountNumber);
      setBalance(balRes.data);

      if (onAccountUpdated) {
        const accRes = await accountApi.getAccount(currentAccount.accountNumber);
        if (accRes.data) {
          onAccountUpdated(accRes.data);
        }
      }
    } catch (err) {
      console.warn('Unable to sync account balance:', err);
    }
  }, [currentAccount?.accountNumber, onAccountUpdated]);

  // Initial account setup and balance load
  useEffect(() => {
    if (currentAccount?.accountNumber) {
      setFormData((prev) => ({
        ...prev,
        senderAccountNumber: currentAccount.accountNumber,
      }));
      refreshAccountBalance();
    }
  }, [currentAccount?.accountNumber, refreshAccountBalance]);

  // ----------------------------------------------------
  // Browser Refresh Recovery (Test 7)
  // Check sessionStorage for active pending transaction on mount
  // ----------------------------------------------------
  useEffect(() => {
    const savedTxId = sessionStorage.getItem('apex_pending_otp_tx_id');
    if (savedTxId) {
      transactionApi
        .getTransaction(savedTxId)
        .then((res) => {
          const tx = res.data;
          if (tx.status === 'PENDING_VERIFICATION') {
            setPendingOtpTransaction(tx);
            showToast('Transaction verification required. OTP sent to your registered contact.', 'warning');
          } else if (tx.status === 'PROCESSING') {
            setProcessingTransaction(tx);
          } else if (tx.status === 'COMPLETED') {
            sessionStorage.removeItem('apex_pending_otp_tx_id');
            setSuccessResult(tx);
          } else if (tx.status === 'FLAGGED' || tx.status === 'REFUNDED') {
            sessionStorage.removeItem('apex_pending_otp_tx_id');
            setRefundResult(tx);
          } else {
            sessionStorage.removeItem('apex_pending_otp_tx_id');
          }
        })
        .catch(() => {
          sessionStorage.removeItem('apex_pending_otp_tx_id');
        });
    }
  }, [showToast]);

  // ----------------------------------------------------
  // OTP Expiration Countdown Timer (5 minutes = 300s)
  // ----------------------------------------------------
  useEffect(() => {
    if (pendingOtpTransaction) {
      setOtpCountdown(300);
      setOtpError(null);

      // Auto-focus the OTP input field
      setTimeout(() => {
        if (otpInputRef.current) {
          otpInputRef.current.focus();
        }
      }, 50);

      if (otpTimerRef.current) clearInterval(otpTimerRef.current);

      otpTimerRef.current = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(otpTimerRef.current);
            setOtpError('OTP expired. Please request a new OTP.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (otpTimerRef.current) {
        clearInterval(otpTimerRef.current);
      }
    }

    return () => {
      if (otpTimerRef.current) {
        clearInterval(otpTimerRef.current);
      }
    };
  }, [pendingOtpTransaction]);

  // ----------------------------------------------------
  // Resend Cooldown Timer
  // ----------------------------------------------------
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, [resendCooldown]);

  // ----------------------------------------------------
  // PROCESSING Polling Flow (GET /api/v1/transactions/{id})
  // ----------------------------------------------------
  useEffect(() => {
    if (!processingTransaction?.id) return;

    let pollCount = 0;
    const maxPolls = 30; // 30 polls * 2.5s = 75 seconds timeout

    const pollStatus = async () => {
      try {
        pollCount += 1;
        setPollAttempt(pollCount);

        const res = await transactionApi.getTransaction(processingTransaction.id);
        const tx = res.data;

        if (tx.status === 'COMPLETED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          sessionStorage.removeItem('apex_pending_otp_tx_id');
          setProcessingTransaction(null);
          setSuccessResult(tx);
          showToast('Transaction completed successfully.', 'success');
          refreshAccountBalance();
          if (onTransferSuccess) onTransferSuccess(tx);
        } else if (tx.status === 'PENDING_VERIFICATION') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          sessionStorage.setItem('apex_pending_otp_tx_id', tx.id);
          setProcessingTransaction(null);
          setPendingOtpTransaction(tx);
          setOtpValue('');
          setOtpError(null);
          showToast('Transaction verification required. OTP sent to your registered contact.', 'warning');
        } else if (tx.status === 'FAILED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          sessionStorage.removeItem('apex_pending_otp_tx_id');
          setProcessingTransaction(null);
          setError(tx.failureReason || 'Transaction failed during processing.');
        } else if (tx.status === 'FLAGGED' || tx.status === 'REFUNDED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          sessionStorage.removeItem('apex_pending_otp_tx_id');
          setProcessingTransaction(null);
          setRefundResult(tx);
          refreshAccountBalance();
        } else {
          // Still PROCESSING
          if (pollCount >= maxPolls) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setProcessingTransaction(null);
            setError(
              'Transaction is taking longer than expected. You can check the transaction status anytime in Transaction History.'
            );
          }
        }
      } catch (err) {
        console.warn('Transaction status polling error:', err);
        if (pollCount >= maxPolls) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setProcessingTransaction(null);
          setError('Unable to verify transaction status. Please check your transaction history.');
        }
      }
    };

    pollTimerRef.current = setInterval(pollStatus, 2500);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [processingTransaction?.id, refreshAccountBalance, onTransferSuccess, showToast]);

  // Form input change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ----------------------------------------------------
  // Form Submit: POST /api/v1/transactions/transfer
  // ----------------------------------------------------
  const handleInitiateTransfer = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessResult(null);
    setRefundResult(null);
    setProcessingTransaction(null);
    setPendingOtpTransaction(null);

    const amountNum = parseFloat(formData.amount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid positive transfer amount.');
      return;
    }

    if (!formData.receiverAccountNumber.trim()) {
      setError('Please enter a destination account number.');
      return;
    }

    if (formData.senderAccountNumber.trim() === formData.receiverAccountNumber.trim()) {
      setError('Sender and receiver accounts cannot be the same.');
      return;
    }

    if (balance !== null && amountNum > Number(balance)) {
      setError(`Insufficient balance. Your current balance is $${Number(balance).toFixed(2)}.`);
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        senderAccountNumber: formData.senderAccountNumber.trim(),
        receiverAccountNumber: formData.receiverAccountNumber.trim(),
        amount: amountNum,
        description: formData.description.trim() || 'Online Transfer',
      };

      // Call API Gateway endpoint: POST /api/v1/transactions/transfer
      const res = await transactionApi.transfer(payload);
      const tx = res.data;

      // Handle Returned Status
      if (tx.status === 'COMPLETED') {
        setSuccessResult(tx);
        showToast('Transaction completed successfully.', 'success');
        refreshAccountBalance();
        if (onTransferSuccess) onTransferSuccess(tx);
      } else if (tx.status === 'PENDING_VERIFICATION') {
        sessionStorage.setItem('apex_pending_otp_tx_id', tx.id);
        setPendingOtpTransaction(tx);
        setOtpValue('');
        setOtpError(null);
        showToast('Transaction verification required. OTP sent to your registered contact.', 'warning');
      } else if (tx.status === 'PROCESSING') {
        sessionStorage.setItem('apex_pending_otp_tx_id', tx.id);
        setProcessingTransaction(tx);
      } else if (tx.status === 'FAILED') {
        setError(tx.failureReason || 'Transaction could not be completed.');
      } else if (tx.status === 'FLAGGED' || tx.status === 'REFUNDED') {
        setRefundResult(tx);
        refreshAccountBalance();
      } else {
        sessionStorage.setItem('apex_pending_otp_tx_id', tx.id);
        setProcessingTransaction(tx);
      }
    } catch (err) {
      setError(
        err.friendlyMessage ||
          'Transfer failed. Ensure accounts exist and sender has sufficient balance.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // OTP Numeric Input Handler (Numeric only, 6 digits)
  // Supports paste
  // ----------------------------------------------------
  const handleOtpChange = (e) => {
    const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpValue(numericOnly);
    if (otpError) setOtpError(null);
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = (e.clipboardData || window.clipboardData).getData('text');
    const numericOnly = pastedData.replace(/\D/g, '').slice(0, 6);
    if (numericOnly) {
      setOtpValue(numericOnly);
      if (otpError) setOtpError(null);
    }
  };

  // ----------------------------------------------------
  // Verify OTP: POST /api/v1/transactions/{id}/verify?otp={otp}
  // ----------------------------------------------------
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpValue.length !== 6) {
      setOtpError('Please enter the complete 6-digit numeric OTP.');
      return;
    }

    if (!pendingOtpTransaction?.id) return;

    setOtpLoading(true);
    setOtpError(null);

    try {
      const res = await transactionApi.verifyOtp(pendingOtpTransaction.id, otpValue.trim());
      const verifiedTx = res.data;

      if (verifiedTx.status === 'COMPLETED') {
        sessionStorage.removeItem('apex_pending_otp_tx_id');
        setPendingOtpTransaction(null);
        setSuccessResult(verifiedTx);
        setOtpValue('');
        showToast('Transaction verified successfully.', 'success');
        setTimeout(() => {
          showToast('Transaction completed successfully.', 'success');
        }, 600);
        refreshAccountBalance();
        if (onTransferSuccess) onTransferSuccess(verifiedTx);
      } else if (verifiedTx.status === 'FLAGGED' || verifiedTx.status === 'FAILED') {
        sessionStorage.removeItem('apex_pending_otp_tx_id');
        setPendingOtpTransaction(null);
        setRefundResult(verifiedTx);
        refreshAccountBalance();
      } else {
        setOtpError('Unable to complete verification. Please try again.');
      }
    } catch (err) {
      const errMsg = err.friendlyMessage || '';
      const serverDataMsg =
        (typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message) || '';
      const combined = `${errMsg} ${serverDataMsg}`.toLowerCase();

      if (combined.includes('expire')) {
        setOtpError('OTP expired. Please request a new OTP.');
      } else if (
        err.response?.status === 400 ||
        combined.includes('wrong') ||
        combined.includes('invalid')
      ) {
        setOtpError('Invalid OTP');
        setOtpValue('');
        if (otpInputRef.current) {
          otpInputRef.current.focus();
        }
      } else if (err.response?.status === 429) {
        setOtpError('Too many invalid attempts. Please request a new OTP.');
      } else {
        setOtpError(errMsg || 'Verification failed. Please try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // ----------------------------------------------------
  // Resend OTP: POST /api/v1/transactions/{id}/resend-otp
  // ----------------------------------------------------
  const handleResendOtp = async () => {
    if (!pendingOtpTransaction?.id || resendingOtp || resendCooldown > 0) return;

    setResendingOtp(true);
    setOtpError(null);

    try {
      const res = await transactionApi.resendOtp(pendingOtpTransaction.id);
      if (res.data) {
        setPendingOtpTransaction(res.data);
      }
      setOtpValue('');
      setOtpCountdown(300); // Reset countdown to 5 minutes
      setResendCooldown(30); // 30 second cooldown before allowing next resend click
      showToast('OTP sent successfully.', 'success');

      if (otpInputRef.current) {
        otpInputRef.current.focus();
      }
    } catch (err) {
      const errMsg =
        err.friendlyMessage ||
        (typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message) ||
        'Failed to resend OTP. Please try again.';
      setOtpError(errMsg);
    } finally {
      setResendingOtp(false);
    }
  };

  // Close / Cancel OTP Modal
  const handleCancelOtp = () => {
    if (otpLoading) return;
    sessionStorage.removeItem('apex_pending_otp_tx_id');
    setPendingOtpTransaction(null);
    setOtpValue('');
    setOtpError(null);
  };

  // Reset form to make another transfer
  const handleMakeAnotherTransfer = () => {
    sessionStorage.removeItem('apex_pending_otp_tx_id');
    setSuccessResult(null);
    setRefundResult(null);
    setProcessingTransaction(null);
    setError(null);
    setFormData({
      senderAccountNumber: currentAccount?.accountNumber || '',
      receiverAccountNumber: '',
      amount: '',
      description: '',
    });
    refreshAccountBalance();
  };

  // Helper: Format countdown mm:ss
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper: Format shortened transaction ID
  const shortenTxId = (id) => {
    if (!id) return '';
    if (id.length <= 16) return id;
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', position: 'relative' }}>
      {/* Toast Notification Container */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast-item toast-${toast.type}`}>
              <span>
                {toast.type === 'success' ? '✅' : toast.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================
          VIEW 1: TRANSACTION PROCESSING VIEW (Polling Active)
         ========================================================= */}
      {processingTransaction && !pendingOtpTransaction && !successResult && !refundResult && (
        <div className="form-card processing-card">
          <div className="processing-pulse">
            <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }}></div>
          </div>

          <h2 className="form-title">Transaction Processing</h2>
          <p className="form-subtitle" style={{ marginTop: '0.5rem' }}>
            The transaction is currently being processed by the SAGA banking engine.
          </p>

          <div className="tx-summary-table">
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span className="badge badge-PROCESSING">PROCESSING</span>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span>
              <strong style={{ fontFamily: 'monospace' }}>{shortenTxId(processingTransaction.id)}</strong>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
              <strong>${Number(processingTransaction.amount || 0).toFixed(2)}</strong>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Receiver Account:</span>
              <span>Account #{processingTransaction.receiverAccountNumber}</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              margin: '1.25rem 0',
            }}
          >
            <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div>
            <span>Evaluating fraud rules and synchronizing ledger status...</span>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <button
              className="btn-secondary"
              onClick={() => navigate('/transactions')}
              style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
            >
              View Transaction History
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 2: TRANSFER SUCCESS VIEW (Status = COMPLETED)
         ========================================================= */}
      {successResult && (
        <div className="tx-success-card">
          <div className="form-header" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
            <h2 className="form-title" style={{ color: 'var(--status-completed-text)' }}>
              Transfer Successful
            </h2>
            <p className="form-subtitle">
              <strong>${Number(successResult.amount || 0).toFixed(2)}</strong> sent successfully.
            </p>
          </div>

          <div className="tx-summary-table">
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span className="badge badge-COMPLETED">COMPLETED</span>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Reference Number:</span>
              <strong style={{ fontFamily: 'monospace' }}>
                {successResult.referenceNumber || successResult.id}
              </strong>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{successResult.id}</span>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Sender Account:</span>
              <span>#{successResult.senderAccountNumber}</span>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Receiver Account:</span>
              <span>#{successResult.receiverAccountNumber}</span>
            </div>
            {successResult.completedAt && (
              <div className="tx-summary-row">
                <span style={{ color: 'var(--text-muted)' }}>Completed At:</span>
                <span style={{ fontSize: '0.85rem' }}>
                  {new Date(successResult.completedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => navigate('/transactions')}
            >
              View Transaction History
            </button>
            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={handleMakeAnotherTransfer}
            >
              Make Another Transfer
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 3: FLAGGED / REFUNDED VIEW
         ========================================================= */}
      {refundResult && (
        <div className="tx-flagged-card">
          <div className="form-header" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🛡️</div>
            <h2 className="form-title" style={{ color: '#991b1b' }}>
              Transaction Flagged & Refunded
            </h2>
            <p className="form-subtitle">
              Security guardrails triggered SAGA compensation. The amount was refunded to your account.
            </p>
          </div>

          <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
            <div>
              <strong>Reason:</strong>{' '}
              {refundResult.failureReason || 'Suspicious transfer activity detected.'}
            </div>
          </div>

          <div className="tx-summary-table">
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span className="badge badge-FLAGGED">{refundResult.status || 'FLAGGED'}</span>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Amount Refunded:</span>
              <strong style={{ color: '#059669' }}>
                +${Number(refundResult.amount || 0).toFixed(2)}
              </strong>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Reference ID:</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {refundResult.referenceNumber || refundResult.id}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={handleMakeAnotherTransfer}
            >
              Make Another Transfer
            </button>
            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => navigate('/notifications')}
            >
              View Security Alerts
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 4: DEFAULT TRANSFER FORM
         ========================================================= */}
      {!processingTransaction && !successResult && !refundResult && (
        <div className="form-card">
          <div className="form-header">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💸</div>
            <h2 className="form-title">Transfer Money</h2>
            <p className="form-subtitle">
              Secure, instant fund transfer via SAGA Orchestrated Banking Network
            </p>
          </div>

          <AlertMessage type="error" message={error} onClose={() => setError(null)} />

          <form onSubmit={handleInitiateTransfer}>
            <div className="form-group">
              <label className="form-label" htmlFor="senderAccountNumber">
                <span>Sender Account</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Current Balance: ${Number(balance ?? currentAccount?.balance ?? 0).toFixed(2)}
                </span>
              </label>
              <input
                id="senderAccountNumber"
                name="senderAccountNumber"
                type="text"
                className="form-input"
                value={formData.senderAccountNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="receiverAccountNumber">
                Receiver Account Number
              </label>
              <input
                id="receiverAccountNumber"
                name="receiverAccountNumber"
                type="text"
                className="form-input"
                placeholder="Enter destination account number"
                value={formData.receiverAccountNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">
                Transfer Amount ($)
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                className="form-input"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Description / Memo (Optional)
              </label>
              <input
                id="description"
                name="description"
                type="text"
                className="form-input"
                placeholder="e.g. Rent, Invoice #402, Utilities"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                  <span>Authorizing & Submitting Transfer...</span>
                </>
              ) : (
                'Authorize & Send Transfer'
              )}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================
          OTP VERIFICATION POPUP MODAL (PENDING_VERIFICATION)
         ========================================================= */}
      {pendingOtpTransaction && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="otp-modal">
            <div className="otp-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              Transaction Verification
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
              Your transaction requires OTP verification.
            </p>

            <div className="otp-details-box">
              <div className="otp-details-row">
                <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>
                  ${Number(pendingOtpTransaction.amount || 0).toFixed(2)}
                </strong>
              </div>

              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  OTP has been sent to:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div className="masked-contact-badge">
                    <span>📧</span>
                    <span>{maskEmail(currentAccount?.email)}</span>
                  </div>
                  <div className="masked-contact-badge">
                    <span>📱</span>
                    <span>{maskPhone(currentAccount?.phone)}</span>
                  </div>
                </div>
              </div>
            </div>

            <AlertMessage type="error" message={otpError} onClose={() => setOtpError(null)} />

            <form onSubmit={handleVerifyOtp}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label
                  htmlFor="otpInput"
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    marginBottom: '0.4rem',
                    textAlign: 'center',
                  }}
                >
                  OTP
                </label>
                <input
                  ref={otpInputRef}
                  id="otpInput"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="[ _ _ _ _ _ _ ]"
                  className="otp-input-field"
                  value={otpValue}
                  onChange={handleOtpChange}
                  onPaste={handleOtpPaste}
                  disabled={otpLoading}
                  autoComplete="one-time-code"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.85rem' }}
                  disabled={otpValue.length !== 6 || otpLoading}
                >
                  {otpLoading ? (
                    <>
                      <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                      <span>Verifying OTP...</span>
                    </>
                  ) : (
                    'Verify OTP'
                  )}
                </button>
              </div>

              <div className="otp-timer-text" style={{ marginBottom: '1rem' }}>
                <span>⏱️</span>
                <span>
                  OTP expires in{' '}
                  <strong className="otp-timer-count">{formatTimer(otpCountdown)}</strong>
                </span>
              </div>

              <div
                style={{
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                }}
              >
                <span>Didn't receive the OTP?</span>
                <button
                  type="button"
                  className="btn-resend-otp"
                  onClick={handleResendOtp}
                  disabled={resendingOtp || resendCooldown > 0 || otpLoading}
                >
                  {resendingOtp
                    ? 'Sending new OTP...'
                    : resendCooldown > 0
                    ? `Resend OTP (${resendCooldown}s)`
                    : 'Resend OTP'}
                </button>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem' }}
                  onClick={handleCancelOtp}
                  disabled={otpLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
