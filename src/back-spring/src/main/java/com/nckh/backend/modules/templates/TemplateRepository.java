package com.nckh.backend.modules.templates;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TemplateRepository extends JpaRepository<Template, String> {
    List<Template> findByIsDeletedFalseOrderByCreatedAtDesc();
}
