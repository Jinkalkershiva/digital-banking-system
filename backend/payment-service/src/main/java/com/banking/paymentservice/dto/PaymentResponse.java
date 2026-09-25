package com.banking.paymentservice.dto;

import com.banking.paymentservice.entity.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponse {

    private String id;
    private String accountNumber;
    private BigDecimal amount;
    private String currency;
    private String razorpayOrderId;
    private String razorpayPaymentId;
    private PaymentStatus status;
    private String refundStatus;
    private String razorpayRefundId;
    private String failureReason;
    private String description;
    private String transactionId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
