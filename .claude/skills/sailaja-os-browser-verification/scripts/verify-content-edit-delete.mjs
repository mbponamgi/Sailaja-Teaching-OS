// verify-content-edit-delete.mjs — regression for edit/delete added to
// lessons, exams, and quiz questions, on explicit owner request ("add
// edit/delete for lessons/exams/quiz") after Phase 3(d) shipped them
// add-only. All three reuse their existing add modal for editing (one
// shared Save handler branching on a module-level editingXId, not a
// separate saveXEdit()-style function) -- this script exists specifically
// to prove that reuse doesn't leak state between add/edit/cancel calls.
//
// PREDICTIONS, written before this script was first run (2026-07-21):
//  1. Adding then clicking Edit on a lesson prefills every field exactly,
//     with the modal title/button relabeled "Edit Lesson Plan"/"Save
//     Changes"; saving changes the record IN PLACE (same id, array length
//     unchanged) and shows "Lesson plan updated!", not "...saved!".
//  2. RELOAD: the edit survives.
//  3. Deleting the lesson removes it (count back to 0, card hides again)
//     and survives a reload.
//  4. NEGATIVE: opening Edit, changing a field, then clicking Cancel makes
//     NO change to the stored record.
//  5. NEGATIVE: after that cancelled edit, clicking "+ New Lesson" and
//     saving creates a genuinely NEW second record (not an overwrite of
//     the first) -- proves editingLessonId doesn't leak from a cancelled
//     edit into the next add.
//  6-10. The same five predictions, adapted, for exams (edit re-selects a
//     DIFFERENT real student and prep status) and quiz questions (edit
//     changes which option is correct, and the quiz-opt click behavior
//     follows the NEW correct answer, not the old one).
//  11. NEGATIVE throughout: the 4 static quiz cards, the static lesson-bank
//     cards, and the static IB Assessment Calendar table are never touched
//     by any add/edit/delete in this script.
//  12. Zero console/page errors throughout.

