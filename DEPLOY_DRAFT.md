# DEPLOY NHAP (Render + Vercel)

Tai lieu nay dung de test online nhanh truoc khi release.

## 1. Backend len Render

- Tao Web Service moi, chon repo nay.
- Root Directory: `src/back`
- Build Command:

```bash
npm install
npx prisma generate
npm run build
```

- Start Command:

```bash
npm run start
```

- Environment Variables can set:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/nckh_db
JWT_SECRET=change_me
JWT_REFRESH_SECRET=change_me_too
FRONTEND_URL=https://<your-vercel-domain>
```

- Sau khi deploy lan dau, mo Shell tren Render va chay:

```bash
npx prisma migrate deploy
```

Neu can seed demo:

```bash
npm run db:seed
```

## 2. Frontend len Vercel

- Import cung repo len Vercel.
- Root Directory: `src/front`
- Build Command: `npm run build`
- Output Directory: `dist`

- Environment variable:

```env
VITE_API_URL=https://<your-render-service>.onrender.com/api
```

## 3. Smoke test sau deploy

- Login duoc voi account demo.
- Frontend goi duoc API backend (khong bi CORS).
- Upload file o Midterm report mo duoc file picker va submit thanh cong.
- Cac endpoint nhay cam tra ve loi 403 khi sai role.
- Dashboard co du lieu tu DB (khong con du lieu mock o cac module da noi API).

## 4. Goi y release

- Chay local truoc khi push:

```bash
# backend
cd src/back
npm run build
npx prisma validate

# frontend
cd ../front
npm run lint
npm run build
```

- Khi da on dinh moi tao release tag.
