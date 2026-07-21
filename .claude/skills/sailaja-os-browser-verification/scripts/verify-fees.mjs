// verify-fees.mjs — regression for sailaja-os-frontier-and-method Item 3,
// the fees & payments ledger (built on explicit owner sign-off 2026-07-21,
// per that item's gate #1 -- "ask the owner whether Sailaja actually wants
// fee tracking here").
//
// PREDICTIONS, written before this script was first run (2026-07-21):
//  1. A new student created with a Monthly Fee set shows "Due — <current
//     month>" on their profile before any payment is recorded, and "No
//     payments recorded yet." in the payments list.
//  2. Recording a payment for the current month flips the status to
//     "Paid — <current month>" and the payment appears in the list.
//  3. RELOAD: both survive — the actual persistence proof.
//  4. NEGATIVE: a student with no Monthly Fee configured shows "No fee set"
//     (not "Due"), and never got a fake amount invented for them.
//  5. Fee Reminder "Copy" with no student selected changes nothing on the
//     clipboard (alerts and aborts before ever touching it) -- NEGATIVE.
//  6. Fee Reminder "Copy" with a student selected who HAS a monthly fee
//     copies text containing their real parent name, the real current
//     month, and the real amount -- none of the three literal
//     [Parent Name]/[Month]/[Amount] placeholders survive. [Date] and
//     [UPI ID] remain literal placeholders by design (not stored data).
//  7. Fee Reminder "Copy" for a student with NO monthly fee configured
//     still fills in real parent name and month, but leaves [Amount]
//     literal rather than inventing a number.
//  8. Deleting a student cascades: their payment records are gone from
//     teach_os_payments, and both student-select dropdowns (payment modal,
//     fee reminder) drop them from their option list.
//  9. The Backup & Restore export includes teach_os_payments (cross-feature
//     fix: Item 4's BACKUP_KEYS was updated when this key was added).
//  10. Zero console/page errors throughout.

import { loadPlaywright, startServer, makeChecker, collectErrors, APP_URL, DB_KEY, BASE } from './lib.mjs';

const PAYMENTS_KEY = 'teach_os_payments';
const { chromium } = await loadPlaywright();
const server = await startServer();
const { check, summary } = makeChecker();

