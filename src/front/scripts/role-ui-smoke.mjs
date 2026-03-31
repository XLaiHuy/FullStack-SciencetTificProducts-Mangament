import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
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
  const skipTokens = [
    'dang xuat',
    'dang nhap',
    'logout',
    'hien',
    'an',
    'xem tat ca thong bao',
    'thuoc',
    'sau',
    'nhan dien noi dung de xuat',
    'hoan tat tai len',
    'tai len & luu tru',
    'gui yeu cau',
    'phe duyet & ban hanh',
  ];

  return skipTokens.some((token) => {
    if (token.length <= 3) {
      return s === token;
    }
    return s === token || s.includes(token);
  });
}

function isUploadApiResponse(url, method) {
  if (!['POST', 'PUT', 'PATCH'].includes(method)) return false;
  return /(\/upload\b|\/products\b|midterm-report\b|final-submission\b|\/minutes\b|\/decision\b|proposals\/parse\b|\/templates\b|extension-requests\b)/i.test(url);
}

function isDownloadApiResponse(url, method, headers) {
  if (method !== 'GET') return false;
  if (/(\/pdf\b|\/download\b|\/minutes-file\b|\/decision-file\b|\/fill\b)/i.test(url)) return true;
  const disposition = headers['content-disposition'];
  return Boolean(disposition && disposition.toLowerCase().includes('attachment'));
}

function isUploadAssertionTarget(routePath, label) {
  const s = normalize(label);
  return (
    (routePath.includes('/project-owner/midterm-report') && s.includes('nop bao cao giua ky')) ||
    (routePath.includes('/project-owner/research-submission') && s.includes('nop ket qua nghien cuu'))
  );
}

function isDownloadAssertionTarget(routePath, label) {
  const s = normalize(label);
  return (
    (routePath.includes('/project-owner/contract-view') && s.includes('tai xuong pdf')) ||
    (routePath.includes('/project-owner/acceptance-minutes') && s.includes('tai xuong pdf'))
  );
}

const DEFAULT_PDF_BUFFER = Buffer.from('%PDF-1.4\n% smoke test file');

