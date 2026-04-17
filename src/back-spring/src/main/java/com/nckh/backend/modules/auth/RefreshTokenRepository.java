package com.nckh.backend.modules.auth;

import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByTokenAndExpiresAtAfter(String token, Instant now);
    void deleteByToken(String token);
    void deleteByUserId(String userId);
}
