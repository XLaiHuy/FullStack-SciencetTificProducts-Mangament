# MONITORING + ALERTS CHECKLIST

Muc tieu: phat hien su co som sau go-live.

## 1) Toi thieu can theo doi

- Backend uptime (`/api/health`).
- Ty le loi HTTP 5xx.
- Do tre request tang dot bien.
- Frontend load trang login/home.

## 2) Render logs

- Theo doi log build va runtime sau moi deploy.
- Kiem tra loi startup:
- ket noi DB
- JWT secret thieu
- CORS config sai

## 3) Canh bao de nghi

- Alert khi health check fail > 3 lan lien tiep.
- Alert khi 5xx vuot nguong.
- Alert khi service restart lap lai nhieu lan.

## 4) Nguoi truc va kenh bao dong

- Owner backend:
- Owner frontend:
- Kenh bao dong (Slack/Zalo/Email):
- SLA phan hoi:
