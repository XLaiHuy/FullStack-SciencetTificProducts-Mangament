# SPRING RENDER DEPLOY RUNBOOK

Muc tieu: deploy backend Spring Boot + frontend Vite len Render, dung Aiven MySQL.

## 1) Chuan bi truoc deploy

- Da co file `render.spring.yaml` o root repo.
- Da tao env theo:
- `docs/deploy/backend-render-spring.env.example`
- `docs/deploy/frontend-render.env.example`
- Da rotate password Aiven neu password tung bi lo.

## 2) Deploy bang Render Blueprint

1. Render Dashboard -> `New` -> `Blueprint`.
2. Chon repo nay.
3. O buoc chon blueprint file, chon `render.spring.yaml`.
4. Render tao 2 service:
- `nckh-backend-spring`
- `nckh-frontend`
5. Nhap env cho backend va frontend (tu 2 file env example).
6. Bam deploy.

## 3) Thu tu cau hinh env khuyen nghi

1. Cau hinh backend env day du.
2. Deploy backend lan 1.
3. Lay backend domain that, gan vao `VITE_API_URL`.
4. Deploy frontend.
5. Lay frontend domain that, gan vao `CORS_ALLOWED_ORIGINS`.
6. Redeploy backend lan 2 de chot CORS.

## 4) Verify sau deploy

1. Health backend:
- `https://<backend-domain>.onrender.com/api/health`
2. Frontend load:
- `https://<frontend-domain>.onrender.com`
3. Chay smoke nhanh:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke\smoke_test_render_spring.ps1 -BackendBaseUrl "https://<backend-domain>.onrender.com" -FrontendUrl "https://<frontend-domain>.onrender.com"
```

## 5) Neu deploy fail

1. Xem log build/start cua backend tren Render.
2. Kiem tra dung `DATABASE_URL` dang JDBC.
3. Kiem tra `DB_USERNAME`, `DB_PASSWORD`.
4. Kiem tra `CORS_ALLOWED_ORIGINS` co dung domain frontend.
5. Thuc hien rollback theo `docs/deploy/ROLLBACK_PLAYBOOK.md`.
