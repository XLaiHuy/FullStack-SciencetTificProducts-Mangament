package com.nckh.backend.modules.settlements;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettlementRepository extends JpaRepository<Settlement, String> {
    List<Settlement> findByIsDeletedFalseOrderByCreatedAtDesc();
    List<Settlement> findByProjectOwnerIdAndIsDeletedFalseOrderByCreatedAtDesc(String ownerId);
    Optional<Settlement> findByIdAndIsDeletedFalse(String id);
}
