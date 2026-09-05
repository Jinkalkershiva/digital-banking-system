package com.banking.accountservice.repository;

import com.banking.accountservice.entity.Account;
import org.springframework.data.jpa.repository.JpaRepository;

public class AccountRepository extends JpaRepository<Account,String> {

}
