package com.banking.paymentservice.dto;

import java.math.BigDecimal;

public class PaymentOrderResponse {

    private String paymentId;
    private String razorpayOrderId;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String razorpayKeyId;

    public PaymentOrderResponse(
            String paymentId,
            String razorpayOrderId,
            BigDecimal amount,
            String currency,
            String status,
            String razorpayKeyId) {
        this.paymentId = paymentId;
        this.razorpayOrderId = razorpayOrderId;
        this.amount = amount;
        this.currency = currency;
        this.status = status;
        this.razorpayKeyId = razorpayKeyId;
    }

    public String getPaymentId() {
        return paymentId;
    }

    public String getRazorpayOrderId() {
        return razorpayOrderId;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getStatus() {
        return status;
    }

    public String getRazorpayKeyId() {
        return razorpayKeyId;
    }
}









//package com.banking.paymentservice.dto;
//
//import java.math.BigDecimal;
//
//public class PaymentOrderResponse {
//
//    private String paymentId;
//
//    private String razorpayOrderId;
//
//    private BigDecimal amount;
//
//    private String currency;
//
//    private String status;
//
//    private String razorpayKeyId;
//}
