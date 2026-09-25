package com.shiva.SpringSecEx.controller;

import com.shiva.SpringSecEx.dto.AuthResponse;
import com.shiva.SpringSecEx.dto.LoginRequest;
import com.shiva.SpringSecEx.dto.RegisterRequest;
import com.shiva.SpringSecEx.dto.UserResponse;
import com.shiva.SpringSecEx.model.Users;
import com.shiva.SpringSecEx.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class UserController {

    @Autowired
    private UserService service;

    @PostMapping({"/api/v1/auth/register", "/register"})
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = service.registerUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping({"/api/v1/auth/login", "/login"})
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = service.loginUser(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/auth/me")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserResponse response = service.getProfile(authentication.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/auth/users")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        return ResponseEntity.ok(service.getAllUsers());
    }
}
