package com.nckh.backend.modules.admin;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.projects.ProjectRepository;
import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRepository;
import com.nckh.backend.modules.users.UserRole;
import java.time.Instant;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@PreAuthorize("hasRole('superadmin')")
public class AdminController {

    private final UserRepository userRepository;
    private final SystemConfigRepository systemConfigRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;
    private final ProjectRepository projectRepository;

    public AdminController(
        UserRepository userRepository,
        SystemConfigRepository systemConfigRepository,
        CategoryRepository categoryRepository,
        PasswordEncoder passwordEncoder,
        ProjectRepository projectRepository
    ) {
        this.userRepository = userRepository;
        this.systemConfigRepository = systemConfigRepository;
        this.categoryRepository = categoryRepository;
        this.passwordEncoder = passwordEncoder;
        this.projectRepository = projectRepository;
    }

    @GetMapping("/dashboard")
    public ApiResponse<Map<String, Object>> dashboard() {
        long totalUsers = userRepository.countByIsDeletedFalse();
        long activeUsers = userRepository.countByIsActiveTrueAndIsDeletedFalse();
        long lockedUsers = userRepository.countByIsLockedTrueAndIsDeletedFalse();

        Map<UserRole, Long> roleCounts = new EnumMap<>(UserRole.class);
        List<User> activeUsersList = userRepository.findAllByIsDeletedFalse();
        for (UserRole role : UserRole.values()) {
            long cnt = activeUsersList.stream().filter(u -> u.getRole() == role).count();
            roleCounts.put(role, cnt);
        }

        return ApiResponse.ok(Map.<String, Object>ofEntries(
            Map.entry("totalUsers", totalUsers),
            Map.entry("activeUsers", activeUsers),
            Map.entry("lockedUsers", lockedUsers),
            Map.entry("systemConfigs", systemConfigRepository.count()),
            Map.entry("totalProjects", projectRepository.countByIsDeletedFalse()),
            Map.entry("auditLogsToday", 0L),
            Map.entry("roleCounts", roleCounts)
        ));
    }

    @GetMapping("/audit-logs")
    public ApiResponse<List<Map<String, Object>>> auditLogs(
        @RequestParam(value = "module", required = false) String module,
        @RequestParam(value = "user", required = false) String user,
        @RequestParam(value = "page", required = false, defaultValue = "1") Integer page,
        @RequestParam(value = "limit", required = false, defaultValue = "50") Integer limit
    ) {
        String moduleFilter = module == null ? "" : module.trim().toLowerCase(Locale.ROOT);
        String userFilter = user == null ? "" : user.trim().toLowerCase(Locale.ROOT);

        List<Map<String, Object>> logs = List.of(
            auditRow("audit-1", "system", "READ", "ADMIN", "Khoi tao he thong", null, Instant.now().toString()),
            auditRow("audit-2", "superadmin", "UPDATE", "CONFIG", "Cap nhat cau hinh", null, Instant.now().minusSeconds(3600).toString())
        ).stream()
            .filter(r -> moduleFilter.isBlank() || String.valueOf(r.get("module")).toLowerCase(Locale.ROOT).contains(moduleFilter))
            .filter(r -> userFilter.isBlank() || String.valueOf(r.get("userName")).toLowerCase(Locale.ROOT).contains(userFilter))
            .toList();

        int safePage = Math.max(page, 1);
        int safeLimit = Math.max(limit, 1);
        int from = Math.min((safePage - 1) * safeLimit, logs.size());
        int to = Math.min(from + safeLimit, logs.size());
        logs = logs.subList(from, to);
        return ApiResponse.ok(logs);
    }

    @GetMapping("/categories")
    public ApiResponse<List<CategoryItem>> categories(@RequestParam(value = "type", required = false) String type) {
        List<Category> entities;
        if (type == null || type.isBlank()) {
            entities = categoryRepository.findByIsActiveTrueOrderByTypeAscSortOrderAscCreatedAtAsc();
        } else {
            entities = categoryRepository.findByTypeAndIsActiveTrueOrderBySortOrderAscCreatedAtAsc(type.trim());
        }
        List<CategoryItem> values = entities.stream().map(this::toCategoryItem).toList();
        return ApiResponse.ok(values);
    }

    @PostMapping("/categories")
    public ApiResponse<CategoryItem> createCategory(@RequestBody CreateCategoryRequest req) {
        if (req.type() == null || req.type().isBlank() || req.value() == null || req.value().isBlank() || req.label() == null || req.label().isBlank()) {
            throw new IllegalArgumentException("Thong tin danh muc khong hop le");
        }
        Category category = new Category();
        category.setType(req.type().trim());
        category.setValue(req.value().trim());
        category.setLabel(req.label().trim());
        category.setSortOrder(req.sortOrder() == null ? 0 : req.sortOrder());
        category.setActive(true);
        Category saved = categoryRepository.save(category);
        return ApiResponse.ok(toCategoryItem(saved), "Tao danh muc thanh cong");
    }

