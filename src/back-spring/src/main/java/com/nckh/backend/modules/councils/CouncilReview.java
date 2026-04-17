package com.nckh.backend.modules.councils;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "council_reviews")
public class CouncilReview {

    @Id
    @Column(length = 64)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "councilId", nullable = false)
    private Council council;

    @Column(nullable = false, length = 64)
    private String memberId;

    @Column(precision = 5, scale = 2)
    private BigDecimal score;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(nullable = false, length = 50)
    private String type = "score";

    @Column(name = "createdAt", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updatedAt", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Council getCouncil() { return council; }
    public void setCouncil(Council council) { this.council = council; }
    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }
    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }
    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
}
