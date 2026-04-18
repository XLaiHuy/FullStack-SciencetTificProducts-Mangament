package com.nckh.backend.modules.settlements;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class SettlementDtos {

    public record CreateSettlementRequest(
        String id,
        String code,
        @NotBlank String projectId,
        @NotBlank String content,
        @NotNull @DecimalMin("0.01") BigDecimal totalAmount,
        String submittedBy,
        String category,
        List<String> evidenceFiles
    ) {}

    public record UpdateSettlementStatusRequest(@NotNull SettlementStatus status, String note) {}

    public record SupplementRequest(String note, String supplementNote, List<String> reasons) {
        public String resolvedNote() {
            if (supplementNote != null && !supplementNote.isBlank()) {
                return supplementNote;
            }
            if (note != null && !note.isBlank()) {
                return note;
            }
            if (reasons != null && !reasons.isEmpty()) {
                return String.join("; ", reasons);
            }
            return null;
        }
    }

    public record SettlementItem(
        String id,
        String code,
        String projectId,
        String projectCode,
        String projectTitle,
        Map<String, Object> project,
        BigDecimal totalAmount,
        SettlementStatus status,
        String submittedBy,
        String supplementNote
    ) {}
}
