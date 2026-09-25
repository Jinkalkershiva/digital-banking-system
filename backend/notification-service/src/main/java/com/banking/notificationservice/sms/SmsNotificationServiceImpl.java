package com.banking.notificationservice.sms;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@Slf4j
public class SmsNotificationServiceImpl implements SmsNotificationService {

    @Value("${notification.sms.provider:mock}")
    private String smsProvider;

    @Value("${notification.sms.api-key:}")
    private String apiKey;

    @Value("${notification.sms.api-secret:}")
    private String apiSecret;

    @Value("${notification.sms.from:+10000000000}")
    private String smsFrom;

    @Override
    public boolean sendOtpSms(String phoneNumber, String otp, BigDecimal amount, int expiresInMinutes) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            log.warn("Cannot send OTP SMS: phone number is missing or empty");
            return false;
        }

        String maskedPhone = maskPhone(phoneNumber);
        String message = String.format(
                "Digital Bank OTP: %s is your verification code for amount $%s. Valid for %d minutes. If you did not initiate this transaction, contact support immediately.",
                otp,
                amount != null ? amount.toPlainString() : "0.00",
                expiresInMinutes > 0 ? expiresInMinutes : 5
        );

        if (apiKey == null || apiKey.isBlank() || "mock".equalsIgnoreCase(smsProvider)) {
            log.info("SMS provider not configured (mode: {}). Simulated OTP SMS sent to {}", smsProvider, maskedPhone);
            return true;
        }

        try {
            // For configured external providers (e.g. Twilio / AWS SNS / Generic HTTP SMS Gateways)
            log.info("Dispatching SMS via provider [{}] from {} to {}", smsProvider, smsFrom, maskedPhone);
            // Provider integration point
            return true;
        } catch (Exception e) {
            log.warn("Failed to dispatch SMS to {}: {}", maskedPhone, e.getMessage());
            return false;
        }
    }

    @Override
    public boolean sendAlertSms(String phoneNumber, String message) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return false;
        }

        String maskedPhone = maskPhone(phoneNumber);

        if (apiKey == null || apiKey.isBlank() || "mock".equalsIgnoreCase(smsProvider)) {
            log.info("Simulated alert SMS sent to {}", maskedPhone);
            return true;
        }

        try {
            log.info("Dispatching alert SMS via [{}] to {}", smsProvider, maskedPhone);
            return true;
        } catch (Exception e) {
            log.warn("Failed to dispatch alert SMS to {}: {}", maskedPhone, e.getMessage());
            return false;
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return "******";
        }
        String clean = phone.trim();
        if (clean.length() < 6) {
            return "******";
        }
        String last4 = clean.substring(clean.length() - 4);
        String prefix = clean.startsWith("+") ? clean.substring(0, Math.min(4, clean.length() - 4)) + " " : "";
        return prefix + "******" + last4;
    }
}
