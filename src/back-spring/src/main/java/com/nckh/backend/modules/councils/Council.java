package com.nckh.backend.modules.councils;

import com.nckh.backend.modules.projects.Project;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "councils")
public class Council {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, unique = true, length = 50)
    private String decisionCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projectId", nullable = false)
    private Project project;

    @Column(nullable = false)
    private Instant createdDate = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CouncilStatus status = CouncilStatus.cho_danh_gia;

    @Column(columnDefinition = "TEXT")
    private String decisionPdfUrl;

    @Column(columnDefinition = "TEXT")
    private String minutesFileUrl;

    @Column(columnDefinition = "TEXT")
    private String minutesContent;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getDecisionCode() { return decisionCode; }
    public void setDecisionCode(String decisionCode) { this.decisionCode = decisionCode; }
    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }
    public Instant getCreatedDate() { return createdDate; }
    public void setCreatedDate(Instant createdDate) { this.createdDate = createdDate; }
    public CouncilStatus getStatus() { return status; }
    public void setStatus(CouncilStatus status) { this.status = status; }
    public String getDecisionPdfUrl() { return decisionPdfUrl; }
    public void setDecisionPdfUrl(String decisionPdfUrl) { this.decisionPdfUrl = decisionPdfUrl; }
    public String getMinutesFileUrl() { return minutesFileUrl; }
    public void setMinutesFileUrl(String minutesFileUrl) { this.minutesFileUrl = minutesFileUrl; }
    public String getMinutesContent() { return minutesContent; }
    public void setMinutesContent(String minutesContent) { this.minutesContent = minutesContent; }
    public Boolean getIsDeleted() { return isDeleted; }
    public void setIsDeleted(Boolean deleted) { isDeleted = deleted; }
}
