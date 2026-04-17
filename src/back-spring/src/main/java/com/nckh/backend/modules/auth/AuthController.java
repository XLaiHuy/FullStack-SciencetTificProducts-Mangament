package com.nckh.backend.modules.auth;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.auth.AuthDtos.*;
import com.nckh.backend.modules.users.User;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request), "Dang nhap thanh cong");
    }

    @PostMapping("/refresh")
    public ApiResponse<RefreshResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.ok(authService.refresh(request), "Token duoc lam moi");
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@Valid @RequestBody LogoutRequest request) {
        authService.logout(request);
        return ApiResponse.ok(null, "Dang xuat thanh cong");
    }

    @GetMapping("/me")
    public ApiResponse<UserPayload> me(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(authService.me(user));
    }
}
