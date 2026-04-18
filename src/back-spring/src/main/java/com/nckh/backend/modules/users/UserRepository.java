package com.nckh.backend.modules.users;

import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmailAndIsDeletedFalse(String email);
    Optional<User> findByEmail(String email);
    boolean existsByEmailAndIdNot(String email, String id);
    List<User> findByRoleAndIsDeletedFalse(UserRole role);
    List<User> findAllByIsDeletedFalse();
    Optional<User> findByIdAndIsDeletedFalse(String id);
    Optional<User> findByEmailAndIdNotAndIsDeletedFalse(String email, String id);
    long countByIsDeletedFalse();
    long countByIsActiveTrueAndIsDeletedFalse();
    long countByIsLockedTrueAndIsDeletedFalse();
}
