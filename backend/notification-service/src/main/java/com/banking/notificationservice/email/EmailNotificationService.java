package com.banking.notificationservice.email;

import java.math.BigDecimal;

public interface EmailNotificationService {
    /**
     * Send transaction verification OTP via email.
     *
     * @param recipientEmail recipient email address
     * @param otp 6-digit OTP
     * @param amount transaction amount
     * @param expiresInMinutes OTP validity period
     * @param transactionId transaction ID
     * @return true if sent successfully or queued, false if failed
     */
    boolean sendOtpEmail(String recipientEmail, String otp, BigDecimal amount, int expiresInMinutes, String transactionId);

    /**
     * Send general alert email.
     *
     * @param recipientEmail recipient email address
     * @param subject email subject
     * @param body email body
     * @return true if sent, false otherwise
     */
    boolean sendAlertEmail(String recipientEmail, String subject, String body);
}
