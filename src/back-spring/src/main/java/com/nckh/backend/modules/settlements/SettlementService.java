package com.nckh.backend.modules.settlements;

import static com.nckh.backend.modules.settlements.SettlementDtos.*;

import com.nckh.backend.modules.projects.Project;
import com.nckh.backend.modules.projects.ProjectRepository;
import com.nckh.backend.modules.projects.ProjectStatus;
import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRole;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class SettlementService {

    private static final Map<SettlementStatus, List<SettlementStatus>> ALLOWED_TRANSITIONS = Map.of(
        SettlementStatus.cho_bo_sung, List.of(SettlementStatus.hop_le, SettlementStatus.hoa_don_vat, SettlementStatus.da_xac_nhan),
        SettlementStatus.hop_le, List.of(SettlementStatus.cho_bo_sung, SettlementStatus.hoa_don_vat, SettlementStatus.da_xac_nhan),
        SettlementStatus.hoa_don_vat, List.of(SettlementStatus.cho_bo_sung, SettlementStatus.da_xac_nhan),
        SettlementStatus.da_xac_nhan, List.of()
    );

    private final SettlementRepository settlementRepository;
    private final ProjectRepository projectRepository;

    public SettlementService(SettlementRepository settlementRepository, ProjectRepository projectRepository) {
        this.settlementRepository = settlementRepository;
        this.projectRepository = projectRepository;
    }

    public List<SettlementItem> getAll(User actor) {
        List<Settlement> list = actor.getRole() == UserRole.project_owner
            ? settlementRepository.findByProjectOwnerIdAndIsDeletedFalseOrderByCreatedAtDesc(actor.getId())
            : settlementRepository.findByIsDeletedFalseOrderByCreatedAtDesc();
        return list.stream().map(this::toItem).toList();
    }

    public SettlementItem getById(String id, User actor) {
        Settlement settlement = settlementRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Ho so quyet toan khong ton tai"));
        if (actor.getRole() == UserRole.project_owner && !settlement.getProject().getOwner().getId().equals(actor.getId())) {
            throw new IllegalArgumentException("Ban khong co quyen xem ho so nay");
        }
        return toItem(settlement);
    }

    public SettlementItem create(CreateSettlementRequest request, User actor) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(request.projectId())
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));

        if (actor.getRole() == UserRole.project_owner && !project.getOwner().getId().equals(actor.getId())) {
            throw new IllegalArgumentException("Ban chi duoc nop quyet toan de tai cua minh");
        }

        if (project.getStatus() != ProjectStatus.da_nghiem_thu && project.getStatus() != ProjectStatus.da_thanh_ly) {
            throw new IllegalArgumentException("Chi duoc nop quyet toan khi de tai da nghiem thu");
        }

        Settlement settlement = new Settlement();
        settlement.setId(request.id());
        settlement.setCode(request.code());
        settlement.setProject(project);
        settlement.setContent(request.content());
        settlement.setTotalAmount(request.totalAmount());
        settlement.setSubmittedBy(request.submittedBy());

        return toItem(settlementRepository.save(settlement));
    }

    public SettlementItem requestSupplement(String id, SupplementRequest request) {
        Settlement s = settlementRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Ho so quyet toan khong ton tai"));
        s.setStatus(SettlementStatus.cho_bo_sung);
        s.setSupplementNote(request.note());
        return toItem(settlementRepository.save(s));
    }

    public SettlementItem updateStatus(String id, UpdateSettlementStatusRequest request) {
        Settlement s = settlementRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Ho so quyet toan khong ton tai"));

        if (s.getStatus() != request.status()) {
            List<SettlementStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(s.getStatus(), List.of());
            if (!allowed.contains(request.status())) {
                throw new IllegalArgumentException("Khong the chuyen trang thai tu " + s.getStatus() + " sang " + request.status());
            }
        }

        s.setStatus(request.status());
        if (request.note() != null && !request.note().isBlank()) {
            s.setSupplementNote(request.note());
        }

        if (request.status() == SettlementStatus.da_xac_nhan) {
            Project p = s.getProject();
            p.setStatus(ProjectStatus.da_thanh_ly);
            projectRepository.save(p);
        }

        return toItem(settlementRepository.save(s));
    }

    public SettlementItem approve(String id) {
        return updateStatus(id, new UpdateSettlementStatusRequest(SettlementStatus.da_xac_nhan, "Phe duyet quyet toan"));
    }

    private SettlementItem toItem(Settlement s) {
        return new SettlementItem(
            s.getId(),
            s.getCode(),
            s.getProject().getId(),
            s.getProject().getCode(),
            s.getProject().getTitle(),
            s.getTotalAmount(),
            s.getStatus(),
            s.getSubmittedBy(),
            s.getSupplementNote()
        );
    }
}