async function attachRouteUploadFixtures(page, routePath) {
  const trySetInputFile = async (selector, file) => {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) return false;
    try {
      await locator.setInputFiles(file);
      const hasFile = await locator.evaluate((el) => {
        if (!(el instanceof HTMLInputElement)) return false;
        return Boolean(el.files && el.files.length > 0);
      });
      return hasFile;
    } catch {
      return false;
    }
  };

  if (routePath.includes('/project-owner/midterm-report')) {
    await trySetInputFile('input[type="file"][accept*=".pdf"]', {
      name: 'midterm-report.pdf',
      mimeType: 'application/pdf',
      buffer: DEFAULT_PDF_BUFFER,
    });
  }

  if (routePath.includes('/research-staff/contract-management')) {
    await trySetInputFile('input[type="file"][accept*=".txt"]', {
      name: 'proposal.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Ma de tai DT-2024-001\nChu nhiem: owner@nckh.edu.vn\nKinh phi: 500000000'),
    });
    await trySetInputFile('input[type="file"][accept*="application/pdf"]', {
      name: 'signed-contract.pdf',
      mimeType: 'application/pdf',
      buffer: DEFAULT_PDF_BUFFER,
    });

    // Auto-select a valid contract in "Liên kết Hợp đồng" to make upload action runnable.
    await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label'));
      const linkedLabel = labels.find((label) => (label.textContent || '').includes('Liên kết Hợp đồng'));
      if (!linkedLabel) return;

      const wrapper = linkedLabel.parentElement;
      const select = wrapper?.querySelector('select');
      if (!select || select.value) return;

      const firstValid = Array.from(select.options).find((option) => option.value);
      if (!firstValid) return;

      select.value = firstValid.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }).catch(() => undefined);
  }

  if (routePath.includes('/research-staff/template-management')) {
    await page
      .locator('input[placeholder="Nhập tên biểu mẫu..."]')
      .first()
      .fill(`Smoke Template ${Date.now()}`)
      .catch(() => undefined);

    await page
      .locator('input[placeholder="2024.1.0"]')
      .first()
      .fill('2026.03.smoke')
      .catch(() => undefined);

    const today = new Date().toISOString().slice(0, 10);
    await page
      .locator('input[type="date"]')
      .first()
      .fill(today)
      .catch(() => undefined);

    await trySetInputFile('input[type="file"][accept*=".docx"]', {
      name: 'smoke-template.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: Buffer.from('PK\u0003\u0004 smoke docx placeholder'),
    });

    await page.waitForTimeout(120);
  }

  if (routePath.includes('/research-staff/council-creation')) {
    const editButton = page.getByRole('button', { name: 'Sửa', exact: true }).first();
    if ((await editButton.count()) > 0) {
      await editButton.click({ timeout: 2500 }).catch(() => undefined);
      await page.waitForTimeout(150);
    } else {
      const setupButton = page.getByRole('button', { name: 'Thiết lập Hội đồng', exact: true }).first();
      if ((await setupButton.count()) > 0) {
        await setupButton.click({ timeout: 2500 }).catch(() => undefined);
        await page.waitForTimeout(150);
      }
    }

    const chooseFileButton = page.getByRole('button', { name: 'Chọn tệp tin', exact: true }).first();
    if ((await chooseFileButton.count()) > 0) {
      await chooseFileButton.click({ timeout: 2500 }).catch(() => undefined);
      await page.waitForTimeout(120);
    } else {
      await trySetInputFile('input[type="file"][accept*="application/pdf"]', {
        name: 'council-decision.pdf',
        mimeType: 'application/pdf',
        buffer: DEFAULT_PDF_BUFFER,
      });
    }
  }

  if (routePath.includes('/research-staff/extension-management')) {
    const projectSelect = page.locator('select').first();
    if ((await projectSelect.count()) > 0) {
      const firstOption = projectSelect.locator('option').first();
      if ((await firstOption.count()) > 0) {
        const firstValue = await firstOption.getAttribute('value');
        if (firstValue) {
          await projectSelect.selectOption(firstValue).catch(() => undefined);
        }
      }
    }

    const targetDate = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await page.locator('input[type="date"]').first().fill(targetDate).catch(() => undefined);
    await page.locator('input[placeholder="Lý do gia hạn"]').first().fill(`Smoke extension reason ${Date.now()}`).catch(() => undefined);

    await trySetInputFile('input[type="file"]', {
      name: 'extension-proof.pdf',
      mimeType: 'application/pdf',
      buffer: DEFAULT_PDF_BUFFER,
    });

    await page.waitForTimeout(120);
  }

  if (routePath.includes('/council-member/secretary')) {
    await trySetInputFile('input[type="file"][accept*="application/pdf"]', {
      name: 'minutes.pdf',
      mimeType: 'application/pdf',
      buffer: DEFAULT_PDF_BUFFER,
    });
  }
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

