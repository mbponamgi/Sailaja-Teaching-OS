// verify-backup.mjs — Backup & Restore round-trip regression for
// sailaja-os-frontier-and-method Item 4 ("You have a result when...": seed a
// known store, export, capture the file, mutate the store, restore from the
// file, and assert the restored state matches the export -- plus negative
// controls for malformed files and a cancelled confirm.
//
// PREDICTIONS, written before this script was first run (2026-07-21):
//  1. On first load (15 seeded students, no prior export) a backup-nudge
//     toast fires automatically -- checkBackupNudge()'s "no export yet but
//     data exists" branch.
//  2. Backup & Restore page shows "No backup has been downloaded yet."
//     before any export.
//  3. Clicking "Download Backup" produces a real file download containing
//     {version, exportedAt, data: {teach_os_students: [...15 records...]}},
//     sets teach_os_last_export in localStorage, and updates the on-page
//     status line to start with "Last backup:".
//  4. Adding a 16th student AFTER the export means the downloaded file still
//     reflects 15 -- proof the file is a real point-in-time snapshot, not a
//     live reference.
//  5. Restore attempts with a non-JSON file, and with valid-JSON-wrong-shape,
//     both leave the 16-student store completely unchanged and show a
//     "Restore failed" toast -- NEGATIVE controls.
//  6. Restore with the valid backup file, but dismissing the confirm dialog,
//     also leaves the store unchanged (still 16) -- confirm-cancel NEGATIVE.
//  7. Restore with the valid backup file, accepting the confirm dialog,
//     overwrites teach_os_students back to the 15-record snapshot (the 16th
//     student is gone) and the page reloads automatically.
//  8. Zero console/page errors throughout.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadPlaywright, startServer, makeChecker, collectErrors, APP_URL, DB_KEY } from './lib.mjs';

const { chromium } = await loadPlaywright();
const server = await startServer();
const { check, summary } = makeChecker();

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sailaja-backup-verify-'));

try {
  const browser = await chromium.launch();
  const context = await browser.newContext({ timezoneId: 'Asia/Kolkata' });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = collectErrors(page);

  let dialogAction = 'accept';
  page.on('dialog', d => (dialogAction === 'accept' ? d.accept() : d.dismiss()));

  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  let students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  check('initDatabase scraped 15 students', students.length, 15);

  // ── Prediction 1: nudge fires on first load (data present, never exported)
  check('backup nudge toast fires on first load with no prior export',
    await page.locator('#toast').textContent(), t => /back ?up/i.test(t || ''));
  await page.waitForTimeout(400); // let the toast's own timeout clear it

  // ── Navigate to the Backup & Restore page
  await page.click('.nav-item:has-text("Backup & Restore")');
  check('backup status before any export', await page.locator('#backup-status').textContent(),
    'No backup has been downloaded yet.');

  // ── Prediction 3: export produces a real file with the expected shape
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Download Backup")'),
  ]);
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('downloaded'));

  const goodBackupPath = path.join(tmpDir, 'good-backup.json');
  await download.saveAs(goodBackupPath);
  const backupJson = JSON.parse(fs.readFileSync(goodBackupPath, 'utf8'));
  check('backup file version', backupJson.version, 1);
  check('backup file has exportedAt', typeof backupJson.exportedAt, 'string');
  check('backup file captured 15 students', (backupJson.data.teach_os_students || []).length, 15);
  check('backup file has no session/lesson/exam/quiz keys yet (none written)',
    ['teach_os_sessions', 'teach_os_lessons', 'teach_os_exams', 'teach_os_quiz']
      .every(k => !Object.prototype.hasOwnProperty.call(backupJson.data, k)), true);

  const lastExport = await page.evaluate(() => localStorage.getItem('teach_os_last_export'));
  check('teach_os_last_export stamped after export', typeof lastExport, 'string');
  check('backup status updated after export', await page.locator('#backup-status').textContent(),
    t => t.startsWith('Last backup:'));

  // ── Mutate the store AFTER the export: add a 16th student via the real UI
  await page.click('.nav-item:has-text("All Students")');
  await page.click('#page-students .btn-primary:has-text("Add Student")');
  await page.fill('#new-student-name', 'Test Backup Student');
  await page.selectOption('#new-student-curr', 'IBDP HL');
  await page.fill('#new-student-level', 'Grade 12');
  await page.selectOption('#new-student-day', 'Wednesday');
  await page.fill('#new-student-time', '5:00 PM');
  await page.fill('#new-student-parent', 'Mrs. Backup — 90000XXXXX');
  await page.fill('#new-student-focus', 'Backup regression fixture');
  await page.click('#modal-add-student .btn-primary:has-text("Add Student")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  check('student count 15 -> 16 after add', students.length, 16);

  await page.click('.nav-item:has-text("Backup & Restore")');

  // ── Prediction 5a: non-JSON file
  const junkPath = path.join(tmpDir, 'junk.json');
  fs.writeFileSync(junkPath, 'not json at all {{{');
  await page.locator('#restore-file-input').setInputFiles(junkPath);
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('not a valid backup file'));
  students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  check('non-JSON restore attempt leaves store unchanged (still 16)', students.length, 16);

  // ── Prediction 5b: valid JSON, wrong shape
  const wrongShapePath = path.join(tmpDir, 'wrong-shape.json');
  fs.writeFileSync(wrongShapePath, JSON.stringify({ hello: 'world' }));
  await page.locator('#restore-file-input').setInputFiles(wrongShapePath);
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('not a recognized backup'));
  students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  check('wrong-shape restore attempt leaves store unchanged (still 16)', students.length, 16);

  // ── Prediction 6: valid file, but confirm is dismissed -- no change
  dialogAction = 'dismiss';
  await page.locator('#restore-file-input').setInputFiles(goodBackupPath);
  await page.waitForTimeout(300);
  students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  check('dismissed-confirm restore leaves store unchanged (still 16)', students.length, 16);
  check('dismissed-confirm restore did not add the extra test student twice',
    students.filter(s => s.name === 'Test Backup Student').length, 1);

  // ── Prediction 7: valid file, confirm accepted -- real restore + reload
  dialogAction = 'accept';
  await page.locator('#restore-file-input').setInputFiles(goodBackupPath);
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('restored'));
  await page.waitForEvent('load', { timeout: 5000 });
  await page.waitForTimeout(300);
  await page.click('.nav-item:has-text("All Students")');

  students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  check('after accepted restore: back to 15 students', students.length, 15);
  check('after accepted restore: the post-export addition is gone',
    students.some(s => s.name === 'Test Backup Student'), false);
  check('after accepted restore: table shows 15 rows', await page.locator('#students-table tbody tr').count(), 15);

  check('no console errors across the whole run', consoleErrors, e => e.length === 0);
  check('no uncaught page errors across the whole run', pageErrors, e => e.length === 0);
  if (consoleErrors.length) console.log('console errors:', consoleErrors);
  if (pageErrors.length) console.log('page errors:', pageErrors);

  await browser.close();
} finally {
  server.stop();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

process.exit(summary(APP_URL));
