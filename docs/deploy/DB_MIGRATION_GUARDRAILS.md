# DB MIGRATION GUARDRAILS (AIVEN MYSQL)

Muc tieu: giam rui ro khi doi schema tren production.

## 1) Chinh sach `JPA_DDL_AUTO`

- Local: co the `update`.
- Staging: uu tien `validate`.
- Production: uu tien `validate`; chi dung `update` khi da thong nhat va da backup.

## 2) Quy trinh de nghi truoc release co schema change

1. Chot danh sach thay doi schema.
2. Backup snapshot tren Aiven.
3. Test migration tren staging data gan production.
4. Uoc luong thoi gian migration.
5. Co ke hoach rollback app + DB.

## 3) Quy tac an toan

- Tranh xoa cot/bang truc tiep trong gio cao diem.
- Tranh doi ten cot lon ma khong co ke hoach tuong thich nguoc.
- Uu tien migration theo nhieu buoc nho, de rollback.

## 4) Checklist sau migration

1. Backend health xanh.
2. Login va API chinh chay duoc.
3. Truy van table chinh khong loi.
4. Error log khong phat sinh bat thuong.
