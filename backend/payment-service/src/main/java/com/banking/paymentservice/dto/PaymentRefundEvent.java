package com.banking.paymentservice.dto;

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
public class PaymentRefundEvent {

    private String transactionId;
    private String paymentId;
    private String razorpayPaymentId;
    private String razorpayOrderId;
    private String razorpayRefundId;
    private BigDecimal amount;
    private String currency;
    private String accountNumber;
    private String reason;
    private String status;
    private String timestamp;

}
