# ROLE FUNCTION TEST GUIDE

This guide is for manual QA/UAT by role. It focuses on real API-backed functions and expected behavior from UI to database.

## 1. Test Preconditions

- Backend is running and database is migrated/seeded.
- Frontend is running and points to backend via `VITE_API_URL`.
- Upload folders are writable: `uploads/contracts`, `uploads/councils`, `uploads/templates`, `uploads/extensions`, `uploads/archive`, `uploads/products`.
- Test accounts exist for all roles:
  - `research_staff`
  - `project_owner`
  - `council_member` (chairman/reviewer/secretary/member)
  - `accounting`
  - `archive_staff`
  - `report_viewer`
  - `superadmin`

## 2. Smoke Commands (Quick Gate)

Run from repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke\smoke_test_api.ps1
```

Run UI role smoke from frontend folder:

```powershell
cd src\front
node .\scripts\role-ui-smoke.mjs
```

## 3. Role-based Manual Test Checklist

## 3.1 Research Staff (`/research-staff/*`)

| Function | Main Steps | Expected Result |
|---|---|---|
| Dashboard statistics | Open Dashboard page | Counts load from API (`projects`, `reports/stats`) and not from static values |
| Create project | Create a project with valid owner/date/budget | New project code generated, project visible in list, status starts at execution flow |
| Update project status | Move project through allowed transitions | Valid transitions pass, invalid transition is blocked with error |
| Contract proposal parse | Upload PDF/DOCX/TXT proposal in Contract page | Parsed info appears: suggested project/budget/owner/email/confidence |
| Create contract | Create contract for eligible project | Contract is created once; duplicate active contract for same project is blocked |
| Upload contract PDF | Upload signed/scan PDF | Contract detail shows `pdfUrl`; inline preview works |
| Update contract status | Change status from management actions | Status updates persist and appear after refresh |
| Create council | Select project `cho_nghiem_thu`, add members, submit | Council created with decision code; invitation emails triggered |
| COI check | Add member with same owner/member as project | Conflict is flagged by API and visible in UI flow |
| Add/remove council member | Add a member then remove one | Membership list updates; removed member is soft-deleted |
| Upload council decision | Upload decision file | Decision file path stored and retrievable |
| Resend invitations | Trigger resend on a council | API returns send count and no server error |
| Approve council | Move council to `dang_danh_gia` | Council status changes correctly |
| Settlement tracking | Open settlement list and search/filter | Data comes from API, status chips match backend values |
| Request supplement | Send supplement reasons for a settlement | Settlement status goes to `cho_bo_sung`, audit log/email path is triggered |
| Template upload | Upload DOCX template with metadata | Template saved, marked default by target role + form type |
| Template fill draft | Fill template with `projectId` | DOCX draft downloads and contains project data |
| Extension approval | Approve/reject extension request | Board status updates; if approved, project end date extends |

Negative tests:
- Try creating council for project not in `cho_nghiem_thu` -> must fail.
- Try creating second active contract for same project -> must fail.
- Upload unsupported or empty proposal file -> parse fails with clear message.

## 3.2 Project Owner (`/project-owner/*`)

| Function | Main Steps | Expected Result |
|---|---|---|
| View own contracts | Open Contract View page and list contracts | Only owner-relevant contracts are shown |
| Sign contract | Sign a `cho_duyet` contract | Status changes to `da_ky`, signed date is set |
| Submit midterm product | Upload file via Midterm page | Product/report is saved; project remains `dang_thuc_hien` |
| Submit final product | Upload file via Research Submission page | Final report saved; project auto changes to `cho_nghiem_thu` |
| Create extension request | Submit requested deadline + reason + optional file | Extension request created with `dang_cho` |
| Submit settlement dossier | Fill settlement form and submit | Settlement code generated and visible in list |
| Download archive (if allowed) | Download archived PDF after completion | File downloads; internal role watermark behavior applies for PDF |

Negative tests:
- Sign contract that is not `cho_duyet` -> blocked.
- Submit product for project not owned by current user -> blocked.
- Create extension for project not in allowed statuses -> blocked.

## 3.3 Council Member (`/council-member/*`)

| Function | Main Steps | Expected Result |
|---|---|---|
| View assigned councils | Open dashboard/relevant page | Council list shows councils where user is a member |
| Submit review | Reviewer submits score/comments | Review upsert works; repeat submit updates same record |
| Submit score | Chairman/member submits score/comments | Score upsert works for current member |
| Submit minutes | Secretary uploads minutes content/file | Minutes record upserted for council |
| View score summary | Secretary loads score summary | Average score and member breakdown load correctly |
| Approve final revision | Trigger revision approval | Council complete flow executes and project moves to `da_nghiem_thu` |

Negative tests:
- Member not in council tries review/score -> blocked.
- Access council outside assigned scope -> blocked by role/ownership checks.

## 3.4 Accounting (`/accounting/*`)

| Function | Main Steps | Expected Result |
|---|---|---|
| Dashboard accounting stats | Open accounting dashboard | Totals from `/accounting/dashboard` load correctly |
| List accounting documents | Open document list/management pages | Settlement docs show with project and items |
| Verify accounting document | Verify with statuses (`hop_le`, `cho_bo_sung`, `da_xac_nhan`, `hoa_don_vat`) | Status updates with audit trail |
| Approve settlement | Trigger settlement approve/liquidation confirm | Settlement becomes `da_xac_nhan`; project becomes `da_thanh_ly` |
| Export settlement | Use export action | Export metadata/url returned (mock export in current phase) |

Negative tests:
- Use invalid verify status -> API rejects with validation error.
- Non-accounting role attempts accounting actions -> 403 forbidden.

## 3.5 Archive Staff (`/archive/*`)

| Function | Main Steps | Expected Result |
|---|---|---|
| Archive dashboard | Open archive dashboard | Counts show total/archived/pending |
| Repository list/search | Open repository and search | Pagination/search works, records map to completed projects |
| Archive upload | Upload files for a completed project | Archive record upsert works and file list is saved |
| Download archive package | Download first archive file | File download succeeds for authorized roles |

Negative tests:
- Try archive upload for project not `da_nghiem_thu` -> blocked.

## 3.6 Report Viewer (`/reports/*`)

| Function | Main Steps | Expected Result |
|---|---|---|
| Dashboard stats | Open reports dashboard | Stats load from `/reports/stats` |
| Topic statistics | Open topic statistics | Group by field endpoint data is shown |
| Progress statistics | Open progress statistics | Group by project status endpoint data is shown |
| Contract statistics | Open contract statistics | Group by contract status/budget endpoint data is shown |
| Export report | Submit export type/format | Export response returns downloadable metadata/url |

Negative tests:
- Export with invalid type/format params should be handled with user-facing error.

## 3.7 Superadmin (`/superadmin/*`)

| Function | Main Steps | Expected Result |
|---|---|---|
| Admin dashboard | Open superadmin dashboard | User/project/audit counters are loaded |
| User management CRUD | Create/update/lock/reset/delete users | State changes persist and appear in list |
| Category management | Create/update/deactivate category | Category list reflects changes |
| System config update | Update key/value pairs | Config upsert success and values persist |
| Audit log query | Filter by module/user/page | Logs return in descending timestamp order |

Negative tests:
- Superadmin cannot delete own account.
- Duplicate email user creation is rejected.

## 4. Current Integration Gaps (Known)

The following pages still have mock/static behavior and should be excluded from strict API pass criteria until integration is completed:

- `src/front/src/pages/auth/LoginPage.tsx` (demo credential helper UI)
- `src/front/src/pages/research_staff/SettlementDetailPage.tsx`
- `src/front/src/pages/council_member/DashboardPage.tsx`
- `src/front/src/pages/reports/ContractStatisticsPage.tsx`
- `src/front/src/pages/reports/ProgressStatisticsPage.tsx`
- `src/front/src/pages/reports/TopicStatisticsPage.tsx`
- `src/front/src/pages/superadmin/AccountManagementPage.tsx`
- `src/front/src/pages/superadmin/AuditLogPage.tsx`
- `src/front/src/pages/superadmin/DashboardPage.tsx`

## 5. Exit Criteria

Release candidate for role-function testing is accepted when:

- API smoke test passes with 0 failures.
- Every role can log in and open all menu pages without runtime crash.
- All API-backed checklist rows above pass in at least 1 full run.
- All blockers in transition rules (project/contract/council/settlement) are validated with both positive and negative test cases.
