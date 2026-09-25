package com.banking.notificationservice.serive;

import com.banking.notificationservice.email.EmailNotificationService;
import com.banking.notificationservice.sms.SmsNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {

    private final EmailNotificationService emailNotificationService;
    private final SmsNotificationService smsNotificationService;

    @KafkaListener(topics = "transaction.otp.generated")
    public void consumeOtpGenerated(@Payload Map<String, Object> payload) {
        try {
            String accountNumber = (String) payload.get("accountNumber");
            String otp = (String) payload.get("otp");
            String transactionId = (String) payload.get("transactionId");
            String email = (String) payload.get("email");
            String phoneNumber = (String) payload.get("phoneNumber");
            String reason = (String) payload.get("reason");

            BigDecimal amount = null;
            if (payload.get("amount") != null) {
                amount = new BigDecimal(payload.get("amount").toString());
            }

            int expiresInMinutes = 5;
            if (payload.get("expiresInMinutes") != null) {
                try {
                    expiresInMinutes = Integer.parseInt(payload.get("expiresInMinutes").toString());
                } catch (Exception ignored) {
                }
            }

            log.info("Processing OTP notification for transaction: {} (account: {})", transactionId, accountNumber);

            boolean emailSent = false;
            boolean smsSent = false;

            if (email != null && !email.isBlank()) {
                emailSent = emailNotificationService.sendOtpEmail(email, otp, amount, expiresInMinutes, transactionId);
            }

            if (phoneNumber != null && !phoneNumber.isBlank()) {
                smsSent = smsNotificationService.sendOtpSms(phoneNumber, otp, amount, expiresInMinutes);
            }

            if (!emailSent && !smsSent && (email != null || phoneNumber != null)) {
                log.warn("OTP delivery failed across all available channels for transaction: {}", transactionId);
            } else {
                log.info("OTP delivery completed for transaction: {} [Email: {}, SMS: {}]",
                        transactionId, emailSent ? "SUCCESS" : "SKIPPED/FAILED", smsSent ? "SUCCESS" : "SKIPPED/FAILED");
            }

        } catch (Exception e) {
            log.error("Error processing OTP notification: {}", e.getMessage(), e);
        }
    }

    @KafkaListener(topics = "transaction.completed")
    public void consumeTransactionCompleted(@Payload Map<String, Object> payload) {
        try {
            String senderAccount = (String) payload.get("senderAccountNumber");
            String receiverAccount = (String) payload.get("receiverAccountNumber");
            String amount = payload.get("amount") != null ? payload.get("amount").toString() : "0.00";

            // DEBIT ALERT
            sendAlert(
                    senderAccount,
                    "DEBIT ALERT",
                    String.format("%s debited from account %s", amount, senderAccount)
            );

            // CREDIT ALERT
            sendAlert(
                    receiverAccount,
                    "CREDIT ALERT",
                    String.format("%s credited to account %s", amount, receiverAccount)
            );

        } catch (Exception e) {
            log.error("Error sending transaction notification: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "fraud.detected")
    public void consumeFraudDetected(@Payload Map<String, Object> payload) {
        try {
            String accountNumber = (String) payload.get("accountNumber");
            String reason = (String) payload.get("reason");

            sendAlert(
                    accountNumber,
                    "SUSPICIOUS ACTIVITY DETECTED",
                    String.format(
                            "Your account %s has been blocked. Reason: %s. Please contact your bank immediately.",
                            accountNumber, reason
                    )
            );
        } catch (Exception e) {
            log.error("Error sending fraud alert: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "transaction.refunded")
    public void consumeTransactionRefunded(@Payload Map<String, Object> payload) {
        try {
            String senderAccount = (String) payload.get("senderAccountNumber");
            String amount = payload.get("amount") != null ? payload.get("amount").toString() : "0.00";
            String reason = (String) payload.get("reason");

            sendAlert(
                    senderAccount,
                    "SUSPICIOUS ACTIVITY DETECTED",
                    String.format(
                            "Your transaction of %s was cancelled. Reason: %s. %s has been refunded to account %s.",
                            amount, reason, amount, senderAccount
                    )
            );
        } catch (Exception e) {
            log.error("Error sending refund notification: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "payment.completed")
    public void consumePaymentCompleted(@Payload Map<String, Object> payload) {
        try {
            String accountNumber = (String) payload.get("accountNumber");
            String amount = payload.get("amount") != null ? payload.get("amount").toString() : "0.00";
            String razorpayPaymentId = (String) payload.get("razorpayPaymentId");

            sendAlert(
                    accountNumber,
                    "PAYMENT SUCCESSFUL",
                    String.format("Payment of %s completed. Razorpay ID: %s.", amount, razorpayPaymentId)
            );

        } catch (Exception e) {
            log.error("Error sending payment notification", e);
        }
    }

    @KafkaListener(topics = "payment.failed")
    public void consumePaymentFailed(@Payload Map<String, Object> payload) {
        try {
            String accountNumber = (String) payload.get("accountNumber");
            String amount = payload.get("amount") != null ? payload.get("amount").toString() : "0.00";

            sendAlert(
                    accountNumber,
                    "PAYMENT FAILED",
                    String.format(
                            "Your payment of %s could not be processed. Please try again or contact support.",
                            amount
                    )
            );

        } catch (Exception e) {
            log.error("Error sending payment failure notification: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "payment.refunded")
    public void consumePaymentRefunded(@Payload Map<String, Object> payload) {
        try {
            String accountNumber = (String) payload.get("accountNumber");
            String amount = payload.get("amount") != null ? payload.get("amount").toString() : "0.00";
            String refundId = (String) payload.get("razorpayRefundId");
            String currency = payload.get("currency") != null ? payload.get("currency").toString() : "INR";

            sendAlert(
                    accountNumber,
                    "REFUND COMPLETED",
                    String.format("Your payment of %s %s has been refunded. Razorpay Refund ID: %s.",
                            currency, amount, refundId != null ? refundId : "Completed")
            );

        } catch (Exception e) {
            log.error("Error sending payment refunded notification: {}", e.getMessage());
        }
    }

    @KafkaListener(topics = "payment.refund.failed")
    public void consumePaymentRefundFailed(@Payload Map<String, Object> payload) {
        try {
            String accountNumber = (String) payload.get("accountNumber");
            String amount = payload.get("amount") != null ? payload.get("amount").toString() : "0.00";
            String reason = (String) payload.get("reason");

            sendAlert(
                    accountNumber,
                    "REFUND REQUIRES ATTENTION",
                    String.format("Automatic refund for payment of %s could not be completed (%s). Our banking support team is reviewing your transaction.",
                            amount, reason != null ? reason : "Unknown")
            );

        } catch (Exception e) {
            log.error("Error sending payment refund failed notification: {}", e.getMessage());
        }
    }

    private void sendAlert(String accountNumber, String subject, String message) {
        log.info("----------------------------------------");
        log.info("Notification Alert - Account: {}", accountNumber);
        log.info("Subject: {}", subject);
        log.info("Message: {}", message);
        log.info("----------------------------------------");
    }
}
