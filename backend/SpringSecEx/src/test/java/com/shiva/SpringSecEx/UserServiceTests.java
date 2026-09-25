package com.shiva.SpringSecEx;

import com.shiva.SpringSecEx.dto.AuthResponse;
import com.shiva.SpringSecEx.dto.LoginRequest;
import com.shiva.SpringSecEx.dto.RegisterRequest;
import com.shiva.SpringSecEx.dto.UserResponse;
import com.shiva.SpringSecEx.model.Users;
import com.shiva.SpringSecEx.repo.UserRepo;
import com.shiva.SpringSecEx.service.JWTService;
import com.shiva.SpringSecEx.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTests {

    @Mock
    private UserRepo userRepo;

    @Mock
    private AuthenticationManager authManager;

    @Mock
    private JWTService jwtService;

    @InjectMocks
    private UserService userService;

    private Users testUser;

    @BeforeEach
    void setUp() {
        testUser = new Users(1L, "testuser", "$2a$12$hashedpassword", "test@bank.local", "ROLE_USER");
    }

    @Test
    @DisplayName("Registration successfully persists user with ROLE_USER and generates JWT")
    void testRegisterUser_Success() {
        RegisterRequest request = new RegisterRequest("newuser", "password123", "newuser@bank.local");

        when(userRepo.existsByUsername("newuser")).thenReturn(false);
        when(userRepo.existsByEmail("newuser@bank.local")).thenReturn(false);
        when(userRepo.save(any(Users.class))).thenAnswer(invocation -> {
            Users u = invocation.getArgument(0);
            u.setId(10L);
            return u;
        });
        when(jwtService.generateToken(any(Users.class))).thenReturn("mock.jwt.token");

        AuthResponse response = userService.registerUser(request);

        assertNotNull(response);
        assertEquals("newuser", response.getUsername());
        assertEquals("ROLE_USER", response.getRole(), "Must strictly enforce ROLE_USER upon public registration");
        assertEquals("mock.jwt.token", response.getToken());
        verify(userRepo, times(1)).save(any(Users.class));
    }

    @Test
    @DisplayName("Registration rejects duplicate username with clear error message")
    void testRegisterUser_DuplicateUsername_ThrowsException() {
        RegisterRequest request = new RegisterRequest("existinguser", "password123", "email@bank.local");
        when(userRepo.existsByUsername("existinguser")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            userService.registerUser(request);
        });

        assertTrue(ex.getMessage().contains("already taken"));
        verify(userRepo, never()).save(any(Users.class));
    }

    @Test
    @DisplayName("Registration rejects duplicate email with clear error message")
    void testRegisterUser_DuplicateEmail_ThrowsException() {
        RegisterRequest request = new RegisterRequest("uniqueuser", "password123", "duplicate@bank.local");
        when(userRepo.existsByUsername("uniqueuser")).thenReturn(false);
        when(userRepo.existsByEmail("duplicate@bank.local")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            userService.registerUser(request);
        });

        assertTrue(ex.getMessage().contains("already registered"));
        verify(userRepo, never()).save(any(Users.class));
    }

    @Test
    @DisplayName("Registration throws IllegalArgumentException when mandatory fields are blank")
    void testRegisterUser_BlankFields_ThrowsException() {
        RegisterRequest blankUser = new RegisterRequest("", "password123", "user@bank.local");
        assertThrows(IllegalArgumentException.class, () -> userService.registerUser(blankUser));

        RegisterRequest blankPass = new RegisterRequest("user", "", "user@bank.local");
        assertThrows(IllegalArgumentException.class, () -> userService.registerUser(blankPass));

        RegisterRequest blankEmail = new RegisterRequest("user", "password123", "");
        assertThrows(IllegalArgumentException.class, () -> userService.registerUser(blankEmail));
    }

    @Test
    @DisplayName("Login returns JWT and user profile for valid credentials")
    void testLoginUser_Success() {
        LoginRequest request = new LoginRequest("testuser", "password123");
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(authManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(userRepo.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(testUser)).thenReturn("valid.jwt.token");

        AuthResponse response = userService.loginUser(request);

        assertNotNull(response);
        assertEquals("valid.jwt.token", response.getToken());
        assertEquals("testuser", response.getUsername());
        assertEquals("ROLE_USER", response.getRole());
    }

    @Test
    @DisplayName("Login throws BadCredentialsException when authentication fails")
    void testLoginUser_BadCredentials_ThrowsException() {
        LoginRequest request = new LoginRequest("testuser", "wrongpassword");
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(false);
        when(authManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);

        assertThrows(BadCredentialsException.class, () -> {
            userService.loginUser(request);
        });
    }

    @Test
    @DisplayName("getProfile returns user data for registered username")
    void testGetProfile_Success() {
        when(userRepo.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        UserResponse response = userService.getProfile("testuser");

        assertNotNull(response);
        assertEquals("testuser", response.getUsername());
        assertEquals("test@bank.local", response.getEmail());
    }

    @Test
    @DisplayName("getProfile throws exception when username not found")
    void testGetProfile_NotFound_ThrowsException() {
        when(userRepo.findByUsername("unknown")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> {
            userService.getProfile("unknown");
        });
    }

    @Test
    @DisplayName("getAllUsers maps repository records to UserResponse DTOs")
    void testGetAllUsers() {
        when(userRepo.findAll()).thenReturn(List.of(testUser));

        List<UserResponse> list = userService.getAllUsers();

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals("testuser", list.get(0).getUsername());
    }

    @Test
    @DisplayName("initAdminUser automatically seeds admin account with ROLE_ADMIN when missing")
    void testInitAdminUser_CreatesAdminIfMissing() {
        when(userRepo.existsByRole("ROLE_ADMIN")).thenReturn(false);
        when(userRepo.existsByUsername("admin")).thenReturn(false);
        when(userRepo.save(any(Users.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.initAdminUser();

        verify(userRepo, times(1)).save(argThat(u ->
                "admin".equals(u.getUsername()) && "ROLE_ADMIN".equals(u.getRole())
        ));
    }
}
