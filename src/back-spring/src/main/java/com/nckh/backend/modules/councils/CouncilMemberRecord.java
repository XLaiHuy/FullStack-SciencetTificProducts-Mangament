package com.nckh.backend.modules.councils;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "council_memberships")
public class CouncilMemberRecord {

    @Id
    @Column(length = 64)
    private String id;

    @Column(nullable = false, length = 64)
    private String councilId;

    @Column(length = 64)
    private String userId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 100)
    private String title;

    @Column(length = 300)
    private String institution;

    @Column(nullable = false, length = 200)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(length = 300)
    private String affiliation;

    @Column(nullable = false, length = 50)
    private String role;

    @Column(nullable = false)
    private boolean hasConflict = false;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getCouncilId() { return councilId; }
    public void setCouncilId(String councilId) { this.councilId = councilId; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getInstitution() { return institution; }
    public void setInstitution(String institution) { this.institution = institution; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getAffiliation() { return affiliation; }
    public void setAffiliation(String affiliation) { this.affiliation = affiliation; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public boolean isHasConflict() { return hasConflict; }
    public void setHasConflict(boolean hasConflict) { this.hasConflict = hasConflict; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public boolean isDeleted() { return isDeleted; }
    public void setDeleted(boolean deleted) { isDeleted = deleted; }
}