try {
  const browser = await chromium.launch();
  const context = await browser.newContext({ timezoneId: 'Asia/Kolkata' });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = collectErrors(page);
  page.on('dialog', d => d.accept()); // deleteStudent()/the fee-reminder no-student alert()

  await page.goto(APP_URL, { waitUntil: 'load' });
  await page.waitForTimeout(300);

  const currentMonthLabel = await page.evaluate(() => formatMonthLabel(currentMonthKey()));

  // ── Add a student WITH a monthly fee, via the real UI
  await page.click('.nav-item:has-text("All Students")');
  await page.click('#page-students .btn-primary:has-text("Add Student")');
  await page.fill('#new-student-name', 'Test Fees Student');
  await page.selectOption('#new-student-curr', 'CBSE');
  await page.fill('#new-student-level', 'Grade 8');
  await page.selectOption('#new-student-day', 'Monday');
  await page.fill('#new-student-time', '4:00 PM');
  await page.fill('#new-student-parent', 'Mrs. Fees — 90000XXXXX');
  await page.fill('#new-student-fee', '2500');
  await page.click('#modal-add-student .btn-primary:has-text("Add Student")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  let students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), DB_KEY);
  const feesStudent = students.find(s => s.name === 'Test Fees Student');
  check('new student has the real monthlyFee stored', feesStudent && feesStudent.monthlyFee, 2500);
  const feesStudentId = feesStudent.id;

  // ── Prediction 1: Due, before any payment
  await page.locator(`tr[data-id="${feesStudentId}"]`).click();
  await page.waitForSelector('#modal-view-student.open');
  check('vs-fee prefilled with the real monthly fee', await page.locator('#vs-fee').inputValue(), '2500');
  check('fee status before any payment: Due', await page.locator('#vs-fee-status').textContent(), `Due — ${currentMonthLabel}`);
  check('payments list before any payment', await page.locator('#vs-payments').textContent(), 'No payments recorded yet.');

  // ── Prediction 2: record a payment via the real UI, status flips to Paid.
  // "+ Record Payment" closes the view-student modal first (matches the
  // existing "Log Session ->" convention -- two modal-bg elements open at
  // once would stack and intercept clicks), so the profile has to be
  // reopened afterward to see the updated status.
  await page.click('button:has-text("+ Record Payment")');
  await page.waitForSelector('#modal-add-payment.open');
  check('payment modal preselects the right student', await page.locator('#payment-student').inputValue(), String(feesStudentId));
  check('payment modal prefills amount from monthlyFee', await page.locator('#payment-amount').inputValue(), '2500');
  const prefilledMonth = await page.locator('#payment-month').inputValue();
  await page.click('#modal-add-payment .btn-primary:has-text("Save Payment")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  let payments = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), PAYMENTS_KEY);
  check('exactly 1 payment recorded', payments.length, 1);
  check('payment studentId matches', payments[0].studentId, feesStudentId);
  check('payment month matches the prefilled current month', payments[0].month, prefilledMonth);
  check('payment amount matches', payments[0].amount, 2500);

  await page.locator(`tr[data-id="${feesStudentId}"]`).click();
  await page.waitForSelector('#modal-view-student.open');
  check('fee status after payment: Paid', await page.locator('#vs-fee-status').textContent(), `Paid — ${currentMonthLabel}`);
  check('payments list shows the real payment', await page.locator('#vs-payments').textContent(),
    t => t.includes(currentMonthLabel) && t.includes('2500'));

  // ── Prediction 3: RELOAD — persistence proof
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.click('.nav-item:has-text("All Students")');
  await page.locator(`tr[data-id="${feesStudentId}"]`).click();
  await page.waitForSelector('#modal-view-student.open');
  check('after reload: fee status still Paid', await page.locator('#vs-fee-status').textContent(), `Paid — ${currentMonthLabel}`);
  check('after reload: payment still listed', await page.locator('#vs-payments').textContent(),
    t => t.includes(currentMonthLabel) && t.includes('2500'));
  await page.click('#modal-view-student .btn-ghost:has-text("Close")');

  // ── Prediction 4: NEGATIVE — a student with no fee configured
  await page.locator('tr[data-id="1"]').click(); // Aarav T., never given a monthlyFee
  await page.waitForSelector('#modal-view-student.open');
  check('student with no monthlyFee: fee status is "No fee set", not Due', await page.locator('#vs-fee-status').textContent(), 'No fee set');
  check('student with no monthlyFee: no payments either', await page.locator('#vs-payments').textContent(), 'No payments recorded yet.');
  await page.click('#modal-view-student .btn-ghost:has-text("Close")');

  // ── Prediction 5: Copy with no student selected touches nothing
  await page.evaluate(() => navigator.clipboard.writeText('unchanged-marker'));
  await page.click('.nav-item:has-text("Parent Comms")');
  await page.click('#page-comms .comm-card:has-text("Fee Reminder") button:has-text("Copy")');
  await page.waitForTimeout(150);
  check('Copy with no student selected leaves clipboard untouched',
    await page.evaluate(() => navigator.clipboard.readText()), 'unchanged-marker');

  // ── Prediction 6: Copy with a fee-configured student selected
  await page.selectOption('#fee-reminder-student', String(feesStudentId));
  await page.click('#page-comms .comm-card:has-text("Fee Reminder") button:has-text("Copy")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show') &&
    document.getElementById('toast').textContent.includes('real details'));
  const feeCopyText = await page.evaluate(() => navigator.clipboard.readText());
  check('fee reminder copy: real parent name present', feeCopyText.includes('Mrs. Fees — 90000XXXXX'), true);
  check('fee reminder copy: real month present', feeCopyText.includes(currentMonthLabel), true);
  check('fee reminder copy: real amount present', feeCopyText.includes('₹2500'), true);
  check('fee reminder copy: no literal [Parent Name] left', feeCopyText.includes('[Parent Name]'), false);
  check('fee reminder copy: no literal [Month] left', feeCopyText.includes('[Month]'), false);
  check('fee reminder copy: no literal [Amount] left (real fee was configured)', feeCopyText.includes('[Amount]'), false);
  check('fee reminder copy: [Date] stays a manual placeholder by design', feeCopyText.includes('[Date]'), true);

  // ── Prediction 7: Copy for a student with no fee configured
  await page.selectOption('#fee-reminder-student', '1'); // Aarav T., no monthlyFee
  await page.click('#page-comms .comm-card:has-text("Fee Reminder") button:has-text("Copy")');
  await page.waitForTimeout(150);
  const noFeeCopyText = await page.evaluate(() => navigator.clipboard.readText());
  check('no-fee student copy: real month still present', noFeeCopyText.includes(currentMonthLabel), true);
  check('no-fee student copy: [Amount] stays literal, no invented number', noFeeCopyText.includes('[Amount]'), true);

  // ── Prediction 8: cascade delete
  const paymentSelectCountBefore = await page.locator('#payment-student option').count();
  await page.click('.nav-item:has-text("All Students")');
  await page.locator(`tr[data-id="${feesStudentId}"]`).click();
  await page.waitForSelector('#modal-view-student.open');
  await page.click('#modal-view-student .btn-ghost:has-text("Delete")');
  await page.waitForFunction(() => document.getElementById('toast').classList.contains('show'));

  payments = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), PAYMENTS_KEY);
  check('after delete: cascade removed the payment record', payments.length, 0);
  check('payment-student select dropped the deleted student',
    await page.locator('#payment-student option').count(), paymentSelectCountBefore - 1);
  check('fee-reminder-student select dropped the deleted student',
    await page.locator(`#fee-reminder-student option[value="${feesStudentId}"]`).count(), 0);

  // ── Prediction 9: backup export includes the payments key
  await page.click('.nav-item:has-text("Backup & Restore")');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Download Backup")'),
  ]);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const backupJson = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  check('backup payload includes teach_os_payments key', Object.prototype.hasOwnProperty.call(backupJson.data, 'teach_os_payments'), true);

  check('no console errors across the whole run', consoleErrors, e => e.length === 0);
  check('no uncaught page errors across the whole run', pageErrors, e => e.length === 0);
  if (consoleErrors.length) console.log('console errors:', consoleErrors);
  if (pageErrors.length) console.log('page errors:', pageErrors);

  await browser.close();
} finally {
  server.stop();
}

process.exit(summary(APP_URL));
