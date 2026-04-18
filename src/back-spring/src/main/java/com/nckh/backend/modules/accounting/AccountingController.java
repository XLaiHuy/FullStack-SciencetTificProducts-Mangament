package com.nckh.backend.modules.accounting;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.settlements.Settlement;
import com.nckh.backend.modules.settlements.SettlementDtos.SettlementItem;
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
        return ApiResponse.ok(Map.of(
            "totalSettlements", list.size(),
            "pendingSettlements", pending,
            "confirmedSettlements", approved,
            "pending", pending,
            "approved", approved,
            "totalAmount", total
        ));
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
    public ApiResponse<SettlementItem> verify(@PathVariable String id, @RequestBody VerifyRequest request) {
        SettlementItem item = settlementService.updateStatus(id, new UpdateSettlementStatusRequest(request.status(), request.note()));
        return ApiResponse.ok(item, "Da cap nhat trang thai chung tu");
    }

    @PostMapping("/liquidation/{id}/confirm")
    @PreAuthorize("hasAnyRole('accounting','superadmin')")
    public ApiResponse<SettlementItem> liquidation(@PathVariable String id) {
        SettlementItem item = settlementService.approve(id);
        return ApiResponse.ok(item, "Da xac nhan thanh ly");
    }

    public record VerifyRequest(SettlementStatus status, String note) {}
}
