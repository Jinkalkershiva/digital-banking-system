package com.banking.apigateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

@Slf4j
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    @Value("${jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B597020}")
    private String secretKey;

    private static final List<String> PUBLIC_ENDPOINTS = List.of(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/login",
            "/register",
            "/api/v1/payments/webhook",
            "/actuator",
            "/favicon.ico"
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // 1. Allow public endpoints & CORS preflights without requiring valid JWT
        if (isPublicRequest(request)) {
            String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                try {
                    String token = authHeader.substring(7).trim();
                    Claims claims = validateAndExtractClaims(token);
                    String username = claims.getSubject();
                    Object idObj = claims.get("id");
                    String userId = idObj != null ? idObj.toString() : "";
                    String role = claims.get("role", String.class);
                    String email = claims.get("email", String.class);

                    ServerHttpRequest mutatedRequest = request.mutate()
                            .header("X-User-Id", userId)
                            .header("X-User-Name", username != null ? username : "")
                            .header("X-User-Role", role != null ? role : "ROLE_USER")
                            .header("X-User-Email", email != null ? email : "")
                            .build();
                    return chain.filter(exchange.mutate().request(mutatedRequest).build());
                } catch (Exception ignored) {
                    // Stale or invalid token on public endpoints must NEVER block registration or public access
                    log.debug("Ignoring invalid/stale token on public endpoint: {}", path);
                }
            }
            return chain.filter(exchange);
        }

        // 2. Extract Authorization header
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("Unauthorized access attempt to {}: Missing or malformed Authorization header", path);
            return onError(exchange, HttpStatus.UNAUTHORIZED, "Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7).trim();

        // 3. Validate JWT
        Claims claims;
        try {
            claims = validateAndExtractClaims(token);
        } catch (Exception e) {
            log.warn("Invalid JWT token for path {}: {}", path, e.getMessage());
            return onError(exchange, HttpStatus.UNAUTHORIZED, "Invalid or expired JWT token: " + e.getMessage());
        }

        // 4. Check Role for Admin endpoints (/api/v1/admin/** or admin endpoints)
        String role = claims.get("role", String.class);
        if (path.startsWith("/api/v1/admin/")) {
            if (role == null || (!role.equalsIgnoreCase("ROLE_ADMIN") && !role.equalsIgnoreCase("ADMIN"))) {
                log.warn("Forbidden access attempt to {} with role {}", path, role);
                return onError(exchange, HttpStatus.FORBIDDEN, "Access denied: Admin role required");
            }
        }

        // 5. Enrich downstream headers
        String username = claims.getSubject();
        Object idObj = claims.get("id");
        String userId = idObj != null ? idObj.toString() : "";
        String email = claims.get("email", String.class);

        ServerHttpRequest mutatedRequest = request.mutate()
                .header("X-User-Id", userId)
                .header("X-User-Name", username != null ? username : "")
                .header("X-User-Role", role != null ? role : "ROLE_USER")
                .header("X-User-Email", email != null ? email : "")
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    private boolean isPublicRequest(ServerHttpRequest request) {
        String path = request.getURI().getPath();
        String method = request.getMethod().name();

        if (method.equalsIgnoreCase("OPTIONS")) {
            return true;
        }
        // Account creation during registration is public
        if (method.equalsIgnoreCase("POST") && (path.equals("/api/v1/accounts") || path.equals("/api/v1/accounts/"))) {
            return true;
        }
        return PUBLIC_ENDPOINTS.stream().anyMatch(p -> path.equals(p) || path.startsWith(p + "/") || (p.equals("/actuator") && path.startsWith("/actuator")));
    }

    private Claims validateAndExtractClaims(String token) {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        SecretKey key = Keys.hmacShaKeyFor(keyBytes);

        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        if (claims.getExpiration().before(new Date())) {
            throw new RuntimeException("Token expired");
        }
        return claims;
    }

    private Mono<Void> onError(ServerWebExchange exchange, HttpStatus status, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = String.format("{\"timestamp\":%d,\"status\":%d,\"error\":\"%s\",\"message\":\"%s\"}",
                System.currentTimeMillis(), status.value(), status.getReasonPhrase(), message);

        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
