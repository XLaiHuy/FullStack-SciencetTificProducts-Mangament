# ENV FINAL CHECKLIST

## Backend (Render)

Bat buoc:

- `NODE_ENV=production`
- `PORT=10000`
- `DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/nckh_db`
- `JWT_SECRET=<strong-random-secret>`
- `JWT_EXPIRES_IN=7d`
- `JWT_REFRESH_SECRET=<strong-random-secret>`
- `JWT_REFRESH_EXPIRES_IN=30d`
- `FRONTEND_URL=https://<your-vercel-domain>`

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

Luu y production:

- Render free co file system tam thoi. Thu muc `uploads` khong ben vung qua redeploy/restart.
- Neu can luu file lau dai, chuyen sang S3/Cloudinary hoac object storage.

## Frontend (Vercel)

Bat buoc:

- `VITE_API_URL=https://<your-render-service>.onrender.com/api`

Kiem tra nhanh:

- API health: `https://<render-service>.onrender.com/api/health`
- Frontend login: `https://<vercel-domain>/login`

## Truoc khi push

- Backend: `npm run build` + `npx prisma validate`
- Frontend: `npm run lint` + `npm run build`
- Kiem tra `.gitignore` khong track `.env`, `node_modules`, `dist`, `uploads`