async function runRouteSpecificIoChecks(page, account, routePath, roleResult, ioTracker) {
  if (account.role !== 'research_staff') return;
  if (!routePath.includes('/research-staff/contract-management')) return;

  const beforeUploadResponses = ioTracker.uploadResponses.length;

  await page.evaluate(async (apiBase) => {
    const token = window.localStorage.getItem('nckh_token');
    const form = new FormData();
    form.append('file', new File(
      ['Ma de tai DT-2024-001\nChu nhiem: owner@nckh.edu.vn\nKinh phi: 500000000'],
      'proposal.txt',
      { type: 'text/plain' }
    ));

    await fetch(`${apiBase}/contracts/proposals/parse`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
  }, API_BASE_URL).catch(() => undefined);

  await page.waitForTimeout(1200);

  roleResult.uploadChecks += 1;
  const uploadEvents = ioTracker.uploadResponses
    .slice(beforeUploadResponses)
    .filter((e) => /proposals\/parse\b/i.test(e.url));
  const uploadOk = uploadEvents.some((e) => e.status >= 200 && e.status < 300);

  if (!uploadOk) {
    roleResult.ioFailures.push({
      route: routePath,
      label: 'API /contracts/proposals/parse',
      type: 'upload',
      reason: uploadEvents.length
        ? `last_status_${uploadEvents[uploadEvents.length - 1].status}`
        : 'no_upload_response',
    });
  }
}

async function exercisePageButtons(page, roleResult, routePath, ioTracker) {
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

      if (isUploadAssertionTarget(routePath, candidate.label)) {
        await attachRouteUploadFixtures(page, routePath);
      }

      const beforeUploadResponses = ioTracker.uploadResponses.length;
      const beforeDownloadResponses = ioTracker.downloadResponses.length;
      const beforeBrowserDownloads = ioTracker.browserDownloads.length;

      const clicked = await clickBySmokeId(page, candidate.id, candidate.label);
      if (clicked) {
        clickedLabels.add(key);
        roleResult.buttonsClicked += 1;
        madeProgress = true;

        const expectUpload = isUploadAssertionTarget(routePath, candidate.label);
        const expectDownload = isDownloadAssertionTarget(routePath, candidate.label);

        if (expectUpload || expectDownload) {
          await page.waitForTimeout(1200);
        }

        if (expectUpload) {
          roleResult.uploadChecks += 1;
          const uploadEvents = ioTracker.uploadResponses.slice(beforeUploadResponses);
          const uploadOk = uploadEvents.some((e) => e.status >= 200 && e.status < 300);

          if (!uploadOk) {
            roleResult.ioFailures.push({
              route: routePath,
              label: candidate.label,
              type: 'upload',
              reason: uploadEvents.length
                ? `last_status_${uploadEvents[uploadEvents.length - 1].status}`
                : 'no_upload_response',
            });
          }
        }

        if (expectDownload) {
          roleResult.downloadChecks += 1;
          const downloadResponses = ioTracker.downloadResponses.slice(beforeDownloadResponses);
          const browserDownloads = ioTracker.browserDownloads.slice(beforeBrowserDownloads);
          const downloadOk =
            downloadResponses.some((e) => e.status >= 200 && e.status < 300) ||
            browserDownloads.length > 0;

          if (!downloadOk) {
            roleResult.ioFailures.push({
              route: routePath,
              label: candidate.label,
              type: 'download',
              reason: downloadResponses.length
                ? `last_status_${downloadResponses[downloadResponses.length - 1].status}`
                : 'no_download_event',
            });
          }
        }
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

  const ioTracker = {
    uploadResponses: [],
    downloadResponses: [],
    browserDownloads: [],
  };

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
  page.on('download', (download) => {
    ioTracker.browserDownloads.push({
      url: page.url(),
      suggestedFileName: download.suggestedFilename(),
      timestamp: Date.now(),
    });
  });
  page.on('response', (response) => {
    const url = response.url();
    if (!url.includes('/api/')) return;

    const method = response.request().method();
    const status = response.status();
    const headers = response.headers();

    if (isUploadApiResponse(url, method)) {
      ioTracker.uploadResponses.push({ url, method, status, timestamp: Date.now() });
    }
    if (isDownloadApiResponse(url, method, headers)) {
      ioTracker.downloadResponses.push({ url, method, status, timestamp: Date.now() });
    }
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
    uploadChecks: 0,
    downloadChecks: 0,
    ioFailures: [],
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
      await attachRouteUploadFixtures(page, routePath);
      await runRouteSpecificIoChecks(page, account, routePath, result, ioTracker);
      result.visitedRoutes.push(routePath);
      const outcome = await exercisePageButtons(page, result, routePath, ioTracker);
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
      totalUploadChecks: roleResults.reduce((sum, r) => sum + r.uploadChecks, 0),
      totalDownloadChecks: roleResults.reduce((sum, r) => sum + r.downloadChecks, 0),
      totalIoFailures: roleResults.reduce((sum, r) => sum + r.ioFailures.length, 0),
      totalUploadFailures: roleResults.reduce(
        (sum, r) => sum + r.ioFailures.filter((f) => f.type === 'upload').length,
        0
      ),
      totalDownloadFailures: roleResults.reduce(
        (sum, r) => sum + r.ioFailures.filter((f) => f.type === 'download').length,
        0
      ),
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
      `${r.role.padEnd(24)} login=${r.loginOk ? 'OK' : 'FAIL'} routes=${String(r.visitedRoutes.length).padStart(2)} buttons=${String(r.buttonsClicked).padStart(3)} jsErrors=${String(r.jsErrors.length).padStart(3)} clickFails=${String(r.buttonFailures.length).padStart(3)} ioFails=${String(r.ioFailures.length).padStart(3)}`
    );
    if (r.error) {
      // eslint-disable-next-line no-console
      console.log(`  error: ${r.error}`);
    }
    if (r.ioFailures.length > 0) {
      for (const failure of r.ioFailures.slice(0, 5)) {
        // eslint-disable-next-line no-console
        console.log(`  io-failure: [${failure.type}] route=${failure.route} label="${failure.label}" reason=${failure.reason}`);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log('\nReport written to:', reportPath);

  if (summary.totals.loginFailed > 0 || summary.totals.totalIoFailures > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Role UI smoke failed:', err);
  process.exit(1);
});
