package com.nckh.backend.modules.accounting;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.settlements.Settlement;
import com.nckh.backend.modules.settlements.SettlementDtos.UpdateSettlementStatusRequest;
import com.nckh.backend.modules.settlements.SettlementRepository;
import com.nckh.backend.modules.settlements.SettlementService;
import com.nckh.backend.modules.settlements.SettlementStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/accounting")
public class AccountingController {

    private final SettlementRepository settlementRepository;
    private final SettlementService settlementService;

    public AccountingController(SettlementRepository settlementRepository, SettlementService settlementService) {
        this.settlementRepository = settlementRepository;
        this.settlementService = settlementService;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('accounting','superadmin')")
    public ApiResponse<Map<String, Object>> dashboard() {
        List<Settlement> list = settlementRepository.findByIsDeletedFalseOrderByCreatedAtDesc();
        BigDecimal total = list.stream().map(Settlement::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long pending = list.stream().filter(s -> s.getStatus() == SettlementStatus.cho_bo_sung).count();
        long approved = list.stream().filter(s -> s.getStatus() == SettlementStatus.da_xac_nhan).count();
        return ApiResponse.ok(Map.of("totalSettlements", list.size(), "pending", pending, "approved", approved, "totalAmount", total));
    }

    @GetMapping("/documents")
    @PreAuthorize("hasAnyRole('accounting','superadmin')")
    public ApiResponse<List<Map<String, Object>>> documents() {
        List<Map<String, Object>> data = settlementRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream().map(s -> Map.<String, Object>of(
            "id", s.getId(),
            "code", s.getCode(),
            "projectCode", s.getProject().getCode(),
            "projectTitle", s.getProject().getTitle(),
            "status", s.getStatus().name(),
            "totalAmount", s.getTotalAmount(),
            "submittedBy", s.getSubmittedBy()
        )).toList();
        return ApiResponse.ok(data);
    }

    @PutMapping("/documents/{id}/verify")
    @PreAuthorize("hasAnyRole('accounting','superadmin')")
    public ApiResponse<Void> verify(@PathVariable String id, @RequestBody VerifyRequest request) {
        settlementService.updateStatus(id, new UpdateSettlementStatusRequest(request.status(), request.note()));
        return ApiResponse.ok(null, "Da cap nhat trang thai chung tu");
    }

    @PostMapping("/liquidation/{id}/confirm")
    @PreAuthorize("hasAnyRole('accounting','superadmin')")
    public ApiResponse<Void> liquidation(@PathVariable String id) {
        settlementService.approve(id);
        return ApiResponse.ok(null, "Da xac nhan thanh ly");
    }

    public record VerifyRequest(SettlementStatus status, String note) {}
}
