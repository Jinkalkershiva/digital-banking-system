package com.banking.paymentservice.repository;

import com.banking.paymentservice.entity.Payment;
import com.banking.paymentservice.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, String> {

    Optional<Payment> findByRazorpayOrderId(String orderId);

    Optional<Payment> findByRazorpayPaymentId(String paymentId);

    List<Payment> findByStatus(PaymentStatus status);

    List<Payment> findByAccountNumberOrderByCreatedAtDesc(String accountNumber);

    List<Payment> findAllByOrderByCreatedAtDesc();
}