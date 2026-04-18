# GO LIVE CHECKLIST (SPRING + RENDER + AIVEN)

## 1) Domain va HTTPS

- Backend URL final da chot.
- Frontend URL final da chot.
- Ca 2 URL deu HTTPS.

## 2) ENV production

- Backend env da nhap du.
- Frontend env `VITE_API_URL` dung backend `/api`.
- `CORS_ALLOWED_ORIGINS` dung frontend domain that.
- JWT secret du manh.

## 3) DB Aiven

- Password moi nhat da rotate neu can.
- Backup snapshot moi nhat ton tai.
- Ket noi SSL mode `REQUIRED`.

## 4) Smoke test truoc mo cong khai

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke\smoke_test_render_spring.ps1 -BackendBaseUrl "https://<backend-domain>.onrender.com" -FrontendUrl "https://<frontend-domain>.onrender.com"
```

## 5) Quan sat 24h dau

- Theo doi health, 5xx, log loi.
- Ghi nhan bug va patch nho neu can.
- Chot release note ngan cho team.
