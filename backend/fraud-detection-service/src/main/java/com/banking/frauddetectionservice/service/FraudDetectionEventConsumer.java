package com.banking.frauddetectionservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FraudDetectionEventConsumer {

    private final FraudDetectionService fraudDetectionService;

    /**
     * Listens to transaction.initiated topic.
     * Evaluates fraud rules and publishes either fraud.check.clean or verification.required.
     *
     * @param payload transaction event payload
     */
    @KafkaListener(topics = "transaction.initiated", groupId = "fraud-service-group")
    public void consumerTransactionInitiated(@Payload Map<String, Object> payload) {
        log.info("[FRAUD] Received transaction.initiated event for fraud check: transactionId={}",
                payload != null ? payload.get("transactionId") : "null");

        try {
            fraudDetectionService.checkTransaction(payload);
        } catch (Exception e) {
            log.error("[FRAUD] Critical error during transaction fraud evaluation for transaction {}: {}",
                    payload != null ? payload.get("transactionId") : "null", e.getMessage(), e);
        }
    }
}
