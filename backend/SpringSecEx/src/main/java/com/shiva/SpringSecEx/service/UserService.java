package com.shiva.SpringSecEx.service;

import com.shiva.SpringSecEx.dto.AuthResponse;
import com.shiva.SpringSecEx.dto.LoginRequest;
import com.shiva.SpringSecEx.dto.RegisterRequest;
import com.shiva.SpringSecEx.dto.UserResponse;
import com.shiva.SpringSecEx.model.Users;
import com.shiva.SpringSecEx.repo.UserRepo;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private AuthenticationManager authManager;

    @Autowired
    private JWTService jwtService;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    @PostConstruct
    public void initAdminUser() {
        try {
            boolean hasAdmin = userRepo.existsByRole("ROLE_ADMIN") || userRepo.existsByUsername("admin");
            if (!hasAdmin) {
                String adminUser = System.getenv().getOrDefault("ADMIN_USERNAME", "admin");
                String adminEmail = System.getenv().getOrDefault("ADMIN_EMAIL", "admin@bank.local");
                String adminPass = System.getenv().getOrDefault("ADMIN_PASSWORD", "Admin@12345");

                Users admin = new Users();
                admin.setUsername(adminUser);
                admin.setEmail(adminEmail);
                admin.setPassword(encoder.encode(adminPass));
                admin.setRole("ROLE_ADMIN");

                userRepo.save(admin);
                log.info("Initialized default administrator account safely: username={}, email={}", adminUser, adminEmail);
            }
        } catch (Exception e) {
            log.warn("Admin initialization check skipped or delayed: {}", e.getMessage());
        }
    }

    public AuthResponse registerUser(RegisterRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        if (userRepo.existsByUsername(request.getUsername().trim())) {
            throw new IllegalArgumentException("Username '" + request.getUsername() + "' is already taken");
        }

        if (userRepo.existsByEmail(request.getEmail().trim())) {
            throw new IllegalArgumentException("Email '" + request.getEmail() + "' is already registered");
        }

        Users user = new Users();
        user.setUsername(request.getUsername().trim());
        user.setEmail(request.getEmail().trim());
        user.setPassword(encoder.encode(request.getPassword()));
        // Normal registration strictly enforces ROLE_USER (never allow client-specified admin)
        user.setRole("ROLE_USER");

        Users savedUser = userRepo.save(user);
        String token = jwtService.generateToken(savedUser);

        return new AuthResponse(
                token,
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getRole()
        );
    }

    public AuthResponse loginUser(LoginRequest request) {
        if (request.getUsername() == null || request.getPassword() == null) {
            throw new IllegalArgumentException("Username and password are required");
        }

        Authentication authentication = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername().trim(),
                        request.getPassword()
                )
        );

        if (!authentication.isAuthenticated()) {
            throw new BadCredentialsException("Invalid username or password");
        }

        Users user = userRepo.findByUsername(request.getUsername().trim())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String token = jwtService.generateToken(user);

        return new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole()
        );
    }

    public UserResponse getProfile(String username) {
        Users user = userRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole(),
                user.getCreatedAt()
        );
    }

    public List<UserResponse> getAllUsers() {
        return userRepo.findAll().stream()
                .map(u -> new UserResponse(
                        u.getId(),
                        u.getUsername(),
                        u.getEmail(),
                        u.getRole(),
                        u.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    // Backwards compatible method
    public Users register(Users user) {
        user.setPassword(encoder.encode(user.getPassword()));
        if (user.getRole() == null || user.getRole().isBlank()) {
            user.setRole("ROLE_USER");
        }
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            user.setEmail(user.getUsername() + "@bank.local");
        }
        return userRepo.save(user);
    }

    // Backwards compatible method
    public String verify(Users user) {
        Authentication authentication = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        user.getUsername(),
                        user.getPassword()
                )
        );
        if (authentication.isAuthenticated()) {
            Users dbUser = userRepo.findByUsername(user.getUsername()).orElse(user);
            return jwtService.generateToken(dbUser);
        }
        return "Fail";
    }
}
