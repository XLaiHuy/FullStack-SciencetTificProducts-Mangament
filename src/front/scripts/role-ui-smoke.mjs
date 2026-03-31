import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const PASSWORD = process.env.TEST_PASSWORD || '123456';

const ACCOUNTS = [
  { role: 'research_staff', email: 'staff@nckh.edu.vn' },
  { role: 'project_owner', email: 'owner@nckh.edu.vn' },
  { role: 'accounting', email: 'accounting@nckh.edu.vn' },
  { role: 'archive_staff', email: 'archive@nckh.edu.vn' },
  { role: 'report_viewer', email: 'reports@nckh.edu.vn' },
  { role: 'superadmin', email: 'admin@nckh.edu.vn' },
  { role: 'council_member_chairman', email: 'chairman@demo.com' },
  { role: 'council_member_reviewer', email: 'reviewer@demo.com' },
  { role: 'council_member_secretary', email: 'secretary@demo.com' },
  { role: 'council_member_member', email: 'member@demo.com' },
];

function normalize(text) {
  return (text || '')
    .replace(/[Đđ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldSkipButton(label) {
  const s = normalize(label);
  if (!s) return true;
  return [
    'dang xuat',
    'dang nhap',
    'logout',
    'hien',
    'an',
    'xem tat ca thong bao',
    'thuoc',
    'sau',
  ].some((token) => s === token || s.includes(token));
}

async function collectVisibleButtons(page) {
  return page.evaluate(() => {
    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        rect.width > 0 &&
        rect.height > 0
      );
    };

    let idx = 0;
    const rows = [];
    document.querySelectorAll('button').forEach((btn) => {
      if (btn.disabled || !isVisible(btn)) return;
      const text = (btn.textContent || btn.getAttribute('aria-label') || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!text) return;
      const id = `smoke-btn-${Date.now()}-${idx++}`;
      btn.setAttribute('data-smoke-id', id);
      rows.push({ id, label: text });
    });
    return rows;
  });
}

async function clickBySmokeId(page, smokeId, label) {
  const locator = page.locator(`[data-smoke-id="${smokeId}"]`).first();
  if ((await locator.count()) === 0) return false;

  try {
    await locator.click({ timeout: 3000 });
    await page.waitForTimeout(250);
    return true;
  } catch {
    // Fallback 1: DOM-level click for cases where Playwright actionability checks are too strict.
    const domClicked = await page.evaluate((id) => {
      const el = document.querySelector(`[data-smoke-id="${id}"]`);
      if (!el) return false;
      const htmlEl = el;
      if (typeof htmlEl.click === 'function') {
        htmlEl.click();
        return true;
      }
      return false;
    }, smokeId).catch(() => false);

    if (domClicked) {
      await page.waitForTimeout(250);
      return true;
    }

    // Fallback 2: force click by visible label.
    const byExactRole = page.getByRole('button', { name: label, exact: true }).first();
    if ((await byExactRole.count()) > 0) {
      try {
        await byExactRole.click({ timeout: 2500, force: true });
        await page.waitForTimeout(250);
        return true;
      } catch {
        // Continue to fuzzy fallback.
      }
    }

    const byFuzzyLabel = page.locator('button', { hasText: label }).first();
    if ((await byFuzzyLabel.count()) > 0) {
      try {
        await byFuzzyLabel.click({ timeout: 2500, force: true });
        await page.waitForTimeout(250);
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }
}

async function login(page, email, password) {
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.fill('#username', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  const currentPath = new URL(page.url()).pathname;
  if (currentPath === '/login') {
    const maybeError = await page.locator('form').innerText().catch(() => 'Login failed');
    throw new Error(`Login failed for ${email}. Path stayed at /login. ${maybeError.slice(0, 160)}`);
  }
}

async function getSidebarPaths(page) {
  const paths = await page.evaluate(() => {
    const hrefs = Array.from(document.querySelectorAll('aside a[href]'))
      .map((a) => {
        try {
          return new URL(a.href).pathname;
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return Array.from(new Set(hrefs));
  });

  const currentPath = new URL(page.url()).pathname;
  if (!paths.includes(currentPath)) paths.unshift(currentPath);
  return paths;
}

async function exercisePageButtons(page, roleResult, routePath) {
  const clickedLabels = new Set();
  const attemptCounts = new Map();
  const failures = [];
  let redirectedToLogin = false;

  for (let pass = 0; pass < 8; pass += 1) {
    let madeProgress = false;

    // Re-collect buttons after every click to avoid stale snapshots when modals/overlays appear.
    while (true) {
      const buttons = await collectVisibleButtons(page);
      const candidate = buttons.find((b) => {
        const key = normalize(b.label);
        const attempts = attemptCounts.get(key) ?? 0;
        return !shouldSkipButton(b.label) && !clickedLabels.has(key) && attempts < 2;
      });
      if (!candidate) break;

      const key = normalize(candidate.label);

      const clicked = await clickBySmokeId(page, candidate.id, candidate.label);
      if (clicked) {
        clickedLabels.add(key);
        roleResult.buttonsClicked += 1;
        madeProgress = true;
      } else {
        attemptCounts.set(key, (attemptCounts.get(key) ?? 0) + 1);
        failures.push({ route: routePath, label: candidate.label });
      }

      const nowPath = new URL(page.url()).pathname;
      if (nowPath === '/login') {
        failures.push({ route: routePath, label: candidate.label, reason: 'redirected_to_login' });
        redirectedToLogin = true;
        break;
      }
    }

    if (redirectedToLogin) break;
    if (!madeProgress) break;
  }

  roleResult.buttonFailures.push(...failures);
  return { redirectedToLogin };
}

async function testRole(browser, account) {
  const context = await browser.newContext();
  const page = await context.newPage();

  const jsErrors = [];
  page.on('pageerror', (err) => {
    jsErrors.push({ url: page.url(), message: err.message });
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      jsErrors.push({ url: page.url(), message: msg.text() });
    }
  });
  page.on('dialog', (dialog) => {
    dialog.accept().catch(() => undefined);
  });
  page.on('filechooser', (fileChooser) => {
    fileChooser
      .setFiles({
        name: 'smoke-test.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n% smoke test file'),
      })
      .catch(() => undefined);
  });

  const result = {
    role: account.role,
    email: account.email,
    loginOk: false,
    visitedRoutes: [],
    buttonsClicked: 0,
    buttonFailures: [],
    jsErrors,
    error: null,
  };

  try {
    await login(page, account.email, PASSWORD);
    result.loginOk = true;

    const routePaths = await getSidebarPaths(page);

    for (const routePath of routePaths) {
      await page.goto(`${FRONTEND_URL}${routePath}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
      result.visitedRoutes.push(routePath);
      const outcome = await exercisePageButtons(page, result, routePath);
      if (outcome.redirectedToLogin) {
        await login(page, account.email, PASSWORD);
      }
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  } finally {
    await context.close();
  }

  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const startedAt = new Date().toISOString();

  const roleResults = [];
  for (const account of ACCOUNTS) {
    // eslint-disable-next-line no-console
    console.log(`Running UI smoke for ${account.role} (${account.email})...`);
    const roleResult = await testRole(browser, account);
    roleResults.push(roleResult);
  }

  await browser.close();

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    frontendUrl: FRONTEND_URL,
    roles: roleResults,
    totals: {
      roles: roleResults.length,
      loginFailed: roleResults.filter((r) => !r.loginOk).length,
      totalRoutesVisited: roleResults.reduce((sum, r) => sum + r.visitedRoutes.length, 0),
      totalButtonsClicked: roleResults.reduce((sum, r) => sum + r.buttonsClicked, 0),
      totalButtonFailures: roleResults.reduce((sum, r) => sum + r.buttonFailures.length, 0),
      totalJsErrors: roleResults.reduce((sum, r) => sum + r.jsErrors.length, 0),
    },
  };

  const reportDir = path.join(process.cwd(), 'test-results');
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'role-ui-smoke-report.json');
  await fs.writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  // eslint-disable-next-line no-console
  console.log('\n=== UI Role Smoke Summary ===');
  for (const r of roleResults) {
    // eslint-disable-next-line no-console
    console.log(
      `${r.role.padEnd(24)} login=${r.loginOk ? 'OK' : 'FAIL'} routes=${String(r.visitedRoutes.length).padStart(2)} buttons=${String(r.buttonsClicked).padStart(3)} jsErrors=${String(r.jsErrors.length).padStart(3)} clickFails=${String(r.buttonFailures.length).padStart(3)}`
    );
    if (r.error) {
      // eslint-disable-next-line no-console
      console.log(`  error: ${r.error}`);
    }
  }

  // eslint-disable-next-line no-console
  console.log('\nReport written to:', reportPath);

  if (summary.totals.loginFailed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Role UI smoke failed:', err);
  process.exit(1);
});
