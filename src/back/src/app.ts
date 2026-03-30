import express from 'express';
import cors from 'cors';
import path from 'path';
import 'dotenv/config';

import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

// ─── Routes ───────────────────────────────────────────────────────────────────
import authRoutes       from './modules/auth/auth.routes';
import projectRoutes    from './modules/projects/project.routes';
import contractRoutes   from './modules/contracts/contract.routes';
import councilRoutes    from './modules/councils/council.routes';
import settlementRoutes from './modules/settlements/settlement.routes';
import extensionRoutes  from './modules/extensions/extension.routes';
import templateRoutes   from './modules/templates/template.routes';
import reportRoutes     from './modules/reports/report.routes';
import archiveRoutes    from './modules/archive/archive.routes';
import accountingRoutes from './modules/accounting/accounting.routes';
import adminRoutes      from './modules/admin/admin.routes';
import revisionRoutes   from './modules/revisions/revision.routes';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL ?? 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static: serve uploaded files ─────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Request Logger (must come after auth middleware, so placed on api routes) ─
app.use('/api', requestLogger);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name:    'NCKH Backend API',
    version: '1.0.0',
    status:  'running',
    docs:    '/api/health',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const BASE = '/api';

app.use(`${BASE}/auth`,        authRoutes);
app.use(`${BASE}/projects`,    projectRoutes);
app.use(`${BASE}/contracts`,   contractRoutes);
app.use(`${BASE}/councils`,    councilRoutes);
app.use(`${BASE}/settlements`, settlementRoutes);
app.use(`${BASE}/extensions`,  extensionRoutes);
app.use(`${BASE}/extension-requests`, extensionRoutes);
app.use(`${BASE}/templates`,   templateRoutes);
app.use(`${BASE}/reports`,     reportRoutes);
app.use(`${BASE}/archive`,     archiveRoutes);
app.use(`${BASE}/archives`,    archiveRoutes);
app.use(`${BASE}/accounting`,  accountingRoutes);
app.use(`${BASE}/admin`,       adminRoutes);
app.use(`${BASE}/revisions`,   revisionRoutes);
app.use(`${BASE}/council`,     councilRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route không tồn tại.' });
});

// ─── Global Error Handler (MUST be last) ──────────────────────────────────────
app.use(errorHandler);

export default app;
