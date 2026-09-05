package com.banking.accountservice.service;

import com.banking.accountservice.dto.AccountResponse;
import com.banking.accountservice.dto.CreateAccountRequest;
import com.banking.accountservice.repository.AccountRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@Slf4j
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;

    public @Nullable AccountResponse createAccount(@Valid CreateAccountRequest request) {
        log.info("Creating account for: {}",request.getEmail());

        if(accountRepository.existsByEmail())
    }

    public @Nullable AccountResponse getAccount(String accountNumber) {

    }

    public @Nullable AccountResponse getBalance(String accountNumber) {

    }

    public void blockAccount(String accountNumber) {

    }

    public void deductBalance(String accountNumber, BigDecimal amount) {

    }

    public void creditBalance(String accountNumber, BigDecimal amount) {

    }
}
