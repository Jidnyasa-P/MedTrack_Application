package com.medtrack.auth.service;

import com.medtrack.auth.dto.AuthResponse;
import com.medtrack.auth.dto.LoginRequest;
import com.medtrack.auth.dto.LoginResponse;
import com.medtrack.auth.dto.RegisterRequest;
import com.medtrack.auth.model.User;
import com.medtrack.auth.model.AccountStatus;
import com.medtrack.auth.repository.UserRepository;
import com.medtrack.auth.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.LockedException;
import java.time.LocalDateTime;

import java.util.List;

/**
 * UserService encapsulates the business logic for user management, credential validation,
 * account registration, and authentication token provisioning.
 *
 * <p>Key features:
 * <ul>
 *   <li><strong>User Registration:</strong> Validates role compatibility, email uniqueness, and encrypts plain text passwords.</li>
 *   <li><strong>User Authentication:</strong> Validates user credentials against encrypted stored hash values.</li>
 *   <li><strong>Token Provisioning:</strong> Delegates to {@link JwtUtil} to issue JWT tokens with appropriate role-based authorization claims.</li>
 * </ul>
 * </p>
 *
 * <p>Annotations used:
 * <ul>
 *   <li>{@code @Service}: Marks this class as a Spring service component to indicate it holds business logic.</li>
 *   <li>{@code @RequiredArgsConstructor}: Lombok annotation generating a constructor for all {@code final} fields, facilitating Dependency Injection.</li>
 * </ul>
 * </p>
 */
@Service
@RequiredArgsConstructor
public class UserService {

    /**
     * List of acceptable security roles within the application system.
     * Roles must match authorized paths configured in security configurations.
     */
    private static final List<String> VALID_ROLES = List.of("HOSPITAL", "TECHNICIAN", "SUPPLIER");

    /**
     * Token lifetime in milliseconds. This value must correspond directly with {@link JwtUtil#EXPIRATION_MS}
     * to keep client-side session timeout synchronization synchronization accurate.
     */
    private static final long TOKEN_EXPIRATION_MS = 1000 * 60 * 15;

    /**
     * Repository interface for performing CRUD operations on the User table.
     */
    private final UserRepository userRepository;

    /**
     * Password encoder used to secure raw credentials via cryptographic hashing before database persistence.
     */
    private final PasswordEncoder passwordEncoder;

    /**
     * Utility component used to sign and build JWT tokens for authenticated users.
     */
    private final JwtUtil jwtUtil;

    /**
     * Service responsible for managing database-backed refresh tokens.
     */
    private final RefreshTokenService refreshTokenService;
    private final AuthenticationManager authenticationManager;

    @Value("${security.account.lock-duration:30}")
    private int lockDurationMinutes;

    /**
     * Registers a new user account in the application database.
     * Enforces unique email check and valid system role assignment, then encodes the password using BCrypt.
     *
     * @param request the registration details DTO
     * @return the {@link AuthResponse} containing user profile information and generated JWT token
     * @throws RuntimeException if the email already exists in the database or if an invalid role is provided
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Enforce username uniqueness constraint prior to registration
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }

        // Enforce email uniqueness constraint prior to registration
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        // Normalize the role string casing to uppercase for consistency in authorization checks; defaults to HOSPITAL
        String role = request.getRole() != null ? request.getRole().toUpperCase() : "HOSPITAL";

        // Validate that the assigned role is mapped to one of the authorized application roles
        if (!VALID_ROLES.contains(role)) {
            throw new RuntimeException("Invalid role. Must be one of: HOSPITAL, TECHNICIAN, SUPPLIER");
        }

        // Map the RegisterRequest DTO to the User database entity and encode raw password
        User user = User.builder()
                .name(request.getName())
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .accountStatus(AccountStatus.ACTIVE)
                .build();
        
        // Persist the user record to the database
        User savedUser = userRepository.save(user);

        // Map the persisted user to authentication response payload containing JWT token
        return mapToAuthResponse(savedUser);
    }

    /**
     * Authenticates an existing user by matching their login credentials against stored credentials.
     * <p>
     * Security notes:
     * <ul>
     *   <li>Email is normalised to lowercase before lookup to avoid case-sensitivity issues.</li>
     *   <li>A generic "Invalid credentials" error is returned for wrong email, wrong password,
     *       <em>and</em> wrong role so that callers cannot enumerate valid email addresses.</li>
     * </ul>
     *
     * @param loginRequest DTO containing the user's login email, plain-text password, and requested role
     * @return the {@link LoginResponse} containing the user profile and a signed JWT access token
     * @throws BadCredentialsException if credentials or role do not match
     */
    @Transactional(noRollbackFor = {BadCredentialsException.class, LockedException.class})
    public LoginResponse login(LoginRequest loginRequest) {
        // Normalize email to lowercase before lookup
        String normalizedEmail = loginRequest.getEmail().trim().toLowerCase();

        // Use a generic error message to avoid revealing whether the email exists (anti-enumeration)
        final BadCredentialsException invalidCredentials =
                new BadCredentialsException("Invalid credentials. Please check your email, password, and role.");

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> invalidCredentials);

