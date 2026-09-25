package com.banking.transactionservice.service;

import com.banking.transactionservice.client.AccountServiceClient;
import com.banking.transactionservice.dto.AccountResponse;
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
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionEventConsumerTests {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private AccountServiceClient accountServiceClient;

    @Mock
    private TransactionService transactionService;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @InjectMocks
    private TransactionEventConsumer transactionEventConsumer;

    private final String txId = "tx-test-98765";
    private final String accNumber = "000000000001";
    private Transaction processingTx;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        processingTx = new Transaction();
        processingTx.setId(txId);
        processingTx.setSenderAccountNumber(accNumber);
        processingTx.setReceiverAccountNumber("000000000002");
        processingTx.setAmount(new BigDecimal("100.00"));
        processingTx.setType(TransactionType.TRANSFER);
        processingTx.setStatus(TransactionStatus.PROCESSING);
    }

    @Test
    @DisplayName("Consume verification.required - generates OTP, stores in Redis, updates status to PENDING_VERIFICATION and publishes event")
    void testConsumeVerificationRequired_Success() {
        when(transactionRepository.findById(txId)).thenReturn(Optional.of(processingTx));

        AccountResponse account = new AccountResponse();
        account.setAccountNumber(accNumber);
        account.setEmail("user@example.com");
        account.setPhone("+919123456789");
        when(accountServiceClient.getAccount(accNumber)).thenReturn(account);

        Map<String, Object> payload = new HashMap<>();
        payload.put("transactionId", txId);
        payload.put("accountNumber", accNumber);
        payload.put("amount", "100.00");
        payload.put("reason", "Suspicious amount multiplier exceeded");

        transactionEventConsumer.consumeVerificationRequired(payload);

        assertEquals(TransactionStatus.PENDING_VERIFICATION, processingTx.getStatus());
        verify(transactionRepository).save(processingTx);

        // Verify Redis key: verification:otp{transactionId} with 5 min TTL
        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(eq("verification:otp" + txId), otpCaptor.capture(), eq(5L), eq(TimeUnit.MINUTES));
        String generatedOtp = otpCaptor.getValue();
        assertNotNull(generatedOtp);
        assertEquals(6, generatedOtp.length());

        // Verify Kafka event published
        ArgumentCaptor<Map<String, Object>> eventCaptor = ArgumentCaptor.forClass(Map.class);
        verify(kafkaTemplate).send(eq("transaction.otp.generated"), eq(txId), eventCaptor.capture());

        Map<String, Object> publishedEvent = eventCaptor.getValue();
        assertEquals(txId, publishedEvent.get("transactionId"));
        assertEquals(accNumber, publishedEvent.get("accountNumber"));
        assertEquals("user@example.com", publishedEvent.get("email"));
        assertEquals("+919123456789", publishedEvent.get("phoneNumber"));
        assertEquals(generatedOtp, publishedEvent.get("otp"));
        assertEquals("OTP", publishedEvent.get("notificationType"));
    }

    @Test
    @DisplayName("Consume verification.required - skips if transaction not in PROCESSING status")
    void testConsumeVerificationRequired_NotProcessing() {
        processingTx.setStatus(TransactionStatus.COMPLETED);
        when(transactionRepository.findById(txId)).thenReturn(Optional.of(processingTx));

        Map<String, Object> payload = new HashMap<>();
        payload.put("transactionId", txId);
        payload.put("accountNumber", accNumber);

        transactionEventConsumer.consumeVerificationRequired(payload);

        verify(valueOperations, never()).set(anyString(), anyString(), anyLong(), any());
        verify(kafkaTemplate, never()).send(anyString(), anyString(), any());
    }
}