    @PutMapping("/categories/{id}")
    public ApiResponse<CategoryItem> updateCategory(@PathVariable String id, @RequestBody UpdateCategoryRequest req) {
        Category current = categoryRepository.findById(id).orElse(null);
        if (current == null) {
            throw new IllegalArgumentException("Danh muc khong ton tai");
        }
        if (req.type() != null) current.setType(req.type().trim());
        if (req.value() != null) current.setValue(req.value().trim());
        if (req.label() != null) current.setLabel(req.label().trim());
        if (req.isActive() != null) current.setActive(req.isActive());
        if (req.sortOrder() != null) current.setSortOrder(req.sortOrder());
        Category saved = categoryRepository.save(current);
        return ApiResponse.ok(toCategoryItem(saved), "Cap nhat danh muc thanh cong");
    }

    @DeleteMapping("/categories/{id}")
    public ApiResponse<Void> deleteCategory(@PathVariable String id) {
        Category current = categoryRepository.findById(id).orElse(null);
        if (current != null) {
            current.setActive(false);
            categoryRepository.save(current);
        }
        return ApiResponse.ok(null, "Xoa danh muc thanh cong");
    }

    @GetMapping("/users")
    public ApiResponse<List<Map<String, Object>>> users(
        @RequestParam(value = "search", required = false) String search,
        @RequestParam(value = "role", required = false) String role
    ) {
        UserRole parsedRole = null;
        if (role != null && !role.isBlank()) {
            try {
                parsedRole = UserRole.valueOf(role.trim().toLowerCase(Locale.ROOT));
            } catch (IllegalArgumentException ignored) {
                parsedRole = null;
            }
        }
        final UserRole roleFilter = parsedRole;

        String keyword = (search == null) ? "" : search.trim().toLowerCase(Locale.ROOT);
        List<Map<String, Object>> rows = userRepository.findAll().stream()
            .filter(u -> !u.isDeleted())
            .filter(u -> roleFilter == null || u.getRole() == roleFilter)
            .filter(u -> keyword.isBlank()
                || (u.getName() != null && u.getName().toLowerCase(Locale.ROOT).contains(keyword))
                || (u.getEmail() != null && u.getEmail().toLowerCase(Locale.ROOT).contains(keyword))
            )
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

    @PostMapping("/users")
    public ApiResponse<Map<String, Object>> createUser(@RequestBody CreateUserRequest req) {
        if (req.name() == null || req.name().isBlank() || req.email() == null || req.email().isBlank() || req.role() == null) {
            throw new IllegalArgumentException("Thong tin tai khoan khong hop le");
        }
        if (userRepository.findByEmailAndIsDeletedFalse(req.email().trim().toLowerCase(Locale.ROOT)).isPresent()) {
            throw new IllegalArgumentException("Email da ton tai trong he thong");
        }

        User user = new User();
        user.setId(req.id() == null || req.id().isBlank() ? UUID.randomUUID().toString() : req.id());
        user.setName(req.name());
        user.setEmail(req.email().trim().toLowerCase(Locale.ROOT));
        user.setRole(req.role());
        user.setActive(req.isActive() == null || req.isActive());
        user.setLocked(req.isLocked() != null && req.isLocked());
        user.setPasswordHash(passwordEncoder.encode(req.password() == null || req.password().isBlank() ? "123456" : req.password()));

        User saved = userRepository.save(user);
        return ApiResponse.ok(toUserMap(saved), "Tao tai khoan thanh cong");
    }

    @PutMapping("/users/{id}")
    public ApiResponse<Map<String, Object>> updateUser(@PathVariable String id, @RequestBody UpdateUserRequest req) {
        User user = userRepository.findByIdAndIsDeletedFalse(id).orElseThrow(() -> new IllegalArgumentException("Tai khoan khong ton tai"));

        String normalizedEmail = req.email() == null ? null : req.email().trim().toLowerCase(Locale.ROOT);
        if (normalizedEmail != null && !normalizedEmail.equalsIgnoreCase(user.getEmail())
            && userRepository.findByEmailAndIdNotAndIsDeletedFalse(normalizedEmail, id).isPresent()) {
            throw new IllegalArgumentException("Email da ton tai trong he thong");
        }

        if (req.name() != null) user.setName(req.name());
        if (normalizedEmail != null) user.setEmail(normalizedEmail);
        if (req.role() != null) user.setRole(req.role());
        if (req.isActive() != null) user.setActive(req.isActive());
        if (req.isLocked() != null) user.setLocked(req.isLocked());

        User saved = userRepository.save(user);
        return ApiResponse.ok(toUserMap(saved), "Cap nhat tai khoan thanh cong");
    }

    @PostMapping("/users/{id}/reset-password")
    public ApiResponse<Map<String, Object>> resetPassword(@PathVariable String id, @RequestBody ResetPasswordRequest req) {
        User user = userRepository.findByIdAndIsDeletedFalse(id).orElseThrow(() -> new IllegalArgumentException("Tai khoan khong ton tai"));
        String requested = req.newPassword();
        if (requested == null || requested.isBlank()) {
            requested = req.temporaryPassword();
        }
        String newPassword = (requested == null || requested.isBlank()) ? "123456" : requested;
        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("Mat khau moi phai co it nhat 6 ky tu");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ApiResponse.ok(Map.<String, Object>of("temporaryPassword", newPassword), "Dat lai mat khau thanh cong");
    }

    @PutMapping("/users/{id}/lock")
    public ApiResponse<Map<String, Object>> toggleLock(@PathVariable String id) {
        User user = userRepository.findByIdAndIsDeletedFalse(id).orElseThrow(() -> new IllegalArgumentException("Tai khoan khong ton tai"));
        user.setLocked(!user.isLocked());
        User saved = userRepository.save(user);
        return ApiResponse.ok(Map.<String, Object>of("id", saved.getId(), "isLocked", saved.isLocked()), "Cap nhat trang thai khoa thanh cong");
    }

    @DeleteMapping("/users/{id}")
    public ApiResponse<Void> deleteUser(@PathVariable String id) {
        User user = userRepository.findByIdAndIsDeletedFalse(id).orElseThrow(() -> new IllegalArgumentException("Tai khoan khong ton tai"));
        user.setDeleted(true);
        userRepository.save(user);
        return ApiResponse.ok(null, "Da xoa tai khoan");
    }

    @GetMapping("/configs")
    public ApiResponse<List<SystemConfig>> configs() {
        return ApiResponse.ok(systemConfigRepository.findAll());
    }

    @GetMapping("/config")
    public ApiResponse<List<SystemConfig>> configAlias() {
        return configs();
    }

    @PutMapping("/config")
    public ApiResponse<Void> updateConfigBatch(@RequestBody List<UpdateConfigBatchRequest> updates) {
        for (UpdateConfigBatchRequest update : updates) {
            SystemConfig cfg = systemConfigRepository.findByKey(update.key()).orElseGet(() -> {
                SystemConfig created = new SystemConfig();
                created.setId(UUID.randomUUID().toString());
                created.setKey(update.key());
                return created;
            });
            cfg.setValue(update.value());
            if (update.label() != null) cfg.setLabel(update.label());
            systemConfigRepository.save(cfg);
        }
        return ApiResponse.ok(null, "Cap nhat cau hinh thanh cong");
    }

    @PutMapping("/configs/{key}")
    public ApiResponse<SystemConfig> updateConfig(@PathVariable String key, @RequestBody UpdateConfigRequest req) {
        SystemConfig cfg = systemConfigRepository.findByKey(key)
            .orElseThrow(() -> new IllegalArgumentException("Config khong ton tai"));
        cfg.setValue(req.value());
        if (req.label() != null) cfg.setLabel(req.label());
        return ApiResponse.ok(systemConfigRepository.save(cfg), "Cap nhat config thanh cong");
    }

    private Map<String, Object> toUserMap(User u) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", u.getId());
        row.put("name", u.getName());
        row.put("email", u.getEmail());
        row.put("role", u.getRole().name());
        row.put("councilRole", null);
        row.put("title", null);
        row.put("department", null);
        row.put("isActive", u.isActive());
        row.put("isLocked", u.isLocked());
        row.put("createdAt", Instant.now().toString());
        row.put("mustChangePassword", false);
        return row;
    }

