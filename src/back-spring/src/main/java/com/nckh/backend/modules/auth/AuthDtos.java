package com.nckh.backend.modules.auth;

import com.nckh.backend.modules.users.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class AuthDtos {

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record LogoutRequest(@NotBlank String refreshToken) {}

    public record UserPayload(String id, String name, String email, UserRole role) {}

    public record LoginResponse(String accessToken, String refreshToken, UserPayload user) {}

    public record RefreshResponse(String accessToken) {}
}
