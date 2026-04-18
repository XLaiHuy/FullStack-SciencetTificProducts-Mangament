# Render deploy quickstart for new GitHub repo

This guide deploys Spring backend + React frontend from this repository.

## 1) Blueprint file to use

Use [render.spring.yaml](../../render.spring.yaml).

It defines:
- `nckh-backend-spring` from `src/back-spring`
- `nckh-frontend` from `submission/source/front`

## 2) Push repo first

Render can deploy only after code exists in GitHub.

## 3) Create services on Render

Option A (recommended):
- Render Dashboard -> New -> Blueprint
- Select this repository
- Select branch to deploy
- Confirm services from `render.spring.yaml`

Option B (manual):
- Create a Web Service for backend
- Create a Static Site for frontend
- Reuse values from [render.spring.yaml](../../render.spring.yaml)

## 4) Required backend environment variables

Copy from [backend-render-spring.env.example](backend-render-spring.env.example):
- `DATABASE_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGINS` (set to frontend Render URL)

Optional defaults are already in blueprint:
- `JAVA_VERSION=17`
- `PORT=10000`
- `JPA_DDL_AUTO=update`
- `JWT_ACCESS_EXPIRATION_MS=900000`
- `JWT_REFRESH_EXPIRATION_MS=604800000`

## 5) Frontend environment variable

Set `VITE_API_URL` using [frontend-render.env.example](frontend-render.env.example):

- Format: `https://<backend-service>.onrender.com/api`

## 6) Health checks

- Backend health endpoint: `/api/health`
- Frontend route rewrite is enabled to support SPA routing.

## 7) After first deploy

- Open frontend URL
- Login and verify key flows
- If CORS error appears, recheck `CORS_ALLOWED_ORIGINS`
