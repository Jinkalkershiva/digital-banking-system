package com.banking.apigateway.config;


import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Configuration
public class RateLimitConfig {

    @Bean
    public KeyResolver keyResolver(){
        return exchange -> {
            var remoteAddress = exchange.getRequest().getRemoteAddress();
            String hostAddress = (remoteAddress != null && remoteAddress.getAddress() != null)
                    ? remoteAddress.getAddress().getHostAddress()
                    : "127.0.0.1";
            return Mono.just(hostAddress);
        };
    }


}