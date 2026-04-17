package com.nckh.backend.modules.settlements;

import static com.nckh.backend.modules.settlements.SettlementDtos.*;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.users.User;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    public ApiResponse<List<SettlementItem>> getAll(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(settlementService.getAll(user));
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

    @GetMapping("/{id}/export")
    @PreAuthorize("hasAnyRole('project_owner','research_staff','accounting','superadmin','report_viewer')")
    public ApiResponse<String> export(@PathVariable String id, @RequestParam(defaultValue = "excel") String format) {
        return ApiResponse.ok("/api/settlements/" + id + "/files/export." + ("word".equalsIgnoreCase(format) ? "docx" : "xlsx"), "Export placeholder");
    }
}
