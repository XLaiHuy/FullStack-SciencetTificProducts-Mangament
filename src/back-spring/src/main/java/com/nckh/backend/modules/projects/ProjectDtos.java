package com.nckh.backend.modules.projects;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class ProjectDtos {

    public record CreateProjectRequest(
        String id,
        String code,
        @NotBlank String title,
        @NotBlank String ownerId,
        @NotBlank String department,
        @NotBlank String field,
        @NotBlank String startDate,
        @NotBlank String endDate,
        @NotNull Integer durationMonths,
        @NotNull @DecimalMin("0.01") BigDecimal budget,
        @DecimalMin("0.00") BigDecimal advancedAmount
    ) {}

    public record UpdateStatusRequest(@NotNull ProjectStatus status) {}

    public record ProjectItem(
        String id,
        String code,
        String title,
        String ownerId,
        String ownerName,
        String ownerEmail,
        String ownerTitle,
        ProjectStatus status,
        BigDecimal budget,
        BigDecimal advancedAmount,
        String department,
        String field,
        String startDate,
        String endDate,
        Integer durationMonths,
        String midtermReportUrl,
        String midtermReportContent,
        String finalReportUrl
    ) {}

    public record DashboardStats(
        long total,
        long active,
        long overdue,
        long pendingAcceptance,
        long completed,
        long cancelled
    ) {}
}
