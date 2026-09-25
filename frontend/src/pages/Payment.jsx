import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AlertMessage from '../components/AlertMessage';
import { paymentApi, accountApi } from '../api/axios';

export default function Payment({ currentAccount }) {
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    accountNumber: currentAccount?.accountNumber || '',
    amount: '32.00',
    description: 'Digital Banking Online Payment',
  });

  // Flow State: 'FORM' | 'CHECKOUT_OPEN' | 'OTP_MODAL' | 'PROCESSING' | 'SUCCESS' | 'CANCELLED' | 'REFUND_PROCESSING' | 'REFUNDED' | 'REFUND_FAILED'
  const [viewState, setViewState] = useState('FORM');

  // Active Payment Details
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // OTP State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [otpCountdown, setOtpCountdown] = useState(300); // 5 minutes in seconds
  const [resendingOtp, setResendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Refs for timers & inputs
  const otpTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const digitInputRefs = useRef([]);

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
  // Sync Account Number
  // ----------------------------------------------------
  useEffect(() => {
    if (currentAccount?.accountNumber) {
      setFormData((prev) => ({
        ...prev,
        accountNumber: currentAccount.accountNumber,
      }));
    }
  }, [currentAccount?.accountNumber]);

  // ----------------------------------------------------
  // Browser Refresh Recovery (Session Storage)
  // ----------------------------------------------------
  useEffect(() => {
    const savedPaymentId = sessionStorage.getItem('apex_pending_payment_id');
    if (savedPaymentId) {
      paymentApi
        .getPayment(savedPaymentId)
        .then((res) => {
          const p = res.data;
          setPaymentData(p);
          if (p.status === 'PENDING_VERIFICATION') {
            setViewState('OTP_MODAL');
            showToast('OTP verification required for pending payment.', 'warning');
          } else if (p.status === 'COMPLETED') {
            sessionStorage.removeItem('apex_pending_payment_id');
            setViewState('SUCCESS');
          } else if (p.status === 'REFUNDED') {
            sessionStorage.removeItem('apex_pending_payment_id');
            setViewState('REFUNDED');
          } else if (p.status === 'REFUND_PENDING') {
            setViewState('REFUND_PROCESSING');
          } else if (p.status === 'REFUND_FAILED') {
            setViewState('REFUND_FAILED');
          } else if (p.status === 'FAILED') {
            sessionStorage.removeItem('apex_pending_payment_id');
            setViewState('CANCELLED');
          }
        })
        .catch(() => {
          sessionStorage.removeItem('apex_pending_payment_id');
        });
    }
  }, [showToast]);

  // ----------------------------------------------------
  // OTP Countdown Timer (300s = 5m)
  // ----------------------------------------------------
  useEffect(() => {
    if (viewState === 'OTP_MODAL') {
      setOtpCountdown(300);
      setOtpError(null);

      // Auto-focus first input box
      setTimeout(() => {
        if (digitInputRefs.current[0]) {
          digitInputRefs.current[0].focus();
        }
      }, 100);

      if (otpTimerRef.current) clearInterval(otpTimerRef.current);

      otpTimerRef.current = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(otpTimerRef.current);
            setOtpError('OTP expired. This payment has been cancelled.');
            // Auto cancel and refund if captured
            handleOtpExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    }

    return () => {
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
    };
  }, [viewState]);

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
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [resendCooldown]);

  // ----------------------------------------------------
  // Refund Status Poller (when REFUND_PROCESSING)
  // ----------------------------------------------------
  useEffect(() => {
    if (viewState === 'REFUND_PROCESSING' && paymentData?.id) {
      let pollCount = 0;
      const maxPolls = 15;

      const pollRefund = async () => {
        try {
          pollCount += 1;
          const res = await paymentApi.getPayment(paymentData.id);
          const p = res.data;
          setPaymentData(p);

          if (p.status === 'REFUNDED' || p.refundStatus === 'REFUNDED') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            sessionStorage.removeItem('apex_pending_payment_id');
            setViewState('REFUNDED');
            showToast('Refund completed successfully.', 'success');
          } else if (p.status === 'REFUND_FAILED' || p.refundStatus === 'REFUND_FAILED') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            sessionStorage.removeItem('apex_pending_payment_id');
            setViewState('REFUND_FAILED');
          } else if (pollCount >= maxPolls) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          }
        } catch (err) {
          console.warn('Error polling refund status:', err);
        }
      };

      pollTimerRef.current = setInterval(pollRefund, 2000);

      return () => {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      };
    }
  }, [viewState, paymentData?.id, showToast]);

  // ----------------------------------------------------
  // Handle Form Change
  // ----------------------------------------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const setPresetAmount = (val) => {
    setFormData((prev) => ({ ...prev, amount: val }));
  };

  // ----------------------------------------------------
  // 1. Create Payment Order & Launch Razorpay Checkout
  // ----------------------------------------------------
  const handleInitiatePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const amountNum = parseFloat(formData.amount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid positive payment amount.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        accountNumber: formData.accountNumber.trim(),
        amount: amountNum,
        description: formData.description.trim() || 'Online Gateway Payment',
      };

      // Step 1: Call backend POST /api/v1/payments
      const res = await paymentApi.createPaymentOrder(payload);
      const orderData = res.data;

      setPaymentData({
        id: orderData.paymentId,
        razorpayOrderId: orderData.razorpayOrderId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        status: 'CREATED',
        accountNumber: formData.accountNumber.trim(),
        description: formData.description.trim(),
      });

      // Step 2: Open Razorpay Checkout Modal
      openRazorpayCheckout(orderData);

    } catch (err) {
      setError(
        err.friendlyMessage ||
          'Failed to create payment order. Ensure Payment Service is running.'
      );
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 2. Razorpay Checkout Modal Handler
  // ----------------------------------------------------
  const openRazorpayCheckout = (orderData) => {
    if (typeof window.Razorpay === 'undefined') {
      // Fallback: Dynamically load Razorpay checkout script if missing
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => launchRazorpay(orderData);
      script.onerror = () => {
        setError('Failed to load Razorpay Checkout SDK. Please check your internet connection.');
        setLoading(false);
      };
      document.body.appendChild(script);
    } else {
      launchRazorpay(orderData);
    }
  };

  const launchRazorpay = (orderData) => {
    try {
      const options = {
        key: orderData.razorpayKeyId,
        amount: Math.round(Number(orderData.amount) * 100),
        currency: orderData.currency || 'INR',
        name: 'Apex Digital Bank',
        description: formData.description || 'Digital Banking Payment',
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: currentAccount?.accountHolderName || 'Valued Customer',
          email: currentAccount?.email || 'customer@bank.com',
          contact: currentAccount?.phone || '+919999999999',
        },
        theme: {
          color: '#2563eb',
        },
        handler: async function (response) {
          // Razorpay callback: { razorpay_payment_id, razorpay_order_id, razorpay_signature }
          handleRazorpaySuccess(orderData.paymentId, response);
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            showToast('Payment checkout was dismissed.', 'warning');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setLoading(false);
        setError(`Payment failed: ${resp.error?.description || 'Gateway transaction declined'}`);
      });
      rzp.open();
    } catch (err) {
      setError('Could not open Razorpay checkout: ' + err.message);
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 3. Checkout Callback: Verify Signature & Trigger OTP
  // ----------------------------------------------------
  const handleRazorpaySuccess = async (paymentId, rzpResponse) => {
    setLoading(true);
    setError(null);

    try {
      const verifyPayload = {
        paymentId: paymentId,
        razorpayOrderId: rzpResponse.razorpay_order_id,
        razorpayPaymentId: rzpResponse.razorpay_payment_id,
        razorpaySignature: rzpResponse.razorpay_signature,
      };

      // Call backend: POST /api/v1/payments/verify-signature
      const res = await paymentApi.verifySignature(verifyPayload);
      const verifiedPayment = res.data;

      setPaymentData(verifiedPayment);
      sessionStorage.setItem('apex_pending_payment_id', verifiedPayment.id);

      // Move to OTP verification view
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError(null);
      setViewState('OTP_MODAL');
      showToast('Payment authorized. OTP sent to your registered contact.', 'warning');

    } catch (err) {
      setError(err.friendlyMessage || 'Signature verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // 4. OTP Digit Box Input Handlers
  // ----------------------------------------------------
  const handleDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);
    if (otpError) setOtpError(null);

    // Auto-advance focus to next digit box
    if (cleanVal && index < 5) {
      if (digitInputRefs.current[index + 1]) {
        digitInputRefs.current[index + 1].focus();
      }
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      if (digitInputRefs.current[index - 1]) {
        digitInputRefs.current[index - 1].focus();
      }
    }
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const numeric = pasted.replace(/\D/g, '').slice(0, 6);
    if (numeric) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < numeric.length && i < 6; i++) {
        newDigits[i] = numeric[i];
      }
      setOtpDigits(newDigits);
      if (otpError) setOtpError(null);
      const focusIndex = Math.min(numeric.length, 5);
      if (digitInputRefs.current[focusIndex]) {
        digitInputRefs.current[focusIndex].focus();
      }
    }
  };

  const getEnteredOtp = () => otpDigits.join('');

  // ----------------------------------------------------
  // 5. Verify OTP
  // ----------------------------------------------------
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const fullOtp = getEnteredOtp();

    if (fullOtp.length !== 6) {
      setOtpError('Please enter the complete 6-digit numeric OTP.');
      return;
    }

    if (!paymentData?.id) return;

    setOtpLoading(true);
    setOtpError(null);

    try {
      // POST /api/v1/payments/{paymentId}/verify-otp?otp=...
      const res = await paymentApi.verifyOtp(paymentData.id, fullOtp);
      const completedPayment = res.data;

      sessionStorage.removeItem('apex_pending_payment_id');
      setPaymentData(completedPayment);
      setViewState('SUCCESS');
      showToast('Payment completed successfully!', 'success');

    } catch (err) {
      const errMsg = err.friendlyMessage || '';
      const serverDataMsg =
        (typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.message) || '';
      const combined = `${errMsg} ${serverDataMsg}`.toLowerCase();

      if (combined.includes('expire')) {
        setOtpError('OTP expired. This payment has been cancelled.');
        handleOtpExpired();
      } else if (
        err.response?.status === 400 ||
        combined.includes('incorrect') ||
        combined.includes('invalid') ||
        combined.includes('wrong')
      ) {
        setOtpError('Incorrect OTP. Please try again.');
        setOtpDigits(['', '', '', '', '', '']);
        if (digitInputRefs.current[0]) {
          digitInputRefs.current[0].focus();
        }
      } else if (err.response?.status === 429) {
        setOtpError('Too many invalid attempts. This payment is being cancelled.');
        handleCancelPayment('Too many invalid OTP attempts.');
      } else {
        setOtpError(errMsg || 'Verification failed. Please try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  // ----------------------------------------------------
  // 6. Resend OTP
  // ----------------------------------------------------
  const handleResendOtp = async () => {
    if (!paymentData?.id || resendingOtp || resendCooldown > 0) return;

    setResendingOtp(true);
    setOtpError(null);

    try {
      const res = await paymentApi.resendOtp(paymentData.id);
      if (res.data) {
        setPaymentData(res.data);
      }
      setOtpDigits(['', '', '', '', '', '']);
      setOtpCountdown(300); // Reset timer
      setResendCooldown(30);
      showToast('OTP sent successfully.', 'success');

      if (digitInputRefs.current[0]) {
        digitInputRefs.current[0].focus();
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

  // ----------------------------------------------------
  // 7. Cancel Payment & Initiate Refund Flow
  // ----------------------------------------------------
  const handleCancelPayment = async (reason = 'OTP verification was not completed.') => {
    if (!paymentData?.id || otpLoading) return;

    setOtpLoading(true);
    try {
      const res = await paymentApi.cancelPayment(paymentData.id, reason);
      const updated = res.data;
      setPaymentData(updated);
      sessionStorage.removeItem('apex_pending_payment_id');

      if (updated.status === 'REFUNDED' || updated.refundStatus === 'REFUNDED') {
        setViewState('REFUNDED');
        showToast('Payment cancelled. ₹' + Number(updated.amount || 0).toFixed(2) + ' has been refunded.', 'success');
      } else if (updated.status === 'REFUND_PENDING' || updated.refundStatus === 'REFUND_PENDING') {
        setViewState('REFUND_PROCESSING');
      } else if (updated.status === 'REFUND_FAILED' || updated.refundStatus === 'REFUND_FAILED') {
        setViewState('REFUND_FAILED');
      } else {
        setViewState('CANCELLED');
        showToast('Payment cancelled.', 'warning');
      }
    } catch (err) {
      console.error('Error cancelling payment:', err);
      setViewState('CANCELLED');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpExpired = () => {
    handleCancelPayment('OTP expired. Verification was not completed.');
  };

  // Reset form to start a new payment
  const handleNewPayment = () => {
    sessionStorage.removeItem('apex_pending_payment_id');
    setPaymentData(null);
    setViewState('FORM');
    setError(null);
    setFormData({
      accountNumber: currentAccount?.accountNumber || '',
      amount: '32.00',
      description: 'Digital Banking Online Payment',
    });
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const shortenId = (id) => {
    if (!id) return '';
    if (id.length <= 16) return id;
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', position: 'relative' }}>
      {/* In-app Toast Container */}
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
          TOP PROGRESS STEPPER
         ========================================================= */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '0.8rem',
          fontWeight: 600,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: viewState !== 'FORM' ? '#10b981' : 'var(--accent)' }}>
          <span>●</span>
          <span>1. Create Order</span>
        </div>
        <span style={{ color: 'var(--border-color)' }}>➔</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: ['OTP_MODAL', 'SUCCESS', 'REFUNDED', 'REFUND_PROCESSING'].includes(viewState) ? '#10b981' : 'var(--text-muted)' }}>
          <span>●</span>
          <span>2. Gateway Checkout</span>
        </div>
        <span style={{ color: 'var(--border-color)' }}>➔</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: viewState === 'OTP_MODAL' ? '#9333ea' : ['SUCCESS', 'REFUNDED'].includes(viewState) ? '#10b981' : 'var(--text-muted)' }}>
          <span>●</span>
          <span>3. OTP Verification</span>
        </div>
        <span style={{ color: 'var(--border-color)' }}>➔</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: viewState === 'SUCCESS' ? '#10b981' : ['REFUNDED', 'CANCELLED', 'REFUND_PROCESSING'].includes(viewState) ? '#ef4444' : 'var(--text-muted)' }}>
          <span>●</span>
          <span>4. Complete / Refund</span>
        </div>
      </div>

      {/* =========================================================
          VIEW 1: PAYMENT SUCCESS (status === 'COMPLETED')
         ========================================================= */}
      {viewState === 'SUCCESS' && paymentData && (
        <div className="tx-success-card">
          <div className="form-header" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✓</div>
            <h2 className="form-title" style={{ color: '#059669' }}>
              Payment Successful
            </h2>
            <p className="form-subtitle" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.5rem' }}>
              ₹{Number(paymentData.amount || 0).toFixed(2)} INR
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
              Payment completed successfully.
            </p>
          </div>

          <div className="tx-summary-table">
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Payment Status:</span>
              <span className="badge badge-COMPLETED">COMPLETED</span>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Payment ID:</span>
              <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{paymentData.id}</strong>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Razorpay Payment ID:</span>
              <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{paymentData.razorpayPaymentId || 'N/A'}</strong>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Razorpay Order ID:</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{paymentData.razorpayOrderId || 'N/A'}</span>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Account Number:</span>
              <span>#{paymentData.accountNumber}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => navigate('/transactions')}>
              View Statement
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={handleNewPayment}>
              Make Another Payment
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 2: REFUND COMPLETED (status === 'REFUNDED')
         ========================================================= */}
      {viewState === 'REFUNDED' && paymentData && (
        <div className="tx-flagged-card">
          <div className="form-header" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✓</div>
            <h2 className="form-title" style={{ color: '#059669' }}>
              Refund Completed
            </h2>
            <p className="form-subtitle" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.5rem' }}>
              ₹{Number(paymentData.amount || 0).toFixed(2)} INR has been refunded.
            </p>
          </div>

          <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
            <div>
              <strong>⚠ Payment Cancelled:</strong> {paymentData.failureReason || 'OTP verification was not completed.'}
              <div style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>
                Your payment was not completed. Your money has been safely returned via Razorpay.
              </div>
            </div>
          </div>

          <div className="tx-summary-table">
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Refund Status:</span>
              <span className="badge" style={{ backgroundColor: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                ✓ REFUND COMPLETED
              </span>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Refund Amount:</span>
              <strong style={{ color: '#059669', fontSize: '1rem' }}>
                +₹{Number(paymentData.amount || 0).toFixed(2)} INR
              </strong>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Razorpay Refund ID:</span>
              <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#166534' }}>
                {paymentData.razorpayRefundId || 'N/A'}
              </strong>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Razorpay Payment ID:</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{paymentData.razorpayPaymentId || 'N/A'}</span>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Internal Payment ID:</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{paymentData.id}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={handleNewPayment}>
              Make Another Payment
            </button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/notifications')}>
              View Notifications
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 3: REFUND PROCESSING (status === 'REFUND_PENDING')
         ========================================================= */}
      {viewState === 'REFUND_PROCESSING' && paymentData && (
        <div className="form-card processing-card">
          <div className="processing-pulse">
            <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }}></div>
          </div>

          <h2 className="form-title" style={{ color: 'var(--primary)' }}>
            ↻ Refund Processing
          </h2>
          <p className="form-subtitle" style={{ marginTop: '0.5rem' }}>
            The payment was cancelled because OTP verification was not completed.
          </p>
          <p style={{ color: '#2563eb', fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Your payment was not completed. Your money is being returned.
          </p>

          <div className="tx-summary-table" style={{ marginTop: '1.5rem' }}>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Refund Status:</span>
              <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                ↻ REFUND PROCESSING
              </span>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Refund Amount:</span>
              <strong>₹{Number(paymentData.amount || 0).toFixed(2)} INR</strong>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Payment ID:</span>
              <strong style={{ fontFamily: 'monospace' }}>{paymentData.id}</strong>
            </div>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            We're securely communicating with Razorpay to reverse the charge. Do not refresh the page.
          </p>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
            <button className="btn-secondary" style={{ width: '100%' }} onClick={handleNewPayment}>
              Return to Payments
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 4: REFUND FAILED / REQUIRES ATTENTION
         ========================================================= */}
      {viewState === 'REFUND_FAILED' && paymentData && (
        <div className="tx-flagged-card">
          <div className="form-header">
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚠</div>
            <h2 className="form-title" style={{ color: '#dc2626' }}>
              Refund Requires Attention
            </h2>
            <p className="form-subtitle">
              Your payment was cancelled, but the automatic gateway refund encountered an issue.
            </p>
          </div>

          <div className="alert-box alert-error">
            <div>
              <strong>Gateway Notice:</strong> {paymentData.failureReason || 'Razorpay refund API unavailable.'}
              <p style={{ marginTop: '0.4rem', fontSize: '0.85rem' }}>
                Our banking reconciliation engine will automatically retry this refund, or you can contact support with your Payment ID.
              </p>
            </div>
          </div>

          <div className="tx-summary-table">
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Payment ID:</span>
              <strong style={{ fontFamily: 'monospace' }}>{paymentData.id}</strong>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Razorpay Payment ID:</span>
              <strong style={{ fontFamily: 'monospace' }}>{paymentData.razorpayPaymentId || 'N/A'}</strong>
            </div>
            <div className="tx-summary-row">
              <span style={{ color: 'var(--text-muted)' }}>Amount:</span>
              <strong>₹{Number(paymentData.amount || 0).toFixed(2)} INR</strong>
            </div>
          </div>

          <button className="btn-primary" style={{ marginTop: '1.25rem' }} onClick={handleNewPayment}>
            Make Another Payment
          </button>
        </div>
      )}

      {/* =========================================================
          VIEW 5: PAYMENT CANCELLED (Uncaptured)
         ========================================================= */}
      {viewState === 'CANCELLED' && (
        <div className="tx-flagged-card">
          <div className="form-header">
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>×</div>
            <h2 className="form-title" style={{ color: '#991b1b' }}>
              Payment Cancelled
            </h2>
            <p className="form-subtitle">
              {paymentData?.failureReason || 'OTP verification was not completed.'}
            </p>
          </div>

          <div className="alert-box alert-info">
            <div>
              <strong>Notice:</strong> No funds were captured from your account. You can retry the payment anytime.
            </div>
          </div>

          <button className="btn-primary" style={{ marginTop: '1.25rem' }} onClick={handleNewPayment}>
            Make New Payment
          </button>
        </div>
      )}

      {/* =========================================================
          VIEW 6: DEFAULT PAYMENT ORDER FORM (viewState === 'FORM')
         ========================================================= */}
      {viewState === 'FORM' && (
        <div className="form-card">
          <div className="form-header">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💳</div>
            <h2 className="form-title">Payment & Gateway Order</h2>
            <p className="form-subtitle">
              Pay securely via Razorpay Checkout with 2-Factor OTP verification
            </p>
          </div>

          <AlertMessage type="error" message={error} onClose={() => setError(null)} />

          <form onSubmit={handleInitiatePayment}>
            <div className="form-group">
              <label className="form-label" htmlFor="accountNumber">
                Account Number
              </label>
              <input
                id="accountNumber"
                name="accountNumber"
                type="text"
                className="form-input"
                value={formData.accountNumber}
                onChange={handleChange}
                placeholder="Enter 12-digit account number"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="amount">
                <span>Payment Amount (₹ INR)</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Razorpay Test Gateway</span>
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                className="form-input"
                placeholder="32.00"
                value={formData.amount}
                onChange={handleChange}
                required
              />

              {/* Quick Amount Presets */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                {['10.00', '32.00', '100.00', '500.00'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPresetAmount(amt)}
                    style={{
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: formData.amount === amt ? '1px solid var(--accent)' : '1px solid var(--border-color)',
                      backgroundColor: formData.amount === amt ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-main)',
                      color: formData.amount === amt ? 'var(--accent)' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Payment Description / Memo
              </label>
              <input
                id="description"
                name="description"
                type="text"
                className="form-input"
                placeholder="e.g. Utility bill, Online purchase, Invoice"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                  <span>Initiating Razorpay Order...</span>
                </>
              ) : (
                `Proceed to Pay ₹${Number(formData.amount || 0).toFixed(2)} INR`
              )}
            </button>
          </form>
        </div>
      )}

      {/* =========================================================
          OTP VERIFICATION POPUP MODAL (Section 11)
         ========================================================= */}
      {viewState === 'OTP_MODAL' && paymentData && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="otp-modal">
            <div className="otp-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.02em' }}>
              Verify Payment
            </h3>

            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#2563eb', margin: '0.4rem 0' }}>
              ₹{Number(paymentData.amount || 0).toFixed(2)} INR
            </div>

            <div className="otp-details-box">
              <div className="otp-details-row">
                <span style={{ color: 'var(--text-muted)' }}>Payment ID:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{shortenId(paymentData.id)}</span>
              </div>
              <div className="otp-details-row">
                <span style={{ color: 'var(--text-muted)' }}>Order ID:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{paymentData.razorpayOrderId}</span>
              </div>

              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  OTP sent to:
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
              {/* 6-Digit Individual OTP Input Boxes */}
              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--primary)',
                    marginBottom: '0.6rem',
                    textAlign: 'center',
                  }}
                >
                  Enter 6-Digit Verification Code
                </label>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    margin: '0.5rem 0',
                  }}
                >
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (digitInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      onPaste={handleDigitPaste}
                      disabled={otpLoading}
                      autoComplete="off"
                      style={{
                        width: '44px',
                        height: '52px',
                        fontSize: '1.5rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        borderRadius: 'var(--radius-md)',
                        border: digit ? '2px solid #9333ea' : '2px solid var(--border-color)',
                        backgroundColor: digit ? '#faf5ff' : 'var(--bg-card)',
                        color: 'var(--primary)',
                        outline: 'none',
                        fontFamily: 'monospace',
                        transition: 'all 0.15s ease',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.85rem' }}
                  disabled={getEnteredOtp().length !== 6 || otpLoading}
                >
                  {otpLoading ? (
                    <>
                      <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                      <span>Verifying Payment...</span>
                    </>
                  ) : (
                    'Verify Payment'
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
                <span>Didn't receive OTP?</span>
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
                  style={{ width: '100%', fontSize: '0.85rem', padding: '0.55rem', color: '#ef4444' }}
                  onClick={() => handleCancelPayment('OTP verification cancelled by user.')}
                  disabled={otpLoading}
                >
                  Cancel Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
