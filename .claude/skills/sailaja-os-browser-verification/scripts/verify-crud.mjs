// verify-crud.mjs — full student+session CRUD-and-reload regression for the
// sailaja-os-daily-use-campaign Phase 1-3 fix. This is the campaign's stated
// success metric made executable: add student -> log a session -> edit ->
// RELOAD -> delete (cascade), with negative controls for unrelated features.
//
// PREDICTIONS, written before this script was first run (2026-07-21):
//  1. typeof addNewStudent === 'function'; teach_os_students has exactly 15
//     records after first load (scraped from the static seed table)
//  2. Adding "Test Playwright" (IBDP HL, level "Grade 12") makes count 15->16,
//     new record is students[0] (unshift), currBadge 'IBDP', curr 'ibdp', band 'senior'
//  3. Logging a session for that student via the row's "Log" button makes
//     teach_os_sessions have exactly 1 record with studentId == new student's id
//  4. Editing the student's name to "Test Playwright Edited" and saving
//     updates the record; reopening the profile shows the new name
//  5. RELOAD: student count still 16, name still "Test Playwright Edited",
//     session count for that student still 1 -- the actual persistence proof
//  6. Deleting the student: count 16->15, and their session is gone too
//     (cascade delete) -- teach_os_sessions count back to 0
//  7. NEGATIVE: the tweaks panel (JSX-free now) still renders once activated
//     via postMessage; dark mode toggle still flips sailaja-dark;
//     filterStudents is unaffected; zero console/page errors throughout

import { loadPlaywright, startServer, makeChecker, collectErrors, APP_URL, DB_KEY } from './lib.mjs';

const SESSIONS_KEY = 'teach_os_sessions';
const { chromium } = await loadPlaywright();
const server = await startServer();
const { check, summary } = makeChecker();

try {
  const browser = await chromium.launch();
  const context = await browser.newContext({ timezoneId: 'Asia/Kolkata' });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = collectErrors(page);
  page.on('dialog', d => d.accept()); // deleteStudent() uses confirm()

  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  check('addNewStudent is a real function', await page.evaluate(() => typeof window.addNewStudent), 'function');
  let students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  check('initDatabase scraped 15 students', students.length, 15);

  // TweaksPanel renders null until externally activated via postMessage (an
  // edit-mode overlay, by design) -- activate it to prove the JSX-free
  // TweaksApp component tree is actually alive, not just non-throwing.
  await page.evaluate(() => window.postMessage({ type: '__activate_edit_mode' }, '*'));
  await page.waitForTimeout(300);
  check('tweaks panel renders once activated', await page.evaluate(() => document.getElementById('tweaks-root').children.length), n => n > 0);
  await page.evaluate(() => window.postMessage({ type: '__deactivate_edit_mode' }, '*'));
  await page.waitForTimeout(100);

  // ── Add a student via the real UI
  await page.click('.nav-item:has-text("All Students")');
  await page.click('#page-students .btn-primary:has-text("Add Student")');
  await page.fill('#new-student-name', 'Test Playwright');
  await page.selectOption('#new-student-curr', 'IBDP HL');
  await page.fill('#new-student-level', 'Grade 12');
  await page.selectOption('#new-student-day', 'Wednesday');
  await page.fill('#new-student-time', '5:00 PM');
  await page.fill('#new-student-parent', 'Mrs. Playwright — 90000XXXXX');
  await page.fill('#new-student-focus', 'IB oral prep');
  await page.click('#modal-add-student .btn-primary:has-text("Add Student")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  check('student count 15 -> 16', students.length, 16);
  const added = students[0];
  check('new student is unshifted to front', added && added.name, 'Test Playwright');
  check('currBadge derived correctly', added && added.currBadge, 'IBDP');
  check('curr derived correctly', added && added.curr, 'ibdp');
  check('band derived correctly (IBDP always senior)', added && added.band, 'senior');
  const studentId = added.id;

  // ── Log a session for that student via the row's "Log" button
  const row = page.locator(`#students-table tbody tr[data-id="${studentId}"]`);
  await row.locator('button:has-text("Log")').click();
  await page.waitForSelector('#modal-add-session.open');
  check('session-student preselected to the right student',
    await page.locator('#session-student').inputValue(), String(studentId));
  await page.fill('#session-date', '2026-07-21');
  await page.fill('#session-topic', 'Passé composé review');
  await page.click('#modal-add-session .btn-primary:has-text("Save Session")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  let sessions = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), SESSIONS_KEY);
  check('exactly 1 session logged', sessions.length, 1);
  check('session studentId matches', sessions[0] && sessions[0].studentId, studentId);

  // ── Edit the student's name
  await row.click();
  await page.waitForSelector('#modal-view-student.open');
  check('view-student profile pre-filled with real data', await page.inputValue('#vs-name'), 'Test Playwright');
  await page.fill('#vs-name', 'Test Playwright Edited');
  await page.click('#modal-view-student .btn-primary:has-text("Save Changes")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  const edited = students.find(s => s.id === studentId);
  check('name updated in store', edited && edited.name, 'Test Playwright Edited');
  check('edited name renders in table', await page.locator(`tr[data-id="${studentId}"] .student-name`).textContent(), 'Test Playwright Edited');

  // ── RELOAD — the actual persistence proof
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  // showPage() state isn't persisted (it's DOM-class UI state, not app
  // data) -- dashboard is the default active page again after reload.
  await page.click('.nav-item:has-text("All Students")');
  students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  sessions = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), SESSIONS_KEY);
  check('after reload: still 16 students', students.length, 16);
  check('after reload: edited name survived', (students.find(s => s.id === studentId) || {}).name, 'Test Playwright Edited');
  check('after reload: session still there', sessions.length, 1);
  check('after reload: table still shows 16 rows', await page.locator('#students-table tbody tr').count(), 16);

  // ── Delete the student (cascade)
  await page.locator(`tr[data-id="${studentId}"]`).click();
  await page.waitForSelector('#modal-view-student.open');
  await page.click('#modal-view-student .btn-ghost:has-text("Delete")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  sessions = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), SESSIONS_KEY);
  check('after delete: back to 15 students', students.length, 15);
  check('after delete: cascade removed the session', sessions.length, 0);
  check('deleted student gone from table', await page.locator(`tr[data-id="${studentId}"]`).count(), 0);

  // ── Negative controls: unrelated features still work
  const darkBefore = await page.evaluate(() => localStorage.getItem('sailaja-dark'));
  await page.evaluate(() => toggleDark());
  const darkAfter = await page.evaluate(() => localStorage.getItem('sailaja-dark'));
  check('dark mode toggle unaffected', darkAfter !== darkBefore, true);
  check('filterStudents unaffected (still a function)', await page.evaluate(() => typeof filterStudents), 'function');

  check('no console errors across the whole run', consoleErrors, e => e.length === 0);
  check('no uncaught page errors across the whole run', pageErrors, e => e.length === 0);
  if (consoleErrors.length) console.log('console errors:', consoleErrors);
  if (pageErrors.length) console.log('page errors:', pageErrors);

  await browser.close();
} finally {
  server.stop();
}

process.exit(summary(APP_URL));
