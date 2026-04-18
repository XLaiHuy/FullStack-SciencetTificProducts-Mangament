# Parity Matrix API (Node vs Spring)

Cap nhat: 2026-04-17

## Scope

- Muc tieu: dong bo response/status/error/meta giua Node (`src/back`) va Spring (`src/back-spring`).
- Uu tien Wave 1: `councils`, `settlements`.

## Councils

| Endpoint | Node | Spring | Status |
|---|---|---|---|
| `GET /api/councils` | implemented | implemented | PASS |
| `GET /api/councils/{id}` | implemented | implemented | PASS |
| `POST /api/councils` | implemented | implemented | PASS |
| `POST /api/councils/parse-members` | implemented | implemented | PASS |
| `POST /api/councils/{id}/decision` | implemented | implemented | PASS |
| `GET /api/councils/{id}/decision-file` | binary file | binary file | PASS |
| `POST /api/councils/{id}/minutes` | implemented | implemented | PASS |
| `GET /api/councils/{id}/minutes-file` | binary file | binary file | PASS |
| `DELETE /api/councils/{id}/members/{memberId}` | implemented | implemented | PASS |
| `PUT /api/councils/{id}/approve` | implemented | implemented | PASS |
| `PUT /api/councils/{id}/complete` | implemented | implemented | PASS |
| `POST /api/councils/{id}/score` | implemented | implemented | PASS |
| `POST /api/councils/{id}/review` | implemented | implemented | PASS |
| `GET /api/councils/{id}/score-summary` | implemented | implemented | PASS |

## Settlements

| Endpoint | Node | Spring | Status |
|---|---|---|---|
| `GET /api/settlements` | implemented | implemented | PASS |
| `GET /api/settlements/{id}` | implemented | implemented | PASS |
| `POST /api/settlements` (json) | implemented | implemented | PASS |
| `POST /api/settlements` (multipart) | implemented | implemented | PASS |
| `POST /api/settlements/{id}/supplement-request` | implemented | implemented | PASS |
| `PUT /api/settlements/{id}/status` | implemented | implemented | PASS |
| `PUT /api/settlements/{id}/approve` | implemented | implemented | PASS |
| `GET /api/settlements/{id}/export` | binary export | binary export | PASS |

## Con lai (Wave 2/3)

- Contracts/templates/reports/archive file endpoints.
- Auth/RBAC negative-path parity.
- Error message parity chi tiet theo role va validation.
