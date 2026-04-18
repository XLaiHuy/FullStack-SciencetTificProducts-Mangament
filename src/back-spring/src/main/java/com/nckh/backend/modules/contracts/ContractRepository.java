package com.nckh.backend.modules.contracts;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContractRepository extends JpaRepository<Contract, String> {
    List<Contract> findByIsDeletedFalseOrderByCreatedAtDesc();
    List<Contract> findByProjectOwnerIdAndIsDeletedFalseOrderByCreatedAtDesc(String ownerId);
    List<Contract> findByProjectIdAndIsDeletedFalse(String projectId);
    Optional<Contract> findByIdAndIsDeletedFalse(String id);
}
