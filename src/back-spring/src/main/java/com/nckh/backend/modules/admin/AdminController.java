package com.nckh.backend.modules.admin;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.users.UserRepository;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('superadmin')")
public class AdminController {

    private final UserRepository userRepository;
    private final SystemConfigRepository systemConfigRepository;

    public AdminController(UserRepository userRepository, SystemConfigRepository systemConfigRepository) {
        this.userRepository = userRepository;
        this.systemConfigRepository = systemConfigRepository;
    }

    @GetMapping("/users")
    public ApiResponse<List<Map<String, Object>>> users() {
        List<Map<String, Object>> rows = userRepository.findAll().stream()
            .map(u -> Map.<String, Object>of(
                "id", u.getId(),
                "name", u.getName(),
                "email", u.getEmail(),
                "role", u.getRole().name(),
                "isActive", u.isActive(),
                "isLocked", u.isLocked()
            )).toList();
        return ApiResponse.ok(rows);
    }

    @GetMapping("/configs")
    public ApiResponse<List<SystemConfig>> configs() {
        return ApiResponse.ok(systemConfigRepository.findAll());
    }

    @PutMapping("/configs/{key}")
    public ApiResponse<SystemConfig> updateConfig(@PathVariable String key, @RequestBody UpdateConfigRequest req) {
        SystemConfig cfg = systemConfigRepository.findByKey(key)
            .orElseThrow(() -> new IllegalArgumentException("Config khong ton tai"));
        cfg.setValue(req.value());
        if (req.label() != null) cfg.setLabel(req.label());
        return ApiResponse.ok(systemConfigRepository.save(cfg), "Cap nhat config thanh cong");
    }

    public record UpdateConfigRequest(String value, String label) {}
}
