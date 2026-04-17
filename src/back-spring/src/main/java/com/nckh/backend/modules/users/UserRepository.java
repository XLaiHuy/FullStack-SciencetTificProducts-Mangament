package com.nckh.backend.modules.users;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmailAndIsDeletedFalse(String email);
}
