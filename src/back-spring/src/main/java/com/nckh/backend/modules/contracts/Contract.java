package com.nckh.backend.modules.contracts;

import com.nckh.backend.modules.projects.Project;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "contracts")
public class Contract {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "projectId", nullable = false)
    private Project project;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal budget;

    @Column(name = "signedDate")
    private LocalDate signedDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ContractStatus status = ContractStatus.cho_duyet;

    @Column(name = "agencyName", length = 300)
    private String agencyName;

    @Column(length = 200)
    private String representative;

    @Column(name = "pdfUrl", columnDefinition = "TEXT")
    private String pdfUrl;

    @Column(columnDefinition = "TEXT")
    private String notes;

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
    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }
    public LocalDate getSignedDate() { return signedDate; }
    public void setSignedDate(LocalDate signedDate) { this.signedDate = signedDate; }
    public ContractStatus getStatus() { return status; }
    public void setStatus(ContractStatus status) { this.status = status; }
    public String getAgencyName() { return agencyName; }
    public void setAgencyName(String agencyName) { this.agencyName = agencyName; }
    public String getRepresentative() { return representative; }
    public void setRepresentative(String representative) { this.representative = representative; }
    public String getPdfUrl() { return pdfUrl; }
    public void setPdfUrl(String pdfUrl) { this.pdfUrl = pdfUrl; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public Boolean getIsDeleted() { return isDeleted; }
    public void setIsDeleted(Boolean deleted) { isDeleted = deleted; }
}
