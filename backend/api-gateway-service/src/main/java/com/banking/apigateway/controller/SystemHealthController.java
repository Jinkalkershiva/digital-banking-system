package com.banking.apigateway.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/system")
public class SystemHealthController {

    private final WebClient webClient;

    @Autowired(required = false)
    private ReactiveRedisTemplate<String, String> redisTemplate;

    public SystemHealthController() {
        this.webClient = WebClient.builder()
                .build();
    }

    private static class ServiceCheckDef {
        final String name;
        final int port;
        final String protocol;
        final String routePrefix;
        final String role;
        final String healthUrl;

        ServiceCheckDef(String name, int port, String protocol, String routePrefix, String role, String healthUrl) {
            this.name = name;
            this.port = port;
            this.protocol = protocol;
            this.routePrefix = routePrefix;
            this.role = role;
            this.healthUrl = healthUrl;
        }
    }

    private static final List<ServiceCheckDef> HTTP_SERVICES = List.of(
            new ServiceCheckDef("API Gateway Service", 8080, "HTTP / WebFlux", "/api/v1/**", "Unified Entrypoint, Rate Limiter & JWT Guard", "http://localhost:8080/actuator/health"),
            new ServiceCheckDef("SpringSecEx (Auth)", 8088, "HTTP / Spring Security", "/api/v1/auth/**", "BCrypt Hashing, User Registry & JWT Minting", "http://localhost:8088/actuator/health"),
            new ServiceCheckDef("Account Service", 8081, "HTTP / JPA / Kafka", "/api/v1/accounts/**", "Account Ledgers, Balance Queries, Debit/Credit", "http://localhost:8081/actuator/health"),
            new ServiceCheckDef("Transaction Service", 8082, "HTTP / JPA / Redis / Kafka", "/api/v1/transactions/**", "Transfer SAGA Orchestrator & OTP Verification", "http://localhost:8082/actuator/health"),
            new ServiceCheckDef("Payment Service", 8083, "HTTP / Razorpay / Kafka", "/api/v1/payments/**", "Razorpay Checkout, Signature Validation & Refunds", "http://localhost:8083/actuator/health"),
            new ServiceCheckDef("Fraud Detection Service", 8084, "HTTP / Redis / Feign", "/api/v1/fraud/**", "Velocity, Spike Multiplier & 90% Balance Rules", "http://localhost:8084/actuator/health"),
            new ServiceCheckDef("Notification Service", 8085, "HTTP / JavaMail / SMS", "/api/v1/notifications/**", "Asynchronous Kafka Alerts, OTP Delivery (Email/SMS)", "http://localhost:8085/actuator/health")
    );

    @GetMapping("/health")
    public Mono<ResponseEntity<Map<String, Object>>> getSystemTopologyHealth() {
        long startTime = System.currentTimeMillis();

        // 1. Check HTTP Microservices in parallel
        Flux<Map<String, Object>> httpChecks = Flux.fromIterable(HTTP_SERVICES)
                .flatMap(svc -> {
                    if (svc.port == 8080) {
                        Map<String, Object> map = createResultMap(svc, "UP", 1, "Service operational (self)");
                        return Mono.just(map);
                    }
                    long t0 = System.currentTimeMillis();
                    return webClient.get()
                            .uri(svc.healthUrl)
                            .retrieve()
                            .bodyToMono(Map.class)
                            .timeout(Duration.ofMillis(2000))
                            .map(resp -> {
                                long latency = System.currentTimeMillis() - t0;
                                String status = "UP";
                                if (resp != null && resp.containsKey("status")) {
                                    status = resp.get("status").toString().toUpperCase();
                                }
                                return createResultMap(svc, status, latency, "Actuator status: " + status);
                            })
                            .onErrorResume(err -> {
                                long latency = System.currentTimeMillis() - t0;
                                return Mono.just(createResultMap(svc, "DOWN", latency, "Unreachable: " + err.getMessage()));
                            });
                });

        return httpChecks.collectList().map(results -> {
            // 2. Check Redis
            Map<String, Object> redisResult = checkSocketOrRedis("Redis Cache & Rate Limiter", 6379, "TCP / Redis", "Port 6379", "OTP Storage, Velocity Window & Rate Limiter");
            results.add(redisResult);

            // 3. Check Kafka
            Map<String, Object> kafkaResult = checkSocketOrRedis("Apache Kafka Broker", 9092, "PLAINTEXT / TCP", "Port 9092", "Distributed Event Streaming & SAGA Bus");
            results.add(kafkaResult);

            // 4. Check MySQL
            Map<String, Object> mysqlResult = checkSocketOrRedis("MySQL 8.0 Database", 3306, "JDBC / TCP", "Port 3306", "auth_db, account_db, payment_db Storage");
            results.add(mysqlResult);

            // Aggregate overall
            boolean allUp = results.stream().allMatch(r -> "UP".equalsIgnoreCase((String) r.get("status")));
            boolean anyDown = results.stream().anyMatch(r -> "DOWN".equalsIgnoreCase((String) r.get("status")));
            String overall = allUp ? "UP" : (anyDown ? "DEGRADED" : "UP");

            Map<String, Object> response = new HashMap<>();
            response.put("timestamp", System.currentTimeMillis());
            response.put("overallStatus", overall);
            response.put("totalServices", results.size());
            response.put("healthyServices", results.stream().filter(r -> "UP".equalsIgnoreCase((String) r.get("status"))).count());
            response.put("services", results);
            response.put("executionTimeMs", System.currentTimeMillis() - startTime);

            return ResponseEntity.ok(response);
        });
    }

    private Map<String, Object> checkSocketOrRedis(String name, int port, String protocol, String routePrefix, String role) {
        long t0 = System.currentTimeMillis();
        boolean reachable = isSocketAlive("localhost", port, 1500);
        long latency = System.currentTimeMillis() - t0;

        ServiceCheckDef def = new ServiceCheckDef(name, port, protocol, routePrefix, role, null);
        String status = reachable ? "UP" : "DOWN";
        String details = reachable ? "TCP port " + port + " listening & accepting connections" : "Port " + port + " connection refused / offline";
        return createResultMap(def, status, latency, details);
    }

    private boolean isSocketAlive(String host, int port, int timeoutMs) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), timeoutMs);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Map<String, Object> createResultMap(ServiceCheckDef def, String status, long responseTimeMs, String details) {
        Map<String, Object> map = new HashMap<>();
        map.put("name", def.name);
        map.put("port", def.port);
        map.put("protocol", def.protocol);
        map.put("routePrefix", def.routePrefix);
        map.put("role", def.role);
        map.put("status", status);
        map.put("responseTimeMs", responseTimeMs);
        map.put("details", details);
        return map;
    }
}
