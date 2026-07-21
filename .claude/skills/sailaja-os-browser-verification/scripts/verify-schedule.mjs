// verify-schedule.mjs — regression for sailaja-os-frontier-and-method
// Item 5's last sub-item, the schedule-aware dashboard. Its stated
// milestone is literally "dashboard counts computed from stored schedules
// match a hand-counted seed" -- this script IS that hand-count, done
// independently of the app's own scheduleDayNum()/computeWeekClassCount()
// so it's a real cross-check, not a restatement of the same formula.
//
// PREDICTIONS, written before this script was first run (2026-07-21):
//  1. #stat-thisweek and the dashboard subgreeting's class count both equal
//     a hand-computed count: of the 15 seeded students' known weekly day
//     (hardcoded below, verified against the static table), how many fall
//     on-or-after today's day-of-week within the current Mon-Sat week.
//     "Already happened earlier this week" students are NOT counted --
//     that's the whole point of "remaining", not "total weekly roster".
//  2. The dashboard subgreeting's exam count starts at 0 (no exams seeded).
//  3. #dashboard-upcoming-sessions renders exactly 5 items, in ascending
//     (days-until-next-occurrence, then name) order, matching a
//     hand-computed top-5 from the same known day table.
//  4. Adding an exam dated in the FUTURE increments the exam count; one
//     dated in the PAST does not -- NEGATIVE control.
//  5. Adding a new student whose class day falls outside the remaining
//     window (already passed this week) does NOT change the week-class
//     count, even though the total roster count (nav badge) does go up --
//     proves "this week" isn't secretly "everyone" -- NEGATIVE control.
//  6. Adding a new student whose class day falls inside the remaining
//     window DOES increment the week-class count.
//  7. Editing a counted student's schedule to move them outside the window
//     decrements the count; deleting a student inside the window
//     decrements it again.
//  8. RELOAD: every computed number matches what it was before reload
//     (all derived live from persisted data, not itself stored — the
//     proof here is that recomputation after a fresh page load agrees).
//  9. Zero console/page errors throughout.

import { loadPlaywright, startServer, makeChecker, collectErrors, APP_URL, DB_KEY } from './lib.mjs';

const EXAMS_KEY = 'teach_os_exams';

// Hand-counted from the static seed table (sailaja-os-data-model-and-
// migrations' seeded rows) -- day-of-week numbers, Sun=0..Sat=6. Written
// independently of index.html's own DAY_ABBR_TO_NUM table.
const SEED_DAY_NUM = {
  'Aarav T.': 2, 'Diya R.': 4, 'Rohan K.': 1, 'Neha P.': 5, 'Kabir S.': 6,
  'Sara M.': 3, 'Ananya S.': 2, 'Ravi C.': 4, 'Layla H.': 6, 'Ishaan M.': 3,
  'Zara F.': 5, 'Priya R.': 1, 'Arjun M.': 4, 'Meera S.': 6, 'Kiran P.': 3,
};

function offsetFrom(todayDow, dow) {
  return (dow - todayDow + 7) % 7;
}

function expectedWeekCount(dayMap, todayDow) {
  const maxOffset = todayDow === 0 ? 6 : 6 - todayDow;
  return Object.values(dayMap).filter(dow => offsetFrom(todayDow, dow) <= maxOffset).length;
}

// makeChecker()'s check() uses Object.is for non-predicate expected values --
// two arrays with identical contents are never Object.is-equal, so array
// comparisons need a predicate (JSON-stringify equality is enough here,
// these are always flat arrays of strings).
function equalsArray(want) {
  const fn = actual => JSON.stringify(actual) === JSON.stringify(want);
  fn.label = JSON.stringify(want);
  return fn;
}

