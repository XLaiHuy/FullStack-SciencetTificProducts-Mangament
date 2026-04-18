# RBAC + Auth Matrix

Cap nhat: 2026-04-17

## Roles

- research_staff
- project_owner
- council_member
- accounting
- archive_staff
- report_viewer
- superadmin

## Auth lifecycle checklist

| Flow | Node | Spring | Status |
|---|---|---|---|
| login | implemented | implemented | Pending full parity |
| refresh | implemented | implemented | Pending edge cases |
| logout | implemented | implemented | Pending edge cases |
| forgot-password | implemented | implemented | Pending mail side effects |
| reset-password | implemented | implemented | Pending token policy parity |
| change-password | implemented | implemented | Pending negative-path matrix |

## RBAC test matrix (tracking)

| Module | Positive path | Forbidden path | Status |
|---|---|---|---|
| councils | in progress | in progress | Wave 2 |
| settlements | in progress | in progress | Wave 2 |
| contracts | pending | pending | Wave 2 |
| projects | pending | pending | Wave 2 |
| archive | pending | pending | Wave 2 |
| templates | pending | pending | Wave 2 |
| reports | pending | pending | Wave 2 |
| admin | pending | pending | Wave 2 |
| accounting | pending | pending | Wave 2 |

## Gate

- 401/403 response shape va message phai tuong thich Node.
