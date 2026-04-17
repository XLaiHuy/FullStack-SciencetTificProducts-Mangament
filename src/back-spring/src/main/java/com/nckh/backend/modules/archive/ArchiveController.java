package com.nckh.backend.modules.archive;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.projects.Project;
import com.nckh.backend.modules.projects.ProjectRepository;
import com.nckh.backend.modules.users.User;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/archive")
public class ArchiveController {

    private final ArchiveRecordRepository archiveRepository;
    private final ProjectRepository projectRepository;

    public ArchiveController(ArchiveRecordRepository archiveRepository, ProjectRepository projectRepository) {
        this.archiveRepository = archiveRepository;
        this.projectRepository = projectRepository;
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAnyRole('archive_staff','superadmin')")
    public ApiResponse<DashboardDto> dashboard() {
        long total = archiveRepository.count();
        return ApiResponse.ok(new DashboardDto(total));
    }

    @GetMapping("/repository")
    @PreAuthorize("hasAnyRole('archive_staff','superadmin','report_viewer')")
    public ApiResponse<List<ArchiveItem>> repository() {
        List<ArchiveItem> data = archiveRepository.findAllByOrderByArchivedAtDesc().stream()
            .map(a -> new ArchiveItem(a.getId(), a.getProject().getId(), a.getProject().getCode(), a.getProject().getTitle(), a.getArchivedAt(), a.getArchivedBy()))
            .toList();
        return ApiResponse.ok(data);
    }

    @PostMapping("/repository/{projectId}")
    @PreAuthorize("hasAnyRole('archive_staff','superadmin')")
    public ApiResponse<ArchiveItem> add(@PathVariable String projectId, @RequestBody AddArchiveRequest req, @AuthenticationPrincipal User user) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(projectId)
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));

        ArchiveRecord record = archiveRepository.findByProjectId(projectId).orElseGet(ArchiveRecord::new);
        if (record.getId() == null) {
            record.setId(java.util.UUID.randomUUID().toString());
            record.setProject(project);
        }
        record.setArchivedBy(user.getName());
        record.setFileUrlsJson(req.fileUrlsJson() == null ? "[]" : req.fileUrlsJson());
        record.setNotes(req.notes());
        record = archiveRepository.save(record);

        return ApiResponse.ok(new ArchiveItem(record.getId(), project.getId(), project.getCode(), project.getTitle(), record.getArchivedAt(), record.getArchivedBy()));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('archive_staff','superadmin','report_viewer','project_owner')")
    public ApiResponse<List<ArchiveItem>> list() {
        return repository();
    }

    @GetMapping("/{topicId}/download")
    @PreAuthorize("hasAnyRole('archive_staff','superadmin','report_viewer','project_owner')")
    public ApiResponse<String> download(@PathVariable String topicId) {
        ArchiveRecord record = archiveRepository.findByProjectId(topicId)
            .orElseThrow(() -> new IllegalArgumentException("Khong tim thay ho so luu tru"));
        return ApiResponse.ok(record.getFileUrlsJson(), "Danh sach tep luu tru");
    }

    public record DashboardDto(long totalArchived) {}
    public record ArchiveItem(String id, String projectId, String projectCode, String projectTitle, java.time.Instant archivedAt, String archivedBy) {}
    public record AddArchiveRequest(String fileUrlsJson, String notes) {}
}
