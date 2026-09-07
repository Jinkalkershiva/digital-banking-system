package com.banking.transactionservice.entity;


/**
 * Transaction Lifecycle flow:
 *
 * PENDING -> PROCESSING  -> COMPLETED (clean transaction)
 *                        -> PENDING_VERIFICATION (suspicious detected)
 *                                 -> COMPLTED (verified) otp,etc
 *                                 -> Flagged (SAGA REFUND)
 *                        -> FAILED
 *                        -> FLAGGED
 */
public enum TransactionStatus {
    PENDING,
    PROCESSING,
    PENDING_VERIFICATION,
    COMPLETED,
    FAILED,
    FLAGGED


}
