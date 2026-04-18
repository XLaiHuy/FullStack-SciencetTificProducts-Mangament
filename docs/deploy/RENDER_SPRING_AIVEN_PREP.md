# RENDER SPRING + AIVEN PREP

Muc tieu: chuan bi deploy truoc khi code fix xong, KHONG sua source app.

## 1) Files da duoc tao san

- `render.spring.yaml`
- `docs/deploy/backend-render-spring.env.example`
- `docs/deploy/frontend-render.env.example`

## 2) Cac buoc dung nhanh tren Render

1. Vao Render -> `New` -> `Blueprint`.
2. Chon repo nay, va chon file `render.spring.yaml`.
3. Render tao 2 service:
- `nckh-backend-spring`
- `nckh-frontend`
4. Dien env theo 2 file `.env.example` trong `docs/deploy`.

## 3) Aiven MySQL mapping cho Spring

Thong so tu Aiven:

- Host: `nckh-mysql-1-leminhquan2878-a096.d.aivencloud.com`
- Port: `21026`
- DB: `defaultdb`
- User: `avnadmin`
- SSL mode: `REQUIRED`

Map vao backend env:

- `DATABASE_URL=jdbc:mysql://nckh-mysql-1-leminhquan2878-a096.d.aivencloud.com:21026/defaultdb?sslMode=REQUIRED&serverTimezone=UTC`
- `DB_USERNAME=avnadmin`
- `DB_PASSWORD=<mat khau moi nhat>`

## 4) Verify sau khi deploy

1. Backend health:
- `https://<backend-domain>.onrender.com/api/health`
2. Frontend load:
- `https://<frontend-domain>.onrender.com`
3. Frontend goi API khong bi CORS:
- `CORS_ALLOWED_ORIGINS` phai la domain frontend that.

## 5) Luu y bao mat

- Khong commit password that vao repo.
- Vi password da lo trong anh chat, nen rotate password Aiven truoc khi production.
