package com.nckh.backend.modules.councils;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CouncilMemberRecordRepository extends JpaRepository<CouncilMemberRecord, String> {
    List<CouncilMemberRecord> findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(String councilId);
    long countByCouncilIdAndIsDeletedFalse(String councilId);
}
