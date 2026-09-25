package com.banking.notificationservice.sms;

import java.math.BigDecimal;

public interface SmsNotificationService {
    /**
     * Send transaction verification OTP via SMS.
     *
     * @param phoneNumber recipient phone number
     * @param otp 6-digit OTP
     * @param amount transaction amount
     * @param expiresInMinutes OTP validity period
     * @return true if sent successfully or queued, false if failed
     */
    boolean sendOtpSms(String phoneNumber, String otp, BigDecimal amount, int expiresInMinutes);

    /**
     * Send general alert SMS.
     *
     * @param phoneNumber recipient phone number
     * @param message SMS text message
     * @return true if sent, false otherwise
     */
    boolean sendAlertSms(String phoneNumber, String message);
}
