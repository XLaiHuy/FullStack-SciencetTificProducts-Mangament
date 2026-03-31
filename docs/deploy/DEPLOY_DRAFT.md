# DEPLOY A-Z (1 Render Blueprint + MySQL Cloud)

Tai lieu nay la quy trinh day du de deploy ca backend + frontend bang 1 file `render.yaml`.

## 0) Kien truc muc tieu

- Backend: Render Web Service (`nckh-backend`)
- Frontend: Render Static Site (`nckh-frontend`)
- Database: MySQL cloud ben ngoai Render

Luu y: Render Blueprint ho tro Postgres native, khong tao MySQL managed trong cung blueprint.
Voi du an nay (Prisma dang `provider = "mysql"`), can dung MySQL cloud ngoai.

## 1) Chon nha cung cap MySQL cloud

Lua chon phu hop nhat cho du an nay:

1. Railway MySQL:
- Setup nhanh, UI de dung, phu hop startup/POC va ca production nho-vua.

2. Aiven for MySQL:
- Ban quan ly cao hon, SLA/compliance ro rang, phu hop production nghiem tuc.

3. PlanetScale (MySQL/Vitess):
- Manh ve scale, zero-downtime schema, phu hop khi tai tang cao.

Khuyen nghi nhanh:
- Muon nhanh nhat: Railway.
- Muon van hanh enterprise: Aiven/PlanetScale.

## 2) Tao MySQL cloud (A-Z)

1. Tao database instance MySQL tren nha cung cap da chon.
2. Tao user/app password rieng cho production.
3. Lay connection string day du dang:

```env
mysql://USER:PASSWORD@HOST:PORT/DB_NAME
```

4. Neu nha cung cap yeu cau TLS/SSL, bat SSL theo huong dan cua ho.
5. Luu connection string de dien vao `DATABASE_URL` tren Render.

## 3) Tao Blueprint tren Render

Repo da co san 1 file `render.yaml` deploy ca 2 service:

- `nckh-backend` (Node web service)
- `nckh-frontend` (Static site)

Thuc hien:

1. Vao Render Dashboard -> New -> Blueprint.
2. Chon repo GitHub: `XLaiHuy/FullStack-SciencetTificProducts-Mangament`.
3. Render doc file `render.yaml` va tao 2 service.
4. Dien cac bien `sync: false` khi Render hoi.

## 4) Bien moi truong can nhap

### 4.1 Backend (`nckh-backend`)

Bat buoc:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DB_NAME
JWT_SECRET=<strong-random>
JWT_REFRESH_SECRET=<strong-random>
FRONTEND_URL=https://<frontend-domain>.onrender.com
```

Mac dinh da co trong blueprint:

```env
NODE_ENV=production
NODE_VERSION=22
PORT=10000
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
EMAIL_MOCK=true
```

Tuy chon SMTP that:

```env
EMAIL_MOCK=false
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=...
```

### 4.2 Frontend (`nckh-frontend`)

Bat buoc:

```env
VITE_API_URL=https://<backend-domain>.onrender.com/api
```

## 5) Migrate va seed

Blueprint da cau hinh:

- `preDeployCommand: npx prisma migrate deploy`

Nen khi deploy backend, migrations se chay truoc khi app start.

Neu can seed demo sau khi deploy:

1. Mo Shell cua backend tren Render.
2. Chay:

```bash
cd src/back
npm run db:seed
```

## 6) Verify sau deploy

1. Health backend:

```text
https://<backend-domain>.onrender.com/api/health
```

2. Frontend load duoc login page.
3. Dang nhap thanh cong voi account seed.
4. CORS pass (khong bi browser block).
5. Chay smoke API (tu local):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke\smoke_test_api.ps1
```

6. Chay UI smoke (tu local):

```powershell
cd src\front
node .\scripts\role-ui-smoke.mjs
```

## 7) Canh bao production

- Render disk local la ephemeral tren free plan.
- Folder `uploads` khong nen dung cho luu tru lau dai.
- Khuyen nghi chuyen upload sang S3/Cloudinary/R2.

## 8) Minh co the "tu deploy" cho ban khong?

Minh khong the dang nhap va thao tac truc tiep tren tai khoan Render/Railway/Aiven cua ban tu day.

Nhung minh co the lam toi da trong repo:

1. Chuan hoa `render.yaml` cho 1-click blueprint.
2. Tao script/checklist smoke sau deploy.
3. Tao bo env template production/staging.
4. Review log deploy neu ban paste output loi.
