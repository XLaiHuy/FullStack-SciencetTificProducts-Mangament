package com.nckh.backend.modules.contracts;

import static com.nckh.backend.modules.contracts.ContractDtos.*;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.users.User;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/contracts")
public class ContractController {

    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner','report_viewer','accounting')")
    public ApiResponse<List<ContractItem>> getAll(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(contractService.getAll(user));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('project_owner')")
    public ApiResponse<List<ContractItem>> getMine(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(contractService.getMine(user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner','report_viewer','accounting')")
    public ApiResponse<ContractItem> getById(@PathVariable String id, @AuthenticationPrincipal User user) {
        return ApiResponse.ok(contractService.getById(id, user));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<ContractItem> create(@Valid @RequestBody CreateContractRequest request) {
        return ApiResponse.ok(contractService.create(request), "Tao hop dong thanh cong");
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<ContractItem> updateStatus(@PathVariable String id, @Valid @RequestBody UpdateStatusRequest request) {
        return ApiResponse.ok(contractService.updateStatus(id, request), "Cap nhat trang thai thanh cong");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('superadmin')")
    public ApiResponse<Void> delete(@PathVariable String id) {
        contractService.softDelete(id);
        return ApiResponse.ok(null, "Xoa hop dong thanh cong");
    }
}
