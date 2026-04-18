package com.nckh.backend.modules.admin;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "system_configs")
public class SystemConfig {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "`key`", nullable = false, unique = true, length = 100)
    private String key;

    @Column(name = "`value`", nullable = false, columnDefinition = "TEXT")
    private String value;

    @Column(length = 200)
    private String label;

    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getKey() { return key; }
    public String getValue() { return value; }
    public String getLabel() { return label; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setId(String id) { this.id = id; }
    public void setKey(String key) { this.key = key; }
    public void setValue(String value) { this.value = value; }
    public void setLabel(String label) { this.label = label; }
}
