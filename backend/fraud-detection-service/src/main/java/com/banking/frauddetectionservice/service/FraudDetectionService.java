package com.banking.frauddetectionservice.service;

import com.banking.frauddetectionservice.client.AccountServiceClient;
import com.banking.frauddetectionservice.model.FraudCheckResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedDeque;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class FraudDetectionService {

    private final AccountServiceClient accountServiceClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final RedisTemplate<String, String> redisTemplate;

    @Value("${fraud.max-transaction-per-minute:5}")
    private int maxTransactionPerMinute;

    @Value("${fraud.suspicious-amount-multiplier:5}")
    private double suspiciousAmountMultiplier;

    @Value("${fraud.max-balance-percentage:0.90}")
    private double maxBalancePercentage;

    private static final String VERIFICATION_REQUIRED_TOPIC = "verification.required";
    private static final String FRAUD_CHECK_CLEAN_RESULT_TOPIC = "fraud.check.clean";
    private static final int MAX_HISTORY_SIZE = 50;

    private final Deque<Map<String, Object>> recentFraudEvents = new ConcurrentLinkedDeque<>();

    public void checkTransaction(Map<String, Object> payload) {
        if (payload == null) {
            log.warn("[FRAUD] Received null payload, skipping");
            return;
        }

        String transactionId = (String) payload.get("transactionId");
        String accountNumber = (String) payload.get("senderAccountNumber");
        BigDecimal amount = BigDecimal.ZERO;
        if (payload.get("amount") != null) {
            try {
                amount = new BigDecimal(payload.get("amount").toString());
            } catch (Exception e) {
                log.error("[FRAUD] Invalid amount format in payload: {}", payload.get("amount"));
            }
        }

        log.info("[FRAUD] Checking transaction={}", transactionId);
        log.info("[FRAUD] Account={}", accountNumber);
        log.info("[FRAUD] Amount={}", amount);

        // Fetch real balance from Account Service with safe fallback
        BigDecimal senderBalance = BigDecimal.ZERO;
        try {
            if (accountNumber != null && !accountNumber.isBlank()) {
                BigDecimal bal = accountServiceClient.getBalance(accountNumber);
                if (bal != null) {
                    senderBalance = bal;
                }
            }
        } catch (Exception e) {
            log.warn("[FRAUD] Could not fetch real-time balance for account {}: {}", accountNumber, e.getMessage());
        }

        log.info("[FRAUD] Balance={}", senderBalance);

        // Perform rule evaluation
        FraudCheckResult result = performFraudCheck(accountNumber, amount, senderBalance, transactionId);

        log.info("[FRAUD] Result={}", result.isFraud() ? "FLAGGED - " + result.getReason() : "CLEAN");

        // Record event for telemetry
        recordFraudEvent(transactionId, accountNumber, amount, result);

        if (result.isFraud()) {
            log.info("[FRAUD] Suspicious activity detected - account: {} reason: {} - publishing verification.required",
                    accountNumber, result.getReason());

            Map<String, Object> verificationEvent = new HashMap<>();
            verificationEvent.put("transactionId", transactionId);
            verificationEvent.put("accountNumber", accountNumber);
            verificationEvent.put("amount", amount);
            verificationEvent.put("reason", result.getReason());

            kafkaTemplate.send(VERIFICATION_REQUIRED_TOPIC, transactionId, verificationEvent);
        } else {
            log.info("[FRAUD] Transaction {} is clean - publishing fraud.check.clean", transactionId);

            Map<String, Object> transactionCleanEvent = new HashMap<>();
            transactionCleanEvent.put("transactionId", transactionId);
            transactionCleanEvent.put("isFailed", false);
            transactionCleanEvent.put("reason", null);

            kafkaTemplate.send(FRAUD_CHECK_CLEAN_RESULT_TOPIC, transactionId, transactionCleanEvent);
        }
    }

    private FraudCheckResult performFraudCheck(
            String accountNumber,
            BigDecimal amount,
            BigDecimal senderBalance,
            String transactionId) {

        if (accountNumber == null || accountNumber.isBlank()) {
            return new FraudCheckResult(false, null);
        }

        // Pattern 1: Velocity Check
        Long velocityCount = getVelocityCount(accountNumber);
        log.info("[FRAUD] Velocity={}/{}", velocityCount, maxTransactionPerMinute);

        if (velocityCount != null && velocityCount > maxTransactionPerMinute) {
            return new FraudCheckResult(
                    true, "Too many transactions in 60 seconds (Count: " + velocityCount +
                    ", Max: " + maxTransactionPerMinute + ") - Velocity limit exceeded");
        }

        // Pattern 2: Amount Spike Anomaly Check
        if (isAmountSuspicious(accountNumber, amount)) {
            return new FraudCheckResult(
                    true, "Unusual transaction amount (" + amount +
                    ") - exceeds " + suspiciousAmountMultiplier + "x customer historical average");
        }

        // Pattern 3: High Balance Drainage Check (exceeds configured % of balance)
        if (senderBalance != null && senderBalance.compareTo(BigDecimal.ZERO) > 0
                && isBalanceCheckFailed(senderBalance, amount)) {
            int pct = (int) (maxBalancePercentage * 100);
            return new FraudCheckResult(
                    true, "Transaction exceeds " + pct + "% of available account balance");
        }

        // Pattern 4: Extreme High Value Threshold (> 500,000)
        if (amount != null && amount.compareTo(new BigDecimal("500000")) > 0) {
            return new FraudCheckResult(
                    true, "High-value transfer exceeding ₹500,000 limit requires step-up OTP verification");
        }

        return new FraudCheckResult(false, null);
    }

    private Long getVelocityCount(String accountNumber) {
        try {
            String key = "fraud:velocity" + accountNumber;
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, 60, TimeUnit.SECONDS);
            }
            return count;
        } catch (Exception e) {
            log.warn("[FRAUD] Redis velocity counter error: {}", e.getMessage());
            return 1L;
        }
    }

    private boolean isAmountSuspicious(String accountNumber, BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }
        try {
            String avgKey = "fraud:avg_amount" + accountNumber;
            String avgStr = redisTemplate.opsForValue().get(avgKey);

            if (avgStr == null) {
                redisTemplate.opsForValue().set(avgKey, amount.toString());
                return false;
            }

            BigDecimal avgAmount = new BigDecimal(avgStr);
            BigDecimal threshold = avgAmount.multiply(BigDecimal.valueOf(suspiciousAmountMultiplier));

            BigDecimal newAvg = avgAmount.add(amount).divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
            redisTemplate.opsForValue().set(avgKey, newAvg.toString());

            return amount.compareTo(threshold) > 0;
        } catch (Exception e) {
            log.warn("[FRAUD] Redis amount check error: {}", e.getMessage());
            return false;
        }
    }

    private boolean isBalanceCheckFailed(BigDecimal senderBalance, BigDecimal amount) {
        if (senderBalance == null || amount == null) {
            return false;
        }
        BigDecimal maxAllowed = senderBalance.multiply(BigDecimal.valueOf(maxBalancePercentage));
        return amount.compareTo(maxAllowed) > 0;
    }

    private void recordFraudEvent(String transactionId, String accountNumber, BigDecimal amount, FraudCheckResult result) {
        Map<String, Object> event = new HashMap<>();
        event.put("id", UUID.randomUUID().toString());
        event.put("transactionId", transactionId != null ? transactionId : "N/A");
        event.put("accountNumber", accountNumber != null ? accountNumber : "N/A");
        event.put("amount", amount != null ? amount : BigDecimal.ZERO);
        event.put("isFraud", result.isFraud());
        event.put("status", result.isFraud() ? "FLAGGED" : "CLEAN");
        event.put("reason", result.getReason() != null ? result.getReason() : "Normal transaction profile");
        event.put("triggeredRule", result.isFraud() ? extractRuleName(result.getReason()) : "None");
        event.put("timestamp", LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));

        while (recentFraudEvents.size() >= MAX_HISTORY_SIZE) {
            recentFraudEvents.pollLast();
        }
        recentFraudEvents.addFirst(event);
    }

    private String extractRuleName(String reason) {
        if (reason == null) return "None";
        if (reason.contains("Velocity")) return "Velocity Limit Rule";
        if (reason.contains("historical average")) return "Spike Multiplier Rule";
        if (reason.contains("balance")) return "Balance Depletion Rule";
        if (reason.contains("₹500,000")) return "Extreme Value Rule";
        return "Anomaly Rule";
    }

    public List<Map<String, Object>> getRecentFraudEvents() {
        return new ArrayList<>(recentFraudEvents);
    }

    public Map<String, Object> getFraudRules() {
        Map<String, Object> rules = new HashMap<>();
        rules.put("maxTransactionPerMinute", maxTransactionPerMinute);
        rules.put("suspiciousAmountMultiplier", suspiciousAmountMultiplier);
        rules.put("maxBalancePercentage", maxBalancePercentage);
        rules.put("rules", List.of(
                Map.of(
                        "key", "velocity",
                        "name", "Velocity Limit Rule",
                        "description", "Flags account if transfers exceed " + maxTransactionPerMinute + " within 60 seconds",
                        "value", maxTransactionPerMinute,
                        "unit", "tx / 60s"
                ),
                Map.of(
                        "key", "multiplier",
                        "name", "Sudden Spike Amount Multiplier",
                        "description", "Flags transfer if amount exceeds " + suspiciousAmountMultiplier + "x rolling average",
                        "value", suspiciousAmountMultiplier,
                        "unit", "x average"
                ),
                Map.of(
                        "key", "balance",
                        "name", "Balance Drainage Percentage",
                        "description", "Flags transfer if single transaction drains > " + (int)(maxBalancePercentage * 100) + "% of account balance",
                        "value", maxBalancePercentage,
                        "unit", "% balance"
                )
        ));
        rules.put("status", "ACTIVE");
        return rules;
    }

    public synchronized void updateFraudRules(Integer maxTxPerMin, Double amountMultiplier, Double maxBalPct) {
        if (maxTxPerMin != null && maxTxPerMin > 0) {
            this.maxTransactionPerMinute = maxTxPerMin;
            log.info("[FRAUD] Updated maxTransactionPerMinute to {}", maxTxPerMin);
        }
        if (amountMultiplier != null && amountMultiplier > 0) {
            this.suspiciousAmountMultiplier = amountMultiplier;
            log.info("[FRAUD] Updated suspiciousAmountMultiplier to {}", amountMultiplier);
        }
        if (maxBalPct != null && maxBalPct > 0 && maxBalPct <= 1.0) {
            this.maxBalancePercentage = maxBalPct;
            log.info("[FRAUD] Updated maxBalancePercentage to {}", maxBalPct);
        }
    }
}