        // Check if user account is locked
        if (user.getAccountStatus() == AccountStatus.LOCKED || user.getAccountLockedUntil() != null) {
            if (user.getAccountLockedUntil() != null && LocalDateTime.now().isAfter(user.getAccountLockedUntil())) {
                // Lock expired – perform automatic unlock
                user.setAccountStatus(AccountStatus.ACTIVE);
                user.setAccountLockedUntil(null);
                user.setFailedLoginAttempts(0);
                user = userRepository.save(user);
            } else {
                throw new LockedException("Account is temporarily locked. Please try again later.");
            }
        }

        // Verify role: compare the stored role against the requested role (both uppercased)
        String requestedRole = loginRequest.getRole().toUpperCase();
        if (!user.getRole().toUpperCase().equals(requestedRole)) {
            throw invalidCredentials;
        }

        // Verify password using bcrypt
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            if (user.getAccountStatus() == AccountStatus.ACTIVE) {
                int newAttempts = user.getFailedLoginAttempts() + 1;
                if (newAttempts >= 5) {
                    user.setAccountStatus(AccountStatus.LOCKED);
                    user.setAccountLockedUntil(LocalDateTime.now().plusMinutes(lockDurationMinutes));
                    user.setFailedLoginAttempts(0);
                } else {
                    user.setFailedLoginAttempts(newAttempts);
                }
                userRepository.save(user);
            }
            throw invalidCredentials;
        }

        // Successful login: reset failed-attempt counters
        user.setFailedLoginAttempts(0);
        user.setAccountLockedUntil(null);
        user.setAccountStatus(AccountStatus.ACTIVE);
        User savedUser = userRepository.save(user);

        // Generate JWT access token
        String token = jwtUtil.generateToken(savedUser.getEmail(), savedUser.getRole());

        // Build and return the structured login response
        return LoginResponse.builder()
                .success(true)
                .message("Login successful")
                .token(token)
                .user(LoginResponse.UserPayload.builder()
                        .id(savedUser.getId())
                        .name(savedUser.getName())
                        .email(savedUser.getEmail())
                        .phone(savedUser.getPhone())
                        .organization(savedUser.getOrganization())
                        .role(savedUser.getRole().toUpperCase())
                        .build())
                .build();
    }


    /**
     * Helper mapping method to transform a {@link User} domain model entity into a response-friendly
     * DTO payload, generating a secure JWT token containing the user's authentication details.
     *
     * @param user the authenticated {@link User} entity
     * @return the fully populated {@link AuthResponse} object
     */
    private AuthResponse mapToAuthResponse(User user) {
        // Request a new JWT token signed with user's email and role claims
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        String refreshToken = refreshTokenService.createRefreshToken(user.getId()).getToken();

        // Build and return the response DTO
        return AuthResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .token(token)
                .refreshToken(refreshToken)
                .expiresIn(TOKEN_EXPIRATION_MS)
                .build();
    }

    /**
     * Issues a new access token (and rotates the refresh token) given a valid refresh token.
     *
     * @param requestRefreshToken the refresh token submitted by the client
     * @return the new {@link AuthResponse} containing rotated tokens
     */
    @Transactional
    public AuthResponse refreshAccessToken(String requestRefreshToken) {
        var refreshToken = refreshTokenService.verifyToken(requestRefreshToken);

        User user = userRepository.findById(refreshToken.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Rotate: revoke old refresh token, issue a brand new one
        refreshTokenService.revokeToken(requestRefreshToken);

        return mapToAuthResponse(user);
    }

    /**
     * Logs the user out by revoking the specified refresh token.
     *
     * @param refreshToken the refresh token to revoke
     */
    @Transactional
    public void logout(String refreshToken) {
        refreshTokenService.revokeToken(refreshToken);
    }
}
