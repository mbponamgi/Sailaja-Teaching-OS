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
  check('initDatabase scraped exactly 15 students into the dynamic render',
    await page.locator('#students-table tbody tr').count(), 15);

  // Persistence-layer checks (sailaja-os-daily-use-campaign Phase 2 landed
  // 2026-07-21 — sailaja-os-failure-archaeology Incident 1 is now SETTLED).
  // These are the same three predictions the founding-defect incident used,
  // now inverted: if any of these three regress back to the old values,
  // the dead-block bug (or something exactly like it) has come back.
  check('addNewStudent is a real function', await page.evaluate(() => typeof window.addNewStudent), 'function');
  check('teach_os_students is written on first load', await page.evaluate(k => localStorage.getItem(k) !== null, DB_KEY), true);
  check('tweaks-panel.js globals load (plain <script src>, vanilla JS since 2026-07-21 — no React)',
    await page.evaluate(() => typeof window.createTweaksPanel), 'function');
  // The panel renders nothing until externally activated via postMessage
  // (an edit-mode overlay, by design — not a bug) — activate it to prove
  // the vanilla control tree actually builds and mounts.
  await page.evaluate(() => window.postMessage({ type: '__activate_edit_mode' }, '*'));
  await page.waitForTimeout(300);
  check('tweaks panel renders once activated', await page.evaluate(() => document.getElementById('tweaks-root').children.length), n => n > 0);

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
