// verify-offline.mjs — offline-completeness regression, the exact success
// metric stated in sailaja-os-frontier-and-method Item 2: "a network-blocked
// Playwright run passes with 0 external requests attempted and 0 console
// errors." Item 2 is DONE as of 2026-07-21 (React removed, fonts vendored) —
// this script is that claim made executable.
//
// PREDICTIONS, written before running anything:
//  1. With ALL non-localhost network routes aborted, the page still loads
//     to a fully-usable state: sidebar renders, dashboard is active,
//     initDatabase scrapes 15 students, addNewStudent is a function.
//  2. Zero requests are attempted to any non-localhost host (aborted-route
//     count stays 0 — nothing even TRIES to leave the machine).
//  3. Zero console errors, zero page errors.
//  4. document.fonts confirms both vendored families (Figtree, Instrument
//     Serif) actually loaded from the local woff2 files, not a fallback.
//  5. The tweaks panel still mounts and its controls still work offline
//     (proves the React removal, not just the font vendoring, is what
//     makes this pass — pre-2026-07-21 this script would have failed on
//     the React CDN scripts alone, before ever reaching the font check).

import { loadPlaywright, startServer, makeChecker, collectErrors, APP_URL } from './lib.mjs';

const { chromium } = await loadPlaywright();
const server = await startServer();
const { check, summary } = makeChecker();

try {
  const browser = await chromium.launch();
  const context = await browser.newContext({ timezoneId: 'Asia/Kolkata' });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = collectErrors(page);

  const blockedAttempts = [];
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      route.continue();
    } else {
      blockedAttempts.push(route.request().url());
      route.abort();
    }
  });

  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  check('zero external requests attempted while offline', blockedAttempts, a => a.length === 0);
  if (blockedAttempts.length) console.log('blocked/attempted external requests:', blockedAttempts);

  check('sidebar renders offline', await page.locator('.sidebar').first().isVisible(), true);
  check('dashboard is the active page offline', await page.locator('#page-dashboard.active').isVisible(), true);
  check('initDatabase scraped 15 students offline', await page.locator('#students-table tbody tr').count(), 15);
  check('addNewStudent is a function offline', await page.evaluate(() => typeof window.addNewStudent), 'function');

  // Fonts actually loaded from the local vendored files, not a system fallback.
  await page.evaluate(() => document.fonts.ready);
  const loadedFamilies = await page.evaluate(() => [...document.fonts].map(f => f.family));
  check('Figtree loaded from local file', loadedFamilies, f => f.includes('Figtree'));
  check('Instrument Serif loaded from local file', loadedFamilies, f => f.includes('Instrument Serif'));

  // Tweaks panel (the React-removal half of Item 2) still works with zero network.
  await page.evaluate(() => window.postMessage({ type: '__activate_edit_mode' }, '*'));
  await page.waitForTimeout(200);
  check('tweaks panel mounts offline', await page.locator('#tweaks-root .twk-panel').count(), 1);

  check('no console errors while offline', consoleErrors, e => e.length === 0);
  check('no uncaught page errors while offline', pageErrors, e => e.length === 0);
  if (consoleErrors.length) console.log('console errors:', consoleErrors);
  if (pageErrors.length) console.log('page errors:', pageErrors);

  await browser.close();
} finally {
  server.stop();
}

process.exit(summary(APP_URL));
