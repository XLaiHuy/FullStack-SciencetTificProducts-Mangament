# NCKH Spring Backend - Migration Progress

## Current status

Spring Boot backend has been created at `src/back-spring` with runnable core modules:

- Auth: login, refresh, logout, me
- Security: JWT bearer auth + RBAC roles
- Projects: list, my projects, detail, create, update status, dashboard stats
- Contracts: list, my contracts, detail, create, update status
- Settlements: list, detail, create, update status
- Councils: list, detail, create, update status, review submit
- Reports: dashboard and topic/progress/contracts summary endpoints
- Notifications: list mine, mark as read, create
- Archive: list and create records
- Extensions: list/create/update status
- Templates: list and download-url endpoint
- Admin: user list and system config read/update
- Global exception handling + unified API response

## Tech stack

- Java 17
- Spring Boot 3.3.4
- Spring Security + Method Security
- Spring Data JPA (MySQL)
- Maven Wrapper (`mvnw.cmd`)
- JJWT (token signing/validation)

## Implemented endpoints

Base path: `/api`

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

- `GET /projects`
- `GET /projects/my`
- `GET /projects/{id}`
- `POST /projects`
- `PUT /projects/{id}/status`
- `GET /projects/dashboard`

- `GET /contracts`
- `GET /contracts/my`
- `GET /contracts/{id}`
- `POST /contracts`
- `PUT /contracts/{id}/status`

- `GET /settlements`
- `GET /settlements/{id}`
- `POST /settlements`
- `PUT /settlements/{id}/status`

- `GET /councils`
- `GET /councils/{id}`
- `POST /councils`
- `PUT /councils/{id}/status`
- `POST /councils/{id}/review`

- `GET /reports/dashboard`
- `GET /reports/topics`
- `GET /reports/progress`
- `GET /reports/contracts`
- `GET /reports/filter-options`
- `GET /reports/export`

- `GET /notifications/me`
- `PUT /notifications/{id}/read`
- `POST /notifications`

- `GET /archive`
- `POST /archive`

- `GET /extensions`
- `POST /extensions`
- `PUT /extensions/{id}/status`

- `GET /templates`
- `GET /templates/{id}/download`

- `GET /admin/users`
- `GET /admin/configs`
- `PUT /admin/configs/{key}`

- `GET /health`

## Roles wired in RBAC

- research_staff
- project_owner
- council_member
- accounting
- archive_staff
- report_viewer
- superadmin

## Build and test

From `src/back-spring`:

```powershell
.\mvnw.cmd test
.\mvnw.cmd -DskipTests package
```

## Environment variables

- `DATABASE_URL` (jdbc url)
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `JWT_ACCESS_EXPIRATION_MS`
- `JWT_REFRESH_EXPIRATION_MS`
- `CORS_ALLOWED_ORIGINS`

## Remaining modules to port for full parity

- File upload/download and physical storage flow parity with old backend
- Email delivery/logging side effects and cron-like operational flows
- Admin advanced operations (user lifecycle, locking, role reassignment)
- Template/upload management (not only listing)
- Advanced report exports with exact legacy formats
- Full integration/regression tests against frontend critical journeys

## Notes

- Existing Node backend is still available at `src/back`.
- Spring backend is isolated at `src/back-spring` for incremental migration.