import { loadPlaywright, startServer, makeChecker, collectErrors, APP_URL, DB_KEY } from './lib.mjs';

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
  page.on('dialog', d => d.accept()); // deleteLesson()/deleteExam()/deleteQuizQuestion() confirm()

  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  // ══════════════════════════════════════ LESSONS ══════════════════════
  await page.click('.nav-item:has-text("Lesson Plans")');
  const staticLessonBankCountBefore = await page.locator('.lesson-item').count();

  await page.click('#page-lessons .btn-primary:has-text("New Lesson")');
  await page.fill('#lesson-title', 'Edit-Delete Lesson A');
  await page.selectOption('#lesson-curr', 'Cambridge');
  await page.fill('#lesson-level', 'Grade 9');
  await page.selectOption('#lesson-duration', '60 minutes');
  await page.fill('#lesson-objectives', 'Original objectives.');
  await page.fill('#lesson-activities', 'Original activities.');
  await page.fill('#lesson-homework', 'Original homework.');
  await page.click('#modal-add-lesson .btn-primary:has-text("Save")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  let lessons = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), LESSONS_KEY);
  check('lesson A created', lessons.length, 1);
  const lessonAId = lessons[0].id;

  // ── Prediction 1: Edit prefills every field, modal relabeled
  await page.click('#dynamic-lessons-list .lesson-item button:has-text("Edit")');
  await page.waitForSelector('#modal-add-lesson.open');
  check('edit modal title relabeled', await page.locator('#lesson-modal-title').textContent(), 'Edit Lesson Plan');
  check('edit modal button relabeled', await page.locator('#lesson-save-btn').textContent(), 'Save Changes');
  check('lesson-title prefilled', await page.locator('#lesson-title').inputValue(), 'Edit-Delete Lesson A');
  check('lesson-curr prefilled', await page.locator('#lesson-curr').inputValue(), 'Cambridge');
  check('lesson-level prefilled', await page.locator('#lesson-level').inputValue(), 'Grade 9');
  check('lesson-objectives prefilled', await page.locator('#lesson-objectives').inputValue(), 'Original objectives.');

  // ── Prediction 4: Cancel makes no change
  await page.fill('#lesson-title', 'SHOULD NOT BE SAVED');
  await page.click('#modal-add-lesson .btn-ghost:has-text("Cancel")');
  lessons = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), LESSONS_KEY);
  check('cancelled edit did not change the title', lessons[0].title, 'Edit-Delete Lesson A');
  check('cancelled edit did not add a record', lessons.length, 1);

  // ── Prediction 5: "+ New Lesson" after a cancelled edit is a real add,
  // not a leaked overwrite of lesson A
  await page.click('#page-lessons .btn-primary:has-text("New Lesson")');
  check('title field reset for a fresh add', await page.locator('#lesson-title').inputValue(), '');
  check('add modal title relabeled back', await page.locator('#lesson-modal-title').textContent(), 'New Lesson Plan');
  await page.fill('#lesson-title', 'Edit-Delete Lesson B');
  await page.selectOption('#lesson-curr', 'IBDP');
  await page.click('#modal-add-lesson .btn-primary:has-text("Save")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  lessons = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), LESSONS_KEY);
  check('lesson B is a genuinely new second record (editingLessonId did not leak)', lessons.length, 2);
  check('lesson A untouched by adding B', lessons.find(l => l.id === lessonAId).title, 'Edit-Delete Lesson A');

  // ── Real edit: change lesson A for real this time
  const lessonARow = page.locator('#dynamic-lessons-list .lesson-item', { hasText: 'Edit-Delete Lesson A' });
  await lessonARow.locator('button:has-text("Edit")').click();
  await page.waitForSelector('#modal-add-lesson.open');
  await page.fill('#lesson-title', 'Edit-Delete Lesson A (edited)');
  await page.selectOption('#lesson-duration', '90 minutes');
  await page.click('#modal-add-lesson .btn-primary:has-text("Save Changes")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('updated'));

  lessons = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), LESSONS_KEY);
  check('edit updated the record IN PLACE (still 2 records)', lessons.length, 2);
  const editedLessonA = lessons.find(l => l.id === lessonAId);
  check('lesson A id unchanged after edit', editedLessonA.id, lessonAId);
  check('lesson A title updated', editedLessonA.title, 'Edit-Delete Lesson A (edited)');
  check('lesson A duration updated', editedLessonA.duration, '90 minutes');
  check('rendered list shows the edited title', await page.locator('#dynamic-lessons-list').textContent(), t => t.includes('Edit-Delete Lesson A (edited)'));

  // ── Prediction 2: RELOAD — edit survives
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  lessons = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), LESSONS_KEY);
  check('after reload: edit survived', lessons.find(l => l.id === lessonAId).title, 'Edit-Delete Lesson A (edited)');
  check('after reload: still 2 lessons', lessons.length, 2);

  // ── Prediction 3: delete + reload
  await page.click('.nav-item:has-text("Lesson Plans")');
  await page.locator('#dynamic-lessons-list .lesson-item', { hasText: 'Edit-Delete Lesson A (edited)' })
    .locator('button:has-text("Delete")').click();
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('deleted'));

  lessons = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), LESSONS_KEY);
  check('lesson A deleted, B remains', lessons.length, 1);
  check('remaining lesson is B', lessons[0].title, 'Edit-Delete Lesson B');

  await page.locator('#dynamic-lessons-list .lesson-item', { hasText: 'Edit-Delete Lesson B' })
    .locator('button:has-text("Delete")').click();
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('deleted'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.click('.nav-item:has-text("Lesson Plans")');
  lessons = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), LESSONS_KEY);
  check('after reload: both lessons gone', lessons.length, 0);
  check('lessons card hidden again', await page.locator('#my-lessons-card').isVisible(), false);
  check('static lesson-bank cards unaffected by the whole lesson add/edit/delete cycle',
    await page.locator('.lesson-item').count(), staticLessonBankCountBefore);

  // ══════════════════════════════════════ EXAMS ═════════════════════════
  await page.click('.nav-item:has-text("Exams")');
  const staticExamCalendarRowsBefore = await page.locator('#page-exams table').first().locator('tbody tr').count();

  const students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  const studentOne = students[0]; // Aarav T., id 1
  const studentTwo = students[1]; // Diya R., id 2

  await page.click('#page-exams .btn-primary:has-text("Add Exam")');
  await page.selectOption('#exam-student', String(studentOne.id));
  await page.fill('#exam-date', '2026-09-01');
  await page.fill('#exam-name', 'Edit-Delete Exam');
  await page.selectOption('#exam-curriculum', 'CBSE');
  await page.selectOption('#exam-prep', 'Not started');
  await page.click('#modal-add-exam .btn-primary:has-text("Add Exam")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  let exams = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), EXAMS_KEY);
  check('exam created', exams.length, 1);
  const examId = exams[0].id;

  // ── Edit prefill + relabel
  await page.click('#dynamic-exams-list button:has-text("Edit")');
  await page.waitForSelector('#modal-add-exam.open');
  check('exam edit modal title relabeled', await page.locator('#exam-modal-title').textContent(), 'Edit Exam / Assessment');
  check('exam edit modal button relabeled', await page.locator('#exam-save-btn').textContent(), 'Save Changes');
  check('exam-student prefilled', await page.locator('#exam-student').inputValue(), String(studentOne.id));
  check('exam-date prefilled', await page.locator('#exam-date').inputValue(), '2026-09-01');
  check('exam-name prefilled', await page.locator('#exam-name').inputValue(), 'Edit-Delete Exam');
  check('exam-prep prefilled', await page.locator('#exam-prep').inputValue(), 'Not started');

  // ── Cancel negative control
  await page.fill('#exam-name', 'SHOULD NOT BE SAVED');
  await page.click('#modal-add-exam .btn-ghost:has-text("Cancel")');
  exams = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), EXAMS_KEY);
  check('cancelled exam edit did not change the name', exams[0].examName, 'Edit-Delete Exam');

  // ── Real edit: reassign to a different student and change prep status
  await page.click('#dynamic-exams-list button:has-text("Edit")');
  await page.waitForSelector('#modal-add-exam.open');
  await page.selectOption('#exam-student', String(studentTwo.id));
  await page.selectOption('#exam-prep', 'On track / Ready');
  await page.click('#modal-add-exam .btn-primary:has-text("Save Changes")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('updated'));

  exams = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), EXAMS_KEY);
  check('exam edited in place (still 1 record)', exams.length, 1);
  check('exam id unchanged after edit', exams[0].id, examId);
  check('exam reassigned to the real second student', exams[0].studentLabel, studentTwo.name);
  check('exam prep status updated', exams[0].prepStatus, 'On track / Ready');
  check('rendered exam row shows the new student and status',
    await page.locator('#dynamic-exams-list').textContent(), t => t.includes(studentTwo.name) && t.includes('On track / Ready'));

  // ── RELOAD — edit survives
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  exams = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), EXAMS_KEY);
  check('after reload: exam edit survived', exams[0].studentLabel, studentTwo.name);

  // ── Delete + reload
  await page.click('.nav-item:has-text("Exams")');
  await page.click('#dynamic-exams-list button:has-text("Delete")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('deleted'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.click('.nav-item:has-text("Exams")');
  exams = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), EXAMS_KEY);
  check('after reload: exam deleted', exams.length, 0);
  check('exams card hidden again', await page.locator('#my-exams-card').isVisible(), false);
  check('static IB Assessment Calendar unaffected by the whole exam add/edit/delete cycle',
    await page.locator('#page-exams table').first().locator('tbody tr').count(), staticExamCalendarRowsBefore);

  // ══════════════════════════════════════ QUIZ ══════════════════════════
  await page.click('.nav-item:has-text("Quiz Bank")');
  const staticQuizCountBefore = await page.locator('#page-quizzes > .quiz-card').count();
  check('4 static quiz cards before this cycle', staticQuizCountBefore, 4);

  await page.click('#page-quizzes .btn-primary:has-text("New Question")');
  await page.selectOption('#quiz-curr', 'A1/A2');
  await page.selectOption('#quiz-category', 'Vocabulary');
  await page.fill('#quiz-question', 'Edit-Delete Q: "chien" means?');
  await page.fill('#quiz-opt-a', 'Cat');
  await page.fill('#quiz-opt-b', 'Dog');
  await page.fill('#quiz-opt-c', 'Bird');
  await page.fill('#quiz-opt-d', 'Fish');
  await page.selectOption('#quiz-correct', 'B');
  await page.click('#modal-add-quiz .btn-primary:has-text("Add Question")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  let quiz = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), QUIZ_KEY);
  check('quiz question created', quiz.length, 1);
  const quizId = quiz[0].id;
  const dynamicCard = page.locator('#dynamic-quiz-list .quiz-card').first();

  // ── Edit prefill + relabel
  await dynamicCard.locator('button:has-text("Edit")').click();
  await page.waitForSelector('#modal-add-quiz.open');
  check('quiz edit modal title relabeled', await page.locator('#quiz-modal-title').textContent(), 'Edit Quiz Question');
  check('quiz edit modal button relabeled', await page.locator('#quiz-save-btn').textContent(), 'Save Changes');
  check('quiz-question prefilled', await page.locator('#quiz-question').inputValue(), 'Edit-Delete Q: "chien" means?');
  check('quiz-opt-b prefilled', await page.locator('#quiz-opt-b').inputValue(), 'Dog');
  check('quiz-correct prefilled', await page.locator('#quiz-correct').inputValue(), 'B');

  // ── Cancel negative control
  await page.fill('#quiz-question', 'SHOULD NOT BE SAVED');
  await page.click('#modal-add-quiz .btn-ghost:has-text("Cancel")');
  quiz = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), QUIZ_KEY);
  check('cancelled quiz edit did not change the question', quiz[0].question, 'Edit-Delete Q: "chien" means?');

  // ── Real edit: change the correct answer from B to C
  await dynamicCard.locator('button:has-text("Edit")').click();
  await page.waitForSelector('#modal-add-quiz.open');
  await page.selectOption('#quiz-correct', 'C');
  await page.click('#modal-add-quiz .btn-primary:has-text("Save Changes")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('updated'));

  quiz = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), QUIZ_KEY);
  check('quiz edited in place (still 1 record)', quiz.length, 1);
  check('quiz id unchanged after edit', quiz[0].id, quizId);
  check('quiz correct answer updated to C', quiz[0].correct, 'C');
  check('static quiz cards still exactly 4 after editing the dynamic one', await page.locator('#page-quizzes > .quiz-card').count(), 4);

  // The rendered options re-render fresh from the updated record -- clicking
  // "Bird" (option C, the NEW correct answer) should now report Correct.
  await dynamicCard.locator('.quiz-opt', { hasText: 'Bird' }).click();
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));
  check('quiz-opt click follows the EDITED correct answer, not the original',
    await page.locator('#toast').textContent(), t => t.includes('Correct'));

  // ── RELOAD — edit survives
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  quiz = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), QUIZ_KEY);
  check('after reload: quiz edit survived', quiz[0].correct, 'C');

  // ── Delete + reload
  await page.click('.nav-item:has-text("Quiz Bank")');
  await page.locator('#dynamic-quiz-list .quiz-card').first().locator('button:has-text("Delete")').click();
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('deleted'));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.click('.nav-item:has-text("Quiz Bank")');
  quiz = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), QUIZ_KEY);
  check('after reload: quiz question deleted', quiz.length, 0);
  check('dynamic quiz list empty again', await page.locator('#dynamic-quiz-list .quiz-card').count(), 0);
  check('static quiz cards unaffected by the whole quiz add/edit/delete cycle',
    await page.locator('#page-quizzes > .quiz-card').count(), staticQuizCountBefore);

  // ── Final negative controls
  check('addNewStudent still a function (Phase 1-3 untouched)', await page.evaluate(() => typeof window.addNewStudent), 'function');
  check('logPayment still a function (Item 3 untouched)', await page.evaluate(() => typeof window.logPayment), 'function');

  check('no console errors across the whole run', consoleErrors, e => e.length === 0);
  check('no uncaught page errors across the whole run', pageErrors, e => e.length === 0);
  if (consoleErrors.length) console.log('console errors:', consoleErrors);
  if (pageErrors.length) console.log('page errors:', pageErrors);

  await browser.close();
} finally {
  server.stop();
}

process.exit(summary(APP_URL));
