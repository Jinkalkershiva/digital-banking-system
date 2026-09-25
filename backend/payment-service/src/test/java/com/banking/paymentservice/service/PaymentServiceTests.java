package com.banking.paymentservice.service;

import com.banking.paymentservice.dto.CreatePaymentRequest;
import com.banking.paymentservice.dto.PaymentOrderResponse;
import com.banking.paymentservice.dto.PaymentRefundEvent;
import com.banking.paymentservice.dto.PaymentResponse;
import com.banking.paymentservice.dto.VerifyPaymentSignatureRequest;
import com.banking.paymentservice.entity.Payment;
import com.banking.paymentservice.entity.PaymentStatus;
import com.banking.paymentservice.repository.PaymentRepository;
import com.razorpay.Order;
import com.razorpay.OrderClient;
import com.razorpay.PaymentClient;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Refund;
import org.json.JSONObject;
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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTests {

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Mock
    private RedisTemplate<String, String> redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private RazorpayClient razorpayClient;

    @Mock
    private PaymentClient paymentClient;

    @Mock
    private OrderClient orderClient;

    @InjectMocks
    private PaymentService paymentService;

    private final String paymentId = "pay-uuid-12345";
    private final String orderId = "order_TgD41NaVAegukI";
    private final String rzpPaymentId = "pay_N84ks92ndlaPq";
    private final String rzpRefundId = "rfnd_9a8bc7def432";
    private final String accountNumber = "000000000012";
    private final BigDecimal amount = new BigDecimal("32.00");

    private Payment payment;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "keyId", "rzp_test_mockKey");
        ReflectionTestUtils.setField(paymentService, "keySecret", "mockSecretKey123");
        ReflectionTestUtils.setField(paymentService, "webhookSecret", "dummy_webhook_secret");
        ReflectionTestUtils.setField(paymentService, "razorpayClient", razorpayClient);

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        payment = new Payment();
        payment.setId(paymentId);
        payment.setAccountNumber(accountNumber);
        payment.setAmount(amount);
        payment.setCurrency("INR");
        payment.setRazorpayOrderId(orderId);
        payment.setStatus(PaymentStatus.CREATED);
        payment.setRefundStatus("NONE");
    }

    @Test
    @DisplayName("Create Payment Order - Success")
    void testCreatePaymentOrder_Success() throws Exception {
        ReflectionTestUtils.setField(razorpayClient, "orders", orderClient);

        JSONObject orderJson = new JSONObject();
        orderJson.put("id", orderId);
        Order mockOrder = new Order(orderJson);

        when(orderClient.create(any(JSONObject.class))).thenReturn(mockOrder);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(i -> {
            Payment p = i.getArgument(0);
            p.setId(paymentId);
            return p;
        });

        CreatePaymentRequest request = new CreatePaymentRequest(accountNumber, amount, "Test Payment");
        PaymentOrderResponse response = paymentService.createPaymentOrder(request);

        assertNotNull(response);
        assertEquals(paymentId, response.getPaymentId());
        assertEquals(orderId, response.getRazorpayOrderId());
        assertEquals(amount, response.getAmount());
        assertEquals("INR", response.getCurrency());
        assertEquals("CREATED", response.getStatus());

        verify(paymentRepository).save(any(Payment.class));
    }

    @Test
    @DisplayName("Verify OTP - Success transitions status to COMPLETED and publishes payment.completed")
    void testVerifyOtp_Success() {
        payment.setStatus(PaymentStatus.PENDING_VERIFICATION);
        payment.setRazorpayPaymentId(rzpPaymentId);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(valueOperations.get("payment:otp:" + paymentId)).thenReturn("654321");
        when(valueOperations.increment("payment:attempts:" + paymentId)).thenReturn(1L);
        when(paymentRepository.save(any(Payment.class))).thenReturn(payment);

        PaymentResponse response = paymentService.verifyOTP(paymentId, "654321");

        assertNotNull(response);
        assertEquals(PaymentStatus.COMPLETED, response.getStatus());
        assertEquals(PaymentStatus.COMPLETED, payment.getStatus());

        // Verify Redis deletion
        verify(redisTemplate).delete("payment:otp:" + paymentId);
        verify(redisTemplate).delete("payment:attempts:" + paymentId);

        // Verify Kafka event published
        verify(kafkaTemplate).send(eq("payment.completed"), eq(paymentId), any());
    }

    @Test
    @DisplayName("Verify OTP - Wrong OTP throws 400 Bad Request and remains in verification state")
    void testVerifyOtp_WrongOtp() {
        payment.setStatus(PaymentStatus.PENDING_VERIFICATION);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(valueOperations.get("payment:otp:" + paymentId)).thenReturn("654321");
        when(valueOperations.increment("payment:attempts:" + paymentId)).thenReturn(1L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            paymentService.verifyOTP(paymentId, "000000");
        });

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertEquals("Incorrect OTP. Please try again.", ex.getReason());
        assertEquals(PaymentStatus.PENDING_VERIFICATION, payment.getStatus());

        verify(redisTemplate, never()).delete("payment:otp:" + paymentId);
        verify(kafkaTemplate, never()).send(eq("payment.completed"), anyString(), any());
    }

    @Test
    @DisplayName("Verify OTP - Expired OTP throws 400 Bad Request")
    void testVerifyOtp_ExpiredOtp() {
        payment.setStatus(PaymentStatus.PENDING_VERIFICATION);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(valueOperations.get("payment:otp:" + paymentId)).thenReturn(null);
        when(valueOperations.increment("payment:attempts:" + paymentId)).thenReturn(1L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            paymentService.verifyOTP(paymentId, "654321");
        });

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("OTP expired"));
    }

    @Test
    @DisplayName("Verify OTP - Exceeding 5 attempts throws 429 Too Many Requests")
    void testVerifyOtp_TooManyAttempts() {
        payment.setStatus(PaymentStatus.PENDING_VERIFICATION);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(valueOperations.increment("payment:attempts:" + paymentId)).thenReturn(6L);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> {
            paymentService.verifyOTP(paymentId, "654321");
        });

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Too many invalid OTP attempts"));
    }

    @Test
    @DisplayName("Resend OTP - Successfully generates new OTP and publishes notification")
    void testResendOtp_Success() {
        payment.setStatus(PaymentStatus.PENDING_VERIFICATION);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(valueOperations.increment("payment:resend_count:" + paymentId)).thenReturn(1L);

        PaymentResponse response = paymentService.resendOTP(paymentId);

        assertNotNull(response);
        verify(redisTemplate).delete("payment:otp:" + paymentId);
        verify(valueOperations).set(eq("payment:otp:" + paymentId), anyString(), eq(5L), eq(TimeUnit.MINUTES));
        verify(kafkaTemplate).send(eq("transaction.otp.generated"), eq(paymentId), any());
    }

    @Test
    @DisplayName("Cancel uncaptured payment - marks FAILED without Razorpay refund")
    void testCancelPayment_Uncaptured() {
        payment.setStatus(PaymentStatus.CREATED);
        payment.setRazorpayPaymentId(null);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenReturn(payment);

        PaymentResponse response = paymentService.cancelPayment(paymentId, "User cancelled order");

        assertNotNull(response);
        assertEquals(PaymentStatus.FAILED, payment.getStatus());
        assertEquals("NOT_APPLICABLE", payment.getRefundStatus());
        assertEquals("User cancelled order", payment.getFailureReason());

        verifyNoInteractions(paymentClient);
    }

    @Test
    @DisplayName("Cancel captured payment - triggers Razorpay refund and publishes payment.refunded")
    void testCancelPayment_Captured_RefundsSuccessfully() throws Exception {
        payment.setStatus(PaymentStatus.PENDING_VERIFICATION);
        payment.setRazorpayPaymentId(rzpPaymentId);

        ReflectionTestUtils.setField(razorpayClient, "payments", paymentClient);

        JSONObject refundJson = new JSONObject();
        refundJson.put("id", rzpRefundId);
        refundJson.put("payment_id", rzpPaymentId);
        refundJson.put("amount", 3200);
        refundJson.put("status", "processed");
        Refund mockRefund = new Refund(refundJson);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenReturn(payment);
        when(paymentClient.refund(eq(rzpPaymentId), any(JSONObject.class))).thenReturn(mockRefund);

        PaymentResponse response = paymentService.cancelPayment(paymentId, "OTP verification was not completed.");

        assertNotNull(response);
        assertEquals(PaymentStatus.REFUNDED, payment.getStatus());
        assertEquals("REFUNDED", payment.getRefundStatus());
        assertEquals(rzpRefundId, payment.getRazorpayRefundId());

        // Verify Kafka payment.refunded event published
        ArgumentCaptor<PaymentRefundEvent> eventCaptor = ArgumentCaptor.forClass(PaymentRefundEvent.class);
        verify(kafkaTemplate).send(eq("payment.refunded"), eq(paymentId), eventCaptor.capture());

        PaymentRefundEvent event = eventCaptor.getValue();
        assertEquals(paymentId, event.getPaymentId());
        assertEquals(rzpPaymentId, event.getRazorpayPaymentId());
        assertEquals(rzpRefundId, event.getRazorpayRefundId());
        assertEquals(amount, event.getAmount());
        assertEquals("INR", event.getCurrency());
    }

    @Test
    @DisplayName("Idempotent Refund - already refunded payment skips calling Razorpay API")
    void testInitiateRefund_Idempotent() throws Exception {
        payment.setStatus(PaymentStatus.REFUNDED);
        payment.setRefundStatus("REFUNDED");
        payment.setRazorpayPaymentId(rzpPaymentId);
        payment.setRazorpayRefundId(rzpRefundId);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));

        PaymentResponse response = paymentService.initiateRefund(paymentId, "Duplicate refund request", amount);

        assertNotNull(response);
        assertEquals(PaymentStatus.REFUNDED, response.getStatus());
        assertEquals(rzpRefundId, response.getRazorpayRefundId());

        // Verify Razorpay client was NOT called again
        verify(paymentClient, never()).refund(anyString(), any(JSONObject.class));
    }

    @Test
    @DisplayName("Razorpay refund API failure - marks REFUND_FAILED and publishes payment.refund.failed")
    void testInitiateRefund_ApiFailure() throws Exception {
        payment.setStatus(PaymentStatus.CAPTURED);
        payment.setRazorpayPaymentId(rzpPaymentId);

        ReflectionTestUtils.setField(razorpayClient, "payments", paymentClient);

        when(paymentRepository.findById(paymentId)).thenReturn(Optional.of(payment));
        when(paymentRepository.save(any(Payment.class))).thenReturn(payment);
        when(paymentClient.refund(eq(rzpPaymentId), any(JSONObject.class)))
                .thenThrow(new RazorpayException("Razorpay gateway timeout"));

        assertThrows(ResponseStatusException.class, () -> {
            paymentService.initiateRefund(paymentId, "OTP failed", amount);
        });

        assertEquals(PaymentStatus.REFUND_FAILED, payment.getStatus());
        assertEquals("REFUND_FAILED", payment.getRefundStatus());
        assertTrue(payment.getFailureReason().contains("Razorpay gateway timeout"));

        // Verify failure event published
        verify(kafkaTemplate).send(eq("payment.refund.failed"), eq(paymentId), any());
    }

    @Test
    @DisplayName("Startup reconciliation of REFUND_PENDING payments")
    void testReconcilePendingRefunds_Success() throws Exception {
        Payment pendingRefundPayment = new Payment();
        pendingRefundPayment.setId("pending-refund-id");
        pendingRefundPayment.setStatus(PaymentStatus.REFUND_PENDING);
        pendingRefundPayment.setRefundStatus("REFUND_PENDING");
        pendingRefundPayment.setRazorpayPaymentId(rzpPaymentId);
        pendingRefundPayment.setAmount(amount);

        ReflectionTestUtils.setField(razorpayClient, "payments", paymentClient);

        JSONObject rzpPaymentJson = new JSONObject();
        rzpPaymentJson.put("id", rzpPaymentId);
        rzpPaymentJson.put("status", "refunded");
        com.razorpay.Payment mockRzpPayment = new com.razorpay.Payment(rzpPaymentJson);

        when(paymentRepository.findByStatus(PaymentStatus.REFUND_PENDING))
                .thenReturn(List.of(pendingRefundPayment));
        when(paymentClient.fetch(rzpPaymentId)).thenReturn(mockRzpPayment);

        paymentService.reconcilePendingRefunds();

        assertEquals(PaymentStatus.REFUNDED, pendingRefundPayment.getStatus());
        assertEquals("REFUNDED", pendingRefundPayment.getRefundStatus());
        verify(paymentRepository).save(pendingRefundPayment);
        verify(kafkaTemplate).send(eq("payment.refunded"), eq("pending-refund-id"), any());
    }
}
