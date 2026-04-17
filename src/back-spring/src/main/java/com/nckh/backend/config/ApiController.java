package com.nckh.backend.config;

import com.nckh.backend.common.ApiResponse;
import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ApiController {

    @GetMapping("/")
    public ApiResponse<Map<String, Object>> root() {
        return ApiResponse.ok(Map.of(
            "name", "NCKH Spring Backend",
            "status", "running",
            "timestamp", Instant.now().toString()
        ));
    }

    @GetMapping("/health")
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.ok(Map.of("status", "ok"));
    }
}
