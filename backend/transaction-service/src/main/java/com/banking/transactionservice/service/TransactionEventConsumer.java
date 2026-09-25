package com.banking.transactionservice.service;

import com.banking.transactionservice.client.AccountServiceClient;
import com.banking.transactionservice.dto.AccountResponse;
import com.banking.transactionservice.entity.Transaction;
import com.banking.transactionservice.entity.TransactionStatus;
import com.banking.transactionservice.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class TransactionEventConsumer {

    private final TransactionRepository transactionRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final TransactionService transactionService;
    private final AccountServiceClient accountServiceClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    private static final long OTP_EXPIRY_MINUTES = 5;
    private static final String TRANSACTION_OTP_GENERATE_TOPIC = "transaction.otp.generated";
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Consume verification.required event from Fraud Detection.
     * Generates secure 6-digit OTP, stores in Redis with 5 min TTL,
     * updates transaction status to PENDING_VERIFICATION, and publishes OTP event.
     *
     * @param payload verification event payload
     */
    @KafkaListener(topics = "verification.required")
    public void consumeVerificationRequired(@Payload Map<String, Object> payload) {
        try {
            String transactionId = (String) payload.get("transactionId");
            String accountNumber = (String) payload.get("accountNumber");
            String reason = (String) payload.get("reason");

            log.info("Verification required - transaction: {} reason: {}", transactionId, reason);
            Transaction transaction = transactionRepository.findById(transactionId)
                    .orElseThrow(() -> new RuntimeException("Transaction not found: " + transactionId));

            if (transaction.getStatus() != TransactionStatus.PROCESSING) {
                log.warn("Transaction {} not PROCESSING (current: {}) - skipping", transactionId, transaction.getStatus());
                return;
            }

            // Generate cryptographically secure 6-digit OTP (100000 - 999999)
            int otpNum = 100000 + secureRandom.nextInt(900000);
            String otp = String.valueOf(otpNum);

            // Store OTP in Redis - key convention: verification:otp{transactionId}, expires in 5 minutes
            String otpKey = "verification:otp" + transactionId;
            redisTemplate.opsForValue().set(otpKey, otp, OTP_EXPIRY_MINUTES, TimeUnit.MINUTES);

            // Update Transaction Status to PENDING_VERIFICATION
            transaction.setStatus(TransactionStatus.PENDING_VERIFICATION);
            transactionRepository.save(transaction);

            log.info("Secure OTP generated and stored in Redis for transaction: {} (key: {}, expires in {} min)",
                    transactionId, otpKey, OTP_EXPIRY_MINUTES);

            // Retrieve customer contact details from Account Service
            String email = null;
            String phone = null;
            try {
                AccountResponse account = accountServiceClient.getAccount(accountNumber);
                if (account != null) {
                    email = account.getEmail();
                    phone = account.getPhone();
                }
            } catch (Exception ex) {
                log.warn("Could not retrieve customer contact details from Account Service for account {}: {}",
                        accountNumber, ex.getMessage());
            }

            // Publish OTP notification event for Notification Service
            Map<String, Object> otpEvent = new HashMap<>();
            otpEvent.put("transactionId", transactionId);
            otpEvent.put("accountNumber", accountNumber);
            otpEvent.put("email", email);
            otpEvent.put("phoneNumber", phone);
            otpEvent.put("notificationType", "OTP");
            otpEvent.put("message", "Your transaction verification OTP is " + otp);
            otpEvent.put("expiresInMinutes", OTP_EXPIRY_MINUTES);
            otpEvent.put("otp", otp);
            otpEvent.put("amount", payload.get("amount"));
            otpEvent.put("reason", reason);

            kafkaTemplate.send(TRANSACTION_OTP_GENERATE_TOPIC, transactionId, otpEvent);
            log.info("Published {} event for transaction: {}", TRANSACTION_OTP_GENERATE_TOPIC, transactionId);

        } catch (Exception e) {
            log.error("Error handling verification required event: {}", e.getMessage(), e);
        }
    }

    /**
     * Consume fraud.check.clean event from Fraud Detection.
     * Completes transaction and publishes transaction.completed.
     */
    @KafkaListener(topics = "fraud.check.clean")
    public void consumeFraudCheckCleanResult(@Payload Map<String, Object> payload) {
        try {
            String transactionId = (String) payload.get("transactionId");
            log.info("Received fraud.check.clean for transaction: {}", transactionId);
            transactionService.processCleanResult(transactionId);
        } catch (Exception e) {
            log.error("Error processing fraud check clean result: {}", e.getMessage(), e);
        }
    }

    /**
     * Consume fraud.detected event from Fraud Detection.
     * Triggers SAGA compensation to refund deducted amount back to sender.
     */
    @KafkaListener(topics = "fraud.detected")
    public void consumeFraudDetected(@Payload Map<String, Object> payload) {
        try {
            String transactionId = (String) payload.get("transactionId");
            String reason = (String) payload.get("reason");
            log.warn("Received fraud.detected for transaction: {} (reason: {})", transactionId, reason);

            if (transactionId != null) {
                transactionRepository.findById(transactionId).ifPresent(tx -> {
                    if (tx.getStatus() != TransactionStatus.COMPLETED && tx.getStatus() != TransactionStatus.FLAGGED) {
                        transactionService.compensateTransaction(tx, reason != null ? reason : "Fraud detection rejected transaction");
                    }
                });
            }
        } catch (Exception e) {
            log.error("Error handling fraud.detected in TransactionEventConsumer: {}", e.getMessage(), e);
        }
    }

    /**
     * Consume payment.refunded event.
     */
    @KafkaListener(topics = "payment.refunded")
    public void consumePaymentRefunded(@Payload Map<String, Object> payload) {
        try {
            String transactionId = (String) payload.get("transactionId");
            String refundId = (String) payload.get("razorpayRefundId");
            log.info("Received payment.refunded for transaction: {} (Refund ID: {})", transactionId, refundId);

            if (transactionId != null) {
                transactionRepository.findById(transactionId).ifPresent(tx -> {
                    if (tx.getStatus() != TransactionStatus.COMPLETED) {
                        tx.setStatus(TransactionStatus.FLAGGED);
                        tx.setFailureReason("Gateway payment refunded: " + refundId);
                        transactionRepository.save(tx);
                    }
                });
            }
        } catch (Exception e) {
            log.error("Error handling payment.refunded in TransactionEventConsumer: {}", e.getMessage(), e);
        }
    }

    /**
     * Consume payment.refund.failed event.
     */
    @KafkaListener(topics = "payment.refund.failed")
    public void consumePaymentRefundFailed(@Payload Map<String, Object> payload) {
        try {
            String transactionId = (String) payload.get("transactionId");
            String reason = (String) payload.get("reason");
            log.warn("Received payment.refund.failed for transaction: {} (Reason: {})", transactionId, reason);

            if (transactionId != null) {
                transactionRepository.findById(transactionId).ifPresent(tx -> {
                    if (tx.getStatus() != TransactionStatus.COMPLETED) {
                        tx.setFailureReason("Refund requires attention: " + reason);
                        transactionRepository.save(tx);
                    }
                });
            }
        } catch (Exception e) {
            log.error("Error handling payment.refund.failed in TransactionEventConsumer: {}", e.getMessage(), e);
        }
    }
}
