package com.nckh.backend.modules.councils;

import static com.nckh.backend.modules.councils.CouncilDtos.*;

import com.nckh.backend.modules.admin.SystemConfig;
import com.nckh.backend.modules.admin.SystemConfigRepository;
import com.nckh.backend.modules.projects.Project;
import com.nckh.backend.modules.projects.ProjectRepository;
import com.nckh.backend.modules.projects.ProjectStatus;
import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRepository;
import com.nckh.backend.modules.users.UserRole;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CouncilService {

    private static final Set<String> SCORE_ELIGIBLE_ROLES = Set.of("chu_tich", "phan_bien_1", "phan_bien_2");

    private final CouncilRepository councilRepository;
    private final CouncilReviewRepository reviewRepository;
    private final CouncilMinutesRecordRepository minutesRecordRepository;
    private final CouncilMemberRepository councilMemberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SystemConfigRepository systemConfigRepository;

    public CouncilService(
        CouncilRepository councilRepository,
        CouncilReviewRepository reviewRepository,
        CouncilMinutesRecordRepository minutesRecordRepository,
        CouncilMemberRepository councilMemberRepository,
        ProjectRepository projectRepository,
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        SystemConfigRepository systemConfigRepository
    ) {
        this.councilRepository = councilRepository;
        this.reviewRepository = reviewRepository;
        this.minutesRecordRepository = minutesRecordRepository;
        this.councilMemberRepository = councilMemberRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.systemConfigRepository = systemConfigRepository;
    }

    public List<Map<String, Object>> getAll(User actor) {
        List<Council> list;
        if (actor.getRole() == UserRole.project_owner) {
            list = councilRepository.findByProjectOwnerIdAndIsDeletedFalseOrderByCreatedDateDesc(actor.getId());
        } else if (actor.getRole() == UserRole.council_member) {
            list = councilMemberRepository.findCouncilsByMemberUserId(actor.getId());
        } else {
            list = councilRepository.findByIsDeletedFalseOrderByCreatedDateDesc();
        }
        return list.stream().map(council -> toCouncilDetail(council, actor)).toList();
    }

    public List<Map<String, Object>> getMine(User actor) {
        if (actor.getRole() == UserRole.council_member) {
            return councilMemberRepository.findCouncilsByMemberUserId(actor.getId()).stream().map(council -> toCouncilDetail(council, actor)).toList();
        }
        return councilRepository.findByProjectOwnerIdAndIsDeletedFalseOrderByCreatedDateDesc(actor.getId()).stream().map(council -> toCouncilDetail(council, actor)).toList();
    }

    public Map<String, Object> getById(String id, User actor) {
        Council council = resolveCouncilForActor(id, actor);
        return toCouncilDetail(council, actor);
    }

    public CouncilCreateResult create(CreateCouncilRequest request) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(request.projectId())
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));

        if (project.getStatus() != ProjectStatus.cho_nghiem_thu) {
            throw new IllegalArgumentException("Chi co the thanh lap hoi dong cho de tai dang o trang thai Chờ nghiệm thu");
        }

        List<MemberInput> members = request.members() == null ? List.of() : request.members();
        if (members.size() < 5) {
            throw new IllegalArgumentException("Hoi dong phai co it nhat 5 thanh vien");
        }

        boolean hasChairman = members.stream().anyMatch(m -> "chu_tich".equals(m.role()));
        boolean hasSecretary = members.stream().anyMatch(m -> "thu_ky".equals(m.role()));
        boolean hasReviewer1 = members.stream().anyMatch(m -> "phan_bien_1".equals(m.role()));
        boolean hasReviewer2 = members.stream().anyMatch(m -> "phan_bien_2".equals(m.role()));
        if (!hasChairman || !hasSecretary || !hasReviewer1 || !hasReviewer2) {
            throw new IllegalArgumentException("Hoi dong bat buoc phai co Chu tich, Thu ky, Phan bien 1 va Phan bien 2");
        }

        long distinctEmails = members.stream().map(m -> safeLower(m.email())).distinct().count();
        if (distinctEmails != members.size()) {
            throw new IllegalArgumentException("Thanh vien trong hoi dong khong duoc trung email");
        }

        Council council = new Council();
        council.setId((request.id() == null || request.id().isBlank()) ? UUID.randomUUID().toString() : request.id());
        council.setDecisionCode((request.decisionCode() == null || request.decisionCode().isBlank())
            ? "QD/" + java.time.Year.now().getValue() + "/" + String.format("%03d", councilRepository.findByIsDeletedFalseOrderByCreatedDateDesc().size() + 1)
            : request.decisionCode());
        council.setProject(project);

        Council saved = councilRepository.save(council);
        List<CouncilCredentialRow> credentialRows = replaceMembers(saved, members);
        return new CouncilCreateResult(
            toItem(saved),
            credentialRows.size(),
            encodeCredentialCsv(credentialRows),
            buildCredentialFileName(saved.getDecisionCode())
        );
    }

    public CouncilItem approve(String id) {
        Council c = councilRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));
        c.setStatus(CouncilStatus.dang_danh_gia);
        return toItem(councilRepository.save(c));
    }

    public CouncilItem complete(String id) {
        Council c = councilRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));

        List<CouncilMember> members = councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(id);
        List<String> requiredRoles = List.of("chu_tich", "phan_bien_1", "phan_bien_2", "thu_ky");
        if (members.size() < 5 || requiredRoles.stream().anyMatch(role -> members.stream().noneMatch(m -> role.equals(m.getRole())))) {
            throw new IllegalArgumentException("Hoi dong chua du thanh phan bat buoc de hoan thanh nghiem thu");
        }

        c.setStatus(CouncilStatus.da_hoan_thanh);
        Project p = c.getProject();
        p.setStatus(ProjectStatus.da_nghiem_thu);
        projectRepository.save(p);
        return toItem(councilRepository.save(c));
    }

    public Map<String, Object> checkConflict(String memberEmail, String projectId) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(projectId)
            .orElseGet(() -> projectRepository.findAll().stream()
                .filter(p -> p.getCode() != null && p.getCode().equals(projectId) && Boolean.FALSE.equals(p.getIsDeleted()))
                .findFirst()
                .orElse(null));

        if (project == null) {
            throw new IllegalArgumentException("De tai khong ton tai");
        }

        if (project.getOwner() != null && memberEmail != null && memberEmail.equalsIgnoreCase(project.getOwner().getEmail())) {
            return Map.<String, Object>of("hasConflict", true, "reason", "Thanh vien la Chu nhiem de tai dang duoc nghiem thu.");
        }

        boolean isMember = false;
        if (memberEmail != null && !memberEmail.isBlank()) {
            isMember = councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(project.getId()).stream()
                .anyMatch(member -> memberEmail.equalsIgnoreCase(member.getEmail()));
        }

        if (isMember) {
            return Map.<String, Object>of("hasConflict", true, "reason", "Thanh vien thuoc nhom thuc hien de tai.");
        }

        return Map.of("hasConflict", false);
    }

    public ScoreSummary score(String id, ScoreRequest request) {
        Council c = councilRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));

        String memberRef = (request.memberId() == null || request.memberId().isBlank()) ? "anonymous-member" : request.memberId();
        CouncilMember scoringMember = resolveScoringMember(id, memberRef);

        if (!isScoreEligibleRole(scoringMember.getRole())) {
            throw new IllegalArgumentException("Chi chu tich va cac phan bien moi duoc cham diem");
        }

        CouncilReview review = reviewRepository
            .findByCouncilIdAndMemberIdAndType(id, scoringMember.getId(), "score")
            .orElseGet(() -> {
                if (scoringMember.getMemberUserId() != null && !scoringMember.getMemberUserId().isBlank()) {
                    return reviewRepository.findByCouncilIdAndMemberIdAndType(id, scoringMember.getMemberUserId(), "score")
                        .orElseGet(CouncilReview::new);
                }
                return new CouncilReview();
            });
        if (review.getId() == null) {
            review.setId(UUID.randomUUID().toString());
            review.setCouncil(c);
            review.setMemberId(scoringMember.getId());
            review.setType("score");
        } else if (!scoringMember.getId().equals(review.getMemberId())) {
            review.setMemberId(scoringMember.getId());
        }
        review.setScore(request.score());
        review.setComments(request.comment());
        reviewRepository.save(review);

        return scoreSummary(id);
    }

    public CouncilReview submitReview(String councilId, String userId, Object payload) {
        Map<String, Object> body = new LinkedHashMap<>();
        if (payload instanceof Map<?, ?> raw) {
            for (Map.Entry<?, ?> entry : raw.entrySet()) {
                body.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        ScoreRequest request = new ScoreRequest(null, new BigDecimal(String.valueOf(body.getOrDefault("score", "0"))), String.valueOf(body.getOrDefault("comments", "")));
        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));

        CouncilMember member = councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(councilId).stream()
            .filter(m -> userId.equals(m.getMemberUserId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Ban khong phai thanh vien hop le cua hoi dong nay"));

        if (!"phan_bien_1".equals(member.getRole()) && !"phan_bien_2".equals(member.getRole())) {
            throw new IllegalArgumentException("Chi thanh vien phan bien moi duoc gui nhan xet phan bien");
        }

        CouncilReview review = reviewRepository.findByCouncilIdAndMemberIdAndType(councilId, member.getId(), "review")
            .orElseGet(CouncilReview::new);
        if (review.getId() == null) {
            review.setId(UUID.randomUUID().toString());
            review.setCouncil(council);
            review.setMemberId(member.getId());
            review.setType("review");
        }
        review.setScore(request.score());
        review.setComments(request.comment());
        return reviewRepository.save(review);
    }

    public ScoreSummary scoreSummary(String id) {
        Map<String, Object> details = scoreSummaryDetails(id, null);
        Number avg = (Number) details.getOrDefault("averageScore", 0);
        Number submitted = (Number) details.getOrDefault("submittedCount", 0);
        return new ScoreSummary(id, submitted.intValue(), BigDecimal.valueOf(avg.doubleValue()), avg.doubleValue() >= 5.0);
    }

    public List<Map<String, Object>> getVisibleScoreReviews(String councilId, User actor) {
        if (actor.getRole() != UserRole.council_member) {
            return reviewRepository.findByCouncilIdAndType(councilId, "score").stream()
                .filter(r -> r.getScore() != null)
                .map(r -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", r.getId());
                    row.put("memberId", r.getMemberId());
                    row.put("score", r.getScore());
                    row.put("comments", r.getComments());
                    row.put("type", r.getType());
                    return row;
                })
                .toList();
        }

        CouncilMember myMembership = councilMemberRepository
            .findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(councilId)
            .stream()
            .filter(m -> actor.getId().equals(m.getMemberUserId()))
            .findFirst()
            .orElse(null);

        if (myMembership == null || !isScoreEligibleRole(myMembership.getRole())) {
            return List.of();
        }

        return reviewRepository.findByCouncilIdAndType(councilId, "score").stream()
            .filter(r -> r.getScore() != null)
            .filter(r -> myMembership.getId().equals(r.getMemberId()) || actor.getId().equals(r.getMemberId()))
            .map(r -> {
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("id", r.getId());
                row.put("memberId", r.getMemberId());
                row.put("score", r.getScore());
                row.put("comments", r.getComments());
                row.put("type", r.getType());
                return row;
            })
            .toList();
    }

    public Map<String, Object> scoreSummaryDetails(String councilId, User actor) {
        if (actor != null) {
            resolveCouncilForActor(councilId, actor);
        }

        List<CouncilMember> members = councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(councilId);
        List<CouncilReview> reviews = reviewRepository.findByCouncilIdAndType(councilId, "score");
        reviews.addAll(reviewRepository.findByCouncilIdAndType(councilId, "review"));
        reviews.addAll(reviewRepository.findByCouncilIdAndType(councilId, "decision"));

        List<Map<String, Object>> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        int submittedCount = 0;

        for (CouncilMember member : members) {
            CouncilReview scoreRow = latestReviewForMember(reviews, member, "score");
            CouncilReview reviewRow = latestReviewForMember(reviews, member, "review");
            CouncilReview decisionRow = latestReviewForMember(reviews, member, "decision");

            boolean scoreRequired = isScoreEligibleRole(member.getRole());
            BigDecimal scoreValue = scoreRequired && scoreRow != null ? scoreRow.getScore() : null;
            boolean isSubmitted = scoreRequired && scoreValue != null;

            if (isSubmitted) {
                submittedCount += 1;
                total = total.add(scoreValue);
            }

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("memberId", member.getId());
            row.put("memberName", member.getName());
            row.put("role", member.getRole());
            row.put("score", scoreValue == null ? null : scoreValue.doubleValue());
            row.put("comments", scoreRequired && scoreRow != null ? scoreRow.getComments() : null);
            row.put("isSubmitted", isSubmitted);
            row.put("submittedAt", scoreRequired && scoreRow != null ? scoreRow.getUpdatedAt() : null);
            row.put("submittedType", scoreRequired && scoreRow != null ? scoreRow.getType() : null);
            ParsedDecision parsedDecision = parseDecision(decisionRow == null ? null : decisionRow.getComments());
            row.put("decisionStatus", scoreRequired ? parsedDecision.decision() : null);
            row.put("decisionNote", scoreRequired ? parsedDecision.note() : "");
            row.put("decisionBy", scoreRequired ? parsedDecision.decidedByName() : "");
            row.put("decisionAt", scoreRequired ? (parsedDecision.decidedAt() == null ? (decisionRow == null ? null : decisionRow.getUpdatedAt()) : parsedDecision.decidedAt()) : null);
            items.add(row);
        }

        BigDecimal average = submittedCount > 0
            ? total.divide(BigDecimal.valueOf(submittedCount), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("items", items);
        payload.put("averageScore", average.doubleValue());
        payload.put("submittedCount", submittedCount);
        payload.put("totalMembers", members.size());
        return payload;
    }

    public List<Map<String, Object>> listMembers(String councilId) {
        return councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(councilId).stream().map(this::toMemberMap).toList();
    }

    public List<Map<String, Object>> suggestMembersFromDb() {
        List<User> users = userRepository.findByRoleAndIsDeletedFalse(UserRole.council_member).stream()
            .sorted(java.util.Comparator.comparing(User::getEmail, String.CASE_INSENSITIVE_ORDER))
            .toList();
        if (users.isEmpty()) {
            return List.of();
        }

        String[] roles = new String[] {"chu_tich", "phan_bien_1", "phan_bien_2", "thu_ky", "uy_vien"};
        List<Map<String, Object>> out = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) {
            User u = users.get(i);
            String role = roles[Math.min(i, roles.length - 1)];
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", UUID.randomUUID().toString());
            row.put("name", u.getName());
            row.put("title", "");
            row.put("institution", "");
            row.put("email", u.getEmail());
            row.put("phone", "");
            row.put("affiliation", "");
            row.put("role", role);
            row.put("memberUserId", u.getId());
            out.add(row);
        }
        return out;
    }

    public List<Map<String, Object>> getMembers(String councilId) {
        return listMembers(councilId);
    }

    public List<Map<String, Object>> suggestMembersFromDatabase() {
        List<User> users = userRepository.findByRoleAndIsDeletedFalse(UserRole.council_member);
        if (users.isEmpty()) {
            return List.of();
        }
        String[] roles = new String[] { "chu_tich", "phan_bien_1", "phan_bien_2", "thu_ky", "uy_vien" };
        List<User> sorted = users.stream().sorted(java.util.Comparator.comparing(User::getEmail)).toList();
        java.util.ArrayList<Map<String, Object>> rows = new java.util.ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            User u = sorted.get(i);
            String role = i < roles.length ? roles[i] : "uy_vien";
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", UUID.randomUUID().toString());
            row.put("name", u.getName() == null ? "" : u.getName());
            row.put("title", "");
            row.put("institution", "");
            row.put("email", u.getEmail() == null ? "" : u.getEmail());
            row.put("phone", "");
            row.put("affiliation", "");
            row.put("role", role);
            rows.add(row);
        }
        return rows;
    }

    public Map<String, Object> addMember(String councilId, Map<String, Object> req) {
        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));

        String email = stringValue(req, "email", "").toLowerCase(Locale.ROOT);
        boolean exists = councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(councilId).stream()
            .anyMatch(member -> email.equalsIgnoreCase(member.getEmail()));
        if (exists) {
            throw new IllegalArgumentException("Thanh vien da ton tai trong hoi dong");
        }

        CouncilMember member = new CouncilMember();
        member.setId(UUID.randomUUID().toString());
        member.setCouncil(council);
        member.setName(stringValue(req, "name", "Thanh vien"));
        member.setTitle(stringValue(req, "title", ""));
        member.setInstitution(stringValue(req, "institution", ""));
        member.setEmail(email);
        member.setPhone(stringValue(req, "phone", ""));
        member.setAffiliation(stringValue(req, "affiliation", ""));
        member.setRole(stringValue(req, "role", "uy_vien"));
        member.setMemberUserId(resolveUserIdByEmail(email));
        return toMemberMap(councilMemberRepository.save(member));
    }

    public void removeMember(String councilId, String memberId) {
        CouncilMember member = councilMemberRepository.findByCouncilIdAndIdAndIsDeletedFalse(councilId, memberId)
            .orElseThrow(() -> new IllegalArgumentException("Thanh vien hoi dong khong ton tai"));
        member.setDeleted(true);
        councilMemberRepository.save(member);
    }

    public long countMembers(String councilId) {
        return councilMemberRepository.countByCouncilIdAndIsDeletedFalse(councilId);
    }

    public long memberCount(String councilId) {
        return countMembers(councilId);
    }

    public String updateDecisionUrl(String councilId, String decisionPdfUrl) {
        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));
        council.setDecisionPdfUrl(decisionPdfUrl);
        return councilRepository.save(council).getDecisionPdfUrl();
    }

    public CouncilItem updateDecisionFile(String councilId, String decisionPdfUrl) {
        updateDecisionUrl(councilId, decisionPdfUrl);
        return toItem(councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai")));
    }

    public String getDecisionUrl(String councilId) {
        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));
        return council.getDecisionPdfUrl() == null ? "" : council.getDecisionPdfUrl();
    }

    public String getDecisionFileUrl(String councilId) {
        return getDecisionUrl(councilId);
    }

    public DownloadPayload getDecisionDownload(String councilId, User actor) {
        Map<String, Object> detail = getById(councilId, actor);
        String baseName = sanitizeDownloadName(String.valueOf(detail.getOrDefault("decisionCode", "council")), "council");
        Path uploaded = resolveExistingUploadFile(String.valueOf(detail.getOrDefault("decisionPdfUrl", "")));
        if (uploaded != null) {
            return DownloadPayload.file(uploaded, baseName + "_decision" + fileExtension(uploaded));
        }

        List<String> lines = new ArrayList<>();
        lines.add("Decision code: " + detail.getOrDefault("decisionCode", ""));
        lines.add("Project code: " + detail.getOrDefault("projectCode", ""));
        lines.add("Project title: " + detail.getOrDefault("projectTitle", ""));
        lines.add("Status: " + detail.getOrDefault("status", ""));
        lines.add("Members: " + summarizeMembers(detail));
        lines.add("Note: This PDF is generated by backend because decision file has not been uploaded yet.");
        return DownloadPayload.buffer(buildCouncilPdfBuffer("COUNCIL DECISION SUMMARY", lines), baseName + "_decision.pdf");
    }

    public String recordMinutes(String councilId, String minutesFileUrl, String content) {
        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));
        council.setMinutesContent(content == null ? "" : content);
        if (minutesFileUrl != null && !minutesFileUrl.isBlank()) {
            council.setMinutesFileUrl(minutesFileUrl);
        }
        return councilRepository.save(council).getMinutesFileUrl();
    }

    public String getMinutesUrl(String councilId) {
        CouncilMinutesRecord record = minutesRecordRepository.findByCouncilId(councilId).orElse(null);
        if (record != null && record.getFileUrl() != null && !record.getFileUrl().isBlank()) {
            return record.getFileUrl();
        }
        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));
        return council.getMinutesFileUrl() == null ? "" : council.getMinutesFileUrl();
    }

    public String getMinutesFileUrl(String councilId) {
        return getMinutesUrl(councilId);
    }

    public DownloadPayload getMinutesDownload(String councilId, User actor) {
        Map<String, Object> detail = getById(councilId, actor);
        String baseName = sanitizeDownloadName(String.valueOf(detail.getOrDefault("decisionCode", "council")), "council");
        Path uploaded = resolveExistingUploadFile(getMinutesUrl(councilId));
        if (uploaded != null) {
            return DownloadPayload.file(uploaded, baseName + "_minutes" + fileExtension(uploaded));
        }

        Map<String, Object> minutes = detail.get("minutes") instanceof Map<?, ?> rawMinutes ? castMap(rawMinutes) : Map.of();
        String content = String.valueOf(minutes.getOrDefault("content", "No minutes content submitted yet."));
        List<Map<String, Object>> reviews = detail.get("reviews") instanceof List<?> list
            ? list.stream().filter(item -> item instanceof Map<?, ?>).map(item -> castMap((Map<?, ?>) item)).toList()
            : List.of();
        List<String> scoreLines = reviews.stream()
            .filter(row -> row.get("score") != null)
            .map(row -> "- " + row.getOrDefault("role", "") + ": " + row.get("score") + " / 100")
            .toList();

        List<String> lines = new ArrayList<>();
        lines.add("Decision code: " + detail.getOrDefault("decisionCode", ""));
        lines.add("Project: " + detail.getOrDefault("projectTitle", ""));
        lines.add("Recorded by: " + minutes.getOrDefault("recordedBy", "N/A"));
        lines.add("Content: " + content.substring(0, Math.min(content.length(), 400)));
        if (scoreLines.isEmpty()) {
            lines.add("- No score submitted yet.");
        } else {
            lines.addAll(scoreLines);
        }
        lines.add("Note: This PDF is generated by backend because minutes file has not been uploaded yet.");
        return DownloadPayload.buffer(buildCouncilPdfBuffer("COUNCIL MINUTES SUMMARY", lines), baseName + "_minutes.pdf");
    }

    public void saveMinutes(String councilId, String content, String fileUrl, String actorName) {
        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));

        CouncilMinutesRecord record = minutesRecordRepository.findByCouncilId(councilId).orElseGet(CouncilMinutesRecord::new);
        if (record.getId() == null) {
            record.setId(UUID.randomUUID().toString());
            record.setCouncilId(councilId);
            record.setRecordedBy(actorName == null || actorName.isBlank() ? "system" : actorName);
        }
        record.setContent(content == null ? "" : content);
        if (fileUrl != null && !fileUrl.isBlank()) {
            record.setFileUrl(fileUrl);
        }
        record.setRecordedBy(actorName == null || actorName.isBlank() ? "system" : actorName);
        minutesRecordRepository.save(record);

        council.setMinutesContent(record.getContent());
        if (record.getFileUrl() != null && !record.getFileUrl().isBlank()) {
            council.setMinutesFileUrl(record.getFileUrl());
        }
        councilRepository.save(council);
    }

    private byte[] buildCouncilPdfBuffer(String title, List<String> lines) {
        try (PDDocument pdf = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            pdf.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(pdf, page)) {
                contentStream.beginText();
                contentStream.setFont(PDType1Font.HELVETICA_BOLD, 16);
                contentStream.newLineAtOffset(56, 780);
                contentStream.showText(stripPdfText(title));
                contentStream.newLineAtOffset(0, -28);

                contentStream.setFont(PDType1Font.HELVETICA, 11);
                for (String line : lines) {
                    for (String segment : wrapText(stripPdfText(line), 95)) {
                        contentStream.showText(segment);
                        contentStream.newLineAtOffset(0, -16);
                    }
                }
                contentStream.endText();
            }

            pdf.save(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new IllegalArgumentException("Khong the tao file PDF tam thoi");
        }
    }

    public Map<String, Object> submitScoreDecision(String councilId, String actorUserId, String actorRole, Map<String, Object> payload) {
        String memberId = stringValue(payload, "memberId", "");
        String decision = stringValue(payload, "decision", "accepted");
        String note = stringValue(payload, "note", "");

        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));

        CouncilMember targetMember = councilMemberRepository.findByCouncilIdAndIdAndIsDeletedFalse(councilId, memberId)
            .orElseThrow(() -> new IllegalArgumentException("Thanh vien khong ton tai trong hoi dong nay"));

        String decidedByName = "System";
        if ("council_member".equals(actorRole)) {
            CouncilMember actorMembership = councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(councilId).stream()
                .filter(member -> actorUserId.equals(member.getMemberUserId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Chi thu ky hoi dong moi duoc phep xac nhan hoac yeu cau nhap lai diem"));
            if (!"thu_ky".equals(actorMembership.getRole())) {
                throw new IllegalArgumentException("Chi thu ky hoi dong moi duoc phep xac nhan hoac yeu cau nhap lai diem");
            }
            decidedByName = actorMembership.getName();
        } else {
            decidedByName = userRepository.findById(actorUserId).map(User::getName).orElse("System");
        }

        CouncilReview decisionRow = reviewRepository.findByCouncilIdAndMemberIdAndType(councilId, targetMember.getId(), "decision")
            .orElseGet(CouncilReview::new);
        if (decisionRow.getId() == null) {
            decisionRow.setId(UUID.randomUUID().toString());
            decisionRow.setCouncil(council);
            decisionRow.setMemberId(targetMember.getId());
            decisionRow.setType("decision");
        }

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("decision", decision);
        details.put("note", note);
        details.put("decidedByName", decidedByName);
        details.put("decidedByUserId", actorUserId);
        details.put("decidedAt", java.time.Instant.now().toString());
        decisionRow.setComments(toJson(details));
        decisionRow.setScore(null);
        reviewRepository.save(decisionRow);

        return Map.<String, Object>of(
            "memberId", targetMember.getId(),
            "decision", decision,
            "note", note,
            "decidedByName", decidedByName
        );
    }

    public CouncilReview submitScoreReview(String councilId, String userId, BigDecimal score, String comments) {
        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));
        CouncilMember member = councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(councilId).stream()
            .filter(m -> userId.equals(m.getMemberUserId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Ban khong phai thanh vien hop le cua hoi dong nay"));
        if (!"phan_bien_1".equals(member.getRole()) && !"phan_bien_2".equals(member.getRole())) {
            throw new IllegalArgumentException("Chi thanh vien phan bien moi duoc gui nhan xet phan bien");
        }

        CouncilReview review = reviewRepository.findByCouncilIdAndMemberIdAndType(councilId, member.getId(), "review")
            .orElseGet(CouncilReview::new);
        if (review.getId() == null) {
            review.setId(UUID.randomUUID().toString());
            review.setCouncil(council);
            review.setMemberId(member.getId());
            review.setType("review");
        }
        review.setScore(score);
        review.setComments(comments);
        return reviewRepository.save(review);
    }

    private CouncilItem toItem(Council c) {
        String projectId = c.getProject() == null ? "" : c.getProject().getId();
        String projectCode = "";
        String projectTitle = "";
        if (projectId != null && !projectId.isBlank()) {
            try {
                if (c.getProject() != null) {
                    projectCode = c.getProject().getCode() == null ? "" : c.getProject().getCode();
                    projectTitle = c.getProject().getTitle() == null ? "" : c.getProject().getTitle();
                }
            } catch (Exception ignored) {
            }
            if (projectCode.isBlank() || projectTitle.isBlank()) {
                Project p = projectRepository.findByIdAndIsDeletedFalse(projectId).orElse(null);
                if (p != null) {
                    if (projectCode.isBlank()) {
                        projectCode = p.getCode() == null ? "" : p.getCode();
                    }
                    if (projectTitle.isBlank()) {
                        projectTitle = p.getTitle() == null ? "" : p.getTitle();
                    }
                }
            }
        }
        return new CouncilItem(
            c.getId(),
            c.getDecisionCode(),
            projectId,
            projectCode,
            projectTitle,
            c.getCreatedDate(),
            c.getStatus(),
            c.getDecisionPdfUrl()
        );
    }

    private Map<String, Object> toCouncilDetail(Council council, User actor) {
        Map<String, Object> project = new LinkedHashMap<>();
        project.put("id", council.getProject() == null ? "" : council.getProject().getId());
        project.put("code", council.getProject() == null ? "" : safe(council.getProject().getCode()));
        project.put("title", council.getProject() == null ? "" : safe(council.getProject().getTitle()));
        Map<String, Object> owner = new LinkedHashMap<>();
        if (council.getProject() != null && council.getProject().getOwner() != null) {
            owner.put("id", council.getProject().getOwner().getId());
            owner.put("name", safe(council.getProject().getOwner().getName()));
            owner.put("email", safe(council.getProject().getOwner().getEmail()));
        }
        project.put("owner", owner);
        project.put("reports", List.of());

        Map<String, Object> minutes = new LinkedHashMap<>();
        minutes.put("content", safe(council.getMinutesContent()));
        minutes.put("fileUrl", safe(council.getMinutesFileUrl()));
        minutes.put("recordedBy", "");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", council.getId());
        payload.put("decisionCode", council.getDecisionCode());
        payload.put("projectId", project.get("id"));
        payload.put("projectCode", project.get("code"));
        payload.put("projectTitle", project.get("title"));
        payload.put("createdDate", council.getCreatedDate());
        payload.put("status", council.getStatus());
        payload.put("decisionPdfUrl", safe(council.getDecisionPdfUrl()));
        payload.put("project", project);
        payload.put("members", getMembers(council.getId()));
        payload.put("reviews", getVisibleScoreReviews(council.getId(), actor));
        payload.put("minutes", minutes);
        return payload;
    }

    private CouncilReview latestReviewForMember(List<CouncilReview> reviews, CouncilMember member, String type) {
        return reviews.stream()
            .filter(review -> type.equals(review.getType()))
            .filter(review -> member.getId().equals(review.getMemberId()) || (member.getMemberUserId() != null && member.getMemberUserId().equals(review.getMemberId())))
            .reduce((first, second) -> second)
            .orElse(null);
    }

    private ParsedDecision parseDecision(String raw) {
        if (raw == null || raw.isBlank()) {
            return new ParsedDecision(null, "", "", null);
        }
        String decision = extractJsonValue(raw, "decision");
        if (!"accepted".equals(decision) && !"rework".equals(decision)) {
            return new ParsedDecision(null, "", "", null);
        }
        return new ParsedDecision(
            decision,
            extractJsonValue(raw, "note"),
            extractJsonValue(raw, "decidedByName"),
            extractJsonValue(raw, "decidedAt")
        );
    }

    private String extractJsonValue(String raw, String key) {
        String pattern = "\"" + key + "\"\\s*:\\s*\"([^\"]*)\"";
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile(pattern).matcher(raw);
        return matcher.find() ? matcher.group(1) : "";
    }

    private List<String> wrapText(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return List.of("");
        }
        List<String> segments = new ArrayList<>();
        for (int i = 0; i < value.length(); i += maxLength) {
            segments.add(value.substring(i, Math.min(value.length(), i + maxLength)));
        }
        return segments;
    }

    private String stripPdfText(String value) {
        return value == null ? "" : value.replace('Đ', 'D').replace('đ', 'd');
    }

    private Path resolveExistingUploadFile(String url) {
        String clean = url == null ? "" : url.trim();
        if (clean.isBlank()) {
            return null;
        }
        if (clean.startsWith("/uploads/")) {
            clean = clean.substring(1);
        }
        Path path = Path.of(clean);
        return Files.exists(path) ? path : null;
    }

    private String fileExtension(Path file) {
        String name = file.getFileName().toString();
        int index = name.lastIndexOf('.');
        return index >= 0 ? name.substring(index) : ".pdf";
    }

    private String sanitizeDownloadName(String value, String fallback) {
        String seed = value == null || value.isBlank() ? fallback : value;
        return seed.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> castMap(Map<?, ?> raw) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : raw.entrySet()) {
            out.put(String.valueOf(entry.getKey()), entry.getValue());
        }
        return out;
    }

    private String summarizeMembers(Map<String, Object> detail) {
        Object membersRaw = detail.getOrDefault("members", List.of());
        if (!(membersRaw instanceof List<?> members) || members.isEmpty()) {
            return "N/A";
        }
        return members.stream()
            .filter(member -> member instanceof Map<?, ?>)
            .map(member -> castMap((Map<?, ?>) member))
            .map(member -> member.getOrDefault("name", "") + " (" + member.getOrDefault("role", "") + ")")
            .reduce((left, right) -> left + " | " + right)
            .orElse("N/A");
    }

    public record DownloadPayload(String kind, Path filePath, byte[] fileBuffer, String fileName) {
        public static DownloadPayload file(Path filePath, String fileName) { return new DownloadPayload("file", filePath, null, fileName); }
        public static DownloadPayload buffer(byte[] fileBuffer, String fileName) { return new DownloadPayload("buffer", null, fileBuffer, fileName); }
    }

    private String toJson(Map<String, Object> value) {
        StringBuilder builder = new StringBuilder("{");
        boolean first = true;
        for (Map.Entry<String, Object> entry : value.entrySet()) {
            if (!first) builder.append(',');
            first = false;
            builder.append('"').append(entry.getKey()).append('"').append(':');
            Object v = entry.getValue();
            if (v == null) {
                builder.append("null");
            } else {
                builder.append('"').append(String.valueOf(v).replace("\"", "\\\"")).append('"');
            }
        }
        builder.append('}');
        return builder.toString();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private String safeLower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    private record ParsedDecision(String decision, String note, String decidedByName, String decidedAt) {}

    private List<CouncilCredentialRow> replaceMembers(Council council, List<MemberInput> members) {
        List<CouncilCredentialRow> credentialRows = new ArrayList<>();
        if (members == null || members.isEmpty()) {
            return credentialRows;
        }
        List<CouncilMember> existing = councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(council.getId());
        for (CouncilMember old : existing) {
            old.setDeleted(true);
        }
        councilMemberRepository.saveAll(existing);

        String tempPassword = resolveCouncilDefaultPassword();

        List<CouncilMember> fresh = members.stream().map(input -> {
            CouncilMember member = new CouncilMember();
            member.setId(input.id() == null || input.id().isBlank() ? UUID.randomUUID().toString() : input.id());
            member.setCouncil(council);
            member.setName(input.name() == null || input.name().isBlank() ? "Thanh vien" : input.name());
            member.setTitle(input.title() == null ? "" : input.title());
            member.setInstitution(input.institution() == null ? "" : input.institution());
            String email = input.email() == null ? "" : input.email().toLowerCase(Locale.ROOT);
            member.setEmail(email);
            member.setPhone(input.phone() == null ? "" : input.phone());
            member.setAffiliation(input.affiliation() == null ? "" : input.affiliation());
            member.setRole(input.role() == null || input.role().isBlank() ? "uy_vien" : input.role());

            if (!email.isBlank()) {
                AccountProvisionResult provision = provisionCouncilAccount(member.getName(), member.getTitle(), email, tempPassword);
                member.setMemberUserId(provision.userId());
                credentialRows.add(new CouncilCredentialRow(
                    member.getName(),
                    email,
                    provision.passwordForExport(),
                    provision.role().name(),
                    provision.newlyCreated(),
                    provision.passwordReset()
                ));
            } else {
                member.setMemberUserId(null);
            }
            return member;
        }).toList();
        councilMemberRepository.saveAll(fresh);
        return credentialRows;
    }

    public void replaceMembers(String councilId, List<MemberInput> members) {
        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));

        List<CouncilMember> existing = councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(councilId);
        for (CouncilMember old : existing) {
            old.setDeleted(true);
        }
        councilMemberRepository.saveAll(existing);

        if (members == null || members.isEmpty()) {
            return;
        }

        String tempPassword = resolveCouncilDefaultPassword();

        List<CouncilMember> fresh = members.stream().map(input -> {
            CouncilMember member = new CouncilMember();
            member.setId(input.id() == null || input.id().isBlank() ? UUID.randomUUID().toString() : input.id());
            member.setCouncil(council);
            member.setName(input.name() == null || input.name().isBlank() ? "Thanh vien" : input.name());
            member.setTitle(input.title() == null ? "" : input.title());
            member.setInstitution(input.institution() == null ? "" : input.institution());
            String email = input.email() == null ? "" : input.email().toLowerCase(Locale.ROOT);
            member.setEmail(email);
            member.setPhone(input.phone() == null ? "" : input.phone());
            member.setAffiliation(input.affiliation() == null ? "" : input.affiliation());
            member.setRole(input.role() == null || input.role().isBlank() ? "uy_vien" : input.role());

            if (!email.isBlank()) {
                AccountProvisionResult provision = provisionCouncilAccount(member.getName(), member.getTitle(), email, tempPassword);
                member.setMemberUserId(provision.userId());
            } else {
                member.setMemberUserId(null);
            }
            return member;
        }).toList();
        councilMemberRepository.saveAll(fresh);
    }

    private AccountProvisionResult provisionCouncilAccount(String name, String title, String email, String tempPassword) {
        User existing = userRepository.findByEmailAndIsDeletedFalse(email).orElse(null);
        if (existing == null) {
            User created = new User();
            created.setId(UUID.randomUUID().toString());
            created.setName(name == null || name.isBlank() ? email : name);
            created.setEmail(email);
            created.setTitle(title == null ? "" : title);
            created.setRole(UserRole.council_member);
            created.setActive(true);
            created.setLocked(false);
            created.setDeleted(false);
            created.setPasswordHash(passwordEncoder.encode(tempPassword));
            User saved = userRepository.save(created);
            return new AccountProvisionResult(saved.getId(), saved.getRole(), tempPassword, true, false);
        }

        if (existing.getRole() == UserRole.council_member) {
            existing.setPasswordHash(passwordEncoder.encode(tempPassword));
            existing.setActive(true);
            existing.setLocked(false);
            userRepository.save(existing);
            return new AccountProvisionResult(existing.getId(), existing.getRole(), tempPassword, false, true);
        }

        return new AccountProvisionResult(existing.getId(), existing.getRole(), "", false, false);
    }

    private String resolveCouncilDefaultPassword() {
        String configured = systemConfigRepository.findByKey("COUNCIL_DEFAULT_PASSWORD")
            .map(SystemConfig::getValue)
            .map(String::trim)
            .orElse("");
        if (configured.length() >= 6) {
            return configured;
        }
        return "123456";
    }

    private String encodeCredentialCsv(List<CouncilCredentialRow> rows) {
        if (rows.isEmpty()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        builder.append("\"name\",\"email\",\"temporaryPassword\",\"role\",\"status\"\n");
        for (CouncilCredentialRow row : rows) {
            String status = row.newlyCreated() ? "NEW" : (row.passwordReset() ? "RESET" : "EXISTING");
            builder
                .append(csvCell(row.name())).append(',')
                .append(csvCell(row.email())).append(',')
                .append(csvCell(row.password())).append(',')
                .append(csvCell(row.role())).append(',')
                .append(csvCell(status)).append('\n');
        }
        return Base64.getEncoder().encodeToString(builder.toString().getBytes(StandardCharsets.UTF_8));
    }

    private String csvCell(String value) {
        String safe = value == null ? "" : value;
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    private String buildCredentialFileName(String decisionCode) {
        String seed = decisionCode == null || decisionCode.isBlank() ? "council" : decisionCode;
        String normalized = seed.replaceAll("[^A-Za-z0-9._-]", "_");
        return "council_credentials_" + normalized + ".csv";
    }

    private record AccountProvisionResult(
        String userId,
        UserRole role,
        String passwordForExport,
        boolean newlyCreated,
        boolean passwordReset
    ) {}

    private Map<String, Object> toMemberMap(CouncilMember m) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", m.getId());
        row.put("name", m.getName());
        row.put("title", m.getTitle());
        row.put("institution", m.getInstitution());
        row.put("email", m.getEmail());
        row.put("phone", m.getPhone());
        row.put("affiliation", m.getAffiliation());
        row.put("role", m.getRole());
        row.put("hasConflict", m.isHasConflict());
        row.put("memberUserId", m.getMemberUserId());
        return row;
    }

    private Council resolveCouncilForActor(String councilId, User actor) {
        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));

        if (actor.getRole() == UserRole.project_owner && !council.getProject().getOwner().getId().equals(actor.getId())) {
            throw new IllegalArgumentException("Ban khong co quyen xem hoi dong nay");
        }

        if (actor.getRole() == UserRole.council_member
            && councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(councilId).stream().noneMatch(m -> actor.getId().equals(m.getMemberUserId()))) {
            throw new IllegalArgumentException("Ban khong co quyen xem hoi dong nay");
        }

        return council;
    }

    private CouncilMember resolveScoringMember(String councilId, String memberRef) {
        List<CouncilMember> members = councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(councilId);
        return members.stream()
            .filter(m -> memberRef.equals(m.getId()) || memberRef.equals(m.getMemberUserId()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Ban khong phai thanh vien hop le cua hoi dong nay"));
    }

    private boolean isScoreEligibleRole(String role) {
        return role != null && SCORE_ELIGIBLE_ROLES.contains(role);
    }

    private String resolveUserIdByEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return userRepository.findByEmailAndIsDeletedFalse(email).map(User::getId).orElse(null);
    }

    private String stringValue(Map<String, Object> map, String key, String defaultValue) {
        Object raw = map.get(key);
        if (raw == null) {
            return defaultValue;
        }
        String text = String.valueOf(raw).trim();
        return text.isBlank() ? defaultValue : text;
    }
}
