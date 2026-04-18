package com.nckh.backend.modules.contracts;

import static com.nckh.backend.modules.contracts.ContractDtos.*;

import com.nckh.backend.modules.projects.Project;
import com.nckh.backend.modules.projects.ProjectRepository;
import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRole;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ContractService {

    private final ContractRepository contractRepository;
    private final ProjectRepository projectRepository;

    public ContractService(ContractRepository contractRepository, ProjectRepository projectRepository) {
        this.contractRepository = contractRepository;
        this.projectRepository = projectRepository;
    }

    public List<ContractItem> getAll(User actor) {
        List<Contract> list = actor.getRole() == UserRole.project_owner
            ? contractRepository.findByProjectOwnerIdAndIsDeletedFalseOrderByCreatedAtDesc(actor.getId())
            : contractRepository.findByIsDeletedFalseOrderByCreatedAtDesc();
        return list.stream().map(this::toItem).toList();
    }

    public List<ContractItem> getMine(User actor) {
        return contractRepository.findByProjectOwnerIdAndIsDeletedFalseOrderByCreatedAtDesc(actor.getId()).stream().map(this::toItem).toList();
    }

    public ContractItem getById(String id, User actor) {
        Contract c = contractRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hop dong khong ton tai"));
        if (actor != null && actor.getRole() == UserRole.project_owner) {
            String ownerId = null;
            try {
                if (c.getProject() != null && c.getProject().getOwner() != null) {
                    ownerId = c.getProject().getOwner().getId();
                }
            } catch (Exception ignored) {
                ownerId = null;
            }
            if ((ownerId == null || ownerId.isBlank()) && c.getProject() != null) {
                String projectId = c.getProject().getId();
                Project p = projectRepository.findByIdAndIsDeletedFalse(projectId).orElse(null);
                if (p != null && p.getOwner() != null) {
                    ownerId = p.getOwner().getId();
                }
            }
            if (ownerId == null || !ownerId.equals(actor.getId())) {
                throw new IllegalArgumentException("Ban khong co quyen xem hop dong nay");
            }
        }
        return toItem(c);
    }

    public ContractItem create(CreateContractRequest request) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(request.projectId())
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));

        boolean hasActiveContract = contractRepository.findByProjectIdAndIsDeletedFalse(project.getId()).stream()
            .anyMatch(existing -> existing.getStatus() != ContractStatus.huy);
        if (hasActiveContract) {
            throw new IllegalArgumentException("De tai da ton tai hop dong hien hanh");
        }

        Contract c = new Contract();
        c.setId((request.id() == null || request.id().isBlank()) ? UUID.randomUUID().toString() : request.id());
        c.setCode((request.code() == null || request.code().isBlank()) ? generateContractCode() : request.code());
        c.setProject(project);
        c.setBudget(request.budget());
        c.setAgencyName(request.agencyName());
        c.setRepresentative(request.representative());
        c.setNotes(request.notes());

        return toItem(contractRepository.save(c));
    }

    public ContractItem updateStatus(String id, UpdateStatusRequest request) {
        Contract c = contractRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hop dong khong ton tai"));
        c.setStatus(request.status());
        if (request.status() == ContractStatus.da_ky && c.getSignedDate() == null) {
            c.setSignedDate(java.time.LocalDate.now());
        }
        return toItem(contractRepository.save(c));
    }

    public void softDelete(String id) {
        Contract c = contractRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hop dong khong ton tai"));
        c.setIsDeleted(true);
        contractRepository.save(c);
    }

    public ContractItem updatePdfUrl(String id, String pdfUrl) {
        Contract c = contractRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hop dong khong ton tai"));
        c.setPdfUrl(pdfUrl);
        return toItem(contractRepository.save(c));
    }

    private ContractItem toItem(Contract c) {
        String projectId = c.getProject() == null ? "" : c.getProject().getId();
        String projectCode = "";
        String projectTitle = "";
        String ownerName = "";
        String ownerEmail = "";
        String ownerTitle = "";
        
        if (projectId != null && !projectId.isBlank()) {
            try {
                if (c.getProject() != null) {
                    projectCode = c.getProject().getCode() == null ? "" : c.getProject().getCode();
                    projectTitle = c.getProject().getTitle() == null ? "" : c.getProject().getTitle();
                    if (c.getProject().getOwner() != null) {
                        ownerName = c.getProject().getOwner().getName();
                        ownerEmail = c.getProject().getOwner().getEmail();
                        ownerTitle = c.getProject().getOwner().getTitle();
                    }
                }
            } catch (Exception ignored) {
                // Detached lazy proxy; fallback to repository lookup below.
            }
            if (projectCode.isBlank() || projectTitle.isBlank() || ownerName == null || ownerName.isBlank()) {
                Project p = projectRepository.findByIdAndIsDeletedFalse(projectId).orElse(null);
                if (p != null) {
                    if (projectCode.isBlank()) {
                        projectCode = p.getCode() == null ? "" : p.getCode();
                    }
                    if (projectTitle.isBlank()) {
                        projectTitle = p.getTitle() == null ? "" : p.getTitle();
                    }
                    if (ownerName == null || ownerName.isBlank()) {
                        if (p.getOwner() != null) {
                            ownerName = p.getOwner().getName();
                            ownerEmail = p.getOwner().getEmail();
                            ownerTitle = p.getOwner().getTitle();
                        }
                    }
                }
            }
        }
        
        return new ContractItem(
            c.getId(),
            c.getCode(),
            projectId,
            projectCode,
            projectTitle,
            ownerName == null ? "" : ownerName,
            ownerEmail == null ? "" : ownerEmail,
            ownerTitle == null ? "" : ownerTitle,
            c.getBudget(),
            c.getStatus(),
            c.getSignedDate(),
            c.getAgencyName(),
            c.getRepresentative(),
            c.getPdfUrl(),
            c.getNotes()
        );
    }

    private String generateContractCode() {
        return "HD/" + java.time.Year.now().getValue() + "/" + String.format("%03d", contractRepository.findByIsDeletedFalseOrderByCreatedAtDesc().size() + 1);
    }
}
