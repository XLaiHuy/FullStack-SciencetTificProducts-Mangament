package com.nckh.backend.modules.projects;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class ProjectDtos {

    public record CreateProjectRequest(
        @NotBlank String id,
        @NotBlank String code,
        @NotBlank String title,
        @NotBlank String ownerId,
        @NotBlank String department,
        @NotBlank String field,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
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
        ProjectStatus status,
        BigDecimal budget,
        BigDecimal advancedAmount,
        String department,
        String field
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
