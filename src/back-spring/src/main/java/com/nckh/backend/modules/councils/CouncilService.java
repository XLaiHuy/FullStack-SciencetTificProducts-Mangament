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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CouncilService {

    private final CouncilRepository councilRepository;
    private final CouncilReviewRepository reviewRepository;
    private final CouncilMemberRepository councilMemberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SystemConfigRepository systemConfigRepository;

    public CouncilService(
        CouncilRepository councilRepository,
        CouncilReviewRepository reviewRepository,
        CouncilMemberRepository councilMemberRepository,
        ProjectRepository projectRepository,
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        SystemConfigRepository systemConfigRepository
    ) {
        this.councilRepository = councilRepository;
        this.reviewRepository = reviewRepository;
        this.councilMemberRepository = councilMemberRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.systemConfigRepository = systemConfigRepository;
    }

    public List<CouncilItem> getAll(User actor) {
        List<Council> list;
        if (actor.getRole() == UserRole.project_owner) {
            list = councilRepository.findByProjectOwnerIdAndIsDeletedFalseOrderByCreatedDateDesc(actor.getId());
        } else if (actor.getRole() == UserRole.council_member) {
            list = councilMemberRepository.findCouncilsByMemberUserId(actor.getId());
        } else {
            list = councilRepository.findByIsDeletedFalseOrderByCreatedDateDesc();
        }
        return list.stream().map(this::toItem).toList();
    }

    public List<CouncilItem> getMine(User actor) {
        if (actor.getRole() == UserRole.council_member) {
            return councilMemberRepository.findCouncilsByMemberUserId(actor.getId()).stream().map(this::toItem).toList();
        }
        return councilRepository.findByProjectOwnerIdAndIsDeletedFalseOrderByCreatedDateDesc(actor.getId()).stream().map(this::toItem).toList();
    }

    public CouncilItem getById(String id, User actor) {
        Council council = councilRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));
        if (actor.getRole() == UserRole.project_owner && !council.getProject().getOwner().getId().equals(actor.getId())) {
            throw new IllegalArgumentException("Ban khong co quyen xem hoi dong nay");
        }
        if (actor.getRole() == UserRole.council_member
            && councilMemberRepository.findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(id).stream().noneMatch(m -> actor.getId().equals(m.getMemberUserId()))) {
            throw new IllegalArgumentException("Ban khong co quyen xem hoi dong nay");
        }
        return toItem(council);
    }

    public CouncilCreateResult create(CreateCouncilRequest request) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(request.projectId())
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));

        Council council = new Council();
        council.setId((request.id() == null || request.id().isBlank()) ? UUID.randomUUID().toString() : request.id());
        council.setDecisionCode((request.decisionCode() == null || request.decisionCode().isBlank())
            ? "QD/" + java.time.Year.now().getValue() + "/" + String.format("%03d", councilRepository.findByIsDeletedFalseOrderByCreatedDateDesc().size() + 1)
            : request.decisionCode());
        council.setProject(project);

        Council saved = councilRepository.save(council);
        List<CouncilCredentialRow> credentialRows = replaceMembers(saved, request.members());
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
        c.setStatus(CouncilStatus.da_hoan_thanh);
        Project p = c.getProject();
        p.setStatus(ProjectStatus.da_nghiem_thu);
        projectRepository.save(p);
        return toItem(councilRepository.save(c));
    }

    public ScoreSummary score(String id, ScoreRequest request) {
        Council c = councilRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));

        String memberId = (request.memberId() == null || request.memberId().isBlank()) ? "anonymous-member" : request.memberId();

        CouncilReview review = reviewRepository.findByCouncilIdAndMemberIdAndType(id, memberId, "score")
            .orElseGet(CouncilReview::new);
        if (review.getId() == null) {
            review.setId(UUID.randomUUID().toString());
            review.setCouncil(c);
            review.setMemberId(memberId);
            review.setType("score");
        }
        review.setScore(request.score());
        review.setComments(request.comment());
        reviewRepository.save(review);

        return scoreSummary(id);
    }

    public ScoreSummary scoreSummary(String id) {
        List<CouncilReview> reviews = reviewRepository.findByCouncilIdAndType(id, "score");
        if (reviews.isEmpty()) {
            return new ScoreSummary(id, 0, BigDecimal.ZERO, false);
        }

        BigDecimal total = reviews.stream().map(r -> r.getScore() == null ? BigDecimal.ZERO : r.getScore())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avg = total.divide(BigDecimal.valueOf(reviews.size()), 2, RoundingMode.HALF_UP);
        return new ScoreSummary(id, reviews.size(), avg, avg.compareTo(BigDecimal.valueOf(5.0)) >= 0);
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

        CouncilMember member = new CouncilMember();
        member.setId(UUID.randomUUID().toString());
        member.setCouncil(council);
        member.setName(stringValue(req, "name", "Thanh vien"));
        member.setTitle(stringValue(req, "title", ""));
        member.setInstitution(stringValue(req, "institution", ""));
        String email = stringValue(req, "email", "").toLowerCase(Locale.ROOT);
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
        Council council = councilRepository.findByIdAndIsDeletedFalse(councilId)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));
        return council.getMinutesFileUrl() == null ? "" : council.getMinutesFileUrl();
    }

    public String getMinutesFileUrl(String councilId) {
        return getMinutesUrl(councilId);
    }

    public void saveMinutes(String councilId, String content, String fileUrl, String actorName) {
        recordMinutes(councilId, fileUrl, content);
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
