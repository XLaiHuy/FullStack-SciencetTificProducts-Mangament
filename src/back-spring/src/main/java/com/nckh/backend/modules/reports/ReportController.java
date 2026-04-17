package com.nckh.backend.modules.reports;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.contracts.ContractRepository;
import com.nckh.backend.modules.contracts.ContractStatus;
import com.nckh.backend.modules.councils.CouncilRepository;
import com.nckh.backend.modules.projects.ProjectRepository;
import com.nckh.backend.modules.projects.ProjectStatus;
import com.nckh.backend.modules.settlements.SettlementRepository;
import com.nckh.backend.modules.settlements.SettlementStatus;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
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
        List<Map<String, Object>> rows = projectRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream()
            .map(p -> Map.<String, Object>of(
                "id", p.getId(),
                "code", p.getCode(),
                "title", p.getTitle(),
                "status", p.getStatus().name(),
                "department", p.getDepartment(),
                "field", p.getField()
            )).toList();
        return ApiResponse.ok(rows);
    }

    @GetMapping("/progress")
    @PreAuthorize("hasAnyRole('report_viewer','research_staff','superadmin')")
    public ApiResponse<Map<String, Long>> progress() {
        return ApiResponse.ok(Map.of(
            "dang_thuc_hien", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.dang_thuc_hien),
            "tre_han", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.tre_han),
            "cho_nghiem_thu", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.cho_nghiem_thu),
            "da_nghiem_thu", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.da_nghiem_thu),
            "huy_bo", projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.huy_bo)
        ));
    }

    @GetMapping("/contracts")
    @PreAuthorize("hasAnyRole('report_viewer','research_staff','superadmin','accounting')")
    public ApiResponse<List<Map<String, Object>>> contracts() {
        List<Map<String, Object>> rows = contractRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream()
            .map(c -> Map.<String, Object>of(
                "id", c.getId(),
                "code", c.getCode(),
                "projectCode", c.getProject().getCode(),
                "projectTitle", c.getProject().getTitle(),
                "budget", c.getBudget(),
                "status", c.getStatus().name()
            )).toList();
        return ApiResponse.ok(rows);
    }

    @GetMapping("/filter-options")
    @PreAuthorize("hasAnyRole('report_viewer','research_staff','superadmin','accounting')")
    public ApiResponse<Map<String, Object>> filterOptions() {
        return ApiResponse.ok(Map.of(
            "projectStatuses", ProjectStatus.values(),
            "contractStatuses", ContractStatus.values(),
            "settlementStatuses", SettlementStatus.values(),
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
