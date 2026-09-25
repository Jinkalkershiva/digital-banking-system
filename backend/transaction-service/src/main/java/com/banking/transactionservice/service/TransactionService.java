package com.banking.transactionservice.service;

import com.banking.transactionservice.client.AccountServiceClient;
import com.banking.transactionservice.dto.AccountResponse;
import com.banking.transactionservice.dto.TransactionResponse;
import com.banking.transactionservice.dto.TransferRequest;
import com.banking.transactionservice.entity.Transaction;
import com.banking.transactionservice.entity.TransactionStatus;
import com.banking.transactionservice.entity.TransactionType;
import com.banking.transactionservice.event.TransactionCompletedEvent;
import com.banking.transactionservice.event.TransactionInitiatedEvent;
import com.banking.transactionservice.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

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
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountServiceClient accountServiceClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RedisTemplate<String, String> redisTemplate;

    private static final String TRANSACTION_INITIATED_TOPIC = "transaction.initiated";
    private static final String TRANSACTION_COMPLETED_TOPIC = "transaction.completed";
    private static final String TRANSACTION_REFUNDED_TOPIC = "transaction.refunded";
    private static final String FRAUD_DETECTED_TOPIC = "fraud.detected";
    private static final String TRANSACTION_OTP_GENERATE_TOPIC = "transaction.otp.generated";
    private static final long OTP_EXPIRY_MINUTES = 5;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * SAGA STEP-1: Initiated transfer
     * Deduct from sender via Feign client
     * Saves transaction as PROCESSING.
     * Publish event to Kafka for fraud check
     * Returns.
     *
     * @param request TransferRequest
     * @return TransactionResponse
     */
    public TransactionResponse transfer(TransferRequest request) {
        log.info("SAGA START - Transfer: {} -> {} amount: {}",
                request.getSenderAccountNumber(),
                request.getReceiverAccountNumber(),
                request.getAmount());

        // SAGA STEP 1: Deduct from sender
        accountServiceClient.deductBalance(
                request.getSenderAccountNumber(),
                request.getAmount());

        Transaction transaction = new Transaction();
        transaction.setSenderAccountNumber(request.getSenderAccountNumber());
        transaction.setReceiverAccountNumber(request.getReceiverAccountNumber());
        transaction.setAmount(request.getAmount());
        transaction.setType(TransactionType.TRANSFER);
        transaction.setStatus(TransactionStatus.PROCESSING);
        transaction.setDescription(request.getDescription());
        transaction.setReferenceNumber(UUID.randomUUID().toString());

        Transaction savedTransaction = transactionRepository.save(transaction);
        log.info("Transaction saved as PROCESSING: {}", savedTransaction.getId());

        // SAGA STEP 2: Publish fraud check
        TransactionInitiatedEvent event = new TransactionInitiatedEvent(
                savedTransaction.getId(),
                savedTransaction.getSenderAccountNumber(),
                savedTransaction.getReceiverAccountNumber(),
                savedTransaction.getAmount(),
                savedTransaction.getDescription()
        );

        kafkaTemplate.send(TRANSACTION_INITIATED_TOPIC, savedTransaction.getId(), event);
        log.info("SAGA STEP 2 - TransactionInitiatedEvent published: {}", savedTransaction.getId());

        return mapToResponse(savedTransaction);
    }

    public TransactionResponse getTransaction(String transactionId) {
        return mapToResponse(transactionRepository
                .findById(transactionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found: " + transactionId)));
    }

    public List<TransactionResponse> getTransactionHistory(String accountNumber) {
        return transactionRepository
                .findBySenderAccountNumberOrderByCreatedAtDesc(accountNumber)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Verify OTP for a transaction in PENDING_VERIFICATION state.
     * Validates:
     * 1. Transaction exists and is in PENDING_VERIFICATION state.
     * 2. OTP verification attempts rate limit.
     * 3. OTP exists in Redis and has not expired.
     * 4. OTP matches.
     *
     * If valid:
     * - deletes OTP from Redis
     * - continues Saga by completing transaction (credits receiver via Kafka event)
     * - marks transaction COMPLETED
     *
     * If invalid / expired:
     * - returns proper error, transaction remains PENDING_VERIFICATION.
     *
     * @param transactionId transaction ID
     * @param otp entered OTP code
     * @return TransactionResponse
     */
    public TransactionResponse verifyOTP(String transactionId, String otp) {
        log.info("OTP verification request for transaction: {}", transactionId);

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found: " + transactionId));

        if (transaction.getStatus() == TransactionStatus.COMPLETED) {
            log.info("Transaction {} already COMPLETED", transactionId);
            return mapToResponse(transaction);
        }

        if (transaction.getStatus() != TransactionStatus.PENDING_VERIFICATION) {
            log.warn("Transaction {} not in PENDING_VERIFICATION state (current: {})", transactionId, transaction.getStatus());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transaction is not in PENDING_VERIFICATION state");
        }

        // Rate limit verification attempts (max 5 attempts within 5 minutes)
        String attemptsKey = "verification:attempts:" + transactionId;
        Long attempts = redisTemplate.opsForValue().increment(attemptsKey);
        if (attempts != null && attempts == 1) {
            redisTemplate.expire(attemptsKey, 5, TimeUnit.MINUTES);
        }
        if (attempts != null && attempts > 5) {
            log.warn("Too many OTP verification attempts for transaction: {}", transactionId);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many invalid OTP attempts. Please request a new OTP.");
        }

        String otpKey = "verification:otp" + transactionId;
        String storedOtp = redisTemplate.opsForValue().get(otpKey);

        if (storedOtp == null) {
            log.warn("OTP expired or not found for transaction: {}", transactionId);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP expired. Please request a new OTP.");
        }

        if (otp == null || !storedOtp.equals(otp.trim())) {
            log.warn("Invalid OTP entered for transaction: {}", transactionId);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid OTP");
        }

        // OTP is valid - delete OTP and attempt counter, complete transaction Saga
        log.info("OTP successfully verified for transaction: {}", transactionId);
        redisTemplate.delete(otpKey);
        redisTemplate.delete(attemptsKey);

        completeTransaction(transaction);
        return mapToResponse(transaction);
    }

    /**
     * Resend a new OTP for a transaction in PENDING_VERIFICATION state.
     * Rate-limited to max 3 resends within 10 minutes.
     *
     * @param transactionId transaction ID
     * @return TransactionResponse
     */
    public TransactionResponse resendOTP(String transactionId) {
        log.info("Resend OTP requested for transaction: {}", transactionId);

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found: " + transactionId));

        if (transaction.getStatus() != TransactionStatus.PENDING_VERIFICATION) {
            log.warn("Cannot resend OTP: transaction {} is in state {}", transactionId, transaction.getStatus());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Transaction is not in PENDING_VERIFICATION state");
        }

        // Rate limit: Max 3 resend attempts within 10 minutes
        String resendKey = "verification:resend_count:" + transactionId;
        Long resendCount = redisTemplate.opsForValue().increment(resendKey);
        if (resendCount != null && resendCount == 1) {
            redisTemplate.expire(resendKey, 10, TimeUnit.MINUTES);
        }
        if (resendCount != null && resendCount > 3) {
            log.warn("Resend limit reached for transaction: {} (count: {})", transactionId, resendCount);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Maximum resend attempts reached. Please wait 10 minutes.");
        }

        // Invalidate previous OTP and attempt counter
        String otpKey = "verification:otp" + transactionId;
        redisTemplate.delete(otpKey);
        redisTemplate.delete("verification:attempts:" + transactionId);

        // Generate new secure 6-digit OTP
        int otpNum = 100000 + secureRandom.nextInt(900000);
        String otp = String.valueOf(otpNum);

        // Store new OTP in Redis with 5 min TTL
        redisTemplate.opsForValue().set(otpKey, otp, OTP_EXPIRY_MINUTES, TimeUnit.MINUTES);

        // Fetch customer contact details from Account Service
        String email = null;
        String phone = null;
        try {
            AccountResponse account = accountServiceClient.getAccount(transaction.getSenderAccountNumber());
            if (account != null) {
                email = account.getEmail();
                phone = account.getPhone();
            }
        } catch (Exception ex) {
            log.warn("Could not retrieve customer contact details for resend OTP (account: {}): {}",
                    transaction.getSenderAccountNumber(), ex.getMessage());
        }

        // Publish OTP notification event
        Map<String, Object> otpEvent = new HashMap<>();
        otpEvent.put("transactionId", transactionId);
        otpEvent.put("accountNumber", transaction.getSenderAccountNumber());
        otpEvent.put("email", email);
        otpEvent.put("phoneNumber", phone);
        otpEvent.put("notificationType", "OTP");
        otpEvent.put("message", "Your transaction verification OTP is " + otp);
        otpEvent.put("expiresInMinutes", OTP_EXPIRY_MINUTES);
        otpEvent.put("otp", otp);
        otpEvent.put("amount", transaction.getAmount());
        otpEvent.put("reason", "Resend OTP requested");

        kafkaTemplate.send(TRANSACTION_OTP_GENERATE_TOPIC, transactionId, otpEvent);
        log.info("New OTP generated and published for transaction: {} (resend attempt {}/3)",
                transactionId, resendCount);

        return mapToResponse(transaction);
    }

    public TransactionResponse cancelTransaction(String transactionId, String reason) {
        log.info("Cancelling transaction: {} reason: {}", transactionId, reason);

        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found: " + transactionId));

        if (transaction.getStatus() == TransactionStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot cancel already completed transaction");
        }

        if (transaction.getStatus() == TransactionStatus.FLAGGED || transaction.getStatus() == TransactionStatus.FAILED) {
            log.info("Transaction {} already finalized in status {}", transactionId, transaction.getStatus());
            return mapToResponse(transaction);
        }

        // Invalidate OTP in Redis
        redisTemplate.delete("verification:otp" + transactionId);
        redisTemplate.delete("verification:attempts:" + transactionId);

        String effectiveReason = (reason != null && !reason.isBlank()) ? reason : "OTP verification was not completed.";
        compensateTransaction(transaction, effectiveReason);

        // Publish payment.refund.required in case a gateway order was associated
        Map<String, Object> refundReq = new HashMap<>();
        refundReq.put("transactionId", transaction.getId());
        refundReq.put("accountNumber", transaction.getSenderAccountNumber());
        refundReq.put("amount", transaction.getAmount());
        refundReq.put("currency", "INR");
        refundReq.put("reason", effectiveReason);
        kafkaTemplate.send("payment.refund.required", transaction.getId(), refundReq);

        return mapToResponse(transaction);
    }

    public void compensateTransaction(Transaction transaction, String reason) {
        if (transaction.getStatus() == TransactionStatus.FLAGGED || transaction.getStatus() == TransactionStatus.FAILED) {
            log.warn("Transaction {} is already compensated (status: {}). Skipping duplicate compensation.",
                    transaction.getId(), transaction.getStatus());
            return;
        }

        log.warn("SAGA COMPENSATION - refunding: {} amount: {}",
                transaction.getSenderAccountNumber(),
                transaction.getAmount());

        // CREDIT MONEY BACK TO SENDER SYNCHRONOUSLY
        accountServiceClient.creditBalance(
                transaction.getSenderAccountNumber(),
                transaction.getAmount());
        transaction.setStatus(TransactionStatus.FLAGGED);
        transaction.setFailureReason(reason + " - SAGA Compensation executed, amount refunded at " + LocalDateTime.now());

        transactionRepository.save(transaction);

        // PUBLISH refund event - Notification service will alert user
        Map<String, Object> refundEvent = new HashMap<>();
        refundEvent.put("transactionId", transaction.getId());
        refundEvent.put("senderAccountNumber", transaction.getSenderAccountNumber());
        refundEvent.put("amount", transaction.getAmount());
        refundEvent.put("reason", reason);

        kafkaTemplate.send(TRANSACTION_REFUNDED_TOPIC, transaction.getId(), refundEvent);

        log.info("SAGA COMPENSATION COMPLETE - {} refunded to {}",
                transaction.getAmount(), transaction.getSenderAccountNumber());
    }

    private void blockAccountAndCompensate(Transaction transaction, String reason) {
        // Publish fraud.detected -> Account Service will block account
        Map<String, Object> fraudEvent = new HashMap<>();
        fraudEvent.put("transactionId", transaction.getId());
        fraudEvent.put("accountNumber", transaction.getSenderAccountNumber());
        fraudEvent.put("reason", reason);

        kafkaTemplate.send(FRAUD_DETECTED_TOPIC, transaction.getSenderAccountNumber(), fraudEvent);

        log.warn("fraud.detected published - account: {} will be blocked",
                transaction.getSenderAccountNumber());

        // SAGA COMPENSATION - refund Sender
        compensateTransaction(transaction, reason);
    }

    private void completeTransaction(Transaction transaction) {
        transaction.setStatus(TransactionStatus.COMPLETED);
        transaction.setCompletedAt(LocalDateTime.now());
        transactionRepository.save(transaction);

        TransactionCompletedEvent completedEvent = new TransactionCompletedEvent(
                transaction.getId(),
                transaction.getSenderAccountNumber(),
                transaction.getReceiverAccountNumber(),
                transaction.getAmount(),
                transaction.getDescription()
        );

        kafkaTemplate.send(TRANSACTION_COMPLETED_TOPIC, transaction.getId(), completedEvent);

        log.info("SAGA COMPLETED - Transaction {} completed and published to {}",
                transaction.getId(), TRANSACTION_COMPLETED_TOPIC);
    }

    public void processCleanResult(String transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Transaction not found: " + transactionId
                ));

        if (transaction.getStatus() != TransactionStatus.PROCESSING) {
            log.warn("Transaction {} not PROCESSING - skipping", transactionId);
            return;
        }

        completeTransaction(transaction);
    }

    public List<TransactionResponse> getAllTransactions() {
        return transactionRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .toList();
    }

    private TransactionResponse mapToResponse(Transaction transaction) {
        TransactionResponse response = new TransactionResponse();
        response.setId(transaction.getId());
        response.setSenderAccountNumber(transaction.getSenderAccountNumber());
        response.setReceiverAccountNumber(transaction.getReceiverAccountNumber());
        response.setAmount(transaction.getAmount());
        response.setType(transaction.getType());
        response.setStatus(transaction.getStatus());
        response.setDescription(transaction.getDescription());
        response.setReferenceNumber(transaction.getReferenceNumber());
        response.setFailureReason(transaction.getFailureReason());
        response.setCreatedAt(transaction.getCreatedAt());
        response.setCompletedAt(transaction.getCompletedAt());

        return response;
    }
}
