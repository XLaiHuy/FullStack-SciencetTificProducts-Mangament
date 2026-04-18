# ENV MATRIX SPRING RENDER

Muc tieu: thong nhat bien moi truong theo tung moi truong.

## 1) Backend (Spring)

| Key | Local | Staging/Prod | Bat buoc |
|---|---|---|---|
| `PORT` | `8080` | `10000` (Render) | Co |
| `DATABASE_URL` | `jdbc:mysql://localhost:3306/nckh?...` | `jdbc:mysql://<aiven-host>:<port>/<db>?sslMode=REQUIRED&serverTimezone=UTC` | Co |
| `DB_USERNAME` | local user | `avnadmin` (hoac app user rieng) | Co |
| `DB_PASSWORD` | local password | Aiven password moi nhat | Co |
| `JPA_DDL_AUTO` | `update` | `validate` hoac `update` theo chinh sach team | Co |
| `JWT_SECRET` | test secret | random >= 32 chars | Co |
| `JWT_ACCESS_EXPIRATION_MS` | `900000` | `900000` | Co |
| `JWT_REFRESH_EXPIRATION_MS` | `604800000` | `604800000` | Co |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | `https://<frontend-domain>.onrender.com` | Co |

## 2) Frontend (Vite)

| Key | Local | Staging/Prod | Bat buoc |
|---|---|---|---|
| `VITE_API_URL` | `http://localhost:8080/api` hoac `http://localhost:3000/api` | `https://<backend-domain>.onrender.com/api` | Co |

## 3) Ownership de nghi

| Nhom bien | Owner de nghi |
|---|---|
| DB credentials | Backend lead + DevOps |
| JWT secrets | Backend lead |
| Frontend API URL | Frontend lead |
| CORS_ALLOWED_ORIGINS | Backend lead |

## 4) Quy tac bao mat

- Khong commit secret that vao repo.
- Chi luu `*.env.example` voi placeholder.
- Rotate ngay neu secret lo trong chat, screenshot, log.
