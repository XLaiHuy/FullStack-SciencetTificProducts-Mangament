package com.nckh.backend.modules.councils;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CouncilMemberRepository extends JpaRepository<CouncilMember, String> {
    List<CouncilMember> findByCouncilIdAndIsDeletedFalseOrderByCreatedAtAsc(String councilId);
    long countByCouncilIdAndIsDeletedFalse(String councilId);
    Optional<CouncilMember> findByCouncilIdAndIdAndIsDeletedFalse(String councilId, String id);

    @Query("select distinct cm.council from CouncilMember cm where cm.memberUserId = :userId and cm.isDeleted = false and cm.council.isDeleted = false order by cm.council.createdDate desc")
    List<Council> findCouncilsByMemberUserId(@Param("userId") String userId);
}
