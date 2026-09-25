import apiClient, { authApi, accountApi, transactionApi, paymentApi, fraudApi } from './axios';

export const adminApi = {
  // 1. Overview Telemetry
  getAdminOverview: async () => {
    const [usersRes, accountsRes, txRes, payRes] = await Promise.allSettled([
      authApi.getAllUsers(),
      accountApi.getAllAccounts(),
      transactionApi.getAllTransactions(),
      paymentApi.getAllPayments(),
    ]);

    const users = usersRes.status === 'fulfilled' ? usersRes.value.data || [] : [];
    const accounts = accountsRes.status === 'fulfilled' ? accountsRes.value.data || [] : [];
    const transactions = txRes.status === 'fulfilled' ? txRes.value.data || [] : [];
    const payments = payRes.status === 'fulfilled' ? payRes.value.data || [] : [];

    const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    const blockedAccountsCount = accounts.filter((acc) => acc.status === 'BLOCKED').length;

    const completedTx = transactions.filter((t) => t.status === 'COMPLETED' || t.status === 'SUCCESS');
    const transactionVolume = completedTx.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const completedPayments = payments.filter((p) => p.status === 'COMPLETED' || p.status === 'CAPTURED');
    const paymentVolume = completedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const refundedPayments = payments.filter(
      (p) => p.status === 'REFUNDED' || p.refundStatus === 'REFUNDED'
    );
    const refundedTransactions = transactions.filter(
      (t) => t.status === 'FLAGGED' || t.status === 'FAILED'
    );
    const refundVolume = refundedPayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0
    );

    return {
      userCount: users.length,
      accountCount: accounts.length,
      blockedAccountsCount,
      totalBalance,
      transactionCount: transactions.length,
      transactionVolume,
      paymentCount: payments.length,
      paymentVolume,
      refundCount: refundedPayments.length,
      refundVolume,
      refundedTransactionsCount: refundedTransactions.length,
      recentTransactions: transactions.slice(0, 8),
      recentPayments: payments.slice(0, 8),
      accounts,
      users,
    };
  },

  // 2. User Identity Registry
  getUsers: () => authApi.getAllUsers(),

  // 3. Bank Accounts & Limits
  getAccounts: () => accountApi.getAllAccounts(),
  getAccount: (accountNumber) => accountApi.getAccount(accountNumber),
  blockAccount: (accountNumber) => accountApi.blockAccount(accountNumber),
  unblockAccount: (accountNumber) => accountApi.unblockAccount(accountNumber),

  // 4. Transaction Audit Ledger
  getTransactions: () => transactionApi.getAllTransactions(),
  getTransaction: (transactionId) => transactionApi.getTransaction(transactionId),

  // 5. Razorpay Payments & Orders
  getPayments: () => paymentApi.getAllPayments(),
  getPayment: (paymentId) => paymentApi.getPayment(paymentId),
  refundPayment: (paymentId, data) => paymentApi.refundPayment(paymentId, data),

  // 6. Idempotent Refund Hub
  getRefunds: async () => {
    const [paymentsRes, transactionsRes] = await Promise.allSettled([
      paymentApi.getAllPayments(),
      transactionApi.getAllTransactions(),
    ]);

    const payments = paymentsRes.status === 'fulfilled' ? paymentsRes.value.data || [] : [];
    const transactions = transactionsRes.status === 'fulfilled' ? transactionsRes.value.data || [] : [];

    // Filter payments with refund activity
    const paymentRefunds = payments
      .filter((p) => p.status === 'REFUNDED' || p.status === 'REFUND_PENDING' || p.status === 'REFUND_FAILED' || (p.refundStatus && p.refundStatus !== 'NONE' && p.refundStatus !== 'NOT_APPLICABLE'))
      .map((p) => ({
        id: p.id,
        refundId: p.razorpayRefundId || `rfnd_${p.id.substring(0, 8)}`,
        transactionId: p.transactionId || p.id,
        paymentId: p.id,
        gatewayPaymentId: p.razorpayPaymentId,
        orderId: p.razorpayOrderId,
        accountNumber: p.accountNumber,
        amount: p.amount,
        currency: p.currency || 'INR',
        type: 'GATEWAY_REFUND',
        status: p.refundStatus || p.status,
        sagaState: 'SAGA_REFUND_COMPLETED',
        reason: p.failureReason || 'Razorpay Gateway Refund Execution',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

    // Filter SAGA compensated / flagged transactions
    const transactionRefunds = transactions
      .filter((t) => t.status === 'FLAGGED' || (t.failureReason && t.failureReason.toLowerCase().includes('compensation')))
      .map((t) => ({
        id: t.id,
        refundId: `saga_comp_${t.id.substring(0, 8)}`,
        transactionId: t.id,
        paymentId: null,
        gatewayPaymentId: null,
        orderId: null,
        accountNumber: t.senderAccountNumber,
        amount: t.amount,
        currency: 'INR',
        type: 'INTERNAL_COMPENSATION',
        status: 'COMPENSATED',
        sagaState: 'SAGA_COMPENSATION_EXECUTED',
        reason: t.failureReason || 'SAGA Compensation: Account balance refunded',
        createdAt: t.createdAt,
        updatedAt: t.completedAt || t.createdAt,
      }));

    return [...paymentRefunds, ...transactionRefunds];
  },

  // 7. Fraud Rule Engine & Telemetry
  getFraudRules: () => fraudApi.getRules(),
  updateFraudRules: (rulesData) => apiClient.put('/api/v1/fraud/rules', rulesData),
  getFraudEvents: () => apiClient.get('/api/v1/fraud/events'),

  // 8. System Topology & Health (Live Telemetry)
  getSystemHealth: () => apiClient.get('/api/v1/system/health'),
};

export default adminApi;
