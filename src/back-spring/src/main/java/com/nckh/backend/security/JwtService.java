package com.nckh.backend.security;

import com.nckh.backend.modules.users.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.util.Date;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    @Value("${app.security.jwt.secret}")
    private String secret;

    @Value("${app.security.jwt.access-expiration-ms}")
    private long accessExpirationMs;

    @Value("${app.security.jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    public String generateAccessToken(User user) {
        return generateToken(user, accessExpirationMs);
    }

    public String generateRefreshToken(User user) {
        return generateToken(user, refreshExpirationMs);
    }

    private String generateToken(User user, long expirationMs) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
            .subject(user.getEmail())
            .claim("uid", user.getId())
            .claim("role", user.getRole().name())
            .claim("name", user.getName())
            .issuedAt(now)
            .expiration(expiry)
            .signWith(getSigningKey())
            .compact();
    }

    public String extractEmail(String token) {
        return extractClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        Claims claims = extractClaims(token);
        return claims.getExpiration().after(new Date());
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
            .verifyWith((javax.crypto.SecretKey) getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private Key getSigningKey() {
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
        } catch (Exception ex) {
            keyBytes = secret.getBytes();
        }
        return Keys.hmacShaKeyFor(keyBytes.length >= 32 ? keyBytes : padKey(keyBytes));
    }

    private byte[] padKey(byte[] keyBytes) {
        byte[] out = new byte[32];
        for (int i = 0; i < out.length; i++) {
            out[i] = keyBytes[i % keyBytes.length];
        }
        return out;
    }
}
