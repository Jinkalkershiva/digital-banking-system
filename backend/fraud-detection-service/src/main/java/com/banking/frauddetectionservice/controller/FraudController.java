package com.banking.frauddetectionservice.controller;

import com.banking.frauddetectionservice.service.FraudDetectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/fraud")
@Slf4j
@RequiredArgsConstructor
public class FraudController {

    private final FraudDetectionService fraudDetectionService;

    @GetMapping("/rules")
    public ResponseEntity<Map<String, Object>> getFraudRules() {
        return ResponseEntity.ok(fraudDetectionService.getFraudRules());
    }

    @PutMapping("/rules")
    public ResponseEntity<Map<String, Object>> updateFraudRules(@RequestBody Map<String, Object> request) {
        log.info("[FRAUD] Admin updating fraud detection rules: {}", request);

        Integer maxTx = null;
        if (request.containsKey("maxTransactionPerMinute") && request.get("maxTransactionPerMinute") != null) {
            try {
                maxTx = Integer.parseInt(request.get("maxTransactionPerMinute").toString());
            } catch (Exception ignored) {}
        }

        Double multiplier = null;
        if (request.containsKey("suspiciousAmountMultiplier") && request.get("suspiciousAmountMultiplier") != null) {
            try {
                multiplier = Double.parseDouble(request.get("suspiciousAmountMultiplier").toString());
            } catch (Exception ignored) {}
        }

        Double maxBalPct = null;
        if (request.containsKey("maxBalancePercentage") && request.get("maxBalancePercentage") != null) {
            try {
                maxBalPct = Double.parseDouble(request.get("maxBalancePercentage").toString());
            } catch (Exception ignored) {}
        }

        fraudDetectionService.updateFraudRules(maxTx, multiplier, maxBalPct);
        return ResponseEntity.ok(fraudDetectionService.getFraudRules());
    }

    @GetMapping("/events")
    public ResponseEntity<List<Map<String, Object>>> getRecentFraudEvents() {
        return ResponseEntity.ok(fraudDetectionService.getRecentFraudEvents());
    }
}
