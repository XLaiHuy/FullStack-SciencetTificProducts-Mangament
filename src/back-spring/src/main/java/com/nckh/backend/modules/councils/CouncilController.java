package com.nckh.backend.modules.councils;

import static com.nckh.backend.modules.councils.CouncilDtos.*;

import com.nckh.backend.common.ApiResponse;
import com.nckh.backend.modules.users.User;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/councils")
public class CouncilController {

    private final CouncilService councilService;

    public CouncilController(CouncilService councilService) {
        this.councilService = councilService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin','council_member','project_owner')")
    public ApiResponse<List<CouncilItem>> getAll(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(councilService.getAll(user));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('council_member','project_owner')")
    public ApiResponse<List<CouncilItem>> getMine(@AuthenticationPrincipal User user) {
        return ApiResponse.ok(councilService.getMine(user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('research_staff','superadmin','council_member','project_owner')")
    public ApiResponse<CouncilItem> getById(@PathVariable String id, @AuthenticationPrincipal User user) {
        return ApiResponse.ok(councilService.getById(id, user));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<CouncilItem> create(@Valid @RequestBody CreateCouncilRequest request) {
        return ApiResponse.ok(councilService.create(request), "Tao hoi dong thanh cong");
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<CouncilItem> approve(@PathVariable String id) {
        return ApiResponse.ok(councilService.approve(id), "Da chuyen hoi dong sang dang danh gia");
    }

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('research_staff','superadmin')")
    public ApiResponse<CouncilItem> complete(@PathVariable String id) {
        return ApiResponse.ok(councilService.complete(id), "Da hoan thanh hoi dong");
    }

    @PostMapping("/{id}/score")
    @PreAuthorize("hasAnyRole('council_member','research_staff','superadmin')")
    public ApiResponse<ScoreSummary> score(@PathVariable String id, @Valid @RequestBody ScoreRequest request) {
        return ApiResponse.ok(councilService.score(id, request), "Cham diem thanh cong");
    }

    @GetMapping("/{id}/score-summary")
    @PreAuthorize("hasAnyRole('council_member','research_staff','superadmin','project_owner')")
    public ApiResponse<ScoreSummary> scoreSummary(@PathVariable String id) {
        return ApiResponse.ok(councilService.scoreSummary(id));
    }
}
