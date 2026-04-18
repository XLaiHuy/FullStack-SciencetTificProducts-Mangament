package com.nckh.backend.config;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;

import javax.sql.DataSource;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class SchemaCompatibilityRunner implements ApplicationRunner {

    private final DataSource dataSource;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) throws Exception {
        ensureProjectColumns();
    }

    private void ensureProjectColumns() throws SQLException {
        ensureColumn("projects", "final_report_url", "ADD COLUMN final_report_url VARCHAR(500)");
        ensureColumn("projects", "midterm_report_url", "ADD COLUMN midterm_report_url VARCHAR(500)");
        ensureColumn("projects", "midterm_report_content", "ADD COLUMN midterm_report_content TEXT");
    }

    private void ensureColumn(String tableName, String columnName, String alterClause) throws SQLException {
        if (columnExists(tableName, columnName)) {
            return;
        }

        String sql = "ALTER TABLE " + tableName + " " + alterClause;
        jdbcTemplate.execute(sql);
        log.warn("Applied schema compatibility patch: {}.{}", tableName, columnName);
    }

    private boolean columnExists(String tableName, String columnName) throws SQLException {
        try (Connection connection = dataSource.getConnection()) {
            DatabaseMetaData metaData = connection.getMetaData();
            if (exists(metaData, tableName, columnName)) {
                return true;
            }
            return exists(metaData, tableName.toUpperCase(), columnName.toUpperCase());
        }
    }

    private boolean exists(DatabaseMetaData metaData, String tableName, String columnName) throws SQLException {
        try (ResultSet rs = metaData.getColumns(null, null, tableName, columnName)) {
            return rs.next();
        }
    }
}
