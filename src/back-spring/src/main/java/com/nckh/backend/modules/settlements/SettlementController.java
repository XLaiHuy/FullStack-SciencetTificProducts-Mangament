package com.nckh.backend.modules.settlements;

import static com.nckh.backend.modules.settlements.SettlementDtos.*;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.users.User;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/settlements")
public class SettlementController {

    private final SettlementService settlementService;

    public SettlementController(SettlementService settlementService) {
        this.settlementService = settlementService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('project_owner','research_staff','accounting','superadmin','report_viewer')")
    public ApiResponse<List<SettlementItem>> getAll(
        @AuthenticationPrincipal User user,
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "search", required = false) String search
    ) {
        return ApiResponse.ok(settlementService.getAll(user, status, search));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('project_owner','research_staff','accounting','superadmin','report_viewer')")
    public ApiResponse<SettlementItem> getById(@PathVariable String id, @AuthenticationPrincipal User user) {
        return ApiResponse.ok(settlementService.getById(id, user));
    }

    @PostMapping
    @PreAuthorize("hasRole('project_owner')")
    public ApiResponse<SettlementItem> create(@Valid @RequestBody CreateSettlementRequest request, @AuthenticationPrincipal User user) {
        return ApiResponse.ok(settlementService.create(request, user), "Tao quyet toan thanh cong");
    }

    @PostMapping(consumes = "multipart/form-data")
    @PreAuthorize("hasRole('project_owner')")
    public ApiResponse<SettlementItem> createMultipart(
        @RequestParam("projectId") String projectId,
        @RequestParam("content") String content,
        @RequestParam("totalAmount") BigDecimal totalAmount,
        @RequestParam(value = "category", required = false) String category,
        @RequestPart(value = "evidenceFiles", required = false) List<MultipartFile> evidenceFiles,
        @RequestPart(value = "evidenceFile", required = false) MultipartFile evidenceFile,
        @AuthenticationPrincipal User user
    ) {
        List<MultipartFile> allFiles = new java.util.ArrayList<>();
        if (evidenceFiles != null) {
            allFiles.addAll(evidenceFiles);
        }
        if (evidenceFile != null) {
            allFiles.add(evidenceFile);
        }
        List<String> fileNames = allFiles.stream().map(MultipartFile::getOriginalFilename).filter(n -> n != null && !n.isBlank()).toList();

        CreateSettlementRequest request = new CreateSettlementRequest(
            null,
            null,
            projectId,
            content,
            totalAmount,
            user.getName(),
            category,
            fileNames
        );
        return ApiResponse.ok(settlementService.create(request, user), "Tao quyet toan thanh cong");
    }

    @PostMapping("/{id}/supplement-request")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<SettlementItem> supplement(@PathVariable String id, @RequestBody SupplementRequest request) {
        return ApiResponse.ok(settlementService.requestSupplement(id, request), "Da yeu cau bo sung");
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('accounting','research_staff','superadmin')")
    public ApiResponse<SettlementItem> updateStatus(@PathVariable String id, @Valid @RequestBody UpdateSettlementStatusRequest request) {
        return ApiResponse.ok(settlementService.updateStatus(id, request), "Cap nhat trang thai thanh cong");
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('accounting','superadmin')")
    public ApiResponse<SettlementItem> approve(@PathVariable String id) {
        return ApiResponse.ok(settlementService.approve(id), "Phe duyet quyet toan thanh cong");
    }

    @GetMapping(value = "/{id}/export", produces = {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    })
    @PreAuthorize("hasAnyRole('project_owner','research_staff','accounting','superadmin','report_viewer')")
    public ResponseEntity<byte[]> export(@PathVariable String id, @RequestParam(defaultValue = "excel") String format, @AuthenticationPrincipal User user) {
        SettlementItem item = settlementService.getById(id, user);
        String normalized = format == null ? "excel" : format.trim().toLowerCase();

        if ("word".equals(normalized) || "docx".equals(normalized)) {
            String content = "Settlement Export\nCode: " + item.code() + "\nProject: " + item.projectCode() + " - " + item.projectTitle()
                + "\nStatus: " + item.status() + "\nTotalAmount: " + item.totalAmount();
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=settlement_" + id + ".docx")
                .body(content.getBytes(StandardCharsets.UTF_8));
        }

        String csv = "Code,ProjectCode,ProjectTitle,Status,TotalAmount\n"
            + item.code() + ","
            + item.projectCode() + ","
            + item.projectTitle().replace(",", " ") + ","
            + item.status() + ","
            + item.totalAmount();
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=settlement_" + id + ".xlsx")
            .body(csv.getBytes(StandardCharsets.UTF_8));
    }
}
