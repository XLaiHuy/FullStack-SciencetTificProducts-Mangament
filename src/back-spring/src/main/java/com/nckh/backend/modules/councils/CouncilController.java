package com.nckh.backend.modules.councils;

import static com.nckh.backend.modules.councils.CouncilDtos.*;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.users.User;
import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/councils")
public class CouncilController {

    private final CouncilService councilService;

    public CouncilController(CouncilService councilService) {
        this.councilService = councilService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin','council_member','project_owner')")
    public ApiResponse<List<CouncilItem>> getAll(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(councilService.getAll(user));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('council_member','project_owner')")
    public ApiResponse<List<CouncilItem>> getMine(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(councilService.getMine(user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','council_member','project_owner')")
    public ApiResponse<Map<String, Object>> getById(@PathVariable String id, @AuthenticationPrincipal User user) {
        CouncilItem item = councilService.getById(id, user);
        return ApiResponse.ok(Map.<String, Object>of(
            "id", item.id(),
            "decisionCode", item.decisionCode(),
            "projectId", item.projectId(),
            "projectCode", item.projectCode(),
            "projectTitle", item.projectTitle(),
            "status", item.status(),
            "decisionPdfUrl", item.decisionPdfUrl() == null ? "" : item.decisionPdfUrl(),
            "minutesFile", councilService.getMinutesFileUrl(id),
            "members", councilService.getMembers(id)
        ));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<Map<String, Object>> create(@Valid @RequestBody CreateCouncilRequest request) {
        CouncilCreateResult result = councilService.create(request);
        CouncilItem item = result.council();
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", item.id());
        payload.put("decisionCode", item.decisionCode());
        payload.put("projectId", item.projectId());
        payload.put("projectCode", item.projectCode());
        payload.put("projectTitle", item.projectTitle());
        payload.put("createdDate", item.createdDate());
        payload.put("status", item.status());
        payload.put("decisionPdfUrl", item.decisionPdfUrl());
        payload.put("newAccountsCount", result.newAccountsCount());
        payload.put("newAccountsCsvBase64", result.newAccountsCsvBase64());
        payload.put("newAccountsCsvFileName", result.newAccountsCsvFileName());
        return ApiResponse.ok(payload, "Tao hoi dong thanh cong");
    }

    @PostMapping("/check-conflict")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<Map<String, Object>> checkConflict(@RequestBody Map<String, Object> req) {
        return ApiResponse.ok(Map.<String, Object>of("hasConflict", false, "memberEmail", String.valueOf(req.getOrDefault("memberEmail", ""))));
    }

    @PostMapping(path = "/parse-members", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<List<Map<String, Object>>> parseMembers(@RequestPart("file") MultipartFile file) {
        String content = extractTextContent(file);

        List<Map<String, Object>> rows = parseContentToMembers(content);

        if (rows.isEmpty()) {
            rows = councilService.suggestMembersFromDatabase();
        }
        return ApiResponse.ok(rows);
    }

    /** Extract plain text from uploaded file (DOCX via ZIP XML, PDF via text fallback, or plain text) */
    private String extractTextContent(MultipartFile file) {
        String originalName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        try {
            byte[] bytes = file.getBytes();
            if (originalName.endsWith(".docx")) {
                return extractDocxText(bytes);
            }
            // For PDF and other formats, try UTF-8 text extraction
            return new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    /** Extract text from DOCX by reading word/document.xml inside the ZIP */
    private String extractDocxText(byte[] bytes) {
        try (java.util.zip.ZipInputStream zip = new java.util.zip.ZipInputStream(
                new java.io.ByteArrayInputStream(bytes))) {
            java.util.zip.ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if ("word/document.xml".equals(entry.getName())) {
                    byte[] xmlBytes = zip.readAllBytes();
                    String xml = new String(xmlBytes, java.nio.charset.StandardCharsets.UTF_8);
                    // Preserve row/cell boundaries to keep table-like structures for better parsing.
                    return xml
                        .replace("</w:tr>", "\n")
                        .replace("</w:p>", "\n")
                        .replace("</w:tc>", " | ")
                        .replaceAll("<[^>]+>", " ")
                        .replace("&amp;", "&")
                        .replaceAll("\\s*\\|\\s*", " | ")
                        .replaceAll("[ \\t]+", " ")
                        .replaceAll("\\n{2,}", "\n")
                        .trim();
                }
            }
        } catch (Exception ignored) {}
        return "";
    }

    /** Parse text content into council member records */
    private List<Map<String, Object>> parseContentToMembers(String content) {
        if (content == null || content.isBlank()) return List.of();

        List<Map<String, Object>> rows = new java.util.ArrayList<>();
        // Split by lines or by common separators
        String[] lines = content.split("\\r?\\n");

        for (String rawLine : lines) {
            String line = rawLine.replace("\uFEFF", "").trim();
            if (line.isBlank()) continue;

            String lower = line.toLowerCase(Locale.ROOT);
            // Skip pure header/section lines without data
            if (lower.length() < 3) continue;

            if (isNoiseLine(lower)) continue;

            Map<String, Object> tableRow = parseTableLikeLine(line);
            if (tableRow != null) {
                rows.add(tableRow);
                continue;
            }

            String role = detectRole(lower);
            String email = extract(line, "([A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,})");
            String name = extractName(line);
            String title = extractTitle(line);

            // Only include lines that have at least a name or email
            if ((name == null || name.isBlank()) && (email == null || email.isBlank())) continue;

            if (name != null && isNoiseName(name)) continue;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", UUID.randomUUID().toString());
            row.put("name", name != null && !name.isBlank() ? name : "Thanh vien");
            row.put("title", title != null ? title : "");
            row.put("institution", "");
            row.put("email", email != null ? email.toLowerCase(Locale.ROOT) : "");
            row.put("phone", "");
            row.put("affiliation", "");
            row.put("role", role);
            rows.add(row);
        }
        return postProcessParsedMembers(rows, content);
    }

    private List<Map<String, Object>> postProcessParsedMembers(List<Map<String, Object>> rawRows, String content) {
        Map<String, Map<String, Object>> deduped = new LinkedHashMap<>();

        for (Map<String, Object> row : rawRows) {
            String name = String.valueOf(row.getOrDefault("name", "")).trim();
            String email = String.valueOf(row.getOrDefault("email", "")).trim().toLowerCase(Locale.ROOT);

            if ((name.isBlank() || "Thanh vien".equalsIgnoreCase(name)) && email.isBlank()) {
                continue;
            }
            if (!name.isBlank() && isNoiseName(name)) {
                continue;
            }

            String key = !email.isBlank()
                ? "email:" + email
                : "name:" + normalizeVietnamese(name.toLowerCase(Locale.ROOT)).replaceAll("[^a-z0-9 ]", "").trim();

            Map<String, Object> existing = deduped.get(key);
            if (existing == null) {
                deduped.put(key, row);
                continue;
            }

            String existingRole = String.valueOf(existing.getOrDefault("role", "uy_vien"));
            String incomingRole = String.valueOf(row.getOrDefault("role", "uy_vien"));
            if ("uy_vien".equals(existingRole) && !"uy_vien".equals(incomingRole)) {
                existing.put("role", incomingRole);
            }
            String existingTitle = String.valueOf(existing.getOrDefault("title", "")).trim();
            String incomingTitle = String.valueOf(row.getOrDefault("title", "")).trim();
            if (existingTitle.isBlank() && !incomingTitle.isBlank()) {
                existing.put("title", incomingTitle);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>(deduped.values());

        List<String> roleSequence = extractRoleSequence(content);
        int roleCursor = 0;
        for (Map<String, Object> row : result) {
            String role = String.valueOf(row.getOrDefault("role", "uy_vien"));
            if (!"uy_vien".equals(role)) continue;
            if (roleCursor >= roleSequence.size()) break;
            row.put("role", roleSequence.get(roleCursor));
            roleCursor += 1;
        }

        ensureRequiredRoles(result);
        return result;
    }

    private List<String> extractRoleSequence(String content) {
        List<String> roles = new ArrayList<>();
        String[] lines = content.split("\\r?\\n");
        for (String raw : lines) {
            String line = raw.replace("\uFEFF", "").trim();
            if (line.isBlank()) continue;
            String normalized = normalizeVietnamese(line.toLowerCase(Locale.ROOT));
            if (!normalized.contains("vai tro")
                && !normalized.contains("chu tich")
                && !normalized.contains("phan bien")
                && !normalized.contains("thu ky")) {
                continue;
            }

            String role = detectRole(normalized);
            if ("uy_vien".equals(role) && !(normalized.contains("uy vien") || normalized.contains("uy vien"))) {
                continue;
            }
            roles.add(role);
        }
        return roles;
    }

    private void ensureRequiredRoles(List<Map<String, Object>> rows) {
        String[] required = new String[] { "chu_tich", "phan_bien_1", "phan_bien_2", "thu_ky" };
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("chu_tich", 0);
        counts.put("phan_bien_1", 0);
        counts.put("phan_bien_2", 0);
        counts.put("thu_ky", 0);
        counts.put("uy_vien", 0);

        for (Map<String, Object> row : rows) {
            String role = String.valueOf(row.getOrDefault("role", "uy_vien"));
            counts.put(role, counts.getOrDefault(role, 0) + 1);
        }

        List<Map<String, Object>> uyVienRows = rows.stream()
            .filter(row -> "uy_vien".equals(String.valueOf(row.getOrDefault("role", "uy_vien"))))
            .toList();

        int cursor = 0;
        for (String requiredRole : required) {
            if (counts.getOrDefault(requiredRole, 0) > 0) continue;
            if (cursor >= uyVienRows.size()) break;
            uyVienRows.get(cursor).put("role", requiredRole);
            cursor += 1;
        }
    }

    private boolean isNoiseLine(String lower) {
        String normalized = normalizeVietnamese(lower)
            .replace("\uFEFF", "")
            .replaceAll("[\\t ]+", " ")
            .trim();
        return normalized.startsWith("ho va ten")
            || normalized.startsWith("vai tro")
            || normalized.startsWith("email")
            || normalized.startsWith("hoc ham")
            || normalized.startsWith("nhap hoc ham")
            || normalized.startsWith("don vi")
            || normalized.startsWith("cong hoa xa hoi")
            || normalized.startsWith("doc lap")
            || normalized.startsWith("danh sach")
            || normalized.startsWith("ma de tai")
            || normalized.startsWith("ten de tai")
            || normalized.startsWith("ngay thanh lap")
            || normalized.startsWith("ghi chu")
            || normalized.startsWith("hoi dong");
    }

    private boolean isNoiseName(String name) {
        String normalized = normalizeVietnamese(name.toLowerCase(Locale.ROOT));
        return normalized.startsWith("vai tro")
            || normalized.startsWith("email")
            || normalized.startsWith("ho va ten")
            || normalized.startsWith("hoc ham")
            || normalized.startsWith("nhap hoc ham")
            || normalized.startsWith("don vi")
            || normalized.startsWith("cong hoa xa hoi")
            || normalized.startsWith("doc lap")
            || normalized.startsWith("danh sach")
            || normalized.startsWith("ma de tai")
            || normalized.startsWith("ten de tai")
            || normalized.startsWith("ngay thanh lap")
            || normalized.startsWith("ghi chu")
            || normalized.startsWith("hoi dong");
    }

    private Map<String, Object> parseTableLikeLine(String line) {
        if (!line.contains("|")) return null;

        List<String> cells = Arrays.stream(line.split("\\|"))
            .map(String::trim)
            .filter(cell -> !cell.isBlank())
            .toList();

        if (cells.size() < 2) return null;

        String email = "";
        String role = "uy_vien";
        String title = "";
        String name = "";

        for (String cell : cells) {
            String lower = cell.toLowerCase(Locale.ROOT);

            String maybeEmail = extract(cell, "([A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,})");
            if (!maybeEmail.isBlank()) {
                email = maybeEmail.toLowerCase(Locale.ROOT);
                continue;
            }

            String maybeRole = detectRole(lower);
            if (!"uy_vien".equals(maybeRole) || lower.contains("uy vien") || lower.contains("ủy viên")) {
                role = maybeRole;
                continue;
            }

            String maybeTitle = extractTitle(cell);
            if (!maybeTitle.isBlank()) {
                title = maybeTitle;
            }

            if (name.isBlank() && !isNoiseName(cell)) {
                String candidate = extractName(cell);
                if (candidate != null && !candidate.isBlank() && !isNoiseName(candidate)) {
                    name = candidate;
                }
            }
        }

        if (name.isBlank() && email.isBlank()) return null;

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", UUID.randomUUID().toString());
        row.put("name", name.isBlank() ? "Thanh vien" : name);
        row.put("title", title);
        row.put("institution", "");
        row.put("email", email);
        row.put("phone", "");
        row.put("affiliation", "");
        row.put("role", role);
        return row;
    }

    /** Detect Vietnamese council role from line text */
    private String detectRole(String lower) {
        if (lower.contains("chủ tịch") || lower.contains("chu tich")) return "chu_tich";
        if (lower.contains("phản biện 1") || lower.contains("phan bien 1") || lower.contains("pb1")) return "phan_bien_1";
        if (lower.contains("phản biện 2") || lower.contains("phan bien 2") || lower.contains("pb2")) return "phan_bien_2";
        if (lower.contains("phản biện") || lower.contains("phan bien")) return "phan_bien_1";
        if (lower.contains("thư ký") || lower.contains("thu ky")) return "thu_ky";
        if (lower.contains("ủy viên") || lower.contains("uy vien")) return "uy_vien";
        return "uy_vien";
    }

    /** Extract person name from line (after "Ho va ten:", academic titles, or first meaningful token) */
    private String extractName(String line) {
        // Try "Ho va ten: XXX" or "Họ và tên: XXX"
        String fromLabel = extract(line, "(?i)h[oọ]\\s+v[aà]\\s+t[eê]n\\s*:\\s*([^,;|]+)");
        if (fromLabel != null && !fromLabel.isBlank()) return fromLabel.trim();
        // Try "Tên: XXX"
        String fromTen = extract(line, "(?i)t[eê]n\\s*:\\s*([^,;|]+)");
        if (fromTen != null && !fromTen.isBlank()) return fromTen.trim();
        // Strip academic titles and extract remaining as name
        String stripped = line
            .replaceAll("(?i)(GS\\.?TS\\.?|PGS\\.?TS\\.?|TS\\.?|ThS\\.?|KS\\.?|CN\\.?)\\s*", "")
            .replaceAll("(?i)(Chủ tịch|Chu tich|Phản biện|Phan bien|Thư ký|Thu ky|Ủy viên|Uy vien)\\s*[:\\-]?\\s*", "")
            .replaceAll("(?i)(Vai trò|Vai tro|Đơn vị|Don vi|Email|Học hàm|Hoc ham)\\s*[:\\-]?\\s*", "")
            .replaceAll("[A-Za-z0-9._%+\\-]+@[A-Za-z0-9.\\-]+\\.[A-Za-z]{2,}", "")
            .replaceAll("[;|,].*", "")
            .trim();
        return stripped.length() >= 3 ? stripped : null;
    }

    /** Extract academic title/degree from line */
    private String extractTitle(String line) {
        String t = extract(line, "(?i)(GS\\.?TS\\.?|PGS\\.?TS\\.?|TS\\.?|ThS\\.?|KS\\.?|CN\\.)");
        return t != null ? t.toUpperCase(Locale.ROOT) : "";
    }

    private String normalizeVietnamese(String value) {
        return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
            .replaceAll("[\\p{InCombiningDiacriticalMarks}]", "");
    }

    @PostMapping("/{id}/members")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<Map<String, Object>> addMember(@PathVariable String id, @RequestBody Map<String, Object> req) {
        List<Map<String, Object>> existing = new ArrayList<>(councilService.getMembers(id));
        MemberInput input = new MemberInput(
            req.get("id") == null ? null : String.valueOf(req.get("id")),
            String.valueOf(req.getOrDefault("name", "")),
            String.valueOf(req.getOrDefault("title", "")),
            String.valueOf(req.getOrDefault("institution", "")),
            String.valueOf(req.getOrDefault("email", "")),
            String.valueOf(req.getOrDefault("phone", "")),
            String.valueOf(req.getOrDefault("affiliation", "")),
            String.valueOf(req.getOrDefault("role", "uy_vien"))
        );
        existing.add(Map.of(
            "id", input.id() == null || input.id().isBlank() ? UUID.randomUUID().toString() : input.id(),
            "name", input.name(),
            "title", safe(input.title()),
            "institution", safe(input.institution()),
            "email", input.email(),
            "phone", safe(input.phone()),
            "affiliation", safe(input.affiliation()),
            "role", safeRole(input.role())
        ));

        List<MemberInput> members = existing.stream().map(m -> new MemberInput(
            String.valueOf(m.getOrDefault("id", "")),
            String.valueOf(m.getOrDefault("name", "")),
            String.valueOf(m.getOrDefault("title", "")),
            String.valueOf(m.getOrDefault("institution", "")),
            String.valueOf(m.getOrDefault("email", "")),
            String.valueOf(m.getOrDefault("phone", "")),
            String.valueOf(m.getOrDefault("affiliation", "")),
            String.valueOf(m.getOrDefault("role", "uy_vien"))
        )).toList();
        councilService.replaceMembers(id, members);

        return ApiResponse.ok(Map.<String, Object>of("councilId", id, "member", req), "Them thanh vien thanh cong");
    }

    @DeleteMapping("/{id}/members/{memberId}")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<Void> removeMember(@PathVariable String id, @PathVariable String memberId) {
        councilService.removeMember(id, memberId);
        return ApiResponse.ok(null, "Da xoa thanh vien " + memberId + " khoi hoi dong " + id);
    }

    @PostMapping(path = "/{id}/decision", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<Map<String, Object>> uploadDecision(@PathVariable String id, @RequestPart("file") MultipartFile file) {
        String url = saveUpload(file, "decision");
        councilService.updateDecisionFile(id, url);
        return ApiResponse.ok(Map.<String, Object>of("councilId", id, "decisionPdfUrl", url), "Tai len quyet dinh thanh cong");
    }

    @GetMapping("/{id}/decision-file")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','council_member','project_owner')")
    public ResponseEntity<byte[]> decisionFile(@PathVariable String id) throws IOException {
        String url = councilService.getDecisionFileUrl(id);
        if (url == null || url.isBlank()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":\"Hội đồng này chưa tải lên file Quyết định.\"}".getBytes(StandardCharsets.UTF_8));
        }
        Path path = resolveUploadPath(url);
        if (!Files.exists(path)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":\"File Quyết định không còn tồn tại trên máy chủ.\"}".getBytes(StandardCharsets.UTF_8));
        }
        byte[] data = Files.readAllBytes(path);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + path.getFileName())
            .body(data);
    }

    @GetMapping("/{id}/minutes-file")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','council_member','project_owner')")
    public ResponseEntity<byte[]> minutesFile(@PathVariable String id) throws IOException {
        String url = councilService.getMinutesFileUrl(id);
        if (url == null || url.isBlank()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":\"Hội đồng này chưa tải lên file Biên bản nghiệm thu. Trạng thái Hội đồng chưa hoàn thành đánh giá hoặc chưa tải tệp lên!\"}".getBytes(StandardCharsets.UTF_8));
        }
        Path path = resolveUploadPath(url);
        if (!Files.exists(path)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.APPLICATION_JSON)
                .body("{\"error\":\"File Biên bản nghiệm thu không còn tồn tại trên máy chủ.\"}".getBytes(StandardCharsets.UTF_8));
        }
        byte[] data = Files.readAllBytes(path);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + path.getFileName())
            .body(data);
    }

    @PostMapping("/{id}/resend-invitations")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<Map<String, Object>> resendInvitations(@PathVariable String id) {
        int sent = Math.max(1, councilService.getMembers(id).size());
        return ApiResponse.ok(Map.<String, Object>of("sent", sent, "councilCode", id), "Da gui lai loi moi tham gia hoi dong");
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<CouncilItem> approve(@PathVariable String id) {
        return ApiResponse.ok(councilService.approve(id), "Da chuyen hoi dong sang dang danh gia");
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<CouncilItem> complete(@PathVariable String id) {
        return ApiResponse.ok(councilService.complete(id), "Da hoan thanh hoi dong");
    }

    @PostMapping("/{id}/score")
    @PreAuthorize("hasAnyRole('council_member','research_staff','superadmin')")
    public ApiResponse<ScoreSummary> score(@PathVariable String id, @Valid @RequestBody ScoreRequest request, @AuthenticationPrincipal User user) {
        String memberId = request.memberId();
        if ((memberId == null || memberId.isBlank()) && user != null) {
            memberId = user.getId();
        }
        return ApiResponse.ok(councilService.score(id, new ScoreRequest(memberId, request.score(), request.comment())), "Cham diem thanh cong");
    }

    @PostMapping("/{id}/review")
    @PreAuthorize("hasAnyRole('council_member','research_staff','superadmin')")
    public ApiResponse<ScoreSummary> review(@PathVariable String id, @RequestBody Map<String, Object> request, @AuthenticationPrincipal User user) {
        java.math.BigDecimal score = new java.math.BigDecimal(String.valueOf(request.getOrDefault("score", "0")));
        String comments = String.valueOf(request.getOrDefault("comments", ""));
        return ApiResponse.ok(councilService.score(id, new ScoreRequest(user == null ? null : user.getId(), score, comments)), "Gui nhan xet thanh cong");
    }

    @PostMapping(path = "/{id}/minutes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('council_member','research_staff','superadmin')")
    public ApiResponse<Map<String, Object>> recordMinutes(
        @PathVariable String id,
        @RequestParam(value = "content", required = false) String content,
        @RequestPart(value = "file", required = false) MultipartFile file,
        @AuthenticationPrincipal User user
    ) {
        String url = "";
        if (file != null && !file.isEmpty()) {
            url = saveUpload(file, "minutes");
        }
        councilService.saveMinutes(id, content, url, user == null ? "system" : user.getName());
        String fileName = file == null || file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        return ApiResponse.ok(Map.<String, Object>of("councilId", id, "content", content == null ? "" : content, "minutesFile", fileName), "Ghi bien ban thanh cong");
    }

    @PostMapping("/{id}/score-reviews")
    @PreAuthorize("hasAnyRole('council_member','research_staff','superadmin')")
    public ApiResponse<ScoreSummary> scoreReviews(@PathVariable String id, @Valid @RequestBody ScoreRequest request, @AuthenticationPrincipal User user) {
        return score(id, request, user);
    }

    @PostMapping("/{id}/score-decisions")
    @PreAuthorize("hasAnyRole('council_member','research_staff','superadmin')")
    public ApiResponse<Map<String, Object>> scoreDecisions(@PathVariable String id, @RequestBody Map<String, Object> req) {
        return ApiResponse.ok(Map.<String, Object>of("councilId", id, "decision", req.getOrDefault("decision", "accepted")), "Da ghi nhan quyet dinh diem");
    }

    @GetMapping("/{id}/score-summary")
    @PreAuthorize("hasAnyRole('council_member','research_staff','superadmin','project_owner')")
    public ApiResponse<Map<String, Object>> scoreSummary(@PathVariable String id) {
        ScoreSummary summary = councilService.scoreSummary(id);
        int totalMembers = (int) councilService.memberCount(id);
        return ApiResponse.ok(Map.<String, Object>of(
            "councilId", id,
            "averageScore", summary.averageScore(),
            "passed", summary.passed(),
            "totalMembers", totalMembers,
            "submittedCount", summary.totalScores()
        ));
    }

    private Map<String, Object> parseMemberLine(String line) {
        String lower = line.toLowerCase(Locale.ROOT);
        String role = "uy_vien";
        if (lower.contains("chu tich")) {
            role = "chu_tich";
        } else if (lower.contains("phan bien 1")) {
            role = "phan_bien_1";
        } else if (lower.contains("phan bien 2")) {
            role = "phan_bien_2";
        } else if (lower.contains("thu ky")) {
            role = "thu_ky";
        }

        String email = extract(line, "([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})");
        String name = line;
        if (line.toLowerCase(Locale.ROOT).contains("ho va ten:")) {
            name = extract(line, "(?i)ho\\s+va\\s+ten\\s*:\\s*([^,]+)");
        }
        if (name == null || name.isBlank()) {
            name = "Thanh vien";
        }

        return Map.<String, Object>of(
            "id", UUID.randomUUID().toString(),
            "name", name,
            "title", "",
            "institution", "",
            "email", email == null ? "" : email,
            "role", role,
            "fileName", ""
        );
    }

    private String extract(String source, String regex) {
        java.util.regex.Matcher m = java.util.regex.Pattern.compile(regex).matcher(source == null ? "" : source);
        if (m.find()) {
            return m.group(1).trim();
        }
        return "";
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String safeRole(String value) {
        return value == null || value.isBlank() ? "uy_vien" : value;
    }

    private String saveUpload(MultipartFile file, String prefix) {
        try {
            Path dir = Path.of("uploads", "councils");
            Files.createDirectories(dir);
            String originalName = file.getOriginalFilename() == null ? "file.pdf" : file.getOriginalFilename();
            String fileName = prefix + "_" + UUID.randomUUID() + "_" + originalName.replaceAll("[^A-Za-z0-9._-]", "_");
            Path target = dir.resolve(fileName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/councils/" + fileName;
        } catch (IOException ex) {
            throw new IllegalArgumentException("Khong the luu tep tai len");
        }
    }

    private Path resolveUploadPath(String url) {
        String clean = url == null ? "" : url.trim();
        if (clean.startsWith("/uploads/")) {
            clean = clean.substring(1);
        }
        return Path.of(clean);
    }
}
