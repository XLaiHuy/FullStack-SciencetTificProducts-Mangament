package com.nckh.backend.modules.projects;

import com.nckh.backend.modules.users.User;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 500)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ownerId", nullable = false)
    private User owner;

    @Column(nullable = false, length = 200)
    private String department;

    @Column(nullable = false, length = 200)
    private String field;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private Integer durationMonths;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal budget;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal advancedAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ProjectStatus status = ProjectStatus.dang_thuc_hien;

    @Column(nullable = false, name = "is_deleted")
    private Boolean isDeleted = false;

    @Column(nullable = false, name = "createdAt")
    private Instant createdAt = Instant.now();

    @Column(nullable = false, name = "updatedAt")
    private Instant updatedAt = Instant.now();

    @Column(length = 500)
    private String midtermReportUrl;

    @Column(length = 2000)
    private String midtermReportContent;

    @Column(length = 500)
    private String finalReportUrl;

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getField() { return field; }
    public void setField(String field) { this.field = field; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public Integer getDurationMonths() { return durationMonths; }
    public void setDurationMonths(Integer durationMonths) { this.durationMonths = durationMonths; }
    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }
    public BigDecimal getAdvancedAmount() { return advancedAmount; }
    public void setAdvancedAmount(BigDecimal advancedAmount) { this.advancedAmount = advancedAmount; }
    public ProjectStatus getStatus() { return status; }
    public void setStatus(ProjectStatus status) { this.status = status; }
    public Boolean getIsDeleted() { return isDeleted; }
    public void setIsDeleted(Boolean deleted) { isDeleted = deleted; }
    public String getMidtermReportUrl() { return midtermReportUrl; }
    public void setMidtermReportUrl(String midtermReportUrl) { this.midtermReportUrl = midtermReportUrl; }
    public String getMidtermReportContent() { return midtermReportContent; }
    public void setMidtermReportContent(String midtermReportContent) { this.midtermReportContent = midtermReportContent; }
    public String getFinalReportUrl() { return finalReportUrl; }
    public void setFinalReportUrl(String finalReportUrl) { this.finalReportUrl = finalReportUrl; }
}
