package com.banking.transactionservice.service;

import com.banking.transactionservice.client.AccountServiceClient;
import com.banking.transactionservice.dto.AccountResponse;
import com.banking.transactionservice.dto.TransactionResponse;
import com.banking.transactionservice.entity.Transaction;
import com.banking.transactionservice.entity.TransactionStatus;
import com.banking.transactionservice.entity.TransactionType;
import com.banking.transactionservice.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionServiceOtpTests {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private AccountServiceClient accountServiceClient;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private TransactionService transactionService;

    private Transaction pendingTx;
    private final String txId = "tx-12345-abcde";
    private final String senderAcc = "000000000001";
    private final String receiverAcc = "000000000002";
    private final BigDecimal amount = new BigDecimal("60.00");

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        pendingTx = new Transaction();
        pendingTx.setId(txId);
        pendingTx.setSenderAccountNumber(senderAcc);
        pendingTx.setReceiverAccountNumber(receiverAcc);
        pendingTx.setAmount(amount);
        pendingTx.setType(TransactionType.TRANSFER);
        pendingTx.setStatus(TransactionStatus.PENDING_VERIFICATION);
        pendingTx.setDescription("Test transfer");
    }

    @Test
    @DisplayName("Verify OTP - Correct OTP transitions status to COMPLETED and completes Saga")
    void testVerifyOtp_Success() {
        when(transactionRepository.findById(txId)).thenReturn(Optional.of(pendingTx));
        when(valueOperations.get("verification:otp" + txId)).thenReturn("482931");
        when(valueOperations.increment("verification:attempts:" + txId)).thenReturn(1L);

        TransactionResponse response = transactionService.verifyOTP(txId, "482931");

        assertNotNull(response);
        assertEquals(TransactionStatus.COMPLETED, response.getStatus());
        assertEquals(TransactionStatus.COMPLETED, pendingTx.getStatus());
        assertNotNull(pendingTx.getCompletedAt());

        // Verify Redis deletion
        verify(redisTemplate).delete("verification:otp" + txId);
        verify(redisTemplate).delete("verification:attempts:" + txId);

        // Verify Kafka transaction.completed event
        verify(kafkaTemplate).send(eq("transaction.completed"), eq(txId), any());
        verify(transactionRepository).save(pendingTx);
    }

    @Test
    @DisplayName("Verify OTP - Wrong OTP throws 400 Bad Request and remains PENDING_VERIFICATION")
    void testVerifyOtp_WrongOtp() {
        when(transactionRepository.findById(txId)).thenReturn(Optional.of(pendingTx));
        when(valueOperations.get("verification:otp" + txId)).thenReturn("482931");
        when(valueOperations.increment("verification:attempts:" + txId)).thenReturn(1L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            transactionService.verifyOTP(txId, "999999");
        });

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Invalid OTP", ex.getReason());
        assertEquals(TransactionStatus.PENDING_VERIFICATION, pendingTx.getStatus());

        // Verify OTP is NOT deleted so user can retry
        verify(redisTemplate, never()).delete("verification:otp" + txId);
        verify(kafkaTemplate, never()).send(eq("transaction.completed"), anyString(), any());
    }

    @Test
    @DisplayName("Verify OTP - Expired/Missing OTP throws 400 Bad Request and remains PENDING_VERIFICATION")
    void testVerifyOtp_ExpiredOtp() {
        when(transactionRepository.findById(txId)).thenReturn(Optional.of(pendingTx));
        when(valueOperations.get("verification:otp" + txId)).thenReturn(null);
        when(valueOperations.increment("verification:attempts:" + txId)).thenReturn(1L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            transactionService.verifyOTP(txId, "482931");
        });

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("OTP expired"));
        assertEquals(TransactionStatus.PENDING_VERIFICATION, pendingTx.getStatus());
    }

    @Test
    @DisplayName("Verify OTP - Exceeding 5 attempts throws 429 Too Many Requests")
    void testVerifyOtp_TooManyAttempts() {
        when(transactionRepository.findById(txId)).thenReturn(Optional.of(pendingTx));
        when(valueOperations.increment("verification:attempts:" + txId)).thenReturn(6L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            transactionService.verifyOTP(txId, "123456");
        });

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Too many invalid OTP attempts"));
    }

    @Test
    @DisplayName("Resend OTP - Successfully generates new OTP, resets TTL, and publishes notification")
    void testResendOtp_Success() {
        when(transactionRepository.findById(txId)).thenReturn(Optional.of(pendingTx));
        when(valueOperations.increment("verification:resend_count:" + txId)).thenReturn(1L);

        AccountResponse account = new AccountResponse();
        account.setAccountNumber(senderAcc);
        account.setEmail("customer@bank.com");
        account.setPhone("+919876543210");
        when(accountServiceClient.getAccount(senderAcc)).thenReturn(account);

        TransactionResponse response = transactionService.resendOTP(txId);

        assertNotNull(response);
        assertEquals(TransactionStatus.PENDING_VERIFICATION, response.getStatus());

        // Verify previous OTP deletion
        verify(redisTemplate).delete("verification:otp" + txId);
        verify(redisTemplate).delete("verification:attempts:" + txId);

        // Verify new OTP stored in Redis with 5 min TTL
        verify(valueOperations).set(eq("verification:otp" + txId), anyString(), eq(5L), eq(TimeUnit.MINUTES));

        // Verify notification event published to Kafka
        ArgumentCaptor<Map<String, Object>> eventCaptor = ArgumentCaptor.forClass(Map.class);
        verify(kafkaTemplate).send(eq("transaction.otp.generated"), eq(txId), eventCaptor.capture());

        Map<String, Object> event = eventCaptor.getValue();
        assertEquals(txId, event.get("transactionId"));
        assertEquals(senderAcc, event.get("accountNumber"));
        assertEquals("customer@bank.com", event.get("email"));
        assertEquals("+919876543210", event.get("phoneNumber"));
        assertEquals("OTP", event.get("notificationType"));
        assertNotNull(event.get("otp"));
        assertEquals(6, event.get("otp").toString().length());
    }

    @Test
    @DisplayName("Resend OTP - Exceeding 3 resends within 10 minutes throws 429 Too Many Requests")
    void testResendOtp_RateLimitExceeded() {
        when(transactionRepository.findById(txId)).thenReturn(Optional.of(pendingTx));
        when(valueOperations.increment("verification:resend_count:" + txId)).thenReturn(4L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            transactionService.resendOTP(txId);
        });

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Maximum resend attempts reached"));
    }
}
