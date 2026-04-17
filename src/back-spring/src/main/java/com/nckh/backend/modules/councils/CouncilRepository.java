package com.nckh.backend.modules.councils;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CouncilRepository extends JpaRepository<Council, String> {
    List<Council> findByIsDeletedFalseOrderByCreatedDateDesc();
    List<Council> findByProjectOwnerIdAndIsDeletedFalseOrderByCreatedDateDesc(String ownerId);
    Optional<Council> findByIdAndIsDeletedFalse(String id);
}
