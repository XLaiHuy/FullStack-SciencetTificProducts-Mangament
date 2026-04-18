package com.nckh.backend.modules.councils;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CouncilMinutesRecordRepository extends JpaRepository<CouncilMinutesRecord, String> {
    Optional<CouncilMinutesRecord> findByCouncilId(String councilId);
}
