package com.nckh.backend.modules.contracts;

import static com.nckh.backend.modules.contracts.ContractDtos.*;

import com.nckh.backend.modules.projects.Project;
import com.nckh.backend.modules.projects.ProjectRepository;
import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRole;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
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
        if (actor.getRole() == UserRole.project_owner && !c.getProject().getOwner().getId().equals(actor.getId())) {
            throw new IllegalArgumentException("Ban khong co quyen xem hop dong nay");
        }
        return toItem(c);
    }

    public ContractItem create(CreateContractRequest request) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(request.projectId())
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));

        Contract c = new Contract();
        c.setId(request.id());
        c.setCode(request.code());
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

    private ContractItem toItem(Contract c) {
        return new ContractItem(
            c.getId(),
            c.getCode(),
            c.getProject().getId(),
            c.getProject().getCode(),
            c.getProject().getTitle(),
            c.getBudget(),
            c.getStatus(),
            c.getSignedDate(),
            c.getAgencyName(),
            c.getRepresentative(),
            c.getPdfUrl(),
            c.getNotes()
        );
    }
}
