package com.banking.notificationservice.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@Slf4j
public class EmailNotificationServiceImpl implements EmailNotificationService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${notification.mail.from:no-reply@digitalbank.com}")
    private String mailFrom;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Override
    public boolean sendOtpEmail(String recipientEmail, String otp, BigDecimal amount, int expiresInMinutes, String transactionId) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            log.warn("Cannot send OTP email: recipient email is missing or empty");
            return false;
        }

        String maskedEmail = maskEmail(recipientEmail);
        String subject = "Digital Bank - Transaction Verification OTP";
        String content = String.format(
                "Your Digital Bank transaction requires verification.\n\n" +
                "Amount: $%s\n\n" +
                "OTP: %s\n\n" +
                "This OTP expires in %d minutes.\n\n" +
                "If you did not initiate this transaction, contact support immediately.",
                amount != null ? amount.toPlainString() : "0.00",
                otp,
                expiresInMinutes > 0 ? expiresInMinutes : 5
        );

        if (mailSender == null || mailHost == null || mailHost.isBlank() || mailHost.equalsIgnoreCase("localhost")) {
            log.info("Email provider not configured for external SMTP. Simulated OTP email sent to {}", maskedEmail);
            return true;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(recipientEmail);
            message.setSubject(subject);
            message.setText(content);

            mailSender.send(message);
            log.info("OTP verification email successfully dispatched to {}", maskedEmail);
            return true;
        } catch (Exception e) {
            log.warn("Failed to dispatch email to {}: {}", maskedEmail, e.getMessage());
            return false;
        }
    }

    @Override
    public boolean sendAlertEmail(String recipientEmail, String subject, String body) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            return false;
        }

        String maskedEmail = maskEmail(recipientEmail);

        if (mailSender == null || mailHost == null || mailHost.isBlank() || mailHost.equalsIgnoreCase("localhost")) {
            log.info("Simulated alert email sent to {}: {}", maskedEmail, subject);
            return true;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(recipientEmail);
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            log.info("Alert email successfully dispatched to {}", maskedEmail);
            return true;
        } catch (Exception e) {
            log.warn("Failed to dispatch alert email to {}: {}", maskedEmail, e.getMessage());
            return false;
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "****";
        }
        String[] parts = email.split("@", 2);
        String user = parts[0];
        String domain = parts[1];
        if (user.length() <= 1) {
            return user + "****@" + domain;
        }
        return user.charAt(0) + "****@" + domain;
    }
}
