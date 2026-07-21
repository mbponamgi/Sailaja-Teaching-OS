// smoke.mjs — minimum-bar boot check for the Sailaja Teaching OS.
// Run after ANY change, before anything else: `node smoke.mjs`.
// Uses a THROWAWAY Playwright context (never the persistent PROFILE_DIR that
// seed-store.mjs/dump-store.mjs use) — a smoke run must never touch or create
// real localStorage state.

import {
  loadPlaywright, startServer, makeChecker, collectErrors,
  APP_URL, DB_KEY, DARK_KEY,
} from './lib.mjs';

const { chromium } = await loadPlaywright();
const server = await startServer();
const { check, summary } = makeChecker();

try {
  const browser = await chromium.launch();
  // Throwaway context (default, in-memory) + pinned timezone so any future
  // date-handling checks in this repo are machine-independent.
  const context = await browser.newContext({ timezoneId: 'Asia/Kolkata' });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = collectErrors(page);
  const failedRequests = [];
  page.on('requestfailed', r => failedRequests.push(`${r.url()} — ${r.failure()?.errorText}`));

  await page.goto(APP_URL, { waitUntil: 'load' });
  // mountTweaks() self-retries every 50ms waiting for tweaks-panel.js globals;
  // give the page a beat to settle before reading its result.
  await page.waitForTimeout(300);

  check('sidebar brand renders', await page.locator('.sidebar-brand, .sidebar .brand, .sidebar').first().isVisible(), true);
  check('dashboard is the default active page', await page.locator('#page-dashboard.active').isVisible(), true);
  check('static student rows present (design fixture, §2 of data-model skill)',
    await page.locator('#students-table tbody tr').count(), n => n >= 14 || (n.label ?? true));

  // Founding-defect predictions (sailaja-os-change-control non-negotiable #1
  // worked example; sailaja-os-data-model-and-migrations §0). This smoke test
  // doubles as the campaign's baseline probe — these three should all still
  // read as BROKEN until the daily-use-campaign resurrection fix ships.
  check('DB layer dead: typeof addNewStudent', await page.evaluate(() => typeof window.addNewStudent), 'undefined');
  check('DB layer dead: teach_os_students never written', await page.evaluate(k => localStorage.getItem(k), DB_KEY), null);
  check('tweaks panel never mounts (JSX block also dead)', await page.evaluate(() => document.getElementById('tweaks-root').children.length), 0);
  check('tweaks-panel.js globals DO load (plain <script src>, negative control)',
    await page.evaluate(() => typeof window.useTweaks), 'function');

  // Live feature: dark mode toggle + its one live localStorage key.
  const darkBefore = await page.evaluate(k => localStorage.getItem(k), DARK_KEY);
  await page.evaluate(() => { if (typeof toggleDark === 'function') toggleDark(); });
  const darkAfter = await page.evaluate(k => localStorage.getItem(k), DARK_KEY);
  check('toggleDark() flips sailaja-dark', darkAfter !== darkBefore, true);

  check('no console errors at load', consoleErrors, e => e.length === 0);
  check('no uncaught page errors at load', pageErrors, e => e.length === 0);
  check('no failed requests', failedRequests, e => e.length === 0);
  if (consoleErrors.length) console.log('console errors:', consoleErrors);
  if (pageErrors.length) console.log('page errors:', pageErrors);
  if (failedRequests.length) console.log('failed requests:', failedRequests);

  await browser.close();
} finally {
  server.stop();
}

process.exit(summary(APP_URL));
