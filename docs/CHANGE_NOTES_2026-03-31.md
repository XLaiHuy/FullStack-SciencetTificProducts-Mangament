# Change Notes - 2026-03-31

## Implemented Changes

### Proposal Recognition (Word/PDF)
- Fixed frontend upload behavior to avoid false "no file selected" errors.
- Removed global `Content-Type: application/json` from axios client so `FormData` requests use correct multipart boundary.
- Improved proposal parser robustness for Vietnamese labels:
  - `Ten de tai`
  - `Ma de tai`
  - `Chu nhiem de tai`
  - `Email`
  - `Kinh phi du kien`
- Added better `projectCode` detection fallback and validation.
- Added `DeXuat_ChiTiet_Test.docx` test sample for parse API.

### Council Creation (Mixed Suggestions)
- Stabilized proposal file state handling in `CouncilCreationPage`.
- Added explicit guard when file name is shown but input/file state is invalid.
- Implemented mixed suggestions behavior:
  - Principal Investigator shown as COI warning and not selectable.
  - Role placeholders shown for `phan_bien_1`, `phan_bien_2`, `thu_ky`, `uy_vien`.

### Auth + First Login Security
- Added backend endpoints:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- Added `mustChangePassword` field for users.
- Council temp accounts are created with `mustChangePassword = true`.
- Login response now includes `mustChangePassword`.
- `change-password` and `reset-password` clear `mustChangePassword`.
- Frontend login flow updated with:
  - dedicated login page
  - dedicated forgot-password page
  - dedicated reset-password page
  - forced first-login password change flow in login
- Business rule update: council members are blocked from self-service forgot-password and must contact admin.

### Contract Advance Rule
- On contract creation, system auto-updates project `advancedAmount = 40%` based on `contract.budget`.

### Council Creation UI Simplification
- Introduced a 3-step wizard flow in council creation:
  1. Select project
  2. Upload + parse proposal
  3. Finalize council members and issue decision
- Added step indicator and conditional rendering by step to reduce user confusion.
- Added "skip parse to step 3" action when users need manual setup.
- Added sticky action bar (`Luu nhap` / `Ban hanh`) for faster completion.

## Self-Test Summary
- Backend build: pass
- Frontend build: pass
- Multi-role UI smoke: login/routes/buttons mostly pass; no critical crash.
- Parse API with docx sample: pass (project code, owner, email, budget extracted correctly).
- Forgot/reset flows tested (invalid token rejected correctly).

## Review Notes / Follow-up Recommendations

### Business Rule Alignment
- Council-member forgot-password policy is now aligned: council members must contact admin.

### Logic Refinement
- Remove unused legacy parsing helper to reduce maintenance noise.

### UI Simplification Proposal
- Further refinement suggestion: split `CouncilCreationPage` into smaller components per step for easier maintenance.
