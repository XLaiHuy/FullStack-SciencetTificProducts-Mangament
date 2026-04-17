package com.nckh.backend.modules.auth;

import com.nckh.backend.modules.auth.AuthDtos.*;
import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRepository;
import com.nckh.backend.security.JwtService;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.security.jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    public AuthService(
        UserRepository userRepository,
        RefreshTokenRepository refreshTokenRepository,
        JwtService jwtService,
        PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmailAndIsDeletedFalse(request.email())
            .orElseThrow(() -> new IllegalArgumentException("Email hoac mat khau khong dung"));

        if (!user.isEnabled()) {
            throw new IllegalArgumentException("Tai khoan khong hoat dong");
        }

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new IllegalArgumentException("Email hoac mat khau khong dung");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setToken(refreshToken);
        token.setExpiresAt(Instant.now().plusMillis(refreshExpirationMs));
        refreshTokenRepository.save(token);

        return new LoginResponse(accessToken, refreshToken, toPayload(user));
    }

    public RefreshResponse refresh(RefreshRequest request) {
        refreshTokenRepository.findByTokenAndExpiresAtAfter(request.refreshToken(), Instant.now())
            .orElseThrow(() -> new IllegalArgumentException("Refresh token khong hop le hoac het han"));

        String email = jwtService.extractEmail(request.refreshToken());

        User user = userRepository.findByEmailAndIsDeletedFalse(email)
            .orElseThrow(() -> new IllegalArgumentException("Nguoi dung khong ton tai"));

        if (!user.isEnabled()) {
            throw new IllegalArgumentException("Tai khoan khong hoat dong");
        }

        return new RefreshResponse(jwtService.generateAccessToken(user));
    }

    public void logout(LogoutRequest request) {
        refreshTokenRepository.deleteByToken(request.refreshToken());
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        // Keep response neutral to avoid user enumeration.
        userRepository.findByEmailAndIsDeletedFalse(request.email()).ifPresent(user -> {
            // Placeholder for email integration in next phase.
        });
    }

    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByEmailAndIsDeletedFalse(request.email())
            .orElseThrow(() -> new IllegalArgumentException("Tai khoan khong ton tai"));

        if (request.newPassword().length() < 6) {
            throw new IllegalArgumentException("Mat khau moi phai co it nhat 6 ky tu");
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    public void changePassword(User actor, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), actor.getPassword())) {
            throw new IllegalArgumentException("Mat khau hien tai khong dung");
        }

        if (request.newPassword().length() < 6) {
            throw new IllegalArgumentException("Mat khau moi phai co it nhat 6 ky tu");
        }

        actor.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(actor);
        refreshTokenRepository.deleteByUserId(actor.getId());
    }

    public UserPayload me(User user) {
        return toPayload(user);
    }

    private UserPayload toPayload(User user) {
        return new UserPayload(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
