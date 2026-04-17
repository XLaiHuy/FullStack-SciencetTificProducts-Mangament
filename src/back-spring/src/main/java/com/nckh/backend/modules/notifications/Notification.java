package com.nckh.backend.modules.notifications;

import com.nckh.backend.modules.users.User;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userId", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private Boolean isRead = false;

    @Column(name = "createdAt", nullable = false)
    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean read) { isRead = read; }
    public Instant getCreatedAt() { return createdAt; }
}
