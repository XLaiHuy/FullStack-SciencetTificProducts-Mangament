package com.nckh.backend.modules.projects;

import static com.nckh.backend.modules.projects.ProjectDtos.*;

import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRepository;
import com.nckh.backend.modules.users.UserRole;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ProjectService {

    private static final Map<ProjectStatus, List<ProjectStatus>> ALLOWED_TRANSITIONS = new EnumMap<>(ProjectStatus.class);

    static {
        ALLOWED_TRANSITIONS.put(ProjectStatus.dang_thuc_hien, List.of(ProjectStatus.tre_han, ProjectStatus.cho_nghiem_thu, ProjectStatus.huy_bo));
        ALLOWED_TRANSITIONS.put(ProjectStatus.tre_han, List.of(ProjectStatus.dang_thuc_hien, ProjectStatus.huy_bo));
        ALLOWED_TRANSITIONS.put(ProjectStatus.cho_nghiem_thu, List.of(ProjectStatus.da_nghiem_thu, ProjectStatus.dang_thuc_hien));
        ALLOWED_TRANSITIONS.put(ProjectStatus.da_nghiem_thu, List.of(ProjectStatus.da_thanh_ly));
        ALLOWED_TRANSITIONS.put(ProjectStatus.da_thanh_ly, List.of());
        ALLOWED_TRANSITIONS.put(ProjectStatus.huy_bo, List.of());
    }

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    public List<ProjectItem> getAll(User actor, String status, String search) {
        List<Project> projects = actor.getRole() == UserRole.project_owner
            ? projectRepository.findByOwnerIdAndIsDeletedFalseOrderByCreatedAtDesc(actor.getId())
            : projectRepository.findByIsDeletedFalseOrderByCreatedAtDesc();

        String normalizedStatus = status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
        String keyword = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);

        return projects.stream()
            .filter(p -> normalizedStatus.isBlank() || p.getStatus().name().equalsIgnoreCase(normalizedStatus))
            .filter(p -> keyword.isBlank()
                || (p.getCode() != null && p.getCode().toLowerCase(Locale.ROOT).contains(keyword))
                || (p.getTitle() != null && p.getTitle().toLowerCase(Locale.ROOT).contains(keyword))
                || (p.getOwner() != null && p.getOwner().getName() != null && p.getOwner().getName().toLowerCase(Locale.ROOT).contains(keyword))
            )
            .map(this::toItem)
            .toList();
    }

    public List<ProjectItem> getMine(User actor) {
        return projectRepository.findByOwnerIdAndIsDeletedFalseOrderByCreatedAtDesc(actor.getId()).stream().map(this::toItem).toList();
    }

    public ProjectItem getById(String id, User actor) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));
        if (actor.getRole() == UserRole.project_owner && !project.getOwner().getId().equals(actor.getId())) {
            throw new IllegalArgumentException("Ban khong co quyen xem de tai nay");
        }
        return toItem(project);
    }

    public ProjectItem create(CreateProjectRequest request) {
        User owner = userRepository.findById(request.ownerId())
            .orElseThrow(() -> new IllegalArgumentException("Chu nhiem de tai khong ton tai"));
        LocalDate startDate = parseDate(request.startDate());
        LocalDate endDate = parseDate(request.endDate());

        Project project = new Project();
        project.setId((request.id() == null || request.id().isBlank()) ? UUID.randomUUID().toString() : request.id());
        project.setCode((request.code() == null || request.code().isBlank()) ? generateProjectCode() : request.code());
        project.setTitle(request.title());
        project.setOwner(owner);
        project.setDepartment(request.department());
        project.setField(request.field());
        project.setStartDate(startDate);
        project.setEndDate(endDate);
        int duration = request.durationMonths() == null || request.durationMonths() <= 0
            ? (int) java.time.temporal.ChronoUnit.MONTHS.between(startDate, endDate)
            : request.durationMonths();
        project.setDurationMonths(Math.max(duration, 1));
        project.setBudget(request.budget());
        project.setAdvancedAmount(request.advancedAmount() == null ? BigDecimal.ZERO : request.advancedAmount());

        return toItem(projectRepository.save(project));
    }

    public ProjectItem update(String id, CreateProjectRequest request) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));

        User owner = userRepository.findById(request.ownerId())
            .orElseThrow(() -> new IllegalArgumentException("Chu nhiem de tai khong ton tai"));
        LocalDate startDate = parseDate(request.startDate());
        LocalDate endDate = parseDate(request.endDate());

        if (request.code() != null && !request.code().isBlank()) project.setCode(request.code());
        project.setTitle(request.title());
        project.setOwner(owner);
        project.setDepartment(request.department());
        project.setField(request.field());
        project.setStartDate(startDate);
        project.setEndDate(endDate);
        if (request.durationMonths() != null && request.durationMonths() > 0) {
            project.setDurationMonths(request.durationMonths());
        }
        project.setBudget(request.budget());
        if (request.advancedAmount() != null) project.setAdvancedAmount(request.advancedAmount());

        return toItem(projectRepository.save(project));
    }

    public void softDelete(String id) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));
        project.setIsDeleted(true);
        projectRepository.save(project);
    }

    public void updateMidtermReport(String id, String url, String content) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));
        project.setMidtermReportUrl(url);
        project.setMidtermReportContent(content);
        projectRepository.save(project);
    }

    public void updateFinalReport(String id, String url) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));
        project.setFinalReportUrl(url);
        projectRepository.save(project);
    }

    public void ensureFinalSubmissionAllowed(String id) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));
        if (project.getStatus() != ProjectStatus.dang_thuc_hien) {
            throw new IllegalArgumentException("De tai khong o trang thai dang_thuc_hien");
        }
    }

    public List<Map<String, Object>> owners() {
        return userRepository.findByRoleAndIsDeletedFalse(UserRole.project_owner).stream()
            .map(u -> Map.<String, Object>of(
                "id", u.getId(),
                "name", u.getName(),
                "email", u.getEmail()
            )).toList();
    }

    private String generateProjectCode() {
        return "NCKH-" + java.time.Year.now().getValue() + "-" + String.format("%04d", projectRepository.countByIsDeletedFalse() + 1);
    }

    public ProjectItem updateStatus(String id, UpdateStatusRequest request) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));

        ProjectStatus from = project.getStatus();
        ProjectStatus to = request.status();
        if (from == to) {
            return toItem(project);
        }

        List<ProjectStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(from, List.of());
        if (!allowed.contains(to)) {
            throw new IllegalArgumentException("Khong the chuyen trang thai tu " + from + " sang " + to);
        }

        project.setStatus(to);
        return toItem(projectRepository.save(project));
    }

    public DashboardStats dashboard() {
        return new DashboardStats(
            projectRepository.countByIsDeletedFalse(),
            projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.dang_thuc_hien),
            projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.tre_han),
            projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.cho_nghiem_thu),
            projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.da_nghiem_thu),
            projectRepository.countByStatusAndIsDeletedFalse(ProjectStatus.huy_bo)
        );
    }

    private ProjectItem toItem(Project project) {
        String ownerId = project.getOwner() == null ? "" : project.getOwner().getId();
        return new ProjectItem(
            project.getId(),
            project.getCode(),
            project.getTitle(),
            ownerId,
            resolveOwnerName(project, ownerId),
            project.getOwner() != null ? project.getOwner().getEmail() : "",
            project.getOwner() != null ? project.getOwner().getTitle() : "",
            project.getStatus(),
            project.getBudget(),
            project.getAdvancedAmount(),
            project.getDepartment(),
            project.getField(),
            project.getStartDate() != null ? project.getStartDate().toString() : "",
            project.getEndDate() != null ? project.getEndDate().toString() : "",
            project.getDurationMonths(),
            project.getMidtermReportUrl() != null ? project.getMidtermReportUrl() : "",
            project.getMidtermReportContent() != null ? project.getMidtermReportContent() : "",
            project.getFinalReportUrl() != null ? project.getFinalReportUrl() : ""
        );
    }

    private String resolveOwnerName(Project project, String ownerId) {
        if (ownerId == null || ownerId.isBlank()) {
            return "";
        }
        try {
            if (project.getOwner() != null && project.getOwner().getName() != null) {
                return project.getOwner().getName();
            }
        } catch (Exception ignored) {
            // Fallback to repository lookup for detached/lazy proxies.
        }
        return userRepository.findById(ownerId).map(User::getName).orElse("");
    }

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Ngay khong hop le");
        }
        try {
            return LocalDate.parse(raw);
        } catch (Exception ignored) {
            try {
                return java.time.OffsetDateTime.parse(raw).toLocalDate();
            } catch (Exception ignored2) {
                try {
                    return java.time.LocalDateTime.parse(raw).toLocalDate();
                } catch (Exception ex) {
                    throw new IllegalArgumentException("Dinh dang ngay khong hop le: " + raw);
                }
            }
        }
    }
}
