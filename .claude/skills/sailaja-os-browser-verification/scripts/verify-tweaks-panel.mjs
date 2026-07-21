// verify-tweaks-panel.mjs — interaction regression for the vanilla (no
// React) tweaks panel rewrite, sailaja-os-frontier-and-method Item 2,
// 2026-07-21. The other verify scripts only assert the panel MOUNTS
// (#tweaks-root has children); this one actually drives every control
// type and asserts its real-world side effect, since a full rewrite of
// interactive behavior is exactly where silent regressions hide.
//
// PREDICTIONS, written before running anything:
//  1. Activating via postMessage renders one section per TWEAK_DEFAULTS
//     group (4 x .twk-sect) and the panel is draggable (has a .twk-hd).
//  2. Toggling "Show parent contact" off hides every .student-parent
//     element; toggling it back on shows them again.
//  3. Moving the sidebar-width slider updates --sidebar-w AND the actual
//     .sidebar element's width style, live (no reload needed).
//  4. Changing the accent color input updates --french-blue AND
//     --french-blue-mid to the new value.
//  5. Typing a new teacher name updates the dashboard greeting text live
//     (via updateGreeting(), reused unchanged).
//  6. Clicking the "Cool" option in the background-tone radio updates
//     --bg/--surface2/--border to the cool palette, and moves the visible
//     thumb (aria-checked flips to the clicked option).
//  7. Closing the panel (the ✕ button) removes it from the DOM
//     (#tweaks-root back to 0 children) and posts __edit_mode_dismissed.
//  8. NEGATIVE: zero console/page errors throughout; the persistence layer
//     (addNewStudent) is completely unaffected by any of this.

import { loadPlaywright, startServer, makeChecker, collectErrors, APP_URL } from './lib.mjs';

const { chromium } = await loadPlaywright();
const server = await startServer();
const { check, summary } = makeChecker();

try {
  const browser = await chromium.launch();
  const context = await browser.newContext({ timezoneId: 'Asia/Kolkata' });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = collectErrors(page);

  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  // ── Activate
  const dismissedMsgs = [];
  await page.exposeFunction('__recordParentMsg', msg => dismissedMsgs.push(msg));
  await page.evaluate(() => {
    window.addEventListener('message', e => {
      if (e.data && e.data.type) window.__recordParentMsg(e.data.type);
    });
  });
  await page.evaluate(() => window.postMessage({ type: '__activate_edit_mode' }, '*'));
  await page.waitForTimeout(200);

  check('4 tweak sections rendered', await page.locator('#tweaks-root .twk-sect').count(), 4);
  check('panel header present (draggable handle)', await page.locator('#tweaks-root .twk-hd').count(), 1);

  // ── Toggle: show parent contact (.student-parent only exists on the
  // Students page, which isn't the default active page — navigate first)
  await page.click('.nav-item:has-text("All Students")');
  const parentSpan = page.locator('.student-parent').first();
  check('parent contact visible before toggle', await parentSpan.isVisible(), true);
  await page.locator('#tweaks-root .twk-row-h:has-text("Show parent contact") .twk-toggle').click();
  await page.waitForTimeout(50);
  check('parent contact hidden after toggling off', await parentSpan.isVisible(), false);
  await page.locator('#tweaks-root .twk-row-h:has-text("Show parent contact") .twk-toggle').click();
  await page.waitForTimeout(50);
  check('parent contact visible again after toggling back on', await parentSpan.isVisible(), true);

  // ── Slider: sidebar width
  const slider = page.locator('#tweaks-root input[type="range"]');
  await slider.fill('280');
  await slider.dispatchEvent('input');
  await page.waitForTimeout(50);
  const sidebarVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w').trim());
  check('slider updates --sidebar-w CSS var live', sidebarVar, '280px');
  const sidebarWidth = await page.evaluate(() => document.querySelector('.sidebar').style.width);
  check('slider updates the real .sidebar element width live', sidebarWidth, '280px');

  // ── Color: accent color
  const colorInput = page.locator('#tweaks-root input[type="color"]');
  await colorInput.evaluate(el => { el.value = '#ff0000'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.waitForTimeout(50);
  const accentVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--french-blue').trim());
  check('color picker updates --french-blue CSS var live', accentVar, '#ff0000');

  // ── Text: teacher name -> greeting
  const nameInput = page.locator('#tweaks-root input[type="text"]');
  await nameInput.fill('Test Teacher');
  await nameInput.dispatchEvent('input');
  await page.waitForTimeout(50);
  const greeting = await page.evaluate(() => document.getElementById('dashboard-greeting').textContent);
  check('teacher name input updates the dashboard greeting live', greeting, t => t.includes('Test Teacher'));

  // ── Radio: background tone (click the "Cool" option)
  await page.locator('#tweaks-root .twk-seg button:has-text("Cool")').click();
  await page.waitForTimeout(50);
  const bgVar = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  check('clicking "Cool" updates --bg to the cool palette', bgVar, '#f0f2f5');
  check('clicking "Cool" flips its own aria-checked to true',
    await page.locator('#tweaks-root .twk-seg button:has-text("Cool")').getAttribute('aria-checked'), 'true');
  check('the previously-selected "Warm" option is no longer checked',
    await page.locator('#tweaks-root .twk-seg button:has-text("Warm")').getAttribute('aria-checked'), 'false');

  // ── Close
  await page.locator('#tweaks-root .twk-x').click();
  await page.waitForTimeout(100);
  check('panel removed from DOM after closing', await page.locator('#tweaks-root').evaluate(el => el.children.length), 0);
  check('__edit_mode_dismissed posted to parent', dismissedMsgs.includes('__edit_mode_dismissed'), true);

  // ── Negative control: persistence layer untouched by any of this
  check('addNewStudent still a function after all tweaks interaction', await page.evaluate(() => typeof window.addNewStudent), 'function');

  check('no console errors across the whole run', consoleErrors, e => e.length === 0);
  check('no uncaught page errors across the whole run', pageErrors, e => e.length === 0);
  if (consoleErrors.length) console.log('console errors:', consoleErrors);
  if (pageErrors.length) console.log('page errors:', pageErrors);

  await browser.close();
} finally {
  server.stop();
}

process.exit(summary(APP_URL));
