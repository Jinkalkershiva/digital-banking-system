package com.banking.notificationservice;

import com.banking.notificationservice.email.EmailNotificationService;
import com.banking.notificationservice.email.EmailNotificationServiceImpl;
import com.banking.notificationservice.serive.NotificationService;
import com.banking.notificationservice.sms.SmsNotificationService;
import com.banking.notificationservice.sms.SmsNotificationServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTests {

    @Mock
    private EmailNotificationService emailNotificationService;

    @Mock
    private SmsNotificationService smsNotificationService;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    @DisplayName("Consume OTP generated - invokes email and SMS notification services")
    void testConsumeOtpGenerated_DispatchesBothChannels() {
        when(emailNotificationService.sendOtpEmail(anyString(), anyString(), any(), anyInt(), anyString()))
                .thenReturn(true);
        when(smsNotificationService.sendOtpSms(anyString(), anyString(), any(), anyInt()))
                .thenReturn(true);

        Map<String, Object> payload = new HashMap<>();
        payload.put("transactionId", "tx-999");
        payload.put("accountNumber", "000000000001");
        payload.put("email", "john@example.com");
        payload.put("phoneNumber", "+919876543210");
        payload.put("otp", "482931");
        payload.put("amount", "60.00");
        payload.put("expiresInMinutes", 5);
        payload.put("reason", "Suspicious transaction");

        notificationService.consumeOtpGenerated(payload);

        verify(emailNotificationService).sendOtpEmail(
                eq("john@example.com"),
                eq("482931"),
                eq(new BigDecimal("60.00")),
                eq(5),
                eq("tx-999")
        );

        verify(smsNotificationService).sendOtpSms(
                eq("+919876543210"),
                eq("482931"),
                eq(new BigDecimal("60.00")),
                eq(5)
        );
    }

    @Test
    @DisplayName("EmailNotificationServiceImpl - handles null/empty email gracefully")
    void testEmailService_HandlesMissingEmail() {
        EmailNotificationServiceImpl service = new EmailNotificationServiceImpl();
        boolean result = service.sendOtpEmail(null, "482931", new BigDecimal("60.00"), 5, "tx-1");
        assertFalse(result);
    }

    @Test
    @DisplayName("SmsNotificationServiceImpl - handles null/empty phone gracefully")
    void testSmsService_HandlesMissingPhone() {
        SmsNotificationServiceImpl service = new SmsNotificationServiceImpl();
        boolean result = service.sendOtpSms(null, "482931", new BigDecimal("60.00"), 5);
        assertFalse(result);
    }
}
