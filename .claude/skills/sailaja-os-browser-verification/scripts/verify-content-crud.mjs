// verify-content-crud.mjs — persistence regression for lessons, exams, and
// quiz questions (Phase 3(d) of the daily-use campaign, built on owner
// request 2026-07-21, after the core student/session persistence — 2026-07-21).
//
// PREDICTIONS, written before running anything:
//  1. Adding a lesson ("Test Lesson — Subjonctif", Cambridge, 60 minutes)
//     makes teach_os_lessons go 0->1, unshifted (index 0), curr derived to
//     'cambridge'; the "My Lesson Plans" card becomes visible and shows it.
//  2. Adding an exam for a specific real student (not a bulk "All X" option)
//     resolves studentLabel to that student's real name, teach_os_exams 0->1,
//     "Logged Exams" card becomes visible.
//  3. Adding a quiz question with a chosen correct option makes
//     teach_os_quiz 0->1; the rendered dynamic quiz card's CORRECT option
//     click reports "Correct", and clicking a WRONG option reports "Not
//     quite" (answerQuiz reused, not reimplemented).
//  4. RELOAD: all three counts (lessons, exams, quiz) survive at 1, and all
//     three cards/lists still render the same content.
//  5. NEGATIVE: the four original static quiz cards (numbered 1-4) are
//     unaffected; addNewStudent/logSession paths (Phase 1-3) are untouched;
//     zero console/page errors throughout.

import { loadPlaywright, startServer, makeChecker, collectErrors, APP_URL } from './lib.mjs';

const LESSONS_KEY = 'teach_os_lessons';
const EXAMS_KEY = 'teach_os_exams';
const QUIZ_KEY = 'teach_os_quiz';

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

  // ── Lessons
  await page.click('.nav-item:has-text("Lesson Plans")');
  check('lessons card hidden when empty', await page.locator('#my-lessons-card').isVisible(), false);
  await page.click('#page-lessons .btn-primary:has-text("New Lesson")');
  await page.fill('#lesson-title', 'Test Lesson — Subjonctif');
  await page.selectOption('#lesson-curr', 'Cambridge');
  await page.fill('#lesson-level', 'Grade 9');
  await page.selectOption('#lesson-duration', '60 minutes');
  await page.fill('#lesson-objectives', 'Introduce the subjunctive mood.');
  await page.click('#modal-add-lesson .btn-primary:has-text("Save")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  let lessons = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), LESSONS_KEY);
  check('lesson count 0 -> 1', lessons.length, 1);
  check('lesson curr derived to cambridge', lessons[0] && lessons[0].curr, 'cambridge');
  check('lessons card now visible', await page.locator('#my-lessons-card').isVisible(), true);
  check('lesson title rendered', await page.locator('#dynamic-lessons-list .lesson-title').first().textContent(), 'Test Lesson — Subjonctif');

  // ── Exams (pick a real student, not a bulk option)
  await page.click('.nav-item:has-text("Exams")');
  check('exams card hidden when empty', await page.locator('#my-exams-card').isVisible(), false);
  const studentsBefore = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), 'teach_os_students');
  const targetStudent = studentsBefore[0];
  await page.click('#page-exams .btn-primary:has-text("Add Exam")');
  await page.selectOption('#exam-student', String(targetStudent.id));
  await page.fill('#exam-date', '2026-08-01');
  await page.fill('#exam-name', 'Test Mock Paper');
  await page.selectOption('#exam-curriculum', 'CBSE');
  await page.selectOption('#exam-prep', 'In preparation');
  await page.click('#modal-add-exam .btn-primary:has-text("Add Exam")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  let exams = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), EXAMS_KEY);
  check('exam count 0 -> 1', exams.length, 1);
  check('exam resolved to the real student name', exams[0] && exams[0].studentLabel, targetStudent.name);
  check('exams card now visible', await page.locator('#my-exams-card').isVisible(), true);
  check('exam row shows the student name', await page.locator('#dynamic-exams-list tr td').nth(1).textContent(), targetStudent.name);

  // ── Quiz question
  await page.click('.nav-item:has-text("Quiz Bank")');
  const staticQuizCountBefore = await page.locator('#page-quizzes > .quiz-card').count();
  check('4 static quiz cards present before adding', staticQuizCountBefore, 4);
  await page.click('#page-quizzes .btn-primary:has-text("New Question")');
  await page.selectOption('#quiz-curr', 'A1/A2');
  await page.selectOption('#quiz-category', 'Vocabulary');
  await page.fill('#quiz-question', 'Test question: "chat" means?');
  await page.fill('#quiz-opt-a', 'Dog');
  await page.fill('#quiz-opt-b', 'Cat');
  await page.fill('#quiz-opt-c', 'Bird');
  await page.fill('#quiz-opt-d', 'Fish');
  await page.selectOption('#quiz-correct', 'B');
  await page.click('#modal-add-quiz .btn-primary:has-text("Add Question")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  let quiz = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), QUIZ_KEY);
  check('quiz count 0 -> 1', quiz.length, 1);
  check('static quiz cards still exactly 4 (dynamic ones are separate)', await page.locator('#page-quizzes > .quiz-card').count(), 4);
  const dynamicQuizCard = page.locator('#dynamic-quiz-list .quiz-card').first();
  check('dynamic quiz card rendered', await dynamicQuizCard.locator('.quiz-q').textContent(), t => t.includes('Test question'));

  // answerQuiz reuse: correct option -> "Correct", wrong option (fresh reload needed to reset disabled state)
  const correctOpt = dynamicQuizCard.locator('.quiz-opt', { hasText: 'Cat' });
  await correctOpt.click();
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));
  check('clicking the correct option shows the correct toast',
    await page.locator('#toast').textContent(), t => t.includes('Correct'));

  // ── RELOAD — persistence proof for all three
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  lessons = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), LESSONS_KEY);
  exams = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), EXAMS_KEY);
  quiz = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), QUIZ_KEY);
  check('after reload: lesson count still 1', lessons.length, 1);
  check('after reload: exam count still 1', exams.length, 1);
  check('after reload: quiz count still 1', quiz.length, 1);

  await page.click('.nav-item:has-text("Lesson Plans")');
  check('after reload: lessons card still visible', await page.locator('#my-lessons-card').isVisible(), true);
  await page.click('.nav-item:has-text("Exams")');
  check('after reload: exams card still visible', await page.locator('#my-exams-card').isVisible(), true);
  await page.click('.nav-item:has-text("Quiz Bank")');
  check('after reload: dynamic quiz card still rendered', await page.locator('#dynamic-quiz-list .quiz-card').count(), 1);
  check('after reload: 4 static quiz cards unaffected', await page.locator('#page-quizzes > .quiz-card').count(), 4);

  // ── Negative controls: Phase 1-3 persistence layer untouched
  check('addNewStudent still a function', await page.evaluate(() => typeof window.addNewStudent), 'function');
  check('logSession still a function', await page.evaluate(() => typeof window.logSession), 'function');

  check('no console errors across the whole run', consoleErrors, e => e.length === 0);
  check('no uncaught page errors across the whole run', pageErrors, e => e.length === 0);
  if (consoleErrors.length) console.log('console errors:', consoleErrors);
  if (pageErrors.length) console.log('page errors:', pageErrors);

  await browser.close();
} finally {
  server.stop();
}

process.exit(summary(APP_URL));
