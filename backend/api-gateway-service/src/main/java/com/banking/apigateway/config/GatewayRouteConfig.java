package com.banking.apigateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRouteConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                // Auth Service (SpringSecEx)
                .route("auth-service", r -> r.path("/api/v1/auth/**", "/register", "/login")
                        .uri("http://localhost:8088"))

                // Account Service
                .route("account-service", r -> r.path("/api/v1/accounts", "/api/v1/accounts/**")
                        .uri("http://localhost:8081"))

                // Transaction Service
                .route("transaction-service", r -> r.path("/api/v1/transactions", "/api/v1/transactions/**")
                        .uri("http://localhost:8082"))

                // Payment Service
                .route("payment-service", r -> r.path("/api/v1/payments", "/api/v1/payments/**")
                        .uri("http://localhost:8083"))

                // Fraud Detection Service
                .route("fraud-service", r -> r.path("/api/v1/fraud", "/api/v1/fraud/**")
                        .uri("http://localhost:8084"))

                // Notification Service
                .route("notification-service", r -> r.path("/api/v1/notifications", "/api/v1/notifications/**")
                        .uri("http://localhost:8085"))
                .build();
    }
}
