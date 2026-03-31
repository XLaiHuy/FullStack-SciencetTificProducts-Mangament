# BUSINESS HARDENING REPORT (2026-03-31)

This report summarizes business-level improvements implemented after reviewing role scoping, data visibility, and transition controls.

## 1) Why these changes were needed

Main risk patterns found:

- Read APIs were too open for any authenticated account in some modules.
- Project owner views were not consistently scoped to owner-owned records.
- Settlement status updates allowed free-form status moves.
- Extension rejection action in frontend did not persist to backend.
- Archive download/list for project owners needed strict ownership checks.

## 2) Implemented backend hardening

## 2.1 Project module

Files:
- `src/back/src/modules/projects/project.routes.ts`
- `src/back/src/modules/projects/project.controller.ts`
- `src/back/src/modules/projects/project.service.ts`

Changes:
- Added explicit read-role constraints for list/detail endpoints.
- Added owner-specific endpoint: `GET /api/projects/my`.
- Added service-level data scoping:
  - if role is `project_owner`, list/detail only returns owner-owned projects.

Business impact:
- Prevents cross-project visibility for project owners.
- Keeps read access for institutional roles that need global views.

## 2.2 Contract module

Files:
- `src/back/src/modules/contracts/contract.routes.ts`
- `src/back/src/modules/contracts/contract.controller.ts`
- `src/back/src/modules/contracts/contract.service.ts`

Changes:
- Added role constraints for contract list/detail endpoints.
- Added service-level owner scoping:
  - project owner sees only contracts tied to own projects.

Business impact:
- Stops unauthorized contract enumeration by unrelated users.

## 2.3 Settlement module

Files:
- `src/back/src/modules/settlements/settlement.routes.ts`
- `src/back/src/modules/settlements/settlement.controller.ts`
- `src/back/src/modules/settlements/settlement.service.ts`

Changes:
- Added role constraints for list/detail/export endpoints.
- Added service-level owner scoping for project owners.
- Added settlement state validation and transition rules in `updateStatus`.

Current allowed statuses:
- `cho_bo_sung`
- `hop_le`
- `hoa_don_vat`
- `da_xac_nhan`

Transition policy:
- `cho_bo_sung` -> `hop_le` | `hoa_don_vat` | `da_xac_nhan`
- `hop_le` -> `cho_bo_sung` | `hoa_don_vat` | `da_xac_nhan`
- `hoa_don_vat` -> `cho_bo_sung` | `da_xac_nhan`
- `da_xac_nhan` -> final (no transition)

Business impact:
- Prevents invalid/unsafe settlement state jumps.
- Ensures project owner can only access own settlement records.

## 2.4 Extension module

Files:
- `src/back/src/modules/extensions/extension.routes.ts`
- `src/back/src/modules/extensions/extension.controller.ts`
- `src/back/src/modules/extensions/extension.service.ts`

Changes:
- Added role constraints for extension list/detail endpoints.
- Added service-level owner scoping for project owners.

Business impact:
- Prevents project owners seeing other projects' extension requests.

## 2.5 Council module

Files:
- `src/back/src/modules/councils/council.routes.ts`
- `src/back/src/modules/councils/council.controller.ts`
- `src/back/src/modules/councils/council.service.ts`

Changes:
- Added role constraints for council list/detail endpoints.
- Added member scoping for role `council_member`:
  - only councils where current user is assigned can be listed/viewed.

Business impact:
- Protects council membership/review visibility boundaries.

## 2.6 Archive module

File:
- `src/back/src/modules/archive/archive.routes.ts`

Changes:
- List endpoint `/api/archives` now owner-scoped for `project_owner`.
- Download endpoint `/api/archives/:topicId/download` now checks ownership for `project_owner` before download.

Business impact:
- Prevents owner-to-owner archive data leakage.

## 3) Implemented frontend alignment

## 3.1 Project service endpoint alignment

File:
- `src/front/src/services/api/projectService.ts`

Changes:
- Updated owner-project endpoint usage to `GET /projects/my`.

Business impact:
- Eliminates legacy non-mounted path mismatch.

## 3.2 Extension reject persistence

Files:
- `src/front/src/services/api/extensionService.ts`
- `src/front/src/pages/research_staff/ExtensionManagementPage.tsx`

Changes:
- Added explicit reject API method calling `/extension-requests/:id/decision` with `decision = tu_choi`.
- Updated reject UI action to persist decision to backend (instead of local-only refresh).

Business impact:
- Reject action now changes real workflow state in DB and audit flow.

## 4) Validation evidence

Checks executed after changes:

1. Backend build:
- `npm run build` in backend -> passed.

2. API smoke:
- `scripts/smoke/smoke_test_api.ps1` -> `PASS=11 FAIL=0 SKIP=0`.

3. Frontend build:
- `npm run build` in frontend -> passed.

4. UI role smoke:
- `node src/front/scripts/role-ui-smoke.mjs` -> `totalButtonFailures = 0`, `totalJsErrors = 0`, `loginFailed = 0`.

Latest UI report file:
- `src/front/test-results/role-ui-smoke-report.json`

## 5) Residual improvement candidates (optional next pass)

- Add stricter transition policy for contract status updates similar to settlement state machine.
- Add optional field-level masking on list endpoints for non-core roles.
- Add audit entries for read-denied events (security analytics).
