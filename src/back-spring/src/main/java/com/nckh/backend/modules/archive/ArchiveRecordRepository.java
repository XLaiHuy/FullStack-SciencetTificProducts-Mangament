package com.nckh.backend.modules.archive;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ArchiveRecordRepository extends JpaRepository<ArchiveRecord, String> {
    List<ArchiveRecord> findAllByOrderByArchivedAtDesc();
    Optional<ArchiveRecord> findByProjectId(String projectId);
}
