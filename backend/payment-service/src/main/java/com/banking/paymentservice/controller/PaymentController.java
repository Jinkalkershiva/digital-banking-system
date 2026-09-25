package com.banking.paymentservice.controller;

import com.banking.paymentservice.dto.CreatePaymentRequest;
import com.banking.paymentservice.dto.PaymentOrderResponse;
import com.banking.paymentservice.dto.PaymentResponse;
import com.banking.paymentservice.dto.RefundPaymentRequest;
import com.banking.paymentservice.dto.VerifyPaymentSignatureRequest;
import com.banking.paymentservice.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/payments")
@Slf4j
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    public ResponseEntity<PaymentOrderResponse> createPaymentOrder(
            @Valid @RequestBody CreatePaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.createPaymentOrder(request));
    }

    @GetMapping
    public ResponseEntity<List<PaymentResponse>> getAllPayments() {
        return ResponseEntity.ok(paymentService.getAllPayments());
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable String paymentId) {
        return ResponseEntity.ok(paymentService.getPayment(paymentId));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<PaymentResponse> getPaymentByOrderId(@PathVariable String orderId) {
        return ResponseEntity.ok(paymentService.getPaymentByOrderId(orderId));
    }

    @GetMapping("/account/{accountNumber}")
    public ResponseEntity<List<PaymentResponse>> getPaymentsForAccount(@PathVariable String accountNumber) {
        return ResponseEntity.ok(paymentService.getPaymentsForAccount(accountNumber));
    }

    @PostMapping("/verify-signature")
    public ResponseEntity<PaymentResponse> verifySignature(
            @Valid @RequestBody VerifyPaymentSignatureRequest request) {
        return ResponseEntity.ok(paymentService.verifyPaymentSignature(request));
    }

    @PostMapping("/{paymentId}/verify-otp")
    public ResponseEntity<PaymentResponse> verifyOTP(
            @PathVariable String paymentId,
            @RequestParam("otp") String otp) {
        return ResponseEntity.ok(paymentService.verifyOTP(paymentId, otp));
    }

    @PostMapping("/{paymentId}/resend-otp")
    public ResponseEntity<PaymentResponse> resendOTP(@PathVariable String paymentId) {
        return ResponseEntity.ok(paymentService.resendOTP(paymentId));
    }

    @PostMapping("/{paymentId}/cancel")
    public ResponseEntity<PaymentResponse> cancelPayment(
            @PathVariable String paymentId,
            @RequestParam(value = "reason", required = false) String reason) {
        return ResponseEntity.ok(paymentService.cancelPayment(paymentId, reason));
    }

    @PostMapping("/{paymentId}/refund")
    public ResponseEntity<PaymentResponse> refundPayment(
            @PathVariable String paymentId,
            @RequestBody(required = false) RefundPaymentRequest request) {
        String reason = request != null ? request.getReason() : "Manual refund requested";
        var amount = request != null ? request.getAmount() : null;
        return ResponseEntity.ok(paymentService.initiateRefund(paymentId, reason, amount));
    }

    // Razorpay Webhook endpoint
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestBody String rawBody,
            @RequestHeader("X-Razorpay-Signature") String signature) {
        paymentService.handleWebhook(rawBody, signature);
        return ResponseEntity.ok("Webhook processed");
    }
}