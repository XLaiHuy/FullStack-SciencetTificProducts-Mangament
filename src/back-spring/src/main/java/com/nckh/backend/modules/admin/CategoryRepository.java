package com.nckh.backend.modules.admin;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoryRepository extends JpaRepository<Category, String> {
    List<Category> findByIsActiveTrueOrderByTypeAscSortOrderAscCreatedAtAsc();
    List<Category> findByTypeAndIsActiveTrueOrderBySortOrderAscCreatedAtAsc(String type);
}
