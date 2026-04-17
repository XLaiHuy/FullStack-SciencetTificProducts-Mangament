package com.nckh.backend.modules.extensions;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExtensionRepository extends JpaRepository<Extension, String> {
    List<Extension> findByProjectOwnerIdOrderByCreatedAtDesc(String ownerId);
    List<Extension> findAllByOrderByCreatedAtDesc();
}
