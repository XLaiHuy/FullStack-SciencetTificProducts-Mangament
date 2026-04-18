package com.nckh.backend.modules.admin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "categories")
public class Category {

    @Id
    @Column(length = 64)
    private String id = UUID.randomUUID().toString();

    @Column(nullable = false, length = 100)
    private String type;

    @Column(name = "`value`", nullable = false, length = 200)
    private String value;

    @Column(nullable = false, length = 200)
    private String label;

    @Column(nullable = false)
    private boolean isActive = true;

    @Column(nullable = false)
    private int sortOrder = 0;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public String getType() { return type; }
    public String getValue() { return value; }
    public String getLabel() { return label; }
    public boolean isActive() { return isActive; }
    public int getSortOrder() { return sortOrder; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void setId(String id) { this.id = id; }
    public void setType(String type) { this.type = type; }
    public void setValue(String value) { this.value = value; }
    public void setLabel(String label) { this.label = label; }
    public void setActive(boolean active) { isActive = active; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
