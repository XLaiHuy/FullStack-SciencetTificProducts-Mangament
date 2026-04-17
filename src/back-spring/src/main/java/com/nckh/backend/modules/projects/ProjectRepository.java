package com.nckh.backend.modules.projects;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<Project, String> {
    Optional<Project> findByIdAndIsDeletedFalse(String id);
    List<Project> findByIsDeletedFalseOrderByCreatedAtDesc();
    List<Project> findByOwnerIdAndIsDeletedFalseOrderByCreatedAtDesc(String ownerId);
    long countByIsDeletedFalse();
    long countByStatusAndIsDeletedFalse(ProjectStatus status);
}
