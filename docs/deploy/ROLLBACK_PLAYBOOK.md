# ROLLBACK PLAYBOOK

Muc tieu: rollback nhanh khi release moi bi loi.

## 1) Dieu kien kich hoat rollback

- Backend health `/api/health` fail lien tuc.
- Loi login/phan quyen dien rong.
- Frontend khong goi duoc API do CORS/env sai.
- Loi nghiem trong sau migration.

## 2) Cach rollback tren Render

1. Mo service bi loi (`nckh-backend-spring` hoac `nckh-frontend`).
2. Vao tab `Events` hoac `Deploys`.
3. Chon ban deploy on dinh gan nhat.
4. Bam `Rollback` (hoac trigger redeploy tu commit cu on dinh).
5. Cho service len lai.

## 3) Kiem tra sau rollback

1. `GET /api/health` phai xanh.
2. Login thanh cong.
3. Cac API critical chay duoc.
4. Frontend load + route chinh OK.
5. CORS pass voi domain frontend.

## 4) Incident note mau

- Thoi diem su co:
- Trieu chung:
- Pham vi anh huong:
- Ban deploy gay loi:
- Ban rollback:
- Nguyen nhan goc:
- Action phong ngua:

## 5) Luu y DB

- Rollback app khong tu dong rollback schema DB.
- Neu release co thay doi schema rui ro, can co script down migration rieng.
