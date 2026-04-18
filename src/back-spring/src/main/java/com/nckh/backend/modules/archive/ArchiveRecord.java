package com.nckh.backend.modules.archive;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "archive_records")
public class ArchiveRecord {

    @Id
    @Column(length = 64)
    private String id;

    @Column(name = "projectId", nullable = false, length = 64)
    private String projectId;

    @Column(nullable = false)
    private Instant archivedAt = Instant.now();

    @Column(nullable = false, length = 200)
    private String archivedBy;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String fileUrlsJson;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }
    public Instant getArchivedAt() { return archivedAt; }
    public void setArchivedAt(Instant archivedAt) { this.archivedAt = archivedAt; }
    public String getArchivedBy() { return archivedBy; }
    public void setArchivedBy(String archivedBy) { this.archivedBy = archivedBy; }
    public String getFileUrlsJson() { return fileUrlsJson; }
    public void setFileUrlsJson(String fileUrlsJson) { this.fileUrlsJson = fileUrlsJson; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
