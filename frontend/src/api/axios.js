import axios from 'axios';

// Base URL can be configured via environment variable VITE_API_BASE_URL (e.g. http://localhost:8080 for API Gateway)
// Defaults to empty string so requests use Vite dev proxy in local development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Helper to check if a request is for an inherently public endpoint
const isPublicEndpoint = (config) => {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  if (url.includes('/api/v1/auth/register') || url.includes('/api/v1/auth/login')) {
    return true;
  }
  if (url === '/register' || url === '/login') {
    return true;
  }
  if (method === 'post' && (url === '/api/v1/accounts' || url === '/api/v1/accounts/')) {
    return true;
  }
  return false;
};

// Request interceptor for auth token
apiClient.interceptors.request.use(
  (config) => {
    // Never send stale/expired Bearer tokens on public authentication/registration calls
    if (!isPublicEndpoint(config)) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for centralized error formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let friendlyMessage = 'An unexpected error occurred. Please try again.';

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // 1. Check for detailed backend validation or error message
      let extractedMsg = '';
      if (typeof data === 'string' && data.trim()) {
        try {
          const parsed = JSON.parse(data);
          extractedMsg = parsed.message || parsed.error || '';
        } catch {
          extractedMsg = data;
        }
      } else if (data && typeof data === 'object') {
        if (data.fieldErrors && typeof data.fieldErrors === 'object') {
          extractedMsg = Object.values(data.fieldErrors).join('. ');
        } else {
          extractedMsg = data.message || data.error || '';
        }
      }

      if (extractedMsg && extractedMsg.trim()) {
        friendlyMessage = extractedMsg;
      } else if (status === 400) {
        friendlyMessage = 'Bad Request: Please check your input fields.';
      } else if (status === 401) {
        const isAuthEndpoint = error.config && isPublicEndpoint(error.config);
        friendlyMessage = isAuthEndpoint
          ? 'Invalid credentials provided. Please check your username and password.'
          : 'Session unauthorized or expired. Please login again.';
      } else if (status === 403) {
        friendlyMessage = 'Access denied: Admin role or elevated privileges required.';
      } else if (status === 404) {
        friendlyMessage = 'Requested resource not found.';
      } else if (status === 500) {
        friendlyMessage = 'Internal server error occurred in backend service.';
      }
    } else if (error.request) {
      friendlyMessage = 'Backend service unavailable. Please check if microservices and API Gateway are running.';
    }

    error.friendlyMessage = friendlyMessage;
    return Promise.reject(error);
  }
);

// ==========================================
// Verified Real Backend API Functions
// ==========================================

export const authApi = {
  login: (data) => apiClient.post('/api/v1/auth/login', data),
  register: (data) => apiClient.post('/api/v1/auth/register', data),
  getMe: () => apiClient.get('/api/v1/auth/me'),
  getAllUsers: () => apiClient.get('/api/v1/auth/users'),
};

export const accountApi = {
  createAccount: (data) => apiClient.post('/api/v1/accounts', data),
  getAllAccounts: () => apiClient.get('/api/v1/accounts'),
  getAccount: (accountNumber) => apiClient.get(`/api/v1/accounts/${accountNumber}`),
  getAccountByEmail: (email) => apiClient.get(`/api/v1/accounts/user/${email}`),
  getBalance: (accountNumber) => apiClient.get(`/api/v1/accounts/${accountNumber}/balance`),
  blockAccount: (accountNumber) => apiClient.put(`/api/v1/accounts/${accountNumber}/block`),
  unblockAccount: (accountNumber) => apiClient.put(`/api/v1/accounts/${accountNumber}/unblock`),
};

export const transactionApi = {
  transfer: (data) => apiClient.post('/api/v1/transactions/transfer', data),
  getAllTransactions: () => apiClient.get('/api/v1/transactions'),
  getTransaction: (transactionId) => apiClient.get(`/api/v1/transactions/${transactionId}`),
  getTransactionHistory: (accountNumber) =>
    apiClient.get(`/api/v1/transactions/account/${accountNumber}`),
  verifyOtp: (transactionId, otp) =>
    apiClient.post(`/api/v1/transactions/${transactionId}/verify`, null, {
      params: { otp },
    }),
  resendOtp: (transactionId) =>
    apiClient.post(`/api/v1/transactions/${transactionId}/resend-otp`),
  cancelTransaction: (transactionId, reason) =>
    apiClient.post(`/api/v1/transactions/${transactionId}/cancel`, null, {
      params: { reason },
    }),
};

export const paymentApi = {
  createPaymentOrder: (data) => apiClient.post('/api/v1/payments', data),
  getAllPayments: () => apiClient.get('/api/v1/payments'),
  getPayment: (paymentId) => apiClient.get(`/api/v1/payments/${paymentId}`),
  getPaymentByOrderId: (orderId) => apiClient.get(`/api/v1/payments/order/${orderId}`),
  getPaymentsForAccount: (accountNumber) =>
    apiClient.get(`/api/v1/payments/account/${accountNumber}`),
  verifySignature: (data) => apiClient.post('/api/v1/payments/verify-signature', data),
  verifyOtp: (paymentId, otp) =>
    apiClient.post(`/api/v1/payments/${paymentId}/verify-otp`, null, {
      params: { otp },
    }),
  resendOtp: (paymentId) =>
    apiClient.post(`/api/v1/payments/${paymentId}/resend-otp`),
  cancelPayment: (paymentId, reason) =>
    apiClient.post(`/api/v1/payments/${paymentId}/cancel`, null, {
      params: { reason },
    }),
  refundPayment: (paymentId, data) =>
    apiClient.post(`/api/v1/payments/${paymentId}/refund`, data),
};

export const fraudApi = {
  getRules: () => apiClient.get('/api/v1/fraud/rules'),
};

export const adminApi = {
  getAllUsers: authApi.getAllUsers,
  getAllAccounts: accountApi.getAllAccounts,
  blockAccount: accountApi.blockAccount,
  unblockAccount: accountApi.unblockAccount,
  getAllTransactions: transactionApi.getAllTransactions,
  getAllPayments: paymentApi.getAllPayments,
  refundPayment: paymentApi.refundPayment,
  getFraudRules: fraudApi.getRules,
};

export default apiClient;
