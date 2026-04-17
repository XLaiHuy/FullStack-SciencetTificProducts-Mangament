package com.nckh.backend.modules.settlements;

import com.nckh.backend.modules.projects.Project;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "settlements")
public class Settlement {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projectId", nullable = false)
    private Project project;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SettlementStatus status = SettlementStatus.cho_bo_sung;

    @Column(nullable = false, length = 200)
    private String submittedBy;

    @Column(columnDefinition = "TEXT")
    private String supplementNote;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "createdAt", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updatedAt", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }
    public SettlementStatus getStatus() { return status; }
    public void setStatus(SettlementStatus status) { this.status = status; }
    public String getSubmittedBy() { return submittedBy; }
    public void setSubmittedBy(String submittedBy) { this.submittedBy = submittedBy; }
    public String getSupplementNote() { return supplementNote; }
    public void setSupplementNote(String supplementNote) { this.supplementNote = supplementNote; }
    public Boolean getIsDeleted() { return isDeleted; }
    public void setIsDeleted(Boolean deleted) { isDeleted = deleted; }
}
