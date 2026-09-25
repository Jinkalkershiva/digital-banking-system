package com.banking.paymentservice.service;

import com.banking.paymentservice.dto.CreatePaymentRequest;
import com.banking.paymentservice.dto.PaymentOrderResponse;
import com.banking.paymentservice.dto.PaymentRefundEvent;
import com.banking.paymentservice.dto.PaymentResponse;
import com.banking.paymentservice.dto.VerifyPaymentSignatureRequest;
import com.banking.paymentservice.entity.Payment;
import com.banking.paymentservice.entity.PaymentStatus;
import com.banking.paymentservice.repository.PaymentRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RedisTemplate<String, String> redisTemplate;

    @Value("${razorpay.key-id}")
    private String keyId;

    @Value("${razorpay.key-secret}")
    private String keySecret;

    @Value("${razorpay.webhook-secret}")
    private String webhookSecret;

    private RazorpayClient razorpayClient;

    private static final String PAYMENT_COMPLETED_TOPIC = "payment.completed";
    private static final String PAYMENT_FAILED_TOPIC = "payment.failed";
    private static final String PAYMENT_REFUNDED_TOPIC = "payment.refunded";
    private static final String PAYMENT_REFUND_FAILED_TOPIC = "payment.refund.failed";
    private static final String TRANSACTION_OTP_GENERATE_TOPIC = "transaction.otp.generated";
    private static final String CURRENCY = "INR";
    private static final long OTP_EXPIRY_MINUTES = 5;

    private final SecureRandom secureRandom = new SecureRandom();

    @PostConstruct
    void init() {
        try {
            this.razorpayClient = new RazorpayClient(keyId, keySecret);
            log.info("Razorpay client initialized successfully");
            reconcilePendingRefunds();
        } catch (RazorpayException e) {
            log.error("Failed to initialize Razorpay client", e);
        }
    }

    /**
     * Recover/reconcile any payments that were left in REFUND_PENDING status across restarts (Test 6)
     */
    public void reconcilePendingRefunds() {
        try {
            List<Payment> pendingRefunds = paymentRepository.findByStatus(PaymentStatus.REFUND_PENDING);
            if (pendingRefunds.isEmpty()) {
                return;
            }
            log.info("Found {} payments in REFUND_PENDING during startup reconciliation", pendingRefunds.size());
            for (Payment payment : pendingRefunds) {
                if (payment.getRazorpayPaymentId() != null && razorpayClient != null) {
                    try {
                        com.razorpay.Payment rzpPayment = razorpayClient.payments.fetch(payment.getRazorpayPaymentId());
                        String rzpStatus = rzpPayment.get("status");
                        log.info("Reconciling payment {}: Razorpay status is {}", payment.getId(), rzpStatus);
                        if ("refunded".equalsIgnoreCase(rzpStatus)) {
                            payment.setStatus(PaymentStatus.REFUNDED);
                            payment.setRefundStatus("REFUNDED");
                            paymentRepository.save(payment);
                            publishRefundedEvent(payment, payment.getRazorpayRefundId() != null ? payment.getRazorpayRefundId() : "reconciled", payment.getFailureReason());
                        } else if ("captured".equalsIgnoreCase(rzpStatus)) {
                            // Retry refund
                            initiateRefund(payment.getId(), "Auto-reconciliation after restart", payment.getAmount());
                        }
                    } catch (Exception ex) {
                        log.warn("Could not reconcile REFUND_PENDING payment {}: {}", payment.getId(), ex.getMessage());
                    }
                }
            }
        } catch (Exception ex) {
            log.warn("Error during refund reconciliation: {}", ex.getMessage());
        }
    }

    /**
     * Create Razorpay payment order
     */
    public PaymentOrderResponse createPaymentOrder(CreatePaymentRequest request) {
        if (request == null || request.getAmount() == null
                || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        if (request.getAmount().stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException("Amount cannot have more than 2 decimal places");
        }

        log.info("Creating payment order for account: {} amount: {}",
                maskAccount(request.getAccountNumber()), request.getAmount());

        try {
            long convertedAmount = request.getAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .longValueExact();

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", convertedAmount);
            orderRequest.put("currency", CURRENCY);
            orderRequest.put("receipt", "rcpt_" + UUID.randomUUID().toString()
                    .replace("-", "").substring(0, 20));

            Order razorpayOrder = razorpayClient.orders.create(orderRequest);
            String razorpayOrderId = razorpayOrder.get("id").toString();
            log.info("Razorpay order created: {}", razorpayOrderId);

            // Save payment record
            Payment payment = new Payment();
            payment.setRazorpayOrderId(razorpayOrderId);
            payment.setAccountNumber(request.getAccountNumber());
            payment.setAmount(request.getAmount());
            payment.setCurrency(CURRENCY);
            payment.setStatus(PaymentStatus.CREATED);
            payment.setRefundStatus("NONE");
            payment.setDescription(request.getDescription());

            Payment savedPayment = paymentRepository.save(payment);

            return new PaymentOrderResponse(
                    savedPayment.getId(),
                    razorpayOrderId,
                    request.getAmount(),
                    CURRENCY,
                    "CREATED",
                    keyId
            );

        } catch (Exception e) {
            log.error("Error creating Razorpay payment order", e);
            throw new RuntimeException("Failed to create payment order: " + e.getMessage(), e);
        }
    }

    /**
     * Verify payment signature from Razorpay Checkout and initiate 2FA OTP verification
     */
    @Transactional
    public PaymentResponse verifyPaymentSignature(VerifyPaymentSignatureRequest request) {
        if (request == null || request.getPaymentId() == null || request.getRazorpayOrderId() == null
                || request.getRazorpayPaymentId() == null || request.getRazorpaySignature() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required verification parameters");
        }

        log.info("Verifying checkout signature for payment: {} order: {}",
                request.getPaymentId(), request.getRazorpayOrderId());

        Payment payment = paymentRepository.findById(request.getPaymentId())
                .or(() -> paymentRepository.findByRazorpayOrderId(request.getRazorpayOrderId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));

        // Verify Razorpay signature
        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", request.getRazorpayOrderId());
            attributes.put("razorpay_payment_id", request.getRazorpayPaymentId());
            attributes.put("razorpay_signature", request.getRazorpaySignature());

            boolean isValid = Utils.verifyPaymentSignature(attributes, keySecret);
            if (!isValid) {
                log.error("Invalid payment signature for payment: {}", payment.getId());
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid payment signature");
            }
        } catch (RazorpayException e) {
            log.error("Error verifying payment signature", e);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Signature verification failed: " + e.getMessage());
        }

        // Set payment as CAPTURED/AUTHORIZED
        payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
        payment.setStatus(PaymentStatus.CAPTURED);
        payment.setRefundStatus("NONE");
        payment.setFailureReason(null);
        paymentRepository.save(payment);

        // Generate 6-digit OTP in Redis for payment verification
        int otpNum = 100000 + secureRandom.nextInt(900000);
        String otp = String.valueOf(otpNum);
        String otpKey = "payment:otp:" + payment.getId();
        redisTemplate.opsForValue().set(otpKey, otp, OTP_EXPIRY_MINUTES, TimeUnit.MINUTES);

        // Mark status as PENDING_VERIFICATION
        payment.setStatus(PaymentStatus.PENDING_VERIFICATION);
        Payment savedPayment = paymentRepository.save(payment);

        log.info("Payment {} signature verified and captured. OTP generated with {}m TTL.",
                payment.getId(), OTP_EXPIRY_MINUTES);

        // Publish OTP notification event
        Map<String, Object> otpEvent = new HashMap<>();
        otpEvent.put("transactionId", savedPayment.getId());
        otpEvent.put("paymentId", savedPayment.getId());
        otpEvent.put("accountNumber", savedPayment.getAccountNumber());
        otpEvent.put("notificationType", "OTP");
        otpEvent.put("message", "Your payment verification OTP is " + otp);
        otpEvent.put("expiresInMinutes", OTP_EXPIRY_MINUTES);
        otpEvent.put("otp", otp);
        otpEvent.put("amount", savedPayment.getAmount());
        otpEvent.put("reason", "Gateway payment 2FA verification");

        kafkaTemplate.send(TRANSACTION_OTP_GENERATE_TOPIC, savedPayment.getId(), otpEvent);

        return mapToResponse(savedPayment);
    }

    /**
     * Verify OTP for payment
     */
    @Transactional
    public PaymentResponse verifyOTP(String paymentId, String otp) {
        log.info("Verifying OTP for payment: {}", paymentId);

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found: " + paymentId));

        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            log.info("Payment {} already COMPLETED", paymentId);
            return mapToResponse(payment);
        }

        if (payment.getStatus() != PaymentStatus.PENDING_VERIFICATION && payment.getStatus() != PaymentStatus.CAPTURED) {
            log.warn("Payment {} not in PENDING_VERIFICATION (current: {})", paymentId, payment.getStatus());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment is not in verification state");
        }

        // Rate limit verification attempts (max 5 attempts within 5 minutes)
        String attemptsKey = "payment:attempts:" + paymentId;
        Long attempts = redisTemplate.opsForValue().increment(attemptsKey);
        if (attempts != null && attempts == 1) {
            redisTemplate.expire(attemptsKey, OTP_EXPIRY_MINUTES, TimeUnit.MINUTES);
        }
        if (attempts != null && attempts > 5) {
            log.warn("Too many OTP verification attempts for payment: {}", paymentId);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many invalid OTP attempts. Please cancel payment or request a new OTP.");
        }

        String otpKey = "payment:otp:" + paymentId;
        String storedOtp = redisTemplate.opsForValue().get(otpKey);

        if (storedOtp == null) {
            log.warn("OTP expired for payment: {}", paymentId);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP expired. Please request a new OTP or cancel payment.");
        }

        if (otp == null || !storedOtp.equals(otp.trim())) {
            log.warn("Incorrect OTP entered for payment: {}", paymentId);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Incorrect OTP. Please try again.");
        }

        // OTP is valid
        redisTemplate.delete(otpKey);
        redisTemplate.delete(attemptsKey);

        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setRefundStatus("NONE");
        payment.setFailureReason(null);
        Payment savedPayment = paymentRepository.save(payment);

        // Publish payment completed event
        Map<String, Object> event = new HashMap<>();
        event.put("paymentId", savedPayment.getId());
        event.put("accountNumber", savedPayment.getAccountNumber());
        event.put("amount", savedPayment.getAmount());
        event.put("razorpayPaymentId", savedPayment.getRazorpayPaymentId());
        event.put("razorpayOrderId", savedPayment.getRazorpayOrderId());

        kafkaTemplate.send(PAYMENT_COMPLETED_TOPIC, savedPayment.getId(), event);
        log.info("Payment completed successfully: {}", savedPayment.getId());

        return mapToResponse(savedPayment);
    }

    /**
     * Resend OTP for payment
     */
    public PaymentResponse resendOTP(String paymentId) {
        log.info("Resend OTP requested for payment: {}", paymentId);

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found: " + paymentId));

        if (payment.getStatus() != PaymentStatus.PENDING_VERIFICATION && payment.getStatus() != PaymentStatus.CAPTURED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment is not in verification state");
        }

        // Rate limit: Max 3 resend attempts within 10 minutes
        String resendKey = "payment:resend_count:" + paymentId;
        Long resendCount = redisTemplate.opsForValue().increment(resendKey);
        if (resendCount != null && resendCount == 1) {
            redisTemplate.expire(resendKey, 10, TimeUnit.MINUTES);
        }
        if (resendCount != null && resendCount > 3) {
            log.warn("Resend limit reached for payment: {}", paymentId);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Maximum resend attempts reached. Please wait 10 minutes.");
        }

        // Invalidate old OTP & attempts
        redisTemplate.delete("payment:otp:" + paymentId);
        redisTemplate.delete("payment:attempts:" + paymentId);

        // Generate new OTP
        int otpNum = 100000 + secureRandom.nextInt(900000);
        String otp = String.valueOf(otpNum);
        String otpKey = "payment:otp:" + paymentId;
        redisTemplate.opsForValue().set(otpKey, otp, OTP_EXPIRY_MINUTES, TimeUnit.MINUTES);

        // Publish event
        Map<String, Object> otpEvent = new HashMap<>();
        otpEvent.put("transactionId", payment.getId());
        otpEvent.put("paymentId", payment.getId());
        otpEvent.put("accountNumber", payment.getAccountNumber());
        otpEvent.put("notificationType", "OTP");
        otpEvent.put("message", "Your payment verification OTP is " + otp);
        otpEvent.put("expiresInMinutes", OTP_EXPIRY_MINUTES);
        otpEvent.put("otp", otp);
        otpEvent.put("amount", payment.getAmount());
        otpEvent.put("reason", "Resend OTP requested");

        kafkaTemplate.send(TRANSACTION_OTP_GENERATE_TOPIC, payment.getId(), otpEvent);
        log.info("New OTP generated and published for payment: {} (resend attempt {}/3)", paymentId, resendCount);

        return mapToResponse(payment);
    }

    /**
     * Cancel payment and initiate Razorpay refund if payment was already captured
     */
    @Transactional
    public PaymentResponse cancelPayment(String paymentId, String reason) {
        log.info("Cancelling payment: {} reason: {}", paymentId, reason);

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found: " + paymentId));

        if (payment.getStatus() == PaymentStatus.REFUNDED) {
            log.info("Payment {} is already REFUNDED", paymentId);
            return mapToResponse(payment);
        }

        // Invalidate OTP in Redis
        redisTemplate.delete("payment:otp:" + paymentId);
        redisTemplate.delete("payment:attempts:" + paymentId);

        String effectiveReason = reason != null && !reason.isBlank()
                ? reason
                : "OTP verification was not completed.";

        // If payment was captured on Razorpay, initiate refund!
        if (payment.getRazorpayPaymentId() != null && !payment.getRazorpayPaymentId().isBlank()) {
            log.info("Payment {} has captured payment ID: {}. Initiating refund...",
                    paymentId, payment.getRazorpayPaymentId());
            return initiateRefund(paymentId, effectiveReason, payment.getAmount());
        } else {
            // Payment was never captured
            log.info("Payment {} was not captured. Marking FAILED without refund.", paymentId);
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(effectiveReason);
            payment.setRefundStatus("NOT_APPLICABLE");
            Payment saved = paymentRepository.save(payment);
            return mapToResponse(saved);
        }
    }

    /**
     * Idempotent Razorpay Refund implementation
     */
    @Transactional
    public PaymentResponse initiateRefund(String paymentId, String reason, BigDecimal amount) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found: " + paymentId));

        String effectiveReason = reason != null && !reason.isBlank()
                ? reason
                : "OTP verification was not completed.";

        // 1. Idempotency Check: Already refunded
        if (payment.getStatus() == PaymentStatus.REFUNDED
                || "REFUNDED".equalsIgnoreCase(payment.getRefundStatus())
                || (payment.getRazorpayRefundId() != null && !payment.getRazorpayRefundId().isBlank())) {
            log.info("IDEMPOTENT REFUND: Payment {} already refunded with refund ID: {}. Skipping.",
                    payment.getId(), payment.getRazorpayRefundId());
            publishRefundedEvent(payment, payment.getRazorpayRefundId(), effectiveReason);
            return mapToResponse(payment);
        }

        // 2. Check if payment was ever captured
        if (payment.getRazorpayPaymentId() == null || payment.getRazorpayPaymentId().isBlank()) {
            log.warn("Payment {} cannot be refunded because Razorpay payment ID is missing", payment.getId());
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason("Payment was not captured on gateway");
            payment.setRefundStatus("NOT_APPLICABLE");
            Payment saved = paymentRepository.save(payment);
            return mapToResponse(saved);
        }

        // 3. Mark REFUND_PENDING
        payment.setStatus(PaymentStatus.REFUND_PENDING);
        payment.setRefundStatus("REFUND_PENDING");
        payment.setFailureReason(effectiveReason);
        paymentRepository.save(payment);

        // 4. Call Razorpay Refund API
        try {
            JSONObject refundRequest = new JSONObject();
            BigDecimal refundAmount = (amount != null && amount.compareTo(BigDecimal.ZERO) > 0)
                    ? amount
                    : payment.getAmount();

            if (refundAmount != null && refundAmount.compareTo(BigDecimal.ZERO) > 0) {
                long paise = refundAmount.multiply(BigDecimal.valueOf(100)).longValueExact();
                refundRequest.put("amount", paise);
            }

            JSONObject notes = new JSONObject();
            notes.put("paymentId", payment.getId());
            notes.put("reason", effectiveReason);
            refundRequest.put("notes", notes);
            refundRequest.put("speed", "normal");

            log.info("Calling Razorpay Refund API for payment: {} (Razorpay ID: {})",
                    payment.getId(), payment.getRazorpayPaymentId());

            com.razorpay.Refund rzpRefund = razorpayClient.payments.refund(
                    payment.getRazorpayPaymentId(),
                    refundRequest
            );

            String refundId = rzpRefund.get("id").toString();
            log.info("Razorpay Refund SUCCESS - Payment: {} Refund ID: {}", payment.getId(), refundId);

            payment.setStatus(PaymentStatus.REFUNDED);
            payment.setRefundStatus("REFUNDED");
            payment.setRazorpayRefundId(refundId);
            payment.setFailureReason(effectiveReason);
            Payment savedPayment = paymentRepository.save(payment);

            // Publish payment.refunded event to Kafka
            publishRefundedEvent(savedPayment, refundId, effectiveReason);

            return mapToResponse(savedPayment);

        } catch (RazorpayException e) {
            log.error("Razorpay API error during refund for payment {}: {}", payment.getId(), e.getMessage());

            // Handle case where Razorpay says payment is already refunded
            if (e.getMessage() != null && e.getMessage().toLowerCase().contains("already been refunded")) {
                payment.setStatus(PaymentStatus.REFUNDED);
                payment.setRefundStatus("REFUNDED");
                payment.setFailureReason(effectiveReason);
                Payment saved = paymentRepository.save(payment);
                publishRefundedEvent(saved, payment.getRazorpayRefundId() != null ? payment.getRazorpayRefundId() : "existing_refund", effectiveReason);
                return mapToResponse(saved);
            }

            payment.setStatus(PaymentStatus.REFUND_FAILED);
            payment.setRefundStatus("REFUND_FAILED");
            payment.setFailureReason("Razorpay refund error: " + e.getMessage());
            Payment savedPayment = paymentRepository.save(payment);

            publishRefundFailedEvent(savedPayment, effectiveReason, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Razorpay refund failed: " + e.getMessage(), e);

        } catch (Exception e) {
            log.error("Unexpected error during refund for payment {}", payment.getId(), e);
            payment.setStatus(PaymentStatus.REFUND_FAILED);
            payment.setRefundStatus("REFUND_FAILED");
            payment.setFailureReason("Refund failed: " + e.getMessage());
            Payment savedPayment = paymentRepository.save(payment);

            publishRefundFailedEvent(savedPayment, effectiveReason, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Refund failed: " + e.getMessage(), e);
        }
    }

    public PaymentResponse getPayment(String paymentId) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found: " + paymentId));
        return mapToResponse(payment);
    }

    public PaymentResponse getPaymentByOrderId(String orderId) {
        Payment payment = paymentRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found for order: " + orderId));
        return mapToResponse(payment);
    }

    public List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<PaymentResponse> getPaymentsForAccount(String accountNumber) {
        return paymentRepository.findByAccountNumberOrderByCreatedAtDesc(accountNumber)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Webhook handling
     */
    @Transactional
    public void handleWebhook(String rawBody, String signature) {
        verifySignature(rawBody, signature);

        JSONObject payload = new JSONObject(rawBody);
        String event = payload.optString("event");
        log.info("Received Razorpay webhook: {}", event);

        if ("payment.captured".equals(event)) {
            handlePaymentSuccess(payload);
        } else if ("payment.failed".equals(event)) {
            handlePaymentFailure(payload);
        } else if ("refund.processed".equals(event) || "refund.created".equals(event)) {
            handleRefundWebhook(payload);
        } else {
            log.debug("Ignoring unhandled Razorpay event: {}", event);
        }
    }

    private void handleRefundWebhook(JSONObject payload) {
        try {
            JSONObject refundEntity = payload.getJSONObject("payload").getJSONObject("refund").getJSONObject("entity");
            String paymentId = refundEntity.getString("payment_id");
            String refundId = refundEntity.getString("id");

            paymentRepository.findByRazorpayPaymentId(paymentId).ifPresent(payment -> {
                payment.setStatus(PaymentStatus.REFUNDED);
                payment.setRefundStatus("REFUNDED");
                payment.setRazorpayRefundId(refundId);
                paymentRepository.save(payment);
                log.info("Webhook updated payment {} to REFUNDED with refund ID: {}", payment.getId(), refundId);
            });
        } catch (Exception e) {
            log.error("Error processing refund webhook: {}", e.getMessage());
        }
    }

    private void verifySignature(String rawBody, String signature) {
        if (rawBody == null || signature == null || signature.isBlank()) {
            throw new SecurityException("Missing webhook body or signature");
        }
        try {
            if (!Utils.verifyWebhookSignature(rawBody, signature, webhookSecret)) {
                throw new SecurityException("Invalid Razorpay webhook signature");
            }
        } catch (RazorpayException e) {
            throw new SecurityException("Unable to verify Razorpay webhook signature", e);
        }
    }

    private void handlePaymentSuccess(JSONObject payload) {
        JSONObject paymentData = extractPaymentData(payload);
        String orderId = paymentData.getString("order_id");
        String paymentId = paymentData.getString("id");

        Payment payment = paymentRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new IllegalStateException("Payment not found for order: " + orderId));

        if (payment.getStatus() == PaymentStatus.COMPLETED || payment.getStatus() == PaymentStatus.REFUNDED) {
            log.info("Payment already in final status {}, skipping webhook: {}", payment.getStatus(), payment.getId());
            return;
        }

        payment.setRazorpayPaymentId(paymentId);
        if (payment.getStatus() != PaymentStatus.PENDING_VERIFICATION) {
            payment.setStatus(PaymentStatus.CAPTURED);
        }
        paymentRepository.save(payment);
        log.info("Payment captured via webhook: {}", payment.getId());
    }

    private void handlePaymentFailure(JSONObject payload) {
        JSONObject paymentData = extractPaymentData(payload);
        String orderId = paymentData.getString("order_id");
        String paymentId = paymentData.optString("id", null);

        Payment payment = paymentRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new IllegalStateException("Payment not found for order: " + orderId));

        if (payment.getStatus() != PaymentStatus.CREATED) {
            log.info("Ignoring payment.failed for payment {} in status {}", payment.getId(), payment.getStatus());
            return;
        }

        payment.setRazorpayPaymentId(paymentId);
        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason("Payment failed via Razorpay");
        paymentRepository.save(payment);

        Map<String, Object> event = new HashMap<>();
        event.put("paymentId", payment.getId());
        event.put("accountNumber", payment.getAccountNumber());
        event.put("amount", payment.getAmount());
        event.put("reason", "Payment failed via razorpay");

        kafkaTemplate.send(PAYMENT_FAILED_TOPIC, payment.getId(), event);
        log.warn("Payment failed: {}", payment.getId());
    }

    private void publishRefundedEvent(Payment payment, String refundId, String reason) {
        PaymentRefundEvent event = PaymentRefundEvent.builder()
                .transactionId(payment.getTransactionId() != null ? payment.getTransactionId() : payment.getId())
                .paymentId(payment.getId())
                .razorpayPaymentId(payment.getRazorpayPaymentId())
                .razorpayOrderId(payment.getRazorpayOrderId())
                .razorpayRefundId(refundId)
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .accountNumber(payment.getAccountNumber())
                .reason(reason)
                .status("REFUNDED")
                .timestamp(LocalDateTime.now().toString())
                .build();

        kafkaTemplate.send(PAYMENT_REFUNDED_TOPIC, payment.getId(), event);
        log.info("Published {} event for payment: {} (Refund ID: {})",
                PAYMENT_REFUNDED_TOPIC, payment.getId(), refundId);
    }

    private void publishRefundFailedEvent(Payment payment, String reason, String errorDetails) {
        PaymentRefundEvent event = PaymentRefundEvent.builder()
                .transactionId(payment.getTransactionId() != null ? payment.getTransactionId() : payment.getId())
                .paymentId(payment.getId())
                .razorpayPaymentId(payment.getRazorpayPaymentId())
                .razorpayOrderId(payment.getRazorpayOrderId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .accountNumber(payment.getAccountNumber())
                .reason(reason != null ? reason : errorDetails)
                .status("REFUND_FAILED")
                .timestamp(LocalDateTime.now().toString())
                .build();

        kafkaTemplate.send(PAYMENT_REFUND_FAILED_TOPIC, payment.getId(), event);
        log.warn("Published {} event for payment: {}", PAYMENT_REFUND_FAILED_TOPIC, payment.getId());
    }

    private JSONObject extractPaymentData(JSONObject payload) {
        return payload.getJSONObject("payload")
                .getJSONObject("payment")
                .getJSONObject("entity");
    }

    private String maskAccount(String accountNumber) {
        if (accountNumber == null || accountNumber.length() <= 4) {
            return "****";
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }

    private PaymentResponse mapToResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .accountNumber(payment.getAccountNumber())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .razorpayOrderId(payment.getRazorpayOrderId())
                .razorpayPaymentId(payment.getRazorpayPaymentId())
                .status(payment.getStatus())
                .refundStatus(payment.getRefundStatus())
                .razorpayRefundId(payment.getRazorpayRefundId())
                .failureReason(payment.getFailureReason())
                .description(payment.getDescription())
                .transactionId(payment.getTransactionId())
                .createdAt(payment.getCreatedAt())
                .updatedAt(payment.getUpdatedAt())
                .build();
    }
}