package com.shiva.SpringSecEx;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiva.SpringSecEx.controller.UserController;
import com.shiva.SpringSecEx.dto.AuthResponse;
import com.shiva.SpringSecEx.dto.LoginRequest;
import com.shiva.SpringSecEx.dto.RegisterRequest;
import com.shiva.SpringSecEx.dto.UserResponse;
import com.shiva.SpringSecEx.exception.GlobalExceptionHandler;
import com.shiva.SpringSecEx.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class UserControllerTests {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @InjectMocks
    private UserController userController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(userController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/v1/auth/register succeeds with 201 Created and valid JWT token")
    void testRegister_Success() throws Exception {
        RegisterRequest request = new RegisterRequest("john_doe", "password123", "john@example.com");
        AuthResponse authResponse = new AuthResponse(
                "token-12345",
                10L,
                "john_doe",
                "john@example.com",
                "ROLE_USER"
        );

        when(userService.registerUser(any(RegisterRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("john_doe"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"))
                .andExpect(jsonPath("$.token").value("token-12345"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/register returns 400 Bad Request when validation fails")
    void testRegister_ValidationFailure() throws Exception {
        // Missing username, short password, invalid email
        RegisterRequest invalidRequest = new RegisterRequest("", "123", "invalid-email");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Validation Error"))
                .andExpect(jsonPath("$.fieldErrors").exists());
    }

    @Test
    @DisplayName("POST /api/v1/auth/register returns 400 Bad Request when duplicate username is detected")
    void testRegister_DuplicateUsername() throws Exception {
        RegisterRequest request = new RegisterRequest("existing_user", "password123", "exist@example.com");

        when(userService.registerUser(any(RegisterRequest.class)))
                .thenThrow(new IllegalArgumentException("Username 'existing_user' is already taken"));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Username 'existing_user' is already taken"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login succeeds with 200 OK and JWT token")
    void testLogin_Success() throws Exception {
        LoginRequest request = new LoginRequest("admin", "Admin@12345");
        AuthResponse authResponse = new AuthResponse(
                "admin-token-xyz",
                1L,
                "admin",
                "admin@bank.local",
                "ROLE_ADMIN"
        );

        when(userService.loginUser(any(LoginRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("admin"))
                .andExpect(jsonPath("$.role").value("ROLE_ADMIN"))
                .andExpect(jsonPath("$.token").value("admin-token-xyz"));
    }

    @Test
    @DisplayName("POST /api/v1/auth/login returns 401 Unauthorized on invalid credentials")
    void testLogin_BadCredentials() throws Exception {
        LoginRequest request = new LoginRequest("admin", "WrongPassword");

        when(userService.loginUser(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid username or password"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("GET /api/v1/auth/me returns current user profile")
    void testGetCurrentUser_Success() throws Exception {
        UserResponse profile = new UserResponse(2L, "john_doe", "john@example.com", "ROLE_USER", LocalDateTime.now());
        when(userService.getProfile("john_doe")).thenReturn(profile);

        Authentication auth = new UsernamePasswordAuthenticationToken("john_doe", null, List.of());

        mockMvc.perform(get("/api/v1/auth/me").principal(auth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("john_doe"))
                .andExpect(jsonPath("$.email").value("john@example.com"));
    }

    @Test
    @DisplayName("GET /api/v1/auth/users returns all users list")
    void testGetAllUsers_Success() throws Exception {
        UserResponse u1 = new UserResponse(1L, "admin", "admin@bank.local", "ROLE_ADMIN", LocalDateTime.now());
        UserResponse u2 = new UserResponse(2L, "user1", "user1@bank.local", "ROLE_USER", LocalDateTime.now());

        when(userService.getAllUsers()).thenReturn(List.of(u1, u2));

        mockMvc.perform(get("/api/v1/auth/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].username").value("admin"))
                .andExpect(jsonPath("$[1].username").value("user1"));
    }
}
