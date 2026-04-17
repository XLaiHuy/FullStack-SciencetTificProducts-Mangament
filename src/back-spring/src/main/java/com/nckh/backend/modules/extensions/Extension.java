package com.nckh.backend.modules.extensions;

import com.nckh.backend.modules.projects.Project;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "extensions")
public class Extension {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projectId", nullable = false)
    private Project project;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String supportingDocument;

    @Column(nullable = false)
    private LocalDate proposedDate;

    @Column(nullable = false)
    private Integer extensionDays;

    @Column(nullable = false)
    private Integer extensionCount = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExtensionStatus boardStatus = ExtensionStatus.dang_cho;

    @Column(columnDefinition = "TEXT")
    private String decisionNote;

    @Column(length = 200)
    private String decidedBy;

    private Instant decidedAt;

    @Column(name = "createdAt", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updatedAt", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getSupportingDocument() { return supportingDocument; }
    public void setSupportingDocument(String supportingDocument) { this.supportingDocument = supportingDocument; }
    public LocalDate getProposedDate() { return proposedDate; }
    public void setProposedDate(LocalDate proposedDate) { this.proposedDate = proposedDate; }
    public Integer getExtensionDays() { return extensionDays; }
    public void setExtensionDays(Integer extensionDays) { this.extensionDays = extensionDays; }
    public Integer getExtensionCount() { return extensionCount; }
    public void setExtensionCount(Integer extensionCount) { this.extensionCount = extensionCount; }
    public ExtensionStatus getBoardStatus() { return boardStatus; }
    public void setBoardStatus(ExtensionStatus boardStatus) { this.boardStatus = boardStatus; }
    public String getDecisionNote() { return decisionNote; }
    public void setDecisionNote(String decisionNote) { this.decisionNote = decisionNote; }
    public String getDecidedBy() { return decidedBy; }
    public void setDecidedBy(String decidedBy) { this.decidedBy = decidedBy; }
    public Instant getDecidedAt() { return decidedAt; }
    public void setDecidedAt(Instant decidedAt) { this.decidedAt = decidedAt; }
}
