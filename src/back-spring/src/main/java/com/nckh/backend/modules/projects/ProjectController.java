package com.nckh.backend.modules.projects;

import static com.nckh.backend.modules.projects.ProjectDtos.*;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.users.User;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;

@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner','accounting','archive_staff','report_viewer','council_member')")
    public ApiResponse<List<ProjectItem>> getAll(
        @AuthenticationPrincipal User user,
        @RequestParam(value = "status", required = false) String status,
        @RequestParam(value = "search", required = false) String search
    ) {
        return ApiResponse.ok(projectService.getAll(user, status, search));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('project_owner')")
    public ApiResponse<List<ProjectItem>> getMy(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(projectService.getMine(user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner','accounting','archive_staff','report_viewer','council_member')")
    public ApiResponse<ProjectItem> getById(@PathVariable String id, @AuthenticationPrincipal User user) {
        return ApiResponse.ok(projectService.getById(id, user));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<ProjectItem> create(@Valid @RequestBody CreateProjectRequest request) {
        return ApiResponse.ok(projectService.create(request), "Tao de tai thanh cong");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<ProjectItem> update(@PathVariable String id, @Valid @RequestBody CreateProjectRequest request) {
        return ApiResponse.ok(projectService.update(id, request), "Cap nhat de tai thanh cong");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('superadmin')")
    public ApiResponse<Void> delete(@PathVariable String id) {
        projectService.softDelete(id);
        return ApiResponse.ok(null, "Xoa de tai thanh cong");
    }

    @GetMapping("/owners")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<List<Map<String, Object>>> owners() {
        return ApiResponse.ok(projectService.owners());
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<ProjectItem> updateStatus(@PathVariable String id, @Valid @RequestBody UpdateStatusRequest request) {
        return ApiResponse.ok(projectService.updateStatus(id, request), "Cap nhat trang thai thanh cong");
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<DashboardStats> dashboard() {
        return ApiResponse.ok(projectService.dashboard());
    }

    @GetMapping("/{id}/reports/{reportId}/download")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner','accounting','archive_staff','report_viewer','council_member')")
    public org.springframework.http.ResponseEntity<byte[]> downloadReportFile(@PathVariable String id, @PathVariable String reportId) {
        ProjectDtos.ProjectItem project = projectService.dashboard().total() > 0 ? projectService.getAll(nullActor(), null, null).stream().filter(p -> p.id().equals(id)).findFirst().orElse(null) : null;
        if (project == null) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND).body("Project not found".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }

        String url = "midterm".equals(reportId) ? project.midtermReportUrl() :
                     ("final".equals(reportId) ? project.finalReportUrl() : null);

        if (url == null || url.isBlank()) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND).body("Report not found".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        }

        try {
            java.nio.file.Path path = java.nio.file.Path.of(System.getProperty("user.dir"), url.split("/", 2)[1].replace("/", java.io.File.separator));
            if (!java.nio.file.Files.exists(path)) {
                return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND).body("Report file deleted".getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
            return org.springframework.http.ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + path.getFileName().toString())
                .body(java.nio.file.Files.readAllBytes(path));
        } catch (java.io.IOException e) {
            return org.springframework.http.ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR).body(new byte[0]);
        }
    }

    @PostMapping(path = "/{id}/midterm-report", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('project_owner')")
    public ApiResponse<Map<String, Object>> submitMidtermReport(@PathVariable String id, @RequestPart("file") MultipartFile file, @RequestParam(value = "content", required = false) String content) {
        String url = saveUpload(file, "reports");
        projectService.updateMidtermReport(id, url, content == null ? "" : content);
        return ApiResponse.ok(Map.<String, Object>of(
            "id", java.util.UUID.randomUUID().toString(),
            "projectId", id,
            "type", "midterm_report",
            "fileName", file.getOriginalFilename(),
            "content", content == null ? "" : content
        ), "Nop bao cao giua ky thanh cong");
    }

    @PostMapping(path = "/{id}/final-submission", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('project_owner')")
    public ApiResponse<Map<String, Object>> submitFinalReport(@PathVariable String id, @RequestPart("file") MultipartFile file, @RequestParam(value = "content", required = false) String content) {
        projectService.ensureFinalSubmissionAllowed(id);
        String url = saveUpload(file, "reports");
        projectService.updateFinalReport(id, url);
        projectService.updateStatus(id, new UpdateStatusRequest(ProjectStatus.cho_nghiem_thu));
        return ApiResponse.ok(Map.<String, Object>of(
            "id", java.util.UUID.randomUUID().toString(),
            "projectId", id,
            "type", "final_report",
            "fileName", file.getOriginalFilename(),
            "content", content == null ? "" : content
        ), "Nop bao cao tong ket thanh cong");
    }

    @PostMapping(path = "/{id}/final-submission", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('project_owner')")
    public ApiResponse<Map<String, Object>> submitFinalReportJson(@PathVariable String id, @RequestBody(required = false) Map<String, Object> payload) {
        projectService.ensureFinalSubmissionAllowed(id);
        projectService.updateStatus(id, new UpdateStatusRequest(ProjectStatus.cho_nghiem_thu));
        String content = payload == null ? "" : String.valueOf(payload.getOrDefault("content", ""));
        return ApiResponse.ok(Map.<String, Object>of(
            "id", java.util.UUID.randomUUID().toString(),
            "projectId", id,
            "type", "final_report",
            "fileName", "",
            "content", content
        ), "Nop bao cao tong ket thanh cong");
    }

    @PostMapping(path = "/{id}/products", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('project_owner')")
    public ApiResponse<Map<String, Object>> submitProduct(@PathVariable String id, @RequestPart("file") MultipartFile file, @RequestParam(value = "type", required = false) String type, @RequestParam(value = "content", required = false) String content) {
        if ("final_report".equals(type)) {
            projectService.ensureFinalSubmissionAllowed(id);
            String url = saveUpload(file, "reports");
            projectService.updateFinalReport(id, url);
            projectService.updateStatus(id, new UpdateStatusRequest(ProjectStatus.cho_nghiem_thu));
        } else if ("midterm_report".equals(type)) {
            String url = saveUpload(file, "reports");
            projectService.updateMidtermReport(id, url, content == null ? "" : content);
        }
        return ApiResponse.ok(Map.<String, Object>of("projectId", id, "type", type == null ? "other" : type, "fileName", file.getOriginalFilename(), "content", content == null ? "" : content), "Nop san pham thanh cong");
    }

    private String saveUpload(MultipartFile file, String subDir) {
        try {
            java.nio.file.Path uploadDir = java.nio.file.Path.of(System.getProperty("user.dir"), "uploads", subDir);
            java.nio.file.Files.createDirectories(uploadDir);
            String safeName = System.currentTimeMillis() + "-" + (file.getOriginalFilename() == null ? "file.bin" : file.getOriginalFilename().replaceAll("[^a-zA-Z0-9._-]", "_"));
            java.nio.file.Path target = uploadDir.resolve(safeName);
            java.nio.file.Files.copy(file.getInputStream(), target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + subDir + "/" + safeName;
        } catch (java.io.IOException e) {
            throw new RuntimeException("Loi luu file", e);
        }
    }

    private User nullActor() {
        User u = new User();
        u.setRole(com.nckh.backend.modules.users.UserRole.superadmin);
        return u;
    }
}
