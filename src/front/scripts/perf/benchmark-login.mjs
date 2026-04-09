import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const targetUrl = process.env.BENCH_URL || 'http://localhost:5173/login';
const outputPath = resolve(process.cwd(), 'test-results', 'perf-benchmark-login.json');

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const startedAt = Date.now();
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null;
    const fp = paints.find((entry) => entry.name === 'first-paint')?.startTime ?? null;

    return {
      timing: {
        domContentLoadedMs: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
        loadEventMs: nav ? nav.loadEventEnd - nav.startTime : null,
        responseMs: nav ? nav.responseEnd - nav.requestStart : null,
      },
      paint: {
        firstPaintMs: fp,
        firstContentfulPaintMs: fcp,
      },
      memory: 'memory' in performance
        ? {
            jsHeapSizeLimit: performance.memory?.jsHeapSizeLimit ?? null,
            totalJSHeapSize: performance.memory?.totalJSHeapSize ?? null,
            usedJSHeapSize: performance.memory?.usedJSHeapSize ?? null,
          }
        : null,
    };
  });

  const report = {
    targetUrl,
    measuredAt: new Date().toISOString(),
    totalDurationMs: Date.now() - startedAt,
    ...metrics,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');

  await browser.close();

  console.log('Benchmark saved to:', outputPath);
  console.log(JSON.stringify(report, null, 2));
};

run().catch((error) => {
  console.error('Benchmark failed:', error?.message || error);
  process.exit(1);
});
