package com.nckh.backend.modules.councils;

import static com.nckh.backend.modules.councils.CouncilDtos.*;

import com.nckh.backend.modules.projects.Project;
import com.nckh.backend.modules.projects.ProjectRepository;
import com.nckh.backend.modules.projects.ProjectStatus;
import com.nckh.backend.modules.users.User;
import com.nckh.backend.modules.users.UserRole;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CouncilService {

    private final CouncilRepository councilRepository;
    private final CouncilReviewRepository reviewRepository;
    private final ProjectRepository projectRepository;

    public CouncilService(CouncilRepository councilRepository, CouncilReviewRepository reviewRepository, ProjectRepository projectRepository) {
        this.councilRepository = councilRepository;
        this.reviewRepository = reviewRepository;
        this.projectRepository = projectRepository;
    }

    public List<CouncilItem> getAll(User actor) {
        List<Council> list = actor.getRole() == UserRole.project_owner
            ? councilRepository.findByProjectOwnerIdAndIsDeletedFalseOrderByCreatedDateDesc(actor.getId())
            : councilRepository.findByIsDeletedFalseOrderByCreatedDateDesc();
        return list.stream().map(this::toItem).toList();
    }

    public List<CouncilItem> getMine(User actor) {
        return getAll(actor);
    }

    public CouncilItem getById(String id, User actor) {
        Council council = councilRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));
        if (actor.getRole() == UserRole.project_owner && !council.getProject().getOwner().getId().equals(actor.getId())) {
            throw new IllegalArgumentException("Ban khong co quyen xem hoi dong nay");
        }
        return toItem(council);
    }

    public CouncilItem create(CreateCouncilRequest request) {
        Project project = projectRepository.findByIdAndIsDeletedFalse(request.projectId())
            .orElseThrow(() -> new IllegalArgumentException("De tai khong ton tai"));

        Council council = new Council();
        council.setId(request.id());
        council.setDecisionCode(request.decisionCode());
        council.setProject(project);

        return toItem(councilRepository.save(council));
    }

    public CouncilItem approve(String id) {
        Council c = councilRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));
        c.setStatus(CouncilStatus.dang_danh_gia);
        return toItem(councilRepository.save(c));
    }

    public CouncilItem complete(String id) {
        Council c = councilRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));
        c.setStatus(CouncilStatus.da_hoan_thanh);
        Project p = c.getProject();
        p.setStatus(ProjectStatus.da_nghiem_thu);
        projectRepository.save(p);
        return toItem(councilRepository.save(c));
    }

    public ScoreSummary score(String id, ScoreRequest request) {
        Council c = councilRepository.findByIdAndIsDeletedFalse(id)
            .orElseThrow(() -> new IllegalArgumentException("Hoi dong khong ton tai"));

        CouncilReview review = reviewRepository.findByCouncilIdAndMemberIdAndType(id, request.memberId(), "score")
            .orElseGet(CouncilReview::new);
        if (review.getId() == null) {
            review.setId(java.util.UUID.randomUUID().toString());
            review.setCouncil(c);
            review.setMemberId(request.memberId());
            review.setType("score");
        }
        review.setScore(request.score());
        review.setComments(request.comment());
        reviewRepository.save(review);

        return scoreSummary(id);
    }

    public ScoreSummary scoreSummary(String id) {
        List<CouncilReview> reviews = reviewRepository.findByCouncilIdAndType(id, "score");
        if (reviews.isEmpty()) {
            return new ScoreSummary(id, 0, BigDecimal.ZERO, false);
        }

        BigDecimal total = reviews.stream().map(r -> r.getScore() == null ? BigDecimal.ZERO : r.getScore())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avg = total.divide(BigDecimal.valueOf(reviews.size()), 2, RoundingMode.HALF_UP);
        return new ScoreSummary(id, reviews.size(), avg, avg.compareTo(BigDecimal.valueOf(5.0)) >= 0);
    }

    private CouncilItem toItem(Council c) {
        return new CouncilItem(
            c.getId(),
            c.getDecisionCode(),
            c.getProject().getId(),
            c.getProject().getCode(),
            c.getProject().getTitle(),
            c.getStatus(),
            c.getDecisionPdfUrl()
        );
    }
}
