# PROJECT WORKFLOW (END TO END)

This workflow describes the real operational path from project creation to closure/archive, including role ownership and status transitions.

## 1. Roles and Responsibility Matrix

| Role | Main Responsibility |
|---|---|
| `research_staff` | Setup project, manage contracts, create councils, supervise settlement and extension decisions |
| `project_owner` | Execute project, submit products/reports, sign contract, request extension, submit settlement |
| `council_member` | Review/score/minutes and complete acceptance flow |
| `accounting` | Verify settlement dossiers and confirm liquidation |
| `archive_staff` | Archive accepted project records and manage repository |
| `report_viewer` | View aggregate reporting and export summaries |
| `superadmin` | User/system governance and administrative controls |

## 2. Lifecycle Overview

High-level sequence:

1. Project planning and registration.
2. Contract drafting and signing.
3. Research execution and periodic submissions.
4. Acceptance council creation and evaluation.
5. Settlement and liquidation.
6. Archiving and reporting.

## 3. Detailed Operational Flow

## Stage A. Project Registration

Owner role in process: `research_staff`

Main operations:
- Create project (`POST /api/projects`).
- Initial status starts in execution path (`dang_thuc_hien`).
- Update project details/status with transition rules (`PUT /api/projects/:id`, `PUT /api/projects/:id/status`).

Key status rules:
- `dang_thuc_hien` -> `tre_han` | `cho_nghiem_thu` | `huy_bo`
- `tre_han` -> `dang_thuc_hien` | `huy_bo`
- `cho_nghiem_thu` -> `da_nghiem_thu` | `dang_thuc_hien`
- `da_nghiem_thu` and `huy_bo` are terminal in project service transition map.

Control points:
- Moving to acceptance-related states requires final report present.

## Stage B. Contract Processing

Owner roles in process: `research_staff` and `project_owner`

Main operations:
- Parse proposal (`POST /api/contracts/proposals/parse`) from PDF/DOCX/TXT.
- Create contract (`POST /api/contracts`) for selected project.
- Upload scanned/signed PDF (`POST /api/contracts/:id/upload`).
- Project owner signs (`POST /api/contracts/:id/sign`).
- Contract lifecycle updates (`PUT /api/contracts/:id/status`).

Key controls:
- One active contract per project (duplicate active contract blocked).
- Only project owner of the project can sign.
- Signed contract cannot be deleted.

## Stage C. Research Execution

Owner role in process: `project_owner`

Main operations:
- Midterm upload (`POST /api/projects/:id/midterm-report` or unified `/products` type `midterm_report`).
- Final submission (`POST /api/projects/:id/final-submission` or unified `/products` type `final_report`).

Automatic effects:
- Midterm keeps project in execution.
- Final submission auto moves project to `cho_nghiem_thu`.

## Stage D. Extension Request (Optional Branch)

Owner roles in process: `project_owner` and `research_staff`/`superadmin`

Main operations:
- Owner creates request (`POST /api/extension-requests`).
- Staff/admin approves or rejects (`PUT /api/extension-requests/:id/approve`).

Automatic effects when approved:
- Project `endDate` extends by requested days.
- Project status returns/keeps `dang_thuc_hien`.

## Stage E. Council and Acceptance

Owner roles in process: `research_staff`, `council_member`

Main operations:
- Create council for project in `cho_nghiem_thu` (`POST /api/councils`).
- Optional member conflict check (`POST /api/councils/check-conflict`).
- Add/remove members, upload decision, resend invitations.
- Approve council (`PUT /api/councils/:id/approve`) -> `dang_danh_gia`.
- Members submit review/score (`/review`, `/score`, `/score-reviews`).
- Secretary submits minutes (`POST /api/councils/:id/minutes`).
- Completion (`PUT /api/councils/:id/complete`) or revision alias (`PUT /api/revisions/:id/approve`).

Automatic effects:
- Council completion sets council `da_hoan_thanh`.
- Related project moves to `da_nghiem_thu`.

## Stage F. Settlement and Liquidation

Owner roles in process: `project_owner`, `research_staff`, `accounting`

Main operations:
- Owner submits settlement (`POST /api/settlements`).
- Research staff requests supplement if needed (`POST /api/settlements/:id/supplement-request`).
- Accounting verifies and updates status (`PUT /api/settlements/:id/status` or `/approve`).
- Accounting liquidation confirm (`POST /api/accounting/liquidation/:id/confirm`).

Automatic effects:
- Settlement approval / confirmed status moves project to `da_thanh_ly`.

## Stage G. Archive and Reporting

Owner roles in process: `archive_staff`, `report_viewer`, `superadmin`

Main operations:
- Archive completed projects (`POST /api/archive/repository/:projectId`).
- Browse/download archive (`GET /api/archives`, `GET /api/archives/:topicId/download`).
- Reporting dashboards and statistics (`/api/reports/stats`, `/topics`, `/progress`, `/contracts`, `/export`).

Output:
- Final historical records and institution-level analytics.

## 4. Workflow State Map (Compact)

Project state progression (typical successful path):

1. `dang_thuc_hien`
2. `cho_nghiem_thu`
3. `da_nghiem_thu`
4. `da_thanh_ly`
5. archived record exists in archive module

Council state progression:

1. `cho_danh_gia`
2. `dang_danh_gia`
3. `da_hoan_thanh`

Contract state progression (typical):

1. `cho_duyet`
2. `da_ky`
3. `hoan_thanh` (optional business completion mark)

Settlement state progression (typical):

1. `cho_bo_sung` or `hop_le`
2. `da_xac_nhan`

## 5. Operational Checklist for Go-Live

- All role logins work with valid JWT and route guard.
- Project owner can submit final artifacts and trigger acceptance stage.
- Research staff can create council and upload decision documents.
- Council member actions (review/score/minutes/complete) are persisted.
- Settlement approval moves project to liquidation state.
- Archive list includes completed topics and files download correctly.
- Reports module provides consistent counts with core modules.

## 6. Current Limitations to Track

- Some report/superadmin pages still display mock/static data in frontend.
- Export endpoints for reports/settlements currently return metadata placeholder URLs.
- One frontend method points to non-mounted endpoint (`/project-owner/projects`) and should be aligned.
