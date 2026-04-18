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
    public ApiResponse<Void> logout(@AuthenticationPrincipal User user, @RequestBody(required = false) LogoutRequest request) {
        authService.logout(request);
        if (user != null) {
            authService.logoutAllByUserId(user.getId());
        }
        return ApiResponse.ok(null, "Dang xuat thanh cong");
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ApiResponse.ok(null, "Neu email ton tai, he thong se gui huong dan dat lai mat khau");
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.ok(null, "Dat lai mat khau thanh cong");
    }

    @PutMapping("/change-password")
    public ApiResponse<Void> changePassword(@AuthenticationPrincipal User user, @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(user, request);
        return ApiResponse.ok(null, "Doi mat khau thanh cong");
    }

    @GetMapping("/me")
    public ApiResponse<UserPayload> me(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(authService.me(user));
    }
}
