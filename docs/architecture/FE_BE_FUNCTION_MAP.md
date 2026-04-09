# FRONTEND TO BACKEND FUNCTION MAP

This document maps UI/API client methods to backend routes and business effects.

## 1. Integration Architecture Notes

- Frontend API base: `src/front/src/services/api/axiosClient.ts`
  - Base URL: `VITE_API_URL` (fallback `http://localhost:3000/api`).
  - Request interceptor injects `Authorization: Bearer <token>`.
  - Response interceptor unwraps `{ success, data }` format.
- Backend route mount map: `src/back/src/app.ts`
  - Main prefixes: `/auth`, `/projects`, `/contracts`, `/councils`, `/settlements`, `/extensions`, `/extension-requests`, `/templates`, `/reports`, `/archive`, `/archives`, `/accounting`, `/admin`, `/revisions`, `/council`.

## 2. Auth Module

| FE Service Method | HTTP | Backend Route | Main Backend Effect |
|---|---|---|---|
| `authService.login(email, password)` | `POST /auth/login` | `auth.routes.ts -> AuthController.login` | Validate credentials, return access token + user |
| `authService.logout()` | `POST /auth/logout` | `auth.routes.ts -> AuthController.logout` | Invalidate logout session/token state |

## 3. Projects Module

| FE Service Method | HTTP | Backend Route | Main Backend Effect |
|---|---|---|---|
| `projectService.getAll()` | `GET /projects` | `project.routes.ts -> ProjectController.getAll` | List projects with filters and pagination |
| `projectService.getById(id)` | `GET /projects/:id` | `ProjectController.getById` | Return project detail |
| `projectService.getByStatus(status)` | `GET /projects?status=...` | `ProjectController.getAll` | Filter by status |
| `projectService.getMine()` | `GET /projects/my` | `ProjectController.getMine` | Project owner's own projects |
| `projectService.create(data)` | `POST /projects` | `ProjectController.create` | Create project, generate code, log business action |
| `projectService.updateStatus(id,status)` | `PUT /projects/:id/status` | `ProjectController.updateStatus` | Enforce allowed transition and final-report gating |
| `projectService.submitMidtermReport(...)` | `POST /projects/:id/midterm-report` | `ProjectController.submitMidtermReport` | Save midterm report for owner-owned project |
| `projectService.submitFinalSubmission(...)` | `POST /projects/:id/final-submission` | `ProjectController.submitFinalReport` | Save final report and auto move project to `cho_nghiem_thu` |
| `projectService.submitProduct(...)` | `POST /projects/:id/products` | `ProjectController.submitProduct` | Unified product upload; status update by type |

## 4. Contracts Module

| FE Service Method | HTTP | Backend Route | Main Backend Effect |
|---|---|---|---|
| `contractService.parseProposal(file)` | `POST /contracts/proposals/parse` | `contract.routes.ts -> ContractController.parseProposal` | Parse PDF/DOCX/TXT to detect project/owner/budget/confidence |
| `contractService.getAll()` | `GET /contracts` | `ContractController.getAll` | List contracts with project+owner info |
| `contractService.getById(id)` | `GET /contracts/:id` | `ContractController.getById` | Fetch contract detail |
| `contractService.create(...)` | `POST /contracts` | `ContractController.create` | Create contract if project exists and no active duplicate |
| `contractService.sign(id)` | `POST /contracts/:id/sign` | `ContractController.sign` | Project owner signs contract (`cho_duyet` -> `da_ky`) |
| `contractService.uploadPdf(id,file)` | `POST /contracts/:id/upload` | `ContractController.uploadPdf` | Save uploaded PDF web path for preview/download |
| `contractService.updateStatus(id,status)` | `PUT /contracts/:id/status` | `ContractController.updateStatus` | Update contract status |
| `contractService.delete(id)` | `DELETE /contracts/:id` | `ContractController.delete` | Soft delete, blocked for signed contract |

## 5. Councils and Revisions Module

| FE Service Method | HTTP | Backend Route | Main Backend Effect |
|---|---|---|---|
| `councilService.getAll()` | `GET /councils` | `council.routes.ts -> CouncilController.getAll` | List councils and members |
| `councilService.getById(id)` | `GET /councils/:id` | `CouncilController.getById` | Full council detail, reviews, minutes |
| `councilService.create(...)` | `POST /councils` | `CouncilController.create` | Create council for `cho_nghiem_thu` project, auto invite members |
| `councilService.checkConflict(...)` | `POST /councils/check-conflict` | `CouncilController.checkConflict` | COI check against owner/project member |
| `councilService.addMember(...)` | `POST /councils/:id/members` | `CouncilController.addMember` | Add member, optional auto-account creation |
| `councilService.removeMember(...)` | `DELETE /councils/:id/members/:memberId` | `CouncilController.removeMember` | Soft delete council membership |
| `councilService.uploadDecision(...)` | `POST /councils/:id/decision` | `CouncilController.uploadDecision` | Save decision PDF path |
| `councilService.resendInvitations(...)` | `POST /councils/:id/resend-invitations` | `CouncilController.resendInvitations` | Re-send invitation mails |
| `councilService.updateStatus(..., dang_danh_gia)` | `PUT /councils/:id/approve` | `CouncilController.approve` | Council status set to `dang_danh_gia` |
| `councilService.updateStatus(..., da_hoan_thanh)` | `PUT /councils/:id/complete` | `CouncilController.complete` | Council complete, project auto -> `da_nghiem_thu` |
| `councilService.submitReview(...)` | `POST /councils/:id/review` | `CouncilController.submitReview` | Upsert review by council member |
| `councilService.submitScore(...)` | `POST /council/:id/score-reviews` | Alias to `CouncilController.submitScore` | Upsert score review via alias route |
| `councilService.submitMinutes(...)` | `POST /councils/:id/minutes` | `CouncilController.recordMinutes` | Upsert minutes record |
| `councilService.getScoreSummary(...)` | `GET /council/:id/score-summary` | `CouncilController.getScoreSummary` | Return score list and average score |
| `councilService.approveRevision(revisionId)` | `PUT /revisions/:id/approve` | `revision.routes.ts` using `CouncilService.complete` | Final revision approval to completion flow |

