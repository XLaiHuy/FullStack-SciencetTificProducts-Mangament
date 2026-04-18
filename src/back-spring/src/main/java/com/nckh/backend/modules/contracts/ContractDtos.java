package com.nckh.backend.modules.contracts;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class ContractDtos {

    public record CreateContractRequest(
        String id,
        String code,
        @NotBlank String projectId,
        @NotNull @DecimalMin("0.01") BigDecimal budget,
        String agencyName,
        String representative,
        String notes
    ) {}

    public record UpdateStatusRequest(@NotNull ContractStatus status) {}

    public record ContractItem(
        String id,
        String code,
        String projectId,
        String projectCode,
        String projectTitle,
        String owner,
        String ownerEmail,
        String ownerTitle,
        BigDecimal budget,
        ContractStatus status,
        LocalDate signedDate,
        String agencyName,
        String representative,
        String pdfUrl,
        String notes
    ) {}
}
