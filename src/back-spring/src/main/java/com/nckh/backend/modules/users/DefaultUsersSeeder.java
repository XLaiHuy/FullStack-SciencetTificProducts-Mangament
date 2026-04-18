package com.nckh.backend.modules.users;

import java.util.UUID;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DefaultUsersSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DefaultUsersSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensureUser("staff@nckh.edu.vn", "Research Staff", UserRole.research_staff);
        ensureUser("owner@nckh.edu.vn", "Project Owner", UserRole.project_owner);
        ensureUser("accounting@nckh.edu.vn", "Accounting", UserRole.accounting);
        ensureUser("archive@nckh.edu.vn", "Archive Staff", UserRole.archive_staff);
        ensureUser("reports@nckh.edu.vn", "Report Viewer", UserRole.report_viewer);
        ensureUser("chairman@demo.com", "Council Chairman", UserRole.council_member);
        ensureUser("reviewer@demo.com", "Council Reviewer 1", UserRole.council_member);
        ensureUser("council@nckh.edu.vn", "Council Reviewer 2", UserRole.council_member);
        ensureUser("secretary@demo.com", "Council Secretary", UserRole.council_member);
        ensureUser("member@demo.com", "Council Member", UserRole.council_member);
        ensureUser("admin@nckh.edu.vn", "Super Admin", UserRole.superadmin);
        ensureUser("superadmin@nckh.edu.vn", "Super Admin", UserRole.superadmin);
    }

    private void ensureUser(String email, String name, UserRole role) {
        User user = userRepository.findByEmail(email).orElseGet(User::new);
        if (user.getId() == null || user.getId().isBlank()) {
            user.setId(UUID.randomUUID().toString());
        }
        user.setEmail(email);
        user.setName(name);
        user.setRole(role);
        user.setActive(true);
        user.setLocked(false);
        user.setDeleted(false);
        user.setPasswordHash(passwordEncoder.encode("123456"));
        userRepository.save(user);
    }
}