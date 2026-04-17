package com.nckh.backend.modules.admin;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemConfigRepository extends JpaRepository<SystemConfig, String> {
    Optional<SystemConfig> findByKey(String key);
}
