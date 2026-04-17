package com.nckh.backend.modules.settlements;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class SettlementDtos {

    public record CreateSettlementRequest(
        @NotBlank String id,
        @NotBlank String code,
        @NotBlank String projectId,
        @NotBlank String content,
        @NotNull @DecimalMin("0.01") BigDecimal totalAmount,
        @NotBlank String submittedBy
    ) {}

    public record UpdateSettlementStatusRequest(@NotNull SettlementStatus status, String note) {}

    public record SupplementRequest(String note) {}

    public record SettlementItem(
        String id,
        String code,
        String projectId,
        String projectCode,
        String projectTitle,
        BigDecimal totalAmount,
        SettlementStatus status,
        String submittedBy,
        String supplementNote
    ) {}
}
