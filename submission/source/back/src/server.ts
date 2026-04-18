import 'dotenv/config';
import app from './app';
import prisma from './prisma';
import fs from 'fs';
import path from 'path';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

// ─── Ensure upload directories exist ─────────────────────────────────────────
const UPLOAD_DIRS = ['contracts', 'products', 'councils', 'templates', 'archive', 'extensions', 'settlements'];
UPLOAD_DIRS.forEach(dir => {
  const dirPath = path.join(process.cwd(), 'uploads', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`[Init] Created upload dir: uploads/${dir}`);
  }
});

// ─── Startup ──────────────────────────────────────────────────────────────────
async function main() {
  // Test DB connection
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully.');
  } catch (err) {
    console.error('❌ Database connection failed initially (will retry lazily):', err.message || err);
  }

  const server = app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║     🚀 NCKH Backend API is running!       ║
╠════════════════════════════════════════════╣
║  Port:   ${PORT}                               ║
║  Env:    ${(process.env.NODE_ENV ?? 'development').padEnd(12)}                   ║
║  Health: http://localhost:${PORT}/api/health  ║
╚════════════════════════════════════════════╝
    `);
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Database disconnected. Goodbye!');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
