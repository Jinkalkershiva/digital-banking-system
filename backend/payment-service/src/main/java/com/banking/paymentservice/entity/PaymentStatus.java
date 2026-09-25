package com.banking.paymentservice.entity;

public enum PaymentStatus {
    CREATED,
    AUTHORIZED,
    CAPTURED,
    COMPLETED,
    PENDING,
    PENDING_VERIFICATION,
    FAILED,
    REFUND_PENDING,
    REFUNDED,
    REFUND_FAILED
}

