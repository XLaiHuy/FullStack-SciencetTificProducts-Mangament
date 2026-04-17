package com.nckh.backend.modules.notifications;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationController(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<List<NotificationItem>> list(@AuthenticationPrincipal User user) {
        List<NotificationItem> data = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
            .map(n -> new NotificationItem(n.getId(), n.getType(), n.getMessage(), n.getIsRead(), n.getCreatedAt()))
            .toList();
        return ApiResponse.ok(data);
    }

    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ApiResponse<Void> markRead(@PathVariable String id, @AuthenticationPrincipal User user) {
        Notification n = notificationRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Thong bao khong ton tai"));
        if (!n.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Khong co quyen cap nhat thong bao nay");
        }
        n.setIsRead(true);
        notificationRepository.save(n);
        return ApiResponse.ok(null, "Da danh dau da doc");
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<Void> create(@RequestBody CreateNotificationRequest req) {
        User targetUser = userRepository.findById(req.userId())
            .orElseThrow(() -> new IllegalArgumentException("Nguoi nhan thong bao khong ton tai"));
        Notification n = new Notification();
        n.setId(java.util.UUID.randomUUID().toString());
        n.setUser(targetUser);
        n.setType(req.type());
        n.setMessage(req.message());
        notificationRepository.save(n);
        return ApiResponse.ok(null, "Da tao thong bao");
    }

    public record NotificationItem(String id, NotificationType type, String message, Boolean isRead, Instant createdAt) {}
    public record CreateNotificationRequest(String userId, NotificationType type, String message) {}
}
