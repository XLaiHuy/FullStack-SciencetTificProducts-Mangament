package com.nckh.backend.modules.councils;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CouncilReviewRepository extends JpaRepository<CouncilReview, String> {
    List<CouncilReview> findByCouncilIdAndType(String councilId, String type);
    Optional<CouncilReview> findByCouncilIdAndMemberIdAndType(String councilId, String memberId, String type);
}
