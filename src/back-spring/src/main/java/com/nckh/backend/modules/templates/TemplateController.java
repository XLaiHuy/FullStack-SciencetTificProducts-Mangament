package com.nckh.backend.modules.templates;

import com.nckh.backend.common.ApiResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/templates")
public class TemplateController {

    private final TemplateRepository templateRepository;

    public TemplateController(TemplateRepository templateRepository) {
        this.templateRepository = templateRepository;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner','council_member')")
    public ApiResponse<List<Map<String, Object>>> list() {
        List<Map<String, Object>> rows = templateRepository.findByIsDeletedFalseOrderByCreatedAtDesc().stream()
            .map(t -> {
                Map<String, Object> row = new java.util.LinkedHashMap<>();
                row.put("id", t.getId());
                row.put("name", t.getName());
                row.put("version", t.getVersion());
                row.put("targetRole", t.getRole());
                row.put("formType", Map.<String, Object>of("code", t.getCategory()));
                row.put("fileUrl", t.getFileUrl());
                row.put("size", t.getSize());
                row.put("effectiveDate", t.getEffectiveDate() == null ? Instant.now() : t.getEffectiveDate());
                row.put("createdAt", Instant.now());
                row.put("updatedAt", Instant.now());
                row.put("isDefault", t.getIsDefault());
                return row;
            }).toList();
        return ApiResponse.ok(rows);
    }

    @GetMapping("/form-types")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner','council_member')")
    public ApiResponse<List<Map<String, String>>> formTypes() {
        List<Map<String, String>> data = List.of(
            Map.of("id", "1", "code", "contract_template", "name", "Bieu mau hop dong"),
            Map.of("id", "2", "code", "council_minutes", "name", "Bien ban hoi dong"),
            Map.of("id", "3", "code", "report_template", "name", "Mau bao cao")
        );
        return ApiResponse.ok(data);
    }

    /** Download original uploaded file — correct MIME type based on extension */
    @GetMapping("/{id}/download")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner','council_member')")
    public org.springframework.http.ResponseEntity<byte[]> download(@PathVariable String id) throws Exception {
        Template t = templateRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Template khong ton tai"));
        if (t.getFileUrl() != null && !t.getFileUrl().isBlank()) {
            Path p = Path.of(t.getFileUrl());
            if (Files.exists(p)) {
                String fileName = p.getFileName().toString();
                MediaType mediaType = detectMediaType(fileName);
                String encodedName = java.net.URLEncoder.encode(fileName, java.nio.charset.StandardCharsets.UTF_8)
                    .replace("+", "%20");
                return org.springframework.http.ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileName + "\"; filename*=UTF-8''" + encodedName)
                    .header("Access-Control-Expose-Headers", "Content-Disposition")
                    .body(Files.readAllBytes(p));
            }
        }
        // Fallback text stub
        byte[] fallback = ("Template placeholder for " + t.getName())
            .getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return org.springframework.http.ResponseEntity.ok()
            .contentType(MediaType.TEXT_PLAIN)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"template_" + id + ".txt\"")
            .header("Access-Control-Expose-Headers", "Content-Disposition")
            .body(fallback);
    }

    /** Fill / draft download — returns original file as draft with project-prefixed name */
    @GetMapping("/{id}/fill")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','project_owner','council_member')")
    public org.springframework.http.ResponseEntity<byte[]> fill(
        @PathVariable String id,
        @RequestParam(value = "projectId", required = false) String projectId
    ) {
        Template t = templateRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Template khong ton tai"));
        if (t.getFileUrl() != null && !t.getFileUrl().isBlank()) {
            Path p = Path.of(t.getFileUrl());
            if (Files.exists(p)) {
                String origName = p.getFileName().toString();
                MediaType mediaType = detectMediaType(origName);
                String draftName = "Draft_" + (projectId != null ? projectId + "_" : "") + origName;
                try {
                    String encoded = java.net.URLEncoder.encode(draftName, java.nio.charset.StandardCharsets.UTF_8)
                        .replace("+", "%20");
                    return org.springframework.http.ResponseEntity.ok()
                        .contentType(mediaType)
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + draftName + "\"; filename*=UTF-8''" + encoded)
                        .header("Access-Control-Expose-Headers", "Content-Disposition")
                        .body(Files.readAllBytes(p));
                } catch (Exception ex) {
                    // fall through
                }
            }
        }
        // Stub when no file uploaded yet
        String doc = "Filled template: " + t.getName() + " for project " + (projectId == null ? "" : projectId);
        return org.springframework.http.ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"Draft_" + id + ".docx\"")
            .header("Access-Control-Expose-Headers", "Content-Disposition")
            .body(doc.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    /** Detect correct MIME type from file extension */
    private static MediaType detectMediaType(String fileName) {
        if (fileName == null) return MediaType.APPLICATION_OCTET_STREAM;
        String lower = fileName.toLowerCase(java.util.Locale.ROOT);
        if (lower.endsWith(".pdf"))  return MediaType.APPLICATION_PDF;
        if (lower.endsWith(".docx")) return MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        if (lower.endsWith(".doc"))  return MediaType.parseMediaType("application/msword");
        if (lower.endsWith(".xlsx")) return MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        if (lower.endsWith(".xls"))  return MediaType.parseMediaType("application/vnd.ms-excel");
        if (lower.endsWith(".pptx")) return MediaType.parseMediaType(
            "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        if (lower.endsWith(".txt"))  return MediaType.TEXT_PLAIN;
        if (lower.endsWith(".csv"))  return MediaType.parseMediaType("text/csv");
        return MediaType.APPLICATION_OCTET_STREAM;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<Map<String, Object>> upload(
        @RequestParam("name") String name,
        @RequestParam("version") String version,
        @RequestParam("targetRole") String targetRole,
        @RequestParam("formTypeCode") String formTypeCode,
        @RequestParam(value = "effectiveDate", required = false) String effectiveDate,
        @RequestPart("file") MultipartFile file
    ) {
        try {
            Path uploadDir = Path.of(System.getProperty("user.dir"), "uploads", "templates");
            Files.createDirectories(uploadDir);
            String safeName = System.currentTimeMillis() + "-" +
                (file.getOriginalFilename() == null ? "template.bin" : file.getOriginalFilename());
            Path filePath = uploadDir.resolve(safeName);
            Files.write(filePath, file.getBytes());

            Template t = new Template();
            t.setId(UUID.randomUUID().toString());
            t.setName(name);
            t.setVersion(version);
            t.setRole(targetRole);
            t.setCategory(formTypeCode);
            t.setFileUrl(filePath.toString());
            t.setSize(Math.max(1, file.getSize() / 1024) + " KB");
            t.setIsDefault(true);
            t.setEffectiveDate(Instant.now());
            Template saved = templateRepository.save(t);

            return ApiResponse.ok(Map.<String, Object>of(
                "id", saved.getId(),
                "name", saved.getName(),
                "version", saved.getVersion(),
                "targetRole", saved.getRole(),
                "formType", Map.<String, Object>of("code", saved.getCategory()),
                "size", saved.getSize(),
                "effectiveDate", saved.getEffectiveDate(),
                "isDefault", saved.getIsDefault()
            ), "Tai len bieu mau thanh cong");
        } catch (Exception e) {
            throw new IllegalArgumentException("Khong the tai len bieu mau: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<Void> delete(@PathVariable String id) {
        Template t = templateRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Template khong ton tai"));
        t.setIsDeleted(true);
        templateRepository.save(t);
        return ApiResponse.ok(null, "Da xoa bieu mau");
    }
}
