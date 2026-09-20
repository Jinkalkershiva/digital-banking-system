package com.banking.paymentservice.service;

import com.banking.paymentservice.dto.CreatePaymentRequest;
import com.banking.paymentservice.dto.PaymentOrderResponse;
import com.banking.paymentservice.entity.Payment;
import com.banking.paymentservice.entity.PaymentStatus;
import com.banking.paymentservice.repository.PaymentRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${razorpay.key-id}")
    private String keyId;

    @Value("${razorpay.key-secret}")
    private String keySecret;

    @Value("${razorpay.webhook-secret}")
    private String webhookSecret;

    private RazorpayClient razorpayClient;

    private static final String PAYMENT_COMPLETED_TOPIC = "payment.completed";
    private static final String PAYMENT_FAILED_TOPIC = "payment.failed";
    private static final String CURRENCY = "INR";

    @PostConstruct
    void init() throws RazorpayException {
        this.razorpayClient = new RazorpayClient(keyId, keySecret);
    }

    /**
     * Create Razorpay payment order
     *
     * FLOW:
     * 1. Create order in razorpay
     * 2. Save Payment record in DB
     * 3. Return order details to frontend
     * 4. Frontend show Razorpay Checkout
     * 5. User pays
     * 6. Razorpay calls webhook
     * @param request
     * @return
     */
    public PaymentOrderResponse createPaymentOrder(CreatePaymentRequest request){

        // Validate before anything else so the client gets a 400, not a 500
        if (request == null || request.getAmount() == null
                || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        if (request.getAmount().stripTrailingZeros().scale() > 2) {
            throw new IllegalArgumentException("Amount cannot have more than 2 decimal places");
        }

        log.info("Creating payment order for account: {} amount: {}",
                maskAccount(request.getAccountNumber()), request.getAmount());

        try {

            //Converted Amount (paise)
            long convertedAmount = request.getAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .longValueExact();

            JSONObject orderRequest =new JSONObject();
            orderRequest.put("amount", convertedAmount);
            orderRequest.put("currency", CURRENCY);
            orderRequest.put("receipt", "rcpt_" + UUID.randomUUID().toString()
                    .replace("-", "").substring(0,20));

            Order razorpayOrder = razorpayClient.orders.create(orderRequest);
            String razorpayOrderId = razorpayOrder.get("id").toString();
            log.info("Razorpay order created: {}", razorpayOrderId);

            // Save payment record
            Payment payment =new Payment();
            payment.setRazorpayOrderId(razorpayOrderId);
            payment.setAccountNumber(request.getAccountNumber());
            payment.setAmount(request.getAmount());
            payment.setCurrency(CURRENCY);
            payment.setStatus(PaymentStatus.CREATED);
            payment.setDescription(request.getDescription());

            Payment savedPayment = paymentRepository.save(payment);


            return new PaymentOrderResponse(
                    savedPayment.getId(),
                    razorpayOrderId,
                    request.getAmount(),
                    CURRENCY,
                    "CREATED",
                    keyId
            );

        } catch (Exception e) {
            log.error("Error creating Razorpay payment order", e);
            throw new RuntimeException("Failed to create payment order", e);
        }
    }

    /**
     * @param rawBody   raw request body exactly as received (needed for signature check)
     * @param signature value of the X-Razorpay-Signature header
     */
    @Transactional
    public void handleWebhook(String rawBody, String signature){

        verifySignature(rawBody, signature);

        JSONObject payload = new JSONObject(rawBody);
        String event = payload.optString("event");
        log.info("Received Razorpay webhook: {}", event);

        if("payment.captured".equals(event)){
            handlePaymentSuccess(payload);
        }
        else if("payment.failed".equals(event)){
            handlePaymentFailure(payload);
        }
        else {
            log.debug("Ignoring unhandled Razorpay event: {}", event);
        }
    }

    private void verifySignature(String rawBody, String signature){
        if (rawBody == null || signature == null || signature.isBlank()) {
            throw new SecurityException("Missing webhook body or signature");
        }
        try {
            if (!Utils.verifyWebhookSignature(rawBody, signature, webhookSecret)) {
                throw new SecurityException("Invalid Razorpay webhook signature");
            }
        } catch (RazorpayException e) {
            throw new SecurityException("Unable to verify Razorpay webhook signature", e);
        }
    }

    // Exceptions are intentionally NOT swallowed, so the controller returns non-2xx
    // and Razorpay retries the webhook.
    private void handlePaymentSuccess(JSONObject payload){

        JSONObject paymentData = extractPaymentData(payload);
        String orderId = paymentData.getString("order_id");
        String paymentId = paymentData.getString("id");

        Payment payment =paymentRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(()-> new IllegalStateException(
                        "Payment not found for order: "+orderId
                ));

        // Idempotency: duplicate delivery of the same event
        if (payment.getStatus() == PaymentStatus.COMPLETED) {
            log.info("Payment already completed, skipping: {}", payment.getId());
            return;
        }

        payment.setRazorpayPaymentId(paymentId);
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setFailureReason(null);
        paymentRepository.save(payment);

        //Publish payment completed event
        Map<String,Object> event =new HashMap<>();
        event.put("paymentId", payment.getId());
        event.put("accountNumber", payment.getAccountNumber());
        event.put("amount",payment.getAmount());
        event.put("razorPayPaymentId",paymentId);

        kafkaTemplate.send(PAYMENT_COMPLETED_TOPIC, payment.getId(),event);
        log.info("Payment completed: {}", payment.getId());
    }

    private void handlePaymentFailure(JSONObject payload){

        JSONObject paymentData = extractPaymentData(payload);
        String orderId = paymentData.getString("order_id");
        String paymentId = paymentData.optString("id", null);

        Payment payment =paymentRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(()-> new IllegalStateException(
                        "Payment not found for order: "+orderId
                ));

        // Never overwrite a completed payment (events can arrive out of order),
        // and don't re-process an already failed one.
        if (payment.getStatus() != PaymentStatus.CREATED) {
            log.info("Ignoring payment.failed for payment {} in status {}",
                    payment.getId(), payment.getStatus());
            return;
        }

        payment.setRazorpayPaymentId(paymentId);
        payment.setStatus(PaymentStatus.FAILED);
        payment.setFailureReason("Payment failed via Razorpay");
        paymentRepository.save(payment);

        Map<String,Object> event =new HashMap<>();
        event.put("paymentId", payment.getId());
        event.put("accountNumber", payment.getAccountNumber());
        event.put("amount",payment.getAmount());
        event.put("reason", "Payment failed via razorpay");

        kafkaTemplate.send(PAYMENT_FAILED_TOPIC, payment.getId(),event);
        log.warn("Payment failed: {}", payment.getId());
    }

    private JSONObject extractPaymentData(JSONObject payload){
        return payload.getJSONObject("payload")
                .getJSONObject("payment")
                .getJSONObject("entity");
    }

    private String maskAccount(String accountNumber){
        if (accountNumber == null || accountNumber.length() <= 4) {
            return "****";
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }

}