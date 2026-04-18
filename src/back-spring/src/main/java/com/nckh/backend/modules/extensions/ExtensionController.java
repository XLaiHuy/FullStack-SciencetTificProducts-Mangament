package com.nckh.backend.modules.extensions;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.projects.Project;
import com.nckh.backend.modules.projects.ProjectRepository;
import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/extensions", "/extension-requests"})
public class ExtensionController {

    private final ExtensionRepository extensionRepository;
    private final ProjectRepository projectRepository;

    public ExtensionController(ExtensionRepository extensionRepository, ProjectRepository projectRepository) {
        this.extensionRepository = extensionRepository;
        this.projectRepository = projectRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('project_owner','research_staff','superadmin','report_viewer')")
    public ApiResponse<List<ExtensionItem>> list(@AuthenticationPrincipal User user) {
        List<Extension> data = user.getRole() == UserRole.project_owner
            ? extensionRepository.findByProjectOwnerIdOrderByCreatedAtDesc(user.getId())
            : extensionRepository.findAllByOrderByCreatedAtDesc();
        return ApiResponse.ok(data.stream().map(this::toItem).toList());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('project_owner','research_staff','superadmin','report_viewer')")
    public ApiResponse<ExtensionItem> getById(@PathVariable String id, @AuthenticationPrincipal User user) {
        Extension e = extensionRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Yeu cau khong ton tai"));
        if (user.getRole() == UserRole.project_owner && !e.getProject().getOwner().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Ban khong co quyen xem yeu cau nay");
        }
        return ApiResponse.ok(toItem(e));
    }

    @GetMapping("/{id}/supporting-document")
    @PreAuthorize("hasAnyRole('project_owner','research_staff','superadmin','report_viewer')")
    public ApiResponse<String> supportingDocument(@PathVariable String id, @AuthenticationPrincipal User user) {
        Extension e = extensionRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Yeu cau khong ton tai"));
        if (user.getRole() == UserRole.project_owner && !e.getProject().getOwner().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Ban khong co quyen xem tai lieu nay");
        }
        return ApiResponse.ok(e.getSupportingDocument());
    }

    @PostMapping
    @PreAuthorize("hasRole('project_owner')")
    public ApiResponse<ExtensionItem> create(@RequestBody CreateExtensionRequest req, @AuthenticationPrincipal User user) {
        Project p = projectRepository.findByIdAndIsDeletedFalse(req.projectId())
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));
        if (!p.getOwner().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Ban khong co quyen gui yeu cau gia han cho de tai nay");
        }

        Extension e = new Extension();
        e.setId(req.id());
        e.setProject(p);
        e.setReason(req.reason());
        e.setProposedDate(req.proposedDate());
        e.setExtensionDays(req.extensionDays());
        e.setSupportingDocument(req.supportingDocument());
        return ApiResponse.ok(toItem(extensionRepository.save(e)), "Gui yeu cau gia han thanh cong");
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('project_owner')")
    public ApiResponse<ExtensionItem> createMultipart(
        @RequestParam("projectId") String projectId,
        @RequestParam("reason") String reason,
        @RequestParam(value = "requested_deadline", required = false) String requestedDeadline,
        @RequestParam(value = "extensionDays", required = false) Integer extensionDays,
        @RequestPart(value = "supporting_document", required = false) MultipartFile supportingDocument,
        @AuthenticationPrincipal User user
    ) {
        Project p = projectRepository.findByIdAndIsDeletedFalse(projectId)
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));
        if (!p.getOwner().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Ban khong co quyen gui yeu cau gia han cho de tai nay");
        }

        String supportingPath = null;
        if (supportingDocument != null && !supportingDocument.isEmpty()) {
            try {
                Path uploadDir = Path.of(System.getProperty("user.dir"), "uploads", "extensions");
                Files.createDirectories(uploadDir);
                String safeName = System.currentTimeMillis() + "-" + (supportingDocument.getOriginalFilename() == null ? "supporting.bin" : supportingDocument.getOriginalFilename());
                Path filePath = uploadDir.resolve(safeName);
                Files.write(filePath, supportingDocument.getBytes());
                supportingPath = filePath.toString();
            } catch (Exception e) {
                throw new IllegalArgumentException("Khong the luu file minh chung: " + e.getMessage());
            }
        }

        LocalDate proposed = requestedDeadline != null && requestedDeadline.length() >= 10
            ? LocalDate.parse(requestedDeadline.substring(0, 10))
            : LocalDate.now().plusDays(Math.max(extensionDays == null ? 30 : extensionDays, 1));

        Extension e = new Extension();
        e.setId(UUID.randomUUID().toString());
        e.setProject(p);
        e.setReason(reason);
        e.setProposedDate(proposed);
        e.setExtensionDays(extensionDays == null ? 30 : extensionDays);
        e.setSupportingDocument(supportingPath);
        return ApiResponse.ok(toItem(extensionRepository.save(e)), "Gui yeu cau gia han thanh cong");
    }

    @PutMapping("/{id}/decision")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<ExtensionItem> decide(@PathVariable String id, @RequestBody DecideExtensionRequest req, @AuthenticationPrincipal User user) {
        Extension e = extensionRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Yeu cau khong ton tai"));
        ExtensionStatus status = req.status();
        if (status == null && req.decision() != null) {
            status = req.decision();
        }
        if (status == null) {
            status = ExtensionStatus.da_phe_duyet;
        }
        e.setBoardStatus(status);
        e.setDecisionNote(req.decisionNote());
        e.setDecidedBy(user.getName());
        e.setDecidedAt(Instant.now());
        return ApiResponse.ok(toItem(extensionRepository.save(e)), "Da cap nhat ket qua gia han");
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<ExtensionItem> approve(@PathVariable String id, @RequestBody DecideExtensionRequest req, @AuthenticationPrincipal User user) {
        return decide(id, req, user);
    }

    private ExtensionItem toItem(Extension e) {
        return new ExtensionItem(
            e.getId(),
            e.getProject().getId(),
            e.getProject().getCode(),
            e.getProject().getTitle(),
            e.getReason(),
            e.getProposedDate(),
            e.getExtensionDays(),
            e.getBoardStatus(),
            e.getDecisionNote()
        );
    }

    public record ExtensionItem(String id, String projectId, String projectCode, String projectTitle, String reason, LocalDate proposedDate, Integer extensionDays, ExtensionStatus boardStatus, String decisionNote) {}
    public record CreateExtensionRequest(@NotBlank String id, @NotBlank String projectId, @NotBlank String reason, @NotNull LocalDate proposedDate, @NotNull Integer extensionDays, String supportingDocument) {}
    public record DecideExtensionRequest(ExtensionStatus status, ExtensionStatus decision, String decisionNote) {}
}
