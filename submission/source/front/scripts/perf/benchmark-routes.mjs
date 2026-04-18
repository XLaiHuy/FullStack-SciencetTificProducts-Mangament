import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const baseUrl = process.env.BENCH_BASE_URL || 'http://localhost:5173';
const outputPath = resolve(process.cwd(), 'test-results', 'perf-benchmark-routes.json');

const routes = [
  '/login',
  '/research-staff/dashboard',
  '/project-owner/dashboard',
  '/accounting/dashboard',
  '/archive/dashboard',
  '/reports/dashboard',
  '/superadmin/dashboard',
];

const toMs = (value) => (typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null);

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];

  for (const path of routes) {
    const url = `${baseUrl}${path}`;
    const startedAt = Date.now();
    let ok = true;
    let error = null;

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch (e) {
      ok = false;
      error = e?.message || String(e);
    }

    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const paints = performance.getEntriesByType('paint');
      const fcp = paints.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null;

      return {
        domContentLoadedMs: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
        loadEventMs: nav ? nav.loadEventEnd - nav.startTime : null,
        transferMs: nav ? nav.responseEnd - nav.requestStart : null,
        firstContentfulPaintMs: fcp,
      };
    });

    results.push({
      path,
      ok,
      error,
      totalDurationMs: Date.now() - startedAt,
      metrics: {
        domContentLoadedMs: toMs(metrics.domContentLoadedMs),
        loadEventMs: toMs(metrics.loadEventMs),
        transferMs: toMs(metrics.transferMs),
        firstContentfulPaintMs: toMs(metrics.firstContentfulPaintMs),
      },
    });
  }

  await browser.close();

  const report = {
    baseUrl,
    measuredAt: new Date().toISOString(),
    routes: results,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('Route benchmark saved to:', outputPath);
  console.log(JSON.stringify(report, null, 2));
};

run().catch((error) => {
  console.error('Route benchmark failed:', error?.message || error);
  process.exit(1);
});