## 6. Settlements and Accounting Module

| FE Service Method | HTTP | Backend Route | Main Backend Effect |
|---|---|---|---|
| `settlementService.getAll(params)` | `GET /settlements` | `settlement.routes.ts -> SettlementController.getAll` | List settlements |
| `settlementService.requestSupplement(id,reasons)` | `POST /settlements/:id/supplement-request` | `SettlementController.requestSupplement` | Status -> `cho_bo_sung`, append audit, email owner |
| `settlementService.updateStatus(id,status)` | `PUT /settlements/:id/status` | `SettlementController.updateStatus` | Update status; `da_xac_nhan` also updates project -> `da_thanh_ly` |
| `settlementService.approve(id)` | `PUT /settlements/:id/approve` | `SettlementController.approve` alias | Approve liquidation + project status update |
| `settlementService.exportFile(id,format)` | `GET /settlements/:id/export` | `SettlementController.export` | Return export metadata/url (current phase mock) |
| `accountingService.getDashboard()` | `GET /accounting/dashboard` | `accounting.routes.ts` | Accounting dashboard aggregates |
| `accountingService.getDocuments(params)` | `GET /accounting/documents` | `accounting.routes.ts` | Settlement documents list with items |
| `accountingService.verifyDocument(id,status,notes)` | `PUT /accounting/documents/:id/verify` | `accounting.routes.ts` | Verify status + add audit entry |
| `accountingService.confirmLiquidation(id)` | `POST /accounting/liquidation/:id/confirm` | `accounting.routes.ts` | Confirm liquidation status |

## 7. Extensions Module

| FE Service Method | HTTP | Backend Route | Main Backend Effect |
|---|---|---|---|
| `extensionService.getAll()` | `GET /extension-requests` | Alias to `extension.routes.ts -> ExtensionController.getAll` | List extension requests |
| `extensionService.create(payload)` | `POST /extension-requests` | `ExtensionController.create` | Owner submits extension request |
| `extensionService.approve(id, note)` | `PUT /extension-requests/:id/approve` | `ExtensionController.approve` alias | Approve/reject request; approved path extends project endDate |

## 8. Templates Module

| FE Service Method | HTTP | Backend Route | Main Backend Effect |
|---|---|---|---|
| `templateService.getAll(category)` | `GET /templates` | `template.routes.ts` | List active templates |
| `templateService.getFormTypes()` | `GET /templates/form-types` | `template.routes.ts` | List active template categories |
| `templateService.upload(payload)` | `POST /templates` | `template.routes.ts` | Upload template file and metadata, enforce default by scope |
| `templateService.delete(id)` | `DELETE /templates/:id` | `template.routes.ts` | Soft delete template |
| `templateService.fill(id, projectId)` | `GET /templates/:id/fill?projectId=...` | `template.routes.ts` | Generate/download prefilled DOCX draft |

## 9. Archive Module

| FE Service Method | HTTP | Backend Route | Main Backend Effect |
|---|---|---|---|
| `archiveService.getAll()` | `GET /archives` | Alias to `archive.routes.ts` | List completed projects with archive files |
| `archiveService.download(topicId)` | `GET /archives/:topicId/download` | `archive.routes.ts` | Download archive file, with PDF watermark behavior for internal role |

## 10. Reports Module

| FE Service Method | HTTP | Backend Route | Main Backend Effect |
|---|---|---|---|
| `reportService.getStats()` | `GET /reports/stats` | Alias to `report.routes.ts` | Global project/contract/budget stats |
| `reportService.getProjectsByField()` | `GET /reports/topics` | `report.routes.ts` | Group projects by field |
| `reportService.getProjectsByStatus()` | `GET /reports/progress` | `report.routes.ts` | Group projects by status |
| `reportService.exportReport(type,format)` | `GET /reports/export` | `report.routes.ts` | Return export metadata/url (current phase mock) |

## 11. Admin Module (Backend Available)

Backend admin routes are available under `/admin` for superadmin:

- `GET /admin/dashboard`
- `GET/POST/PUT/DELETE /admin/users...`
- `GET/POST/PUT/DELETE /admin/categories...`
- `GET/PUT /admin/config`
- `GET /admin/audit-logs`

Note: Current frontend superadmin pages are partially mock/static and do not fully consume this module yet.

## 12. Known Frontend Gaps and Risks

- Several pages still use mock/static data and should not be treated as full FE-BE integrated flows yet.
- ✅ Settlement export now generates real Excel files (Phase 1 complete).
- Word format export for settlements is still placeholder (Phase 2).
- Archive record auto-creation triggered when project reaches `da_thanh_ly` status.
- Contract fields `agencyName` and `representative` now exposed in UI.
