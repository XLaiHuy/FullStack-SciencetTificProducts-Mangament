# ENV FINAL CHECKLIST

## 1) Render Blueprint scope

- `render.yaml` deploy 2 service trong 1 blueprint:
  - `nckh-backend` (web, node)
  - `nckh-frontend` (web, runtime static)

## 2) Backend env (`nckh-backend`)

Bat buoc:

- `NODE_ENV=production`
- `NODE_VERSION=22`
- `PORT=10000`
- `DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DB_NAME`
- `JWT_SECRET=<strong-random-secret>`
- `JWT_EXPIRES_IN=7d`
- `JWT_REFRESH_SECRET=<strong-random-secret>`
- `JWT_REFRESH_EXPIRES_IN=30d`
- `FRONTEND_URL=https://<frontend-domain>.onrender.com`

Email (tuy chon):

- Neu chua can gui email that:
  - `EMAIL_MOCK=true`
- Neu can gui email that:
  - `EMAIL_MOCK=false`
  - `SMTP_HOST=smtp.gmail.com`
  - `SMTP_PORT=587`
  - `SMTP_USER=<smtp_user>`
  - `SMTP_PASS=<smtp_pass>`
  - `EMAIL_FROM=<from_email>`

## 3) Frontend env (`nckh-frontend`)

Bat buoc:

- `VITE_API_URL=https://<backend-domain>.onrender.com/api`

## 4) MySQL cloud checklist

Chon 1 provider MySQL ben ngoai Render:

- Railway MySQL
- Aiven for MySQL
- PlanetScale

Can dam bao:

- Da tao user app rieng (khong dung root)
- Da bat TLS neu provider yeu cau
- Da cap nhat dung `DATABASE_URL`

## 5) Kiem tra nhanh sau deploy

- API health: `https://<backend-domain>.onrender.com/api/health`
- Frontend login: `https://<frontend-domain>.onrender.com/login`
- Prisma migrate da chay (preDeploy)
- CORS pass giua frontend/backend

## 6) Luu y production

- Render free co filesystem tam thoi.
- Thu muc `uploads` khong ben vung qua redeploy/restart.
- Neu can luu file lau dai, chuyen sang S3/Cloudinary/R2.

## 7) Truoc khi push

- Backend: `npm run build` + `npx prisma validate`
- Frontend: `npm run lint` + `npm run build`
- Kiem tra `.gitignore` khong track `.env`, `node_modules`, `dist`, `uploads`
