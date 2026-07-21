// verify-live-counts.mjs — regression for sailaja-os-frontier-and-method
// Item 5's "Live counts" and "Real Recent Sessions" nice-to-haves (the two
// sub-items scoped for this pass; the schedule-aware dashboard sub-item is
// explicitly OUT of scope -- no structured schedule data model exists yet).
//
// PREDICTIONS, written before this script was first run (2026-07-21):
//  1. On first load: nav badges, dashboard stat cards, page-subtitle counts,
//     AND the Students page's filter-bar button counts (architecture-contract
//     W7 -- the "All (14)" drift) all read the REAL scraped distribution --
//     15 total (not the old hardcoded "14", which was already stale/wrong
//     the moment initDatabase() scraped 15 rows), 5 CBSE, 4 Cambridge,
//     2 IBDP, 4 A1/A2.
//  2. On first load, before any session is ever logged, all three CBSE
//     "Recent Sessions" cards (primary/middle/senior tabs) show "No
//     sessions logged yet." -- teach_os_sessions starts empty; the old
//     hardcoded April entries are gone entirely, not just relabeled.
//  3. Adding a new CBSE student increments both nav-badge-cbse AND
//     nav-badge-students by exactly 1, with no hardcoded numbers left
//     un-incremented anywhere checked.
//  4. Logging a session for "Aarav T." (id 1, the real seeded student behind
//     the CBSE-primary tracked card) makes #cbse-primary-sessions render
//     that real topic/date -- and does NOT touch the other two tracked
//     cards (negative control: #cbse-middle-sessions, #cbse-senior-sessions
//     still say "No sessions logged yet.").
//  5. Logging a session for "Rohan K." (id 3, CBSE-secondary, NOT one of the
//     3 tracked-by-name cards) changes none of the 3 tracked cards --
//     negative control proving the lookup is name-scoped, not
//     curriculum-scoped.
//  6. Editing that new CBSE student's curriculum to IBDP shifts counts:
//     CBSE 6->5, IBDP 2->3, total unchanged at 16.
//  7. Deleting a student who has a real logged session (Aarav T.) cascades:
//     the session is gone, #cbse-primary-sessions reverts to "No sessions
//     logged yet.", and nav-badge-students/stat-students both decrement.
//  8. RELOAD: all of the above state (counts, the Rohan K. session's
//     non-effect) survives -- the actual persistence proof, not just that
//     the render functions exist.
//  9. Zero console/page errors throughout.

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

  // ── Prediction 1: real distribution on first load, everywhere it's shown
  const text = async sel => (await page.locator(sel).textContent()).trim();
  check('nav badge: students', await text('#nav-badge-students'), '15');
  check('nav badge: a1a2', await text('#nav-badge-a1a2'), '4');
  check('nav badge: cbse', await text('#nav-badge-cbse'), '5');
  check('nav badge: cambridge', await text('#nav-badge-cambridge'), '4');
  check('nav badge: ibdp', await text('#nav-badge-ibdp'), '2');

  check('dashboard stat: students', await text('#stat-students'), '15');
  check('dashboard stat: cbse', await text('#stat-cbse'), '5');
  check('dashboard stat: cambridge', await text('#stat-cambridge'), '4');
  check('dashboard stat: ibdp', await text('#stat-ibdp'), '2');
  check('dashboard stat: a1a2', await text('#stat-a1a2'), '4');

  await page.click('.nav-item:has-text("All Students")');
  check('page subtitle: students count', await text('#subtitle-count-students'), '15');
  check('filter bar: All count (W7 fix)', await text('#filter-count-all'), '15');
  check('filter bar: CBSE count', await text('#filter-count-cbse'), '5');
  check('filter bar: Cambridge count', await text('#filter-count-cambridge'), '4');
  check('filter bar: IBDP count', await text('#filter-count-ibdp'), '2');
  check('filter bar: A1/A2 count', await text('#filter-count-a1a2'), '4');
  await page.click('.nav-item:has-text("A1 / A2 Tuitions")');
  check('page subtitle: a1a2 count', await text('#subtitle-count-a1a2'), '4');
  await page.click('.nav-item:has-text("CBSE")');
  check('page subtitle: cbse count', await text('#subtitle-count-cbse'), '5');
  await page.click('.nav-item:has-text("Cambridge")');
  check('page subtitle: cambridge count', await text('#subtitle-count-cambridge'), '4');
  await page.click('.nav-item:has-text("IBDP")');
  check('page subtitle: ibdp count', await text('#subtitle-count-ibdp'), '2');

  // ── Prediction 2: CBSE Recent Sessions cards start empty, honestly labeled
  await page.click('.nav-item:has-text("CBSE")');
  check('cbse-primary-sessions empty before any session logged',
    await text('#cbse-primary-sessions'), 'No sessions logged yet.');
  check('cbse-middle-sessions empty before any session logged',
    (await page.click('button:has-text("Grade 7 · Middle")'), await text('#cbse-middle-sessions')),
    'No sessions logged yet.');
  check('cbse-senior-sessions empty before any session logged',
    (await page.click('button:has-text("Grade 12 · Senior")'), await text('#cbse-senior-sessions')),
    'No sessions logged yet.');

  // ── Prediction 3: adding a CBSE student increments the right counts
  await page.click('.nav-item:has-text("All Students")');
  await page.click('#page-students .btn-primary:has-text("Add Student")');
  await page.fill('#new-student-name', 'Test Live Count');
  await page.selectOption('#new-student-curr', 'CBSE');
  await page.fill('#new-student-level', 'Grade 8');
  await page.selectOption('#new-student-day', 'Monday');
  await page.fill('#new-student-time', '4:00 PM');
  await page.fill('#new-student-parent', 'Mrs. Live Count — 90000XXXXX');
  await page.fill('#new-student-focus', 'Live-count regression fixture');
  await page.click('#modal-add-student .btn-primary:has-text("Add Student")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  check('nav badge: students 15 -> 16 after add', await text('#nav-badge-students'), '16');
  check('nav badge: cbse 5 -> 6 after add', await text('#nav-badge-cbse'), '6');
  check('filter bar: All 15 -> 16 after add', await text('#filter-count-all'), '16');
  check('filter bar: CBSE 5 -> 6 after add', await text('#filter-count-cbse'), '6');
  check('dashboard stat updates too (students)', (await page.click('.nav-item:has-text("Dashboard")'), await text('#stat-students')), '16');
  check('dashboard stat updates too (cbse)', await text('#stat-cbse'), '6');

  let students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  const newStudent = students.find(s => s.name === 'Test Live Count');
  const newStudentId = newStudent.id;

  // ── Prediction 4: logging a session for Aarav T. (id 1) updates ONLY
  // #cbse-primary-sessions, not the other two tracked cards
  await page.click('.nav-item:has-text("All Students")');
  await page.locator('tr[data-id="1"]').locator('button:has-text("Log")').click();
  await page.waitForSelector('#modal-add-session.open');
  check('session-student preselected to Aarav T. (id 1)', await page.locator('#session-student').inputValue(), '1');
  await page.fill('#session-date', '2026-07-20');
  await page.fill('#session-topic', 'Les nombres — counting practice');
  await page.fill('#session-notes', 'Counted 1-20 confidently.');
  await page.click('#modal-add-session .btn-primary:has-text("Save Session")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  await page.click('.nav-item:has-text("CBSE")');
  await page.click('button:has-text("Grade 4 · Primary")');
  check('cbse-primary-sessions shows the real logged session',
    await page.locator('#cbse-primary-sessions').textContent(),
    t => t.includes('Les nombres') && t.includes('20 Jul'));
  check('cbse-middle-sessions unaffected (negative control)',
    (await page.click('button:has-text("Grade 7 · Middle")'), await text('#cbse-middle-sessions')),
    'No sessions logged yet.');
  check('cbse-senior-sessions unaffected (negative control)',
    (await page.click('button:has-text("Grade 12 · Senior")'), await text('#cbse-senior-sessions')),
    'No sessions logged yet.');

  // ── Prediction 5: logging a session for Rohan K. (id 3, not a tracked
  // name) leaves all 3 tracked cards exactly as they were
  await page.click('.nav-item:has-text("All Students")');
  await page.locator('tr[data-id="3"]').locator('button:has-text("Log")').click();
  await page.waitForSelector('#modal-add-session.open');
  await page.fill('#session-date', '2026-07-20');
  await page.fill('#session-topic', 'Board mock — reading comprehension');
  await page.click('#modal-add-session .btn-primary:has-text("Save Session")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  await page.click('.nav-item:has-text("CBSE")');
  await page.click('button:has-text("Grade 4 · Primary")');
  check('cbse-primary-sessions still just the Aarav T. session (Rohan K. is untracked)',
    await page.locator('#cbse-primary-sessions').locator('.session-item').count(), 1);
  check('cbse-middle-sessions still empty (Rohan K. is untracked)',
    (await page.click('button:has-text("Grade 7 · Middle")'), await text('#cbse-middle-sessions')),
    'No sessions logged yet.');
  check('cbse-senior-sessions still empty (Rohan K. is untracked)',
    (await page.click('button:has-text("Grade 12 · Senior")'), await text('#cbse-senior-sessions')),
    'No sessions logged yet.');

  // ── Prediction 6: editing the new student's curriculum shifts counts
  await page.click('.nav-item:has-text("All Students")');
  await page.locator(`tr[data-id="${newStudentId}"]`).click();
  await page.waitForSelector('#modal-view-student.open');
  await page.selectOption('#vs-curr', 'IBDP HL');
  await page.click('#modal-view-student .btn-primary:has-text("Save Changes")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  check('nav badge: cbse 6 -> 5 after curriculum edit', await text('#nav-badge-cbse'), '5');
  check('nav badge: ibdp 2 -> 3 after curriculum edit', await text('#nav-badge-ibdp'), '3');
  check('nav badge: students unchanged by an edit (still 16)', await text('#nav-badge-students'), '16');

  // ── Prediction 7: deleting Aarav T. cascades the session AND the count
  await page.locator('tr[data-id="1"]').click();
  await page.waitForSelector('#modal-view-student.open');
  await page.click('#modal-view-student .btn-ghost:has-text("Delete")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  check('nav badge: students 16 -> 15 after delete', await text('#nav-badge-students'), '15');
  check('nav badge: cbse 5 -> 4 after deleting Aarav T.', await text('#nav-badge-cbse'), '4');
  await page.click('.nav-item:has-text("CBSE")');
  await page.click('button:has-text("Grade 4 · Primary")');
  check('cbse-primary-sessions reverts after cascade delete',
    await text('#cbse-primary-sessions'), 'No sessions logged yet.');

  // ── Prediction 8: RELOAD — persistence proof
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  check('after reload: nav badge students still 15', await text('#nav-badge-students'), '15');
  check('after reload: nav badge cbse still 4', await text('#nav-badge-cbse'), '4');
  check('after reload: nav badge ibdp still 3', await text('#nav-badge-ibdp'), '3');
  await page.click('.nav-item:has-text("CBSE")');
  check('after reload: cbse-primary-sessions still reverted', await text('#cbse-primary-sessions'), 'No sessions logged yet.');
  check('after reload: cbse-middle-sessions still has just the Rohan-is-untracked negative (empty)',
    (await page.click('button:has-text("Grade 7 · Middle")'), await text('#cbse-middle-sessions')),
    'No sessions logged yet.');

  const sessions = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), SESSIONS_KEY);
  check('after reload: Rohan K.\'s session is still in the store (only its card display is untracked)',
    sessions.some(s => s.studentId === 3 && s.topic.includes('Board mock')), true);

  check('no console errors across the whole run', consoleErrors, e => e.length === 0);
  check('no uncaught page errors across the whole run', pageErrors, e => e.length === 0);
  if (consoleErrors.length) console.log('console errors:', consoleErrors);
  if (pageErrors.length) console.log('page errors:', pageErrors);

  await browser.close();
} finally {
  server.stop();
}

process.exit(summary(APP_URL));
