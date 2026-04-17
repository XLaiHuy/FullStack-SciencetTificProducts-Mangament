package com.nckh.backend.modules.templates;

import com.nckh.backend.common.ApiResponse;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/templates")
public class TemplateController {

    private final TemplateRepository templateRepository;

    public TemplateController(TemplateRepository templateRepository) {
        this.templateRepository = templateRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner')")
    public ApiResponse<List<Map<String, Object>>> list() {
        List<Map<String, Object>> rows = templateRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream()
            .map(t -> Map.<String, Object>of(
                "id", t.getId(),
                "name", t.getName(),
                "version", t.getVersion(),
                "role", t.getRole(),
                "category", t.getCategory(),
                "fileUrl", t.getFileUrl(),
                "isDefault", t.getIsDefault()
            )).toList();
        return ApiResponse.ok(rows);
    }

    @GetMapping("/{id}/download")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner')")
    public ApiResponse<String> download(@PathVariable String id) {
        Template t = templateRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Template khong ton tai"));
        return ApiResponse.ok(t.getFileUrl());
    }
}