function expectedUpcomingTop5(dayMap, todayDow) {
  return Object.entries(dayMap)
    .map(([name, dow]) => ({ name, offset: offsetFrom(todayDow, dow) }))
    .sort((a, b) => a.offset - b.offset || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map(x => x.name);
}

const { chromium } = await loadPlaywright();
const server = await startServer();
const { check, summary } = makeChecker();

try {
  const browser = await chromium.launch();
  const context = await browser.newContext({ timezoneId: 'Asia/Kolkata' });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = collectErrors(page);
  page.on('dialog', d => d.accept());

  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  const todayDow = await page.evaluate(() => new Date().getDay());
  const wantWeekCount = expectedWeekCount(SEED_DAY_NUM, todayDow);
  const wantTop5 = expectedUpcomingTop5(SEED_DAY_NUM, todayDow);

  // ── Prediction 1: This Week stat + subtitle class count match the hand-count
  check('stat-thisweek matches the hand-counted seed', await page.locator('#stat-thisweek').textContent(), String(wantWeekCount));
  let subgreeting = await page.locator('#dashboard-subgreeting').textContent();
  check('subgreeting class count matches the hand-counted seed', subgreeting, t => t.startsWith(`${wantWeekCount} classes this week`));

  // ── Prediction 2: 0 exams coming up before any exam exists
  check('subgreeting exam count starts at 0 (no exams seeded)', subgreeting, t => t.includes('0 exams coming up'));

  // ── Prediction 3: Upcoming Sessions top 5, in the hand-computed order
  const upcomingTitles = await page.locator('#dashboard-upcoming-sessions .session-title').allTextContents();
  check('Upcoming Sessions shows exactly 5 items', upcomingTitles.length, 5);
  check('Upcoming Sessions order matches the hand-computed top 5', upcomingTitles, equalsArray(wantTop5));

  // ── Prediction 4: exam date negative/positive control
  await page.click('.nav-item:has-text("Exams")');
  await page.click('#page-exams .btn-primary:has-text("Add Exam")');
  await page.selectOption('#exam-student', '1'); // Aarav T.
  await page.fill('#exam-date', '2020-01-01'); // deep in the past
  await page.fill('#exam-name', 'Old Mock (past, should not count)');
  await page.click('#modal-add-exam .btn-primary:has-text("Add Exam")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  await page.click('.nav-item:has-text("Dashboard")');
  subgreeting = await page.locator('#dashboard-subgreeting').textContent();
  check('past-dated exam does NOT count as "coming up"', subgreeting, t => t.includes('0 exams coming up'));

  await page.click('.nav-item:has-text("Exams")');
  await page.click('#page-exams .btn-primary:has-text("Add Exam")');
  await page.selectOption('#exam-student', '1');
  const farFuture = `${new Date().getFullYear() + 2}-01-01`;
  await page.fill('#exam-date', farFuture);
  await page.fill('#exam-name', 'Future Mock (should count)');
  await page.click('#modal-add-exam .btn-primary:has-text("Add Exam")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  await page.click('.nav-item:has-text("Dashboard")');
  subgreeting = await page.locator('#dashboard-subgreeting').textContent();
  check('future-dated exam counts as "coming up" (0 -> 1)', subgreeting, t => t.includes('1 exams coming up'));

  // ── Prediction 5 & 6: new student inside vs. outside the remaining window.
  // An "outside" example only EXISTS if some weekday has already passed this
  // week (Mon-Sat) -- on a Sunday or Monday, nothing has passed yet, so
  // every legal class day is still "this week" and prediction 5 has no
  // valid fixture. Skip it (with a printed reason) rather than fabricate a
  // day that wouldn't actually prove the negative.
  const insideDow = (todayDow === 0) ? 1 : todayDow; // a day guaranteed <= maxOffset
  const hasPassedDayThisWeek = todayDow >= 2;
  const outsideDow = hasPassedDayThisWeek ? todayDow - 1 : null; // guaranteed already passed, when it exists
  const DOW_TO_SELECT_OPTION = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  await page.click('.nav-item:has-text("All Students")');
  if (hasPassedDayThisWeek) {
    await page.click('#page-students .btn-primary:has-text("Add Student")');
    await page.fill('#new-student-name', 'Test Schedule Outside');
    await page.selectOption('#new-student-curr', 'CBSE');
    await page.fill('#new-student-level', 'Grade 6');
    await page.selectOption('#new-student-day', DOW_TO_SELECT_OPTION[outsideDow]);
    await page.fill('#new-student-time', '5:00 PM');
    await page.fill('#new-student-parent', 'Mrs. Outside — 90000XXXXX');
    await page.click('#modal-add-student .btn-primary:has-text("Add Student")');
    await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

    check('week-class count unaffected by a student scheduled outside the remaining window',
      await page.locator('#stat-thisweek').textContent(), String(wantWeekCount));
  } else {
    console.log(`SKIP  outside-window negative control -- today (dow=${todayDow}) has no already-passed weekday this week`);
  }

  await page.click('#page-students .btn-primary:has-text("Add Student")');
  await page.fill('#new-student-name', 'Test Schedule Inside');
  await page.selectOption('#new-student-curr', 'CBSE');
  await page.fill('#new-student-level', 'Grade 6');
  await page.selectOption('#new-student-day', DOW_TO_SELECT_OPTION[insideDow]);
  await page.fill('#new-student-time', '5:00 PM');
  await page.fill('#new-student-parent', 'Mrs. Inside — 90000XXXXX');
  await page.click('#modal-add-student .btn-primary:has-text("Add Student")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  check('week-class count increments for a student scheduled inside the remaining window',
    await page.locator('#stat-thisweek').textContent(), String(wantWeekCount + 1));

  let students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  const insideStudent = students.find(s => s.name === 'Test Schedule Inside');
  const outsideStudent = students.find(s => s.name === 'Test Schedule Outside');

  if (hasPassedDayThisWeek) {
    // ── Prediction 7a: editing the inside student out of the window decrements
    await page.locator(`tr[data-id="${insideStudent.id}"]`).click();
    await page.waitForSelector('#modal-view-student.open');
    await page.fill('#vs-schedule', `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][outsideDow]} · 5:00 PM`);
    await page.click('#modal-view-student .btn-primary:has-text("Save Changes")');
    await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

    check('editing a student\'s schedule out of the window decrements the count',
      await page.locator('#stat-thisweek').textContent(), String(wantWeekCount));

    // ── Prediction 7b: deleting the (now-outside) test students changes
    // nothing further for the week count, but confirms cascade still runs
    await page.locator(`tr[data-id="${outsideStudent.id}"]`).click();
    await page.waitForSelector('#modal-view-student.open');
    await page.click('#modal-view-student .btn-ghost:has-text("Delete")');
    await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));
    await page.locator(`tr[data-id="${insideStudent.id}"]`).click();
    await page.waitForSelector('#modal-view-student.open');
    await page.click('#modal-view-student .btn-ghost:has-text("Delete")');
    await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

    check('week-class count back to the original hand-count after cleanup',
      await page.locator('#stat-thisweek').textContent(), String(wantWeekCount));
  } else {
    // No valid "outside" fixture exists today (see the SKIP above) --
    // still exercise deletion, just via the simpler inside-student-only path.
    await page.locator(`tr[data-id="${insideStudent.id}"]`).click();
    await page.waitForSelector('#modal-view-student.open');
    await page.click('#modal-view-student .btn-ghost:has-text("Delete")');
    await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

    check('week-class count back to the original hand-count after deleting the inside student',
      await page.locator('#stat-thisweek').textContent(), String(wantWeekCount));
  }

  // ── Prediction 8: RELOAD — recomputation still agrees
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  check('after reload: stat-thisweek still matches the hand-count', await page.locator('#stat-thisweek').textContent(), String(wantWeekCount));
  const upcomingAfterReload = await page.locator('#dashboard-upcoming-sessions .session-title').allTextContents();
  check('after reload: Upcoming Sessions order unchanged', upcomingAfterReload, equalsArray(wantTop5));
  const subgreetingAfterReload = await page.locator('#dashboard-subgreeting').textContent();
  check('after reload: exam count still 1', subgreetingAfterReload, t => t.includes('1 exams coming up'));

  check('no console errors across the whole run', consoleErrors, e => e.length === 0);
  check('no uncaught page errors across the whole run', pageErrors, e => e.length === 0);
  if (consoleErrors.length) console.log('console errors:', consoleErrors);
  if (pageErrors.length) console.log('page errors:', pageErrors);

  await browser.close();
} finally {
  server.stop();
}

process.exit(summary(APP_URL));
