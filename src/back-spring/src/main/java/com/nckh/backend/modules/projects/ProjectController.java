package com.nckh.backend.modules.projects;

import static com.nckh.backend.modules.projects.ProjectDtos.*;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.users.User;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner','accounting','archive_staff','report_viewer','council_member')")
    public ApiResponse<List<ProjectItem>> getAll(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(projectService.getAll(user));
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
}
