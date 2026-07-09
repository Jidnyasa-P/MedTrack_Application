package com.medtrack.auth.controller;

import com.medtrack.auth.dto.AuthResponse;
import com.medtrack.auth.dto.LoginRequest;
import com.medtrack.auth.dto.RefreshTokenRequest;
import com.medtrack.auth.dto.RegisterRequest;
import com.medtrack.auth.model.User;
import com.medtrack.auth.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * AuthController exposes the REST endpoints for user authentication operations,
 * specifically handling new user registration, user login, token refresh, and logout requests.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final UserService userService;

    /**
     * Registers a new user within the application database.
     *
     * @param registerRequest the {@link RegisterRequest} DTO.
     * @return a {@link ResponseEntity} wrapping the {@link AuthResponse}.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        return ResponseEntity.ok(userService.register(registerRequest));
    }

    /**
     * Authenticates an existing user using their email and password.
     *
     * @param loginRequest the {@link LoginRequest} DTO.
     * @return a {@link ResponseEntity} wrapping the {@link AuthResponse}.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(userService.login(loginRequest));
    }

    /**
     * Issues a new access token and a rotated refresh token using a valid refresh token.
     *
     * @param request the request DTO containing the current refresh token
     * @return the {@link AuthResponse} containing the new tokens
     */
    @PostMapping("/refresh-token")
    public ResponseEntity<AuthResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(userService.refreshAccessToken(request.getRefreshToken()));
    }

    /**
     * Revokes the provided refresh token, performing a user logout.
     *
     * @param request the request DTO containing the refresh token to revoke
     * @return HTTP 204 No Content
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        userService.logout(request.getRefreshToken());
        return ResponseEntity.noContent().build();
    }
}
