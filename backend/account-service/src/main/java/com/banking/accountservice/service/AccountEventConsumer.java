package com.banking.accountservice.service;


import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;

@Service
@Slf4j
public class AccountEventConsumer {

  AccountService accountService ;

  /**
   * Consume transaction.completed event from kafka
   * Credits receiver account
   * @param payload
   */

   @KafkaListener(topics = "transaction.completed")
   public void consumeTransactionComplted(@Payload Map<String,Object> payload) {

     try{
      String receiverAccount =(String) payload.get("receiverAccountNumber");
      BigDecimal amount =new BigDecimal(payload.get("amount").toString());

      log.info("Crediting account : {} amount : {}",receiverAccount ,amount);
     }
     catch(Exception e){
      log.error("Error crediting account: {}", e.getMessage());
     }
   }


 /**
  * Consume fraud.detected event from kafka
  * Block the flagged account
  * @param payload
  */

 @KafkaListener(topics = "fraud.detected")
 public void consumeFraudDetected(@Payload Map<String,Object>payload){

      try{
         String accountNumber =(String) payload.get("accountNumber");
         log.info("Fraud detected -blocking account: {}",accountNumber);

         accountService.blockAccount(accountNumber);
      }
      catch(Exception e){
         log.error("Fraud detected blocking account: {}",e.getMessage());
      }
   }




 }
