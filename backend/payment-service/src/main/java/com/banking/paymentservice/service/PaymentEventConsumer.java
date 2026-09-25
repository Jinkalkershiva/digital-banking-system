package com.banking.paymentservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentEventConsumer {

    private final PaymentService paymentService;

    /**
     * Listen to payment.refund.required topic (e.g., from Transaction Service or SAGA compensations)
     * Performs idempotent refund in Razorpay via PaymentService.
     */
    @KafkaListener(topics = "payment.refund.required", groupId = "payment-refund-group")
    public void consumePaymentRefundRequired(@Payload Map<String, Object> payload) {
        log.info("Received payment.refund.required event: {}", payload);

        try {
            String paymentId = (String) payload.get("paymentId");
            String razorpayPaymentId = (String) payload.get("razorpayPaymentId");
            String razorpayOrderId = (String) payload.get("razorpayOrderId");
            String reason = (String) payload.get("reason");

            BigDecimal amount = null;
            if (payload.get("amount") != null) {
                try {
                    amount = new BigDecimal(payload.get("amount").toString());
                } catch (Exception ignored) {
                }
            }

            if (paymentId != null && !paymentId.isBlank()) {
                paymentService.initiateRefund(paymentId, reason, amount);
            } else if (razorpayOrderId != null && !razorpayOrderId.isBlank()) {
                var payment = paymentService.getPaymentByOrderId(razorpayOrderId);
                if (payment != null && payment.getId() != null) {
                    paymentService.initiateRefund(payment.getId(), reason, amount);
                }
            } else {
                log.warn("payment.refund.required event missing identifier: {}", payload);
            }

        } catch (Exception e) {
            log.error("Error processing payment.refund.required event: {}", e.getMessage(), e);
        }
    }
}
