package com.nckh.backend.modules.archive;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.projects.Project;
import com.nckh.backend.modules.projects.ProjectRepository;
import com.nckh.backend.modules.users.User;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/archive", "/archives"})
@Transactional
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
            .map(a -> projectRepository.findByIdAndIsDeletedFalse(a.getProjectId())
                .map(p -> new ArchiveItem(a.getId(), p.getId(), p.getCode(), p.getTitle(), a.getArchivedAt(), a.getArchivedBy()))
                .orElse(new ArchiveItem(a.getId(), a.getProjectId(), "", "", a.getArchivedAt(), a.getArchivedBy())))
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
            record.setProjectId(project.getId());
        }
        record.setArchivedBy(user.getName());
        record.setFileUrlsJson(req.fileUrlsJson() == null ? "[]" : req.fileUrlsJson());
        record.setNotes(req.notes());
        record = archiveRepository.save(record);

        return ApiResponse.ok(new ArchiveItem(record.getId(), project.getId(), project.getCode(), project.getTitle(), record.getArchivedAt(), record.getArchivedBy()));
    }

    @PostMapping(path = "/repository/{projectId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('archive_staff','superadmin')")
    public ApiResponse<ArchiveItem> addMultipart(
        @PathVariable String projectId,
        @RequestPart(value = "files", required = false) List<MultipartFile> files,
        @RequestParam(value = "notes", required = false) String notes,
        @AuthenticationPrincipal User user
    ) {
        String json = files == null
            ? "[]"
            : files.stream()
                .map(MultipartFile::getOriginalFilename)
                .filter(n -> n != null && !n.isBlank())
                .map(n -> "\"/uploads/archive/" + n + "\"")
                .collect(java.util.stream.Collectors.joining(",", "[", "]"));
        return add(projectId, new AddArchiveRequest(json, notes), user);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('archive_staff','superadmin','report_viewer','project_owner')")
    public ApiResponse<List<Map<String, Object>>> list() {
        List<Map<String, Object>> rows = archiveRepository.findAllByOrderByArchivedAtDesc().stream()
            .map(a -> projectRepository.findByIdAndIsDeletedFalse(a.getProjectId()).map(project -> {
                List<String> files = parseFileUrls(a.getFileUrlsJson());
                return Map.<String, Object>of(
                    "id", project.getId(),
                    "code", project.getCode(),
                    "title", project.getTitle(),
                    "field", project.getField(),
                    "status", project.getStatus().name(),
                    "owner", Map.of("name", project.getOwner() == null ? "" : project.getOwner().getName()),
                    "files", files
                );
            }).orElseGet(Map::of))
            .filter(m -> !m.isEmpty())
            .toList();
        return ApiResponse.ok(rows);
    }

    @GetMapping("/{topicId}/download")
    @PreAuthorize("hasAnyRole('archive_staff','superadmin','report_viewer','project_owner')")
    public ResponseEntity<byte[]> download(@PathVariable String topicId) {
        ArchiveRecord record = archiveRepository.findByProjectId(topicId)
            .orElseThrow(() -> new IllegalArgumentException("Khong tim thay ho so luu tru"));

        String content = "Archive files for project " + topicId + "\n" + record.getFileUrlsJson();
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=archive-" + topicId + ".txt")
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .body(bytes);
    }

    private List<String> parseFileUrls(String fileUrlsJson) {
        if (fileUrlsJson == null || fileUrlsJson.isBlank()) {
            return List.of();
        }
        String raw = fileUrlsJson.trim();
        if (raw.startsWith("[") && raw.endsWith("]")) {
            raw = raw.substring(1, raw.length() - 1);
        }
        if (raw.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(raw.split(","))
            .map(s -> s == null ? "" : s.trim())
            .map(s -> s.replace("\"", ""))
            .filter(s -> !s.isBlank())
            .toList();
    }

    public record DashboardDto(long totalArchived) {}
    public record ArchiveItem(String id, String projectId, String projectCode, String projectTitle, java.time.Instant archivedAt, String archivedBy) {}
    public record AddArchiveRequest(String fileUrlsJson, String notes) {}
}
