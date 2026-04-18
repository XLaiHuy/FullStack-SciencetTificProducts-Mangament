package com.nckh.backend.modules.auth;

import com.nckh.backend.modules.auth.AuthDtos.*;
import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRepository;
import com.nckh.backend.security.JwtService;
import java.time.Instant;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;

    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${spring.mail.username:no-reply@nckh.local}")
    private String mailFrom;

    @Value("${app.security.jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    public AuthService(
        UserRepository userRepository,
        RefreshTokenRepository refreshTokenRepository,
        JwtService jwtService,
        PasswordEncoder passwordEncoder,
        @org.springframework.beans.factory.annotation.Autowired(required = false) JavaMailSender mailSender
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
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
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            refreshTokenRepository.deleteByToken(request.refreshToken());
        }
    }

    public void logoutAllByUserId(String userId) {
        if (userId != null && !userId.isBlank()) {
            refreshTokenRepository.deleteByUserId(userId);
        }
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        // Keep response neutral to avoid user enumeration.
        userRepository.findByEmailAndIsDeletedFalse(request.email()).ifPresent(user -> {
            try {
                String encodedToken = URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8);
                String resetLink = frontendBaseUrl + "/reset-password?token=" + encodedToken + "&email=" + URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8);

                if (mailSender != null) {
                    SimpleMailMessage message = new SimpleMailMessage();
                    message.setFrom(mailFrom);
                    message.setTo(user.getEmail());
                    message.setSubject("Huong dan dat lai mat khau - He thong NCKH");
                    message.setText("Xin chao " + user.getName() + ",\n\nVui long truy cap lien ket sau de dat lai mat khau:\n" + resetLink + "\n\nNeu ban khong yeu cau, hay bo qua email nay.");
                    mailSender.send(message);
                } else {
                    log.info("Mail sender is not configured. Reset link (masked) generated for {}", user.getEmail());
                }
            } catch (Exception ex) {
                // Do not leak mail failures to caller; keep endpoint behavior compatible.
                log.warn("Forgot-password email send failed for {}: {}", user.getEmail(), ex.getMessage());
            }
        });
    }

    public void resetPassword(ResetPasswordRequest request) {
        String email = request.email();
        if ((email == null || email.isBlank()) && request.token() != null && request.token().contains("@")) {
            email = request.token();
        }
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Thong tin dat lai mat khau khong hop le");
        }

        User user = userRepository.findByEmailAndIsDeletedFalse(email)
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
