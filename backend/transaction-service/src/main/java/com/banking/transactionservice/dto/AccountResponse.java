package com.banking.transactionservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AccountResponse {
    private String id;
    private String accountNumber;
    private String accountHolderName;
    private String email;
    private String phone;
    private String accountType;
    private String status;
    private BigDecimal balance;
    private BigDecimal dailyTransactionLimit;
}
