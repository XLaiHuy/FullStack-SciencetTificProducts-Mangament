package com.nckh.backend.modules.reports;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.contracts.ContractRepository;
import com.nckh.backend.modules.contracts.ContractStatus;
import com.nckh.backend.modules.councils.CouncilRepository;
import com.nckh.backend.modules.projects.ProjectRepository;
import com.nckh.backend.modules.projects.ProjectStatus;
import com.nckh.backend.modules.settlements.SettlementRepository;
import com.nckh.backend.modules.settlements.SettlementStatus;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/reports")
public class ReportController {

    private final ProjectRepository projectRepository;
    private final ContractRepository contractRepository;
    private final SettlementRepository settlementRepository;
    private final CouncilRepository councilRepository;

    public ReportController(
        ProjectRepository projectRepository,
        ContractRepository contractRepository,
        SettlementRepository settlementRepository,
        CouncilRepository councilRepository
    ) {
        this.projectRepository = projectRepository;
        this.contractRepository = contractRepository;
        this.settlementRepository = settlementRepository;
        this.councilRepository = councilRepository;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('report_viewer','research_staff','superadmin','accounting')")
    public ApiResponse<Map<String, Object>> dashboard() {
        Map<String, Object> data = Map.of(
            "projects", Map.of(
                "total", projectRepository.countByIsDeletedFalse(),
                "active", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.dang_thuc_hien),
                "pendingAcceptance", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.cho_nghiem_thu),
                "completed", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.da_nghiem_thu)
            ),
            "contracts", Map.of(
                "pending", contractRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream().filter(c -> c.getStatus() == ContractStatus.cho_duyet).count(),
                "signed", contractRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream().filter(c -> c.getStatus() == ContractStatus.da_ky).count()
            ),
            "settlements", Map.of(
                "pending", settlementRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream().filter(s -> s.getStatus() == SettlementStatus.cho_bo_sung).count(),
                "approved", settlementRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream().filter(s -> s.getStatus() == SettlementStatus.da_xac_nhan).count()
            ),
            "councils", Map.of("total", councilRepository.findByIsDeletedFalseOrderByCreatedDateDesc().size())
        );
        return ApiResponse.ok(data);
    }

    @GetMapping("/topics")
    @PreAuthorize("hasAnyRole('report_viewer','research_staff','superadmin')")
    public ApiResponse<List<Map<String, Object>>> topics() {
        Map<String, Long> grouped = projectRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream()
            .collect(
                java.util.stream.Collectors.groupingBy(
                    p -> p.getField() == null || p.getField().isBlank() ? "Khac" : p.getField(),
                    LinkedHashMap::new,
                    java.util.stream.Collectors.counting()
                )
            );

        List<Map<String, Object>> rows = grouped.entrySet().stream()
            .map(e -> Map.<String, Object>of("field", e.getKey(), "count", e.getValue()))
            .sorted(Comparator.comparingLong((Map<String, Object> m) -> ((Number) m.get("count")).longValue()).reversed())
            .toList();
        return ApiResponse.ok(rows);
    }

    @GetMapping("/progress")
    @PreAuthorize("hasAnyRole('report_viewer','research_staff','superadmin')")
    public ApiResponse<List<Map<String, Object>>> progress() {
        List<Map<String, Object>> rows = List.of(
            Map.<String, Object>of("status", ProjectStatus.dang_thuc_hien.name(), "count", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.dang_thuc_hien)),
            Map.<String, Object>of("status", ProjectStatus.tre_han.name(), "count", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.tre_han)),
            Map.<String, Object>of("status", ProjectStatus.cho_nghiem_thu.name(), "count", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.cho_nghiem_thu)),
            Map.<String, Object>of("status", ProjectStatus.da_nghiem_thu.name(), "count", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.da_nghiem_thu)),
            Map.<String, Object>of("status", ProjectStatus.huy_bo.name(), "count", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.huy_bo))
        );
        return ApiResponse.ok(rows);
    }

    @GetMapping("/contracts")
    @PreAuthorize("hasAnyRole('report_viewer','research_staff','superadmin','accounting')")
    public ApiResponse<List<Map<String, Object>>> contracts() {
        Map<String, List<com.nckh.backend.modules.contracts.Contract>> grouped = contractRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream()
            .collect(java.util.stream.Collectors.groupingBy(c -> c.getStatus().name()));
        List<Map<String, Object>> rows = grouped.entrySet().stream()
            .map(e -> {
                BigDecimal totalBudget = e.getValue().stream()
                    .map(c -> c.getBudget() == null ? BigDecimal.ZERO : c.getBudget())
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                return Map.<String, Object>of(
                    "status", e.getKey(),
                    "count", e.getValue().size(),
                    "totalBudget", totalBudget
                );
            })
            .sorted(Comparator.comparing(m -> Objects.toString(m.get("status"))))
            .toList();
        return ApiResponse.ok(rows);
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('report_viewer','research_staff','superadmin','accounting')")
    public ApiResponse<Map<String, Object>> stats() {
        var projects = projectRepository.findByIsDeletedFalseOrderByCreatedAtDesc();
        var contracts = contractRepository.findByIsDeletedFalseOrderByCreatedAtDesc();
        var settlements = settlementRepository.findByIsDeletedFalseOrderByCreatedAtDesc();

        long totalProjects = projects.size();
        long activeProjects = projects.stream().filter(p -> p.getStatus() == ProjectStatus.dang_thuc_hien).count();
        long overdueProjects = projects.stream().filter(p -> p.getStatus() == ProjectStatus.tre_han).count();
        long completedProjects = projects.stream().filter(p -> p.getStatus() == ProjectStatus.da_nghiem_thu).count();

        BigDecimal totalBudget = projects.stream()
            .map(p -> p.getBudget() == null ? BigDecimal.ZERO : p.getBudget())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal disbursedBudget = settlements.stream()
            .filter(s -> s.getStatus() == SettlementStatus.da_xac_nhan)
            .map(s -> s.getTotalAmount() == null ? BigDecimal.ZERO : s.getTotalAmount())
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalContracts = contracts.size();
        long activeContracts = contracts.stream().filter(c -> c.getStatus() == ContractStatus.da_ky).count();
        long pendingContracts = contracts.stream().filter(c -> c.getStatus() == ContractStatus.cho_duyet).count();

        return ApiResponse.ok(Map.<String, Object>ofEntries(
            Map.entry("totalProjects", totalProjects),
            Map.entry("activeProjects", activeProjects),
            Map.entry("overdueProjects", overdueProjects),
            Map.entry("completedProjects", completedProjects),
            Map.entry("totalBudget", totalBudget),
            Map.entry("disbursedBudget", disbursedBudget),
            Map.entry("totalContracts", totalContracts),
            Map.entry("activeContracts", activeContracts),
            Map.entry("pendingContracts", pendingContracts)
        ));
    }

    @GetMapping("/filter-options")
    @PreAuthorize("hasAnyRole('report_viewer','research_staff','superadmin','accounting')")
    public ApiResponse<Map<String, Object>> filterOptions() {
        var projects = projectRepository.findByIsDeletedFalseOrderByCreatedAtDesc();

        List<String> schoolYears = projects.stream()
            .map(p -> p.getStartDate() == null ? null : String.valueOf(p.getStartDate().getYear()))
            .filter(Objects::nonNull)
            .distinct()
            .sorted()
            .toList();

        List<String> fields = projects.stream()
            .map(p -> p.getField() == null ? "" : p.getField().trim())
            .filter(s -> !s.isBlank())
            .distinct()
            .sorted()
            .toList();

        List<String> departments = projects.stream()
            .map(p -> p.getDepartment() == null ? "" : p.getDepartment().trim())
            .filter(s -> !s.isBlank())
            .distinct()
            .sorted()
            .toList();

        List<String> statuses = java.util.Arrays.stream(ProjectStatus.values())
            .map(Enum::name)
            .toList();

        return ApiResponse.ok(Map.of(
            "schoolYears", schoolYears,
            "fields", fields,
            "departments", departments,
            "statuses", statuses,
            "asOf", LocalDate.now().toString()
        ));
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('report_viewer','research_staff','superadmin')")
    public @ResponseBody byte[] export(@RequestParam(defaultValue = "topics") String type, @RequestParam(defaultValue = "csv") String format) {
        String csv = "type,generatedAt\n" + type + "," + java.time.Instant.now() + "\n";
        return csv.getBytes(StandardCharsets.UTF_8);
    }
}
