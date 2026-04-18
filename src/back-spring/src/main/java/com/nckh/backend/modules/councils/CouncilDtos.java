package com.nckh.backend.modules.councils;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class CouncilDtos {

    public record CreateCouncilRequest(String id, String decisionCode, @NotBlank String projectId, java.util.List<MemberInput> members) {}

    public record MemberInput(String id, String name, String title, String institution, String email, String phone, String affiliation, String role) {}

    public record ScoreRequest(String memberId, @NotNull @DecimalMin("0.0") BigDecimal score, String comment) {}

    public record CouncilItem(
        String id,
        String decisionCode,
        String projectId,
        String projectCode,
        String projectTitle,
        CouncilStatus status,
        String decisionPdfUrl
    ) {}

    public record ScoreSummary(String councilId, int totalScores, BigDecimal averageScore, boolean passed) {}
}