    private Map<String, Object> auditRow(String id, String userName, String action, String module, String details, String ipAddress, String timestamp) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", id);
        row.put("userId", null);
        row.put("userName", userName);
        row.put("action", action);
        row.put("module", module);
        row.put("details", details);
        row.put("ipAddress", ipAddress);
        row.put("timestamp", timestamp);
        return row;
    }

    private CategoryItem toCategoryItem(Category category) {
        return new CategoryItem(
            category.getId(),
            category.getType(),
            category.getValue(),
            category.getLabel(),
            category.isActive(),
            category.getSortOrder(),
            category.getCreatedAt().toString(),
            category.getUpdatedAt().toString()
        );
    }

    public record CreateUserRequest(String id, String name, String email, UserRole role, String password, Boolean isActive, Boolean isLocked, String councilRole, String title, String department) {}
    public record UpdateUserRequest(String name, String email, UserRole role, Boolean isActive, Boolean isLocked, String councilRole, String title, String department) {}
    public record ResetPasswordRequest(String newPassword, String temporaryPassword) {}
    public record UpdateConfigRequest(String value, String label) {}
    public record UpdateConfigBatchRequest(String key, String value, String label) {}
    public record CreateCategoryRequest(String type, String value, String label, Integer sortOrder) {}
    public record UpdateCategoryRequest(String type, String value, String label, Boolean isActive, Integer sortOrder) {}
    public record CategoryItem(String id, String type, String value, String label, Boolean isActive, Integer sortOrder, String createdAt, String updatedAt) {}
}