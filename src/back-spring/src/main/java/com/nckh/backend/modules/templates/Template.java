package com.nckh.backend.modules.templates;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "templates")
public class Template {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 300)
    private String name;

    @Column(nullable = false, length = 30)
    private String version;

    @Column(nullable = false, length = 100)
    private String role;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String fileUrl;

    @Column(length = 30)
    private String size;

    @Column(nullable = false)
    private Instant effectiveDate;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "createdAt", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updatedAt", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getName() { return name; }
    public String getVersion() { return version; }
    public String getRole() { return role; }
    public String getCategory() { return category; }
    public String getFileUrl() { return fileUrl; }
    public String getSize() { return size; }
    public Instant getEffectiveDate() { return effectiveDate; }
    public Boolean getIsDefault() { return isDefault; }
    public Boolean getIsDeleted() { return isDeleted; }
}
