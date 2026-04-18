package com.nckh.backend.modules.revisions;

import com.nckh.backend.common.ApiResponse;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/revisions")
public class RevisionController {

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','council_member')")
    public ApiResponse<Map<String, Object>> approve(@PathVariable String id) {
        return ApiResponse.ok(Map.<String, Object>of(
            "revisionId", id,
            "approved", true
        ), "Phe duyet ban chinh sua thanh cong");
    }
}
