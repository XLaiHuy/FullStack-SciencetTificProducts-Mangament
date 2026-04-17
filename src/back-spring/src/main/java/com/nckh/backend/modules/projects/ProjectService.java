package com.nckh.backend.modules.projects;

import static com.nckh.backend.modules.projects.ProjectDtos.*;

import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRepository;
import com.nckh.backend.modules.users.UserRole;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
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

    public List<ProjectItem> getAll(User actor) {
        List<Project> projects = actor.getRole() == UserRole.project_owner
            ? projectRepository.findByOwnerIdAndIsDeletedFalseOrderByCreatedAtDesc(actor.getId())
            : projectRepository.findByIsDeletedFalseOrderByCreatedAtDesc();
        return projects.stream().map(this::toItem).toList();
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

        Project project = new Project();
        project.setId(request.id());
        project.setCode(request.code());
        project.setTitle(request.title());
        project.setOwner(owner);
        project.setDepartment(request.department());
        project.setField(request.field());
        project.setStartDate(request.startDate());
        project.setEndDate(request.endDate());
        project.setDurationMonths(request.durationMonths());
        project.setBudget(request.budget());
        project.setAdvancedAmount(request.advancedAmount() == null ? java.math.BigDecimal.ZERO : request.advancedAmount());

        return toItem(projectRepository.save(project));
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
        return new ProjectItem(
            project.getId(),
            project.getCode(),
            project.getTitle(),
            project.getOwner().getId(),
            project.getOwner().getName(),
            project.getStatus(),
            project.getBudget(),
            project.getAdvancedAmount(),
            project.getDepartment(),
            project.getField()
        );
    }
}
