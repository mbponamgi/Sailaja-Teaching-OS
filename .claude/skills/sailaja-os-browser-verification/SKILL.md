---
name: sailaja-os-browser-verification
description: >
  MANDATORY pre-ship verification discipline for the Sailaja Teaching OS.
  Load this skill when: about to commit ANY behavior change; asked to verify
  or test a change; writing a verify script; seeding or reading
  `teach_os_students`/`sailaja-dark` in localStorage; testing the daily-use
  campaign's persistence work (students, sessions, lessons, exams, quiz
  questions); testing the tweaks panel (vanilla JS since 2026-07-21, no
  React), offline-completeness (zero external requests, also since
  2026-07-21), the Backup & Restore export/import feature (also since
  2026-07-21), live nav-badge/subtitle/stat-card counts and the CBSE Recent
  Sessions cards (also since 2026-07-21), the fees & payments ledger (also
  since 2026-07-21), the schedule-aware dashboard (also since 2026-07-21 —
  the "This Week" stat, the subgreeting's class/exam counts, and the
  "Upcoming Sessions" card), or lesson/exam/quiz edit and delete (also
  since 2026-07-21 — Phase 3(d) was add-only at first, edit/delete added
  same day on explicit owner request); or whenever "how do I test this"
  comes up. Encodes the house rule (non-negotiable #1 in
  sailaja-os-change-control): no change ships on "looks right" alone —
  serve the app locally, drive the real UI with headless Playwright, and
  print PASS/FAIL evidence. Ships eleven working scripts (smoke test, store
  dumper/seeder, student/session CRUD-and-reload regression, lesson/exam/quiz
  add CRUD-and-reload regression, lesson/exam/quiz edit-and-delete
  regression, tweaks-panel control-interaction regression,
  offline-completeness regression, backup-export-restore round-trip
  regression, live-counts-and-recent-sessions regression, fees-ledger
  regression, schedule-aware-dashboard regression) plus the shared plumbing
  they all use.
---

# Sailaja OS Browser Verification

The Sailaja Teaching OS is a zero-build single-file app (`index.html`, no
`package.json`, no test framework — see `sailaja-os-architecture-contract`).
**Verification here means: serve the repo, launch headless Playwright, drive
the real UI (or read/seed its localStorage), and assert outcomes with printed
evidence.** This skill is the *how*; `sailaja-os-change-control` is the
*when/what* (which change classes require a run); `sailaja-os-data-model-and-migrations`
is the *schema* of what you're seeding.

**Why this is non-negotiable, in one sentence:** this repo's own HEAD commit
(`9fef6e5`) shipped a feature that never once executed and looked perfect for
over two months — full incident: `sailaja-os-change-control` §1,
`sailaja-os-failure-archaeology` Incident 1. A screenshot or "the diff is
obviously correct" would not have caught it; a script asserting
`typeof addNewStudent === 'function'` would have, instantly. **This is not
hypothetical**: the same discipline caught a second, independent bug the
moment the fix landed (2026-07-21) — `initDatabase()`'s scraper threw on the
first A1/A2 row (no `.badge` span on that column) and silently produced zero
records; `verify-crud.mjs`'s very first assertion failed and pointed straight
at it (`sailaja-os-failure-archaeology` Incident 2).

## Quick start

```bash
cd /Users/mponamgi/Documents/sailaja-teaching-tuition-OS

# This repo has no local playwright install (no package.json at all).
# Point PW_PATH at any machine-local node_modules that has it — the sibling
# Family Finance OS repo's install works and is what verified the scripts
# below (adjust the path if that repo ever moves):
export PW_PATH=/Users/mponamgi/Documents/Personal-finance-tracker/node_modules

# 1. Prove the app boots clean (run after ANY change, before anything else):
node .claude/skills/sailaja-os-browser-verification/scripts/smoke.mjs

# 2. After any change touching students/sessions, run the full CRUD+reload
#    regression (the daily-use-campaign's stated success metric, executable):
node .claude/skills/sailaja-os-browser-verification/scripts/verify-crud.mjs

# 3. After any change touching lessons/exams/quiz questions:
node .claude/skills/sailaja-os-browser-verification/scripts/verify-content-crud.mjs

# 4. After any change to tweaks-panel.js or mountTweaks():
node .claude/skills/sailaja-os-browser-verification/scripts/verify-tweaks-panel.mjs

# 5. After any change to vendored assets or anything network-adjacent:
node .claude/skills/sailaja-os-browser-verification/scripts/verify-offline.mjs

# 6. After any change to exportData()/handleRestoreFile() or the Backup &
#    Restore page:
node .claude/skills/sailaja-os-browser-verification/scripts/verify-backup.mjs

# 7. After any change to renderLiveCounts()/renderCBSERecentSessions(), or
#    to any nav badge/subtitle/stat-card/CBSE-Recent-Sessions element:
node .claude/skills/sailaja-os-browser-verification/scripts/verify-live-counts.mjs

# 8. After any change to logPayment()/renderViewStudentPayments()/
#    copyFeeReminder(), monthlyFee, or the Fees section of the student
#    profile:
node .claude/skills/sailaja-os-browser-verification/scripts/verify-fees.mjs

# 9. After any change to renderScheduleAwareDashboard(), scheduleDayNum(),
#    computeWeekClassCount(), computeUpcomingExamsCount(), or the
#    dashboard's This Week/subgreeting/Upcoming Sessions elements:
node .claude/skills/sailaja-os-browser-verification/scripts/verify-schedule.mjs

# 10. After any change to openEditLessonModal()/deleteLesson(),
#     openEditExamModal()/deleteExam(), openEditQuizModal()/
#     deleteQuizQuestion(), or the add/edit shared-modal state
#     (editingLessonId/editingExamId/editingQuizId):
node .claude/skills/sailaja-os-browser-verification/scripts/verify-content-edit-delete.mjs

# 11. Inspect or seed the persistent test-profile store (no app JS runs):
node .claude/skills/sailaja-os-browser-verification/scripts/dump-store.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/dump-store.mjs /path/to/seed.json

# 12. For a new behavior change, copy smoke.mjs's or verify-crud.mjs's
#    structure into a throwaway verify-<change>.mjs (scratch dir, never
#    committed) and adapt the DRIVE/ASSERT section — see "Writing a new
#    verify script" below.
```

Scripts are `.mjs` (this repo has no `"type": "module"` package.json to force
the choice — `.mjs` is explicit and matches this skill's own imports). They
`import` from `lib.mjs` in the same directory, so run them with that relative
path intact (don't copy just one file out).

**Installing Playwright properly in THIS repo** (preferred over borrowing
`PW_PATH` long-term — adding a `package.json` is itself a class-(g)/(e)
change, see `sailaja-os-change-control`, and needs the same owner awareness
as any new tooling):
```bash
npm init -y && npm i -D playwright && npx playwright install chromium
```

## What counts as evidence

Same standard as the sibling FFOS repo (`ffos-browser-verification`), adapted:

- PASS/FAIL lines with expected vs. actual, printed and pasted into your
  report/commit — not paraphrased, not "ran clean".
- `page.on('console')` (type `'error'`) and `page.on('pageerror')` captured
  from **before** `page.goto`, asserted empty at the end — a passing feature
  check does not excuse an uncaught exception elsewhere on the page.
- "Screenshot looks right" — **no**, not on its own. This app's whole founding
  incident is a UI that looked perfect while writing zero data (`toast`
  messages fire regardless of whether `saveAndClose()` or a real save
  handler ran — see `sailaja-os-failure-archaeology` Incident 1). Screenshots
  are supplementary only.
- Assert at the layers that exist here: (1) localStorage — `teach_os_students`
  / `sailaja-dark` via `page.evaluate`; (2) DOM — rendered row counts/text;
  (3) zero console/page errors/failed requests across the whole run.

## Shipped scripts (`scripts/`, all default to port 8931)

| Script | What it does | When to run |
|---|---|---|
| `lib.mjs` | Shared plumbing: Playwright resolution (`PW_PATH` fallback), canonical server (port 8931, fail-fast if busy), PASS/FAIL checker, console/page error collectors, the persistent test-profile dir, `DB_KEY`/`DARK_KEY` constants | Imported by every other script — not run directly |
| `smoke.mjs` | Boots the app in a **throwaway** context, asserts sidebar renders, dashboard is the default active page, `initDatabase()` scrapes exactly 15 students, `addNewStudent` is a real function, `teach_os_students` is written, the tweaks panel renders once activated via `postMessage`, `toggleDark()` flips `sailaja-dark`, zero console/page errors/failed requests | After every change; the minimum bar |
| `verify-crud.mjs` | The daily-use-campaign's stated success metric, executable: add a student via the real form → log a session for them via the row's "Log" button → edit their name via the profile modal → **reload the page** → delete them (cascade-removes their session). Asserts exact counts and field values at every step, including post-reload. Negative controls: dark mode, `filterStudents`, zero console/page errors throughout | After any change touching students, sessions, or the view-student/add-session modals — this is the one that actually proves persistence, not just that a function exists |
| `verify-content-crud.mjs` | Phase 3(d)'s regression: add a lesson, an exam (linked to a real student), and a quiz question via their real forms, asserts each new store (`teach_os_lessons`/`teach_os_exams`/`teach_os_quiz`) went 0→1 with correct derived fields, the "hidden until non-empty" cards become visible, the dynamic quiz card's `answerQuiz()` click reports correctly, **reloads**, and re-asserts all three. Negative controls: the 4 static quiz cards stay exactly 4, `addNewStudent`/`logSession` unaffected | After any change touching lessons, exams, or quiz questions |
| `verify-content-edit-delete.mjs` | Edit/delete added on top of Phase 3(d) (explicit owner request, same day): for each of lessons/exams/quiz — add, open Edit (asserts every field prefilled + modal title/button relabeled), Cancel (asserts NO change persisted), "+ New ..." again (asserts a genuinely new second record, not a leaked overwrite — the shared add/edit modal's `editingXId` state doesn't survive a cancel), a real edit saved in place (same id, array length unchanged), **reload** (edit survives), delete, **reload** (deletion survives). For quiz specifically also re-clicks the now-edited correct option and asserts it reports Correct, not the old answer. Negative controls throughout: the static lesson-bank cards, the static exam calendar table, and the 4 static quiz cards are never touched | After any change to `openEditLessonModal()`/`deleteLesson()`, `openEditExamModal()`/`deleteExam()`, `openEditQuizModal()`/`deleteQuizQuestion()`, or the `addLesson()`/`addExam()`/`addQuizQuestion()` add-vs-edit branching |
| `verify-tweaks-panel.mjs` | Interaction regression for the vanilla (no React) tweaks panel rewrite (2026-07-21): activates the panel, drives every control type — toggle, slider, color, text, radio — and asserts each one's real side effect (CSS var change, `.sidebar` width, `.student-parent` visibility, dashboard greeting text), then closes it and asserts DOM cleanup + the `__edit_mode_dismissed` postMessage | After any change to `tweaks-panel.js` or to `mountTweaks()`'s composition in `index.html` |
| `verify-offline.mjs` | Offline-completeness — the exact success metric `sailaja-os-frontier-and-method` Item 2 states: every non-localhost network route aborted, asserts 0 requests attempted, app still fully functional (students scraped, `addNewStudent` callable, tweaks panel mounts), fonts confirmed loaded via `document.fonts` | After any change to vendored assets (`vendor/fonts/`), `<head>` deps, or anything that could reintroduce an external request |
| `verify-backup.mjs` | Item 4's stated success metric: export the seeded store, capture the real downloaded file, mutate the store (add a 16th student) AFTER the export, then restore from the file and assert the store snapshots back to exactly the pre-mutation state. Negative controls: a non-JSON file, a valid-JSON-wrong-shape file, and a dismissed confirm dialog each leave the store completely untouched; also asserts the on-load backup-staleness nudge toast fires when no export has ever happened | After any change to `exportData()`, `handleRestoreFile()`, `renderBackupStatus()`, `checkBackupNudge()`, or the Backup & Restore page |
| `verify-live-counts.mjs` | Item 5's "Live counts" + "Real Recent Sessions" nice-to-haves: asserts nav badges/dashboard stat cards/page-subtitle counts/Students-page filter-bar counts (`sailaja-os-architecture-contract` W7) all read the real 15-student seed (catching that the old hardcoded "14" was already wrong); asserts the 3 CBSE "Recent Sessions" cards start honestly empty, then render a real logged session for their tracked student (`Aarav T.`) while the other two tracked cards and a session for an UNtracked student (`Rohan K.`) leave them unaffected (negative controls); drives add/edit-curriculum/delete through the real UI and asserts every wired count shifts correctly; **reloads** and re-asserts everything | After any change to `renderLiveCounts()`, `renderCBSERecentSessions()`, or any element they write to |
| `verify-fees.mjs` | Item 3's fees & payments ledger: adds a student with a real `monthlyFee`, asserts "Due" status and an empty payment list before any payment, records a payment via the real UI, asserts the status flips to "Paid" and **survives a reload**; negative controls — a student with no `monthlyFee` reads "No fee set" (never a fabricated "Due" or invented amount); the Fee Reminder Copy button with no student selected leaves the clipboard untouched (checked against a pre-seeded marker string) and alerts instead; Copy for a fee-configured student fills in real parent name/month/amount with zero literal placeholders left; Copy for a no-fee student still fills real name/month but leaves `[Amount]` literal; deleting a student cascades their payment records and drops them from both student-select dropdowns; asserts the Backup & Restore export includes `teach_os_payments` (the cross-feature `BACKUP_KEYS` fix) | After any change to `logPayment()`, `renderViewStudentPayments()`, `copyFeeReminder()`, `monthlyFee`, or the Fees section of the student profile |
| `verify-schedule.mjs` | Item 5's last sub-item, the schedule-aware dashboard — its stated milestone verbatim ("dashboard counts computed from stored schedules match a hand-counted seed"): hand-counts the 15 seeded students' known weekly day independently of the app's own parsing code and asserts `#stat-thisweek`/the subgreeting/the Upcoming Sessions top-5 order all agree; negative controls — a past-dated exam does NOT increment "exams coming up" (a future-dated one does); a new student scheduled on an already-passed day this week does NOT change the week-class count (one scheduled inside the remaining window does); editing a student's schedule out of the window decrements the count; **reloads** and re-asserts everything | After any change to `renderScheduleAwareDashboard()`, `scheduleDayNum()`, `computeWeekClassCount()`, `computeUpcomingExamsCount()`, or the dashboard's This-Week/subgreeting/Upcoming-Sessions elements |
| `dump-store.mjs` | Uses a **persistent** test-profile context (survives across separate runs) to read, and optionally seed, `teach_os_students` — navigates to a same-origin 404 page (`NO_APP_URL`) so **zero app script runs**, meaning it never triggers `initDatabase()`'s one-shot first-run scrape | Inspecting the store shape; seeding old- or new-shape data for a migration test; preparing fixture state before a behavior-change verify script drives the real UI |

All three were run for real (`smoke.mjs`/`dump-store.mjs` authored
2026-07-21 against the then-dead persistence layer; `verify-crud.mjs`
authored the same day immediately after the daily-use-campaign Phase 1-3 fix
landed, and both smoke.mjs and dump-store.mjs's assertions were updated to
match) — recorded output below.

## Writing a new verify script

1. **Copy `smoke.mjs`'s shape**, not its assertions: import from `lib.mjs`,
   decide throwaway context (behavior you're about to change fresh) vs.
   `dump-store.mjs`'s persistent-profile pattern (you need seeded state to
   already exist when the app boots).
2. **Seed before `goto`, not after** — same trap as every localStorage app:
   if you need `teach_os_students` populated when `index.html` loads (e.g.
   testing the post-campaign renderer), use
   `page.addInitScript(seed => localStorage.setItem(DB_KEY, JSON.stringify(seed)), SEED)`
   before `page.goto`, not `page.evaluate` after — by then `initDatabase()`
   has already run its one-shot check.
3. **Prefer real clicks over calling app functions.** `showPage('students')`,
   `openModal('add-student')`, `closeModal(id)`, `filterStudents(filter, el)`
   are all reachable via `page.evaluate` as an escape hatch, but a click on
   the actual nav button / row / filter chip is what you're claiming to
   verify.
4. **Run it, get an honest PASS, paste the real output** into your
   report/commit. Never weaken an assertion to make it pass.
5. **Delete the throwaway** when done. A script graduates into this skill's
   `scripts/` dir only as its own change-controlled commit, with this table
   and the recorded-output section updated to match a real run.

### Selectors and flows verified against `index.html` (2026-07-21, HEAD `9fef6e5`)

| Target | Selector / action |
|---|---|
| Pages | `page.locator('#page-<id>.active')` — ids: dashboard (default), students, a1a2, cbse, cambridge, ibdp, lessons, schedule, exams, quizzes, comms, resources; switched via `onclick="showPage('<id>')"` nav buttons |
| Modals | `openModal('<id>')` / `closeModal('<id>')`; ids include `add-student`, `add-session`, `view-student`, `add-lesson`, `add-exam`, `add-quiz`; open modal is `.modal-bg#modal-<id>` becoming visible |
| Dark mode | `toggleDark()` (global fn); flag in `localStorage['sailaja-dark']`, `'1'`/`'0'` |
| Add-student form | `#new-student-name`, `#new-student-curr`, `#new-student-level`, `#new-student-day`, `#new-student-time`, `#new-student-parent`, `#new-student-focus`; Save button calls `addNewStudent()` — live since the daily-use-campaign fix |
| Add-session form | `#session-student` (dynamically populated, value = student id), `#session-date`, `#session-topic`, `#session-performance`, `#session-homework`, `#session-notes`, `#session-parent-update`; Save calls `logSession()`. Open via a row's "Log" button (`openSessionModalFor(id)`, preselects that student) or any generic "+ Log Session" button (`openModal('add-session')`, no preselection) |
| View/edit/delete student | `#vs-name`, `#vs-curr`, `#vs-level`, `#vs-schedule`, `#vs-progress`, `#vs-parent`, `#vs-focus`, `#vs-sessions` (read-only recent-sessions list); Save calls `saveStudentEdit()`, Delete calls `deleteStudent()` (fires a native `confirm()` — register `page.on('dialog', d => d.accept())` before triggering it) |
| Student table rows | `#students-table tbody tr[data-id="<id>"]` — 15 rows scraped from the static seed on first load, dynamically re-rendered on every add/edit/delete; row click calls `viewStudent(id)` |
| add-lesson / add-exam / add-quiz forms | No `id`s on inputs; Save buttons still call `saveAndClose('<modal-id>', '<toast message>')` — out of the daily-use-campaign's scope unless Sailaja asks (`sailaja-os-frontier-and-method` Item 5) |
| Tweaks panel | Renders `null` until activated: `page.evaluate(() => window.postMessage({type:'__activate_edit_mode'}, '*'))`, then `#tweaks-root` gets children. This is the component's own design (an edit-mode overlay), not something the campaign fix changed |

## Recipes

### Seeding `teach_os_students` before load (for a future post-campaign test)

```js
await page.addInitScript(seed => {
  localStorage.setItem('teach_os_students', JSON.stringify(seed));
}, SEED);
await page.goto(APP_URL, { waitUntil: 'load' });
```

Canonical seed shape and the three-record fixture (float id, integer id, all
three badge-mapping branches): `sailaja-os-data-model-and-migrations` §6.
`dump-store.mjs` takes the same JSON shape as a CLI arg.

### Reading the store without running app JS

```js
// dump-store.mjs's approach — a same-origin 404 page runs no app script,
// so reading (or writing) localStorage here can never trigger initDatabase()
// or any other page behavior as a side effect:
await page.goto(NO_APP_URL, { waitUntil: 'load' });
const raw = await page.evaluate(k => localStorage.getItem(k), 'teach_os_students');
```

### Asserting

```js
const students = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), 'teach_os_students');
const rows = await page.locator('#students-table tbody tr').count();
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', e => pageErrors.push(String(e)));
```

## Failure interpretation

- **`typeof addNewStudent === 'undefined'`** — the persistence layer has
  regressed to (or toward) the pre-campaign dead state. Re-read
  `sailaja-os-failure-archaeology` Incident 1 before touching anything;
  check `grep -n 'text/babel' index.html` first (should be empty except in
  comments referencing the old incident).
- **`initDatabase()` writes fewer than 15 records, or `teach_os_students`
  stays `null` after load** — the scraper threw partway through. Check for a
  static row whose markup doesn't match what the scraper expects (this
  exact failure mode is Incident 2 in `sailaja-os-failure-archaeology`: the
  A1/A2 rows' level cell has no `.badge` span). Diagnose with
  `page.on('pageerror', ...)` registered before `goto` — the exception is
  silent in the DOM, loud in `pageerror`.
- **`page.goto` fails / `ERR_CONNECTION_REFUSED`** — server not running or
  wrong port. `lib.mjs`'s `startServer()` fails fast if port 8931 is already
  in use by something else — free it (`lsof -ti :8931 | xargs kill`) rather
  than silently reusing an unknown server.
- **`FATAL: playwright not resolvable`** — no local install and no `PW_PATH`.
  Either `npm init -y && npm i -D playwright && npx playwright install
  chromium` in this repo, or export `PW_PATH` at a machine-local
  `node_modules` containing it (Quick start above).
- **Console error but no pageerror, or vice versa** — capture both always
  (`collectErrors` in `lib.mjs` does this by default). A syntax error inside
  `<script type="text/babel">` is a case where neither fires at load (the
  browser silently skips the whole block, per the founding incident) — the
  absence of an error is itself part of that mechanism's proof, not evidence
  of health. See `sailaja-os-failure-archaeology` Incident 1.

## Recorded outputs

**`smoke.mjs`** (real run, 2026-07-21, post-campaign-fix, HEAD still
`9fef6e5` — the fix is a working-tree change not yet committed at time of
writing; re-run after committing to confirm the recorded output still
holds):

```
PASS  sidebar brand renders  (actual: true)
PASS  dashboard is the default active page  (actual: true)
PASS  initDatabase scraped exactly 15 students into the dynamic render  (actual: 15)
PASS  addNewStudent is a real function  (actual: "function")
PASS  teach_os_students is written on first load  (actual: true)
PASS  tweaks-panel.js globals load (plain <script src>)  (actual: "function")
PASS  tweaks panel renders once activated  (actual: 2)
PASS  toggleDark() flips sailaja-dark  (actual: true)
PASS  no console errors at load  (actual: [])
PASS  no uncaught page errors at load  (actual: [])
PASS  no failed requests  (actual: [])

PASS: 11/11 checks passed (http://localhost:8931/index.html)
```

Superseded output (pre-fix, same day): the previous version of this script
asserted the founding defect itself (`addNewStudent` undefined,
`teach_os_students` null) and passed `11/11` proving the app was still
broken. That version is preserved in `sailaja-os-failure-archaeology`
Incident 1's evidence section, not here — this section always reflects
current expected behavior, not history.

**`verify-crud.mjs`** (real run, 2026-07-21, immediately after the fix):

```
PASS  addNewStudent is a real function  (actual: "function")
PASS  initDatabase scraped 15 students  (actual: 15)
PASS  tweaks panel renders once activated  (actual: 2)
PASS  student count 15 -> 16  (actual: 16)
PASS  new student is unshifted to front  (actual: "Test Playwright")
PASS  currBadge derived correctly  (actual: "IBDP")
PASS  curr derived correctly  (actual: "ibdp")
PASS  band derived correctly (IBDP always senior)  (actual: "senior")
PASS  session-student preselected to the right student  (actual: "16")
PASS  exactly 1 session logged  (actual: 1)
PASS  session studentId matches  (actual: 16)
PASS  view-student profile pre-filled with real data  (actual: "Test Playwright")
PASS  name updated in store  (actual: "Test Playwright Edited")
PASS  edited name renders in table  (actual: "Test Playwright Edited")
PASS  after reload: still 16 students  (actual: 16)
PASS  after reload: edited name survived  (actual: "Test Playwright Edited")
PASS  after reload: session still there  (actual: 1)
PASS  after reload: table still shows 16 rows  (actual: 16)
PASS  after delete: back to 15 students  (actual: 15)
PASS  after delete: cascade removed the session  (actual: 0)
PASS  deleted student gone from table  (actual: 0)
PASS  dark mode toggle unaffected  (actual: true)
PASS  filterStudents unaffected (still a function)  (actual: "function")
PASS  no console errors across the whole run  (actual: [])
PASS  no uncaught page errors across the whole run  (actual: [])

PASS: 25/25 checks passed (http://localhost:8931/index.html)
```

**`verify-content-crud.mjs`** (real run, 2026-07-21, Phase 3(d), built on
owner request immediately after the core persistence fix):

```
PASS  lessons card hidden when empty  (actual: false)
PASS  lesson count 0 -> 1  (actual: 1)
PASS  lesson curr derived to cambridge  (actual: "cambridge")
PASS  lessons card now visible  (actual: true)
PASS  lesson title rendered  (actual: "Test Lesson — Subjonctif")
PASS  exams card hidden when empty  (actual: false)
PASS  exam count 0 -> 1  (actual: 1)
PASS  exam resolved to the real student name  (actual: "Aarav T.")
PASS  exams card now visible  (actual: true)
PASS  exam row shows the student name  (actual: "Aarav T.")
PASS  4 static quiz cards present before adding  (actual: 4)
PASS  quiz count 0 -> 1  (actual: 1)
PASS  static quiz cards still exactly 4 (dynamic ones are separate)  (actual: 4)
PASS  dynamic quiz card rendered  (actual: "5. Test question: \"chat\" means?")
PASS  clicking the correct option shows the correct toast  (actual: "✓ Correct! Très bien!")
PASS  after reload: lesson count still 1  (actual: 1)
PASS  after reload: exam count still 1  (actual: 1)
PASS  after reload: quiz count still 1  (actual: 1)
PASS  after reload: lessons card still visible  (actual: true)
PASS  after reload: exams card still visible  (actual: true)
PASS  after reload: dynamic quiz card still rendered  (actual: 1)
PASS  after reload: 4 static quiz cards unaffected  (actual: 4)
PASS  addNewStudent still a function  (actual: "function")
PASS  logSession still a function  (actual: "function")
PASS  no console errors across the whole run  (actual: [])
PASS  no uncaught page errors across the whole run  (actual: [])

PASS: 26/26 checks passed (http://localhost:8931/index.html)
```

**`verify-tweaks-panel.mjs`** (real run, 2026-07-21, immediately after the
React-removal rewrite):

```
PASS  4 tweak sections rendered  (actual: 4)
PASS  panel header present (draggable handle)  (actual: 1)
PASS  parent contact visible before toggle  (actual: true)
PASS  parent contact hidden after toggling off  (actual: false)
PASS  parent contact visible again after toggling back on  (actual: true)
PASS  slider updates --sidebar-w CSS var live  (actual: "280px")
PASS  slider updates the real .sidebar element width live  (actual: "280px")
PASS  color picker updates --french-blue CSS var live  (actual: "#ff0000")
PASS  teacher name input updates the dashboard greeting live  (actual: "Bon après-midi, Test Teacher")
PASS  clicking "Cool" updates --bg to the cool palette  (actual: "#f0f2f5")
PASS  clicking "Cool" flips its own aria-checked to true  (actual: "true")
PASS  the previously-selected "Warm" option is no longer checked  (actual: "false")
PASS  panel removed from DOM after closing  (actual: 0)
PASS  __edit_mode_dismissed posted to parent  (actual: true)
PASS  addNewStudent still a function after all tweaks interaction  (actual: "function")
PASS  no console errors across the whole run  (actual: [])
PASS  no uncaught page errors across the whole run  (actual: [])

PASS: 17/17 checks passed (http://localhost:8931/index.html)
```

**`verify-offline.mjs`** (real run, 2026-07-21, after fonts were vendored —
`sailaja-os-frontier-and-method` Item 2's exact stated success metric,
achieved):

```
PASS  zero external requests attempted while offline  (actual: [])
PASS  sidebar renders offline  (actual: true)
PASS  dashboard is the active page offline  (actual: true)
PASS  initDatabase scraped 15 students offline  (actual: 15)
PASS  addNewStudent is a function offline  (actual: "function")
PASS  Figtree loaded from local file  (actual: ["Figtree","Instrument Serif","Instrument Serif"])
PASS  Instrument Serif loaded from local file  (actual: ["Figtree","Instrument Serif","Instrument Serif"])
PASS  tweaks panel mounts offline  (actual: 1)
PASS  no console errors while offline  (actual: [])
PASS  no uncaught page errors while offline  (actual: [])

PASS: 10/10 checks passed (http://localhost:8931/index.html)
```

**`verify-backup.mjs`** (real run, 2026-07-21, `sailaja-os-frontier-and-method`
Item 4's exact "you have a result when..." metric, achieved — full export →
mutate → restore round-trip, plus three negative controls):

```
PASS  initDatabase scraped 15 students  (actual: 15)
PASS  backup nudge toast fires on first load with no prior export  (actual: "⚠ It's been a while since your last backup — visit Backup & Restore.")
PASS  backup status before any export  (actual: "No backup has been downloaded yet.")
PASS  backup file version  (actual: 1)
PASS  backup file has exportedAt  (actual: "string")
PASS  backup file captured 15 students  (actual: 15)
PASS  backup file has no session/lesson/exam/quiz keys yet (none written)  (actual: true)
PASS  teach_os_last_export stamped after export  (actual: "string")
PASS  backup status updated after export  (actual: "Last backup: 7/21/2026, 2:54:32 PM (today)")
PASS  student count 15 -> 16 after add  (actual: 16)
PASS  non-JSON restore attempt leaves store unchanged (still 16)  (actual: 16)
PASS  wrong-shape restore attempt leaves store unchanged (still 16)  (actual: 16)
PASS  dismissed-confirm restore leaves store unchanged (still 16)  (actual: 16)
PASS  dismissed-confirm restore did not add the extra test student twice  (actual: 1)
PASS  after accepted restore: back to 15 students  (actual: 15)
PASS  after accepted restore: the post-export addition is gone  (actual: false)
PASS  after accepted restore: table shows 15 rows  (actual: 15)
PASS  no console errors across the whole run  (actual: [])
PASS  no uncaught page errors across the whole run  (actual: [])

PASS: 19/19 checks passed (http://localhost:8931/index.html)
```

**`verify-live-counts.mjs`** (real run, 2026-07-21, `sailaja-os-frontier-and-method`
Item 5's "Live counts" + "Real Recent Sessions" nice-to-haves, both achieved
— scope explicitly narrowed to exclude the schedule-aware dashboard
sub-item, which needs a structured schedule data model that doesn't exist
yet):

```
PASS  nav badge: students  (actual: "15")
PASS  nav badge: a1a2  (actual: "4")
PASS  nav badge: cbse  (actual: "5")
PASS  nav badge: cambridge  (actual: "4")
PASS  nav badge: ibdp  (actual: "2")
PASS  dashboard stat: students  (actual: "15")
PASS  dashboard stat: cbse  (actual: "5")
PASS  dashboard stat: cambridge  (actual: "4")
PASS  dashboard stat: ibdp  (actual: "2")
PASS  dashboard stat: a1a2  (actual: "4")
PASS  page subtitle: students count  (actual: "15")
PASS  filter bar: All count (W7 fix)  (actual: "15")
PASS  filter bar: CBSE count  (actual: "5")
PASS  filter bar: Cambridge count  (actual: "4")
PASS  filter bar: IBDP count  (actual: "2")
PASS  filter bar: A1/A2 count  (actual: "4")
PASS  page subtitle: a1a2 count  (actual: "4")
PASS  page subtitle: cbse count  (actual: "5")
PASS  page subtitle: cambridge count  (actual: "4")
PASS  page subtitle: ibdp count  (actual: "2")
PASS  cbse-primary-sessions empty before any session logged  (actual: "No sessions logged yet.")
PASS  cbse-middle-sessions empty before any session logged  (actual: "No sessions logged yet.")
PASS  cbse-senior-sessions empty before any session logged  (actual: "No sessions logged yet.")
PASS  nav badge: students 15 -> 16 after add  (actual: "16")
PASS  nav badge: cbse 5 -> 6 after add  (actual: "6")
PASS  filter bar: All 15 -> 16 after add  (actual: "16")
PASS  filter bar: CBSE 5 -> 6 after add  (actual: "6")
PASS  dashboard stat updates too (students)  (actual: "16")
PASS  dashboard stat updates too (cbse)  (actual: "6")
PASS  session-student preselected to Aarav T. (id 1)  (actual: "1")
PASS  cbse-primary-sessions shows the real logged session  (actual: "20 Jul / Les nombres — counting practice / Counted 1-20 confidently.")
PASS  cbse-middle-sessions unaffected (negative control)  (actual: "No sessions logged yet.")
PASS  cbse-senior-sessions unaffected (negative control)  (actual: "No sessions logged yet.")
PASS  cbse-primary-sessions still just the Aarav T. session (Rohan K. is untracked)  (actual: 1)
PASS  cbse-middle-sessions still empty (Rohan K. is untracked)  (actual: "No sessions logged yet.")
PASS  cbse-senior-sessions still empty (Rohan K. is untracked)  (actual: "No sessions logged yet.")
PASS  nav badge: cbse 6 -> 5 after curriculum edit  (actual: "5")
PASS  nav badge: ibdp 2 -> 3 after curriculum edit  (actual: "3")
PASS  nav badge: students unchanged by an edit (still 16)  (actual: "16")
PASS  nav badge: students 16 -> 15 after delete  (actual: "15")
PASS  nav badge: cbse 5 -> 4 after deleting Aarav T.  (actual: "4")
PASS  cbse-primary-sessions reverts after cascade delete  (actual: "No sessions logged yet.")
PASS  after reload: nav badge students still 15  (actual: "15")
PASS  after reload: nav badge cbse still 4  (actual: "4")
PASS  after reload: nav badge ibdp still 3  (actual: "3")
PASS  after reload: cbse-primary-sessions still reverted  (actual: "No sessions logged yet.")
PASS  after reload: cbse-middle-sessions still has just the Rohan-is-untracked negative (empty)  (actual: "No sessions logged yet.")
PASS  after reload: Rohan K.'s session is still in the store (only its card display is untracked)  (actual: true)
PASS  no console errors across the whole run  (actual: [])
PASS  no uncaught page errors across the whole run  (actual: [])

PASS: 50/50 checks passed (http://localhost:8931/index.html)
```

**Real bug caught by this run**: the old hardcoded nav-badge/subtitle/
filter-bar total was "14" (`sailaja-os-architecture-contract` W7) — but
`initDatabase()` has scraped **15** rows since the very first
persistence-fix session. The hardcoded number was already wrong
before this fix; `renderLiveCounts()` corrects it as a side effect of
making it live, not as a separate fix.

**`verify-fees.mjs`** (real run, 2026-07-21, `sailaja-os-frontier-and-method`
Item 3's exact "you have a result when..." metric, achieved — built on
explicit owner sign-off obtained in-conversation):

```
PASS  new student has the real monthlyFee stored  (actual: 2500)
PASS  vs-fee prefilled with the real monthly fee  (actual: "2500")
PASS  fee status before any payment: Due  (actual: "Due — July 2026")
PASS  payments list before any payment  (actual: "No payments recorded yet.")
PASS  payment modal preselects the right student  (actual: "16")
PASS  payment modal prefills amount from monthlyFee  (actual: "2500")
PASS  exactly 1 payment recorded  (actual: 1)
PASS  payment studentId matches  (actual: 16)
PASS  payment month matches the prefilled current month  (actual: "2026-07")
PASS  payment amount matches  (actual: 2500)
PASS  fee status after payment: Paid  (actual: "Paid — July 2026")
PASS  payments list shows the real payment  (actual: "July 2026 — ₹2500 (paid 2026-07-21)")
PASS  after reload: fee status still Paid  (actual: "Paid — July 2026")
PASS  after reload: payment still listed  (actual: "July 2026 — ₹2500 (paid 2026-07-21)")
PASS  student with no monthlyFee: fee status is "No fee set", not Due  (actual: "No fee set")
PASS  student with no monthlyFee: no payments either  (actual: "No payments recorded yet.")
PASS  Copy with no student selected leaves clipboard untouched  (actual: "unchanged-marker")
PASS  fee reminder copy: real parent name present  (actual: true)
PASS  fee reminder copy: real month present  (actual: true)
PASS  fee reminder copy: real amount present  (actual: true)
PASS  fee reminder copy: no literal [Parent Name] left  (actual: false)
PASS  fee reminder copy: no literal [Month] left  (actual: false)
PASS  fee reminder copy: no literal [Amount] left (real fee was configured)  (actual: false)
PASS  fee reminder copy: [Date] stays a manual placeholder by design  (actual: true)
PASS  no-fee student copy: real month still present  (actual: true)
PASS  no-fee student copy: [Amount] stays literal, no invented number  (actual: true)
PASS  after delete: cascade removed the payment record  (actual: 0)
PASS  payment-student select dropped the deleted student  (actual: 16)
PASS  fee-reminder-student select dropped the deleted student  (actual: 0)
PASS  backup payload includes teach_os_payments key  (actual: true)
PASS  no console errors across the whole run  (actual: [])
PASS  no uncaught page errors across the whole run  (actual: [])

PASS: 32/32 checks passed (http://localhost:8931/index.html)
```

**A real modal-stacking bug caught by this run**: the first version of the
"+ Record Payment" button opened the add-payment modal without closing the
view-student modal first, so the still-open view-student modal's content
intercepted every click meant for the payment modal (Playwright's
"element is not stable" retry loop, 30s timeout). Fixed by matching the
existing "Log Session →" button's convention —
`closeModal('view-student');openPaymentModalFor(...)` — closing the parent
modal before opening the child one, the same pattern that button already
used to avoid this exact problem. Two `.modal-bg` elements both carrying
the `open` class is not a state the CSS/click-handling was ever designed
to support: worth remembering for any future "open modal B from inside
modal A" button.

**`verify-schedule.mjs`** (real run, 2026-07-21, `sailaja-os-frontier-and-method`
Item 5's exact "you have a result when..." metric, achieved — "today" was a
Tuesday when this ran, so both the inside- and outside-window branches
exercised; totals will differ on a re-run against a different weekday, by
design):

```
PASS  stat-thisweek matches the hand-counted seed  (actual: "13")
PASS  subgreeting class count matches the hand-counted seed  (actual: "13 classes this week · 0 exams coming up")
PASS  subgreeting exam count starts at 0 (no exams seeded)  (actual: "13 classes this week · 0 exams coming up")
PASS  Upcoming Sessions shows exactly 5 items  (actual: 5)
PASS  Upcoming Sessions order matches the hand-computed top 5  (actual: ["Aarav T.","Ananya S.","Ishaan M.","Kiran P.","Sara M."])
PASS  past-dated exam does NOT count as "coming up"  (actual: "13 classes this week · 0 exams coming up")
PASS  future-dated exam counts as "coming up" (0 -> 1)  (actual: "13 classes this week · 1 exams coming up")
PASS  week-class count unaffected by a student scheduled outside the remaining window  (actual: "13")
PASS  week-class count increments for a student scheduled inside the remaining window  (actual: "14")
PASS  editing a student's schedule out of the window decrements the count  (actual: "13")
PASS  week-class count back to the original hand-count after cleanup  (actual: "13")
PASS  after reload: stat-thisweek still matches the hand-count  (actual: "13")
PASS  after reload: Upcoming Sessions order unchanged  (actual: ["Aarav T.","Ananya S.","Ishaan M.","Kiran P.","Sara M."])
PASS  after reload: exam count still 1  (actual: "13 classes this week · 1 exams coming up")
PASS  no console errors across the whole run  (actual: [])
PASS  no uncaught page errors across the whole run  (actual: [])

PASS: 16/16 checks passed (http://localhost:8931/index.html)
```

**No new data model needed — a real finding, not an assumption confirmed**:
the item's own roadmap entry predicted this would need "a structured,
queryable schedule data model." It didn't. `initDatabase()`'s seed rows and
`addNewStudent()` have both written `schedule` as `"Ddd · <time>"` since
before this repo's persistence layer even worked — the day-of-week was
always there, just never parsed back out. `scheduleDayNum()` does that with
a 7-entry lookup table and zero storage changes.

**Array-comparison bug caught while writing this script (not shipped)**:
`makeChecker()`'s `check()` uses `Object.is()` for non-predicate expected
values, which is never true for two different array objects even with
identical contents — `check('...', arrA, arrB)` silently fails even when
`arrA` and `arrB` print identically. Fixed in the script itself with an
`equalsArray()` helper that wraps the comparison in a predicate
(JSON-stringify equality). Worth remembering for any future verify script
asserting an ordered list.

**`verify-content-edit-delete.mjs`** (real run, 2026-07-21, edit/delete
added to lessons/exams/quiz on explicit owner request, right after
schedule-aware dashboard shipped — the same session closed out every
remaining item on the roadmap plus this):

```
PASS  lesson A created  (actual: 1)
PASS  edit modal title relabeled  (actual: "Edit Lesson Plan")
PASS  edit modal button relabeled  (actual: "Save Changes")
PASS  lesson-title prefilled  (actual: "Edit-Delete Lesson A")
PASS  lesson-curr prefilled  (actual: "Cambridge")
PASS  lesson-level prefilled  (actual: "Grade 9")
PASS  lesson-objectives prefilled  (actual: "Original objectives.")
PASS  cancelled edit did not change the title  (actual: "Edit-Delete Lesson A")
PASS  cancelled edit did not add a record  (actual: 1)
PASS  title field reset for a fresh add  (actual: "")
PASS  add modal title relabeled back  (actual: "New Lesson Plan")
PASS  lesson B is a genuinely new second record (editingLessonId did not leak)  (actual: 2)
PASS  lesson A untouched by adding B  (actual: "Edit-Delete Lesson A")
PASS  edit updated the record IN PLACE (still 2 records)  (actual: 2)
PASS  lesson A id unchanged after edit  (actual: 1)
PASS  lesson A title updated  (actual: "Edit-Delete Lesson A (edited)")
PASS  lesson A duration updated  (actual: "90 minutes")
PASS  rendered list shows the edited title  (actual: true)
PASS  after reload: edit survived  (actual: "Edit-Delete Lesson A (edited)")
PASS  after reload: still 2 lessons  (actual: 2)
PASS  lesson A deleted, B remains  (actual: 1)
PASS  remaining lesson is B  (actual: "Edit-Delete Lesson B")
PASS  after reload: both lessons gone  (actual: 0)
PASS  lessons card hidden again  (actual: false)
PASS  static lesson-bank cards unaffected by the whole lesson add/edit/delete cycle  (actual: 30)
PASS  exam created  (actual: 1)
PASS  exam edit modal title relabeled  (actual: "Edit Exam / Assessment")
PASS  exam edit modal button relabeled  (actual: "Save Changes")
PASS  exam-student prefilled  (actual: "1")
PASS  exam-date prefilled  (actual: "2026-09-01")
PASS  exam-name prefilled  (actual: "Edit-Delete Exam")
PASS  exam-prep prefilled  (actual: "Not started")
PASS  cancelled exam edit did not change the name  (actual: "Edit-Delete Exam")
PASS  exam edited in place (still 1 record)  (actual: 1)
PASS  exam id unchanged after edit  (actual: 1)
PASS  exam reassigned to the real second student  (actual: "Diya R.")
PASS  exam prep status updated  (actual: "On track / Ready")
PASS  rendered exam row shows the new student and status  (actual: true)
PASS  after reload: exam edit survived  (actual: "Diya R.")
PASS  after reload: exam deleted  (actual: 0)
PASS  exams card hidden again  (actual: false)
PASS  static IB Assessment Calendar unaffected by the whole exam add/edit/delete cycle  (actual: 7)
PASS  4 static quiz cards before this cycle  (actual: 4)
PASS  quiz question created  (actual: 1)
PASS  quiz edit modal title relabeled  (actual: "Edit Quiz Question")
PASS  quiz edit modal button relabeled  (actual: "Save Changes")
PASS  quiz-question prefilled  (actual: "Edit-Delete Q: \"chien\" means?")
PASS  quiz-opt-b prefilled  (actual: "Dog")
PASS  quiz-correct prefilled  (actual: "B")
PASS  cancelled quiz edit did not change the question  (actual: "Edit-Delete Q: \"chien\" means?")
PASS  quiz edited in place (still 1 record)  (actual: 1)
PASS  quiz id unchanged after edit  (actual: 1)
PASS  quiz correct answer updated to C  (actual: "C")
PASS  static quiz cards still exactly 4 after editing the dynamic one  (actual: 4)
PASS  quiz-opt click follows the EDITED correct answer, not the original  (actual: "✓ Correct! Très bien!")
PASS  after reload: quiz edit survived  (actual: "C")
PASS  after reload: quiz question deleted  (actual: 0)
PASS  dynamic quiz list empty again  (actual: 0)
PASS  static quiz cards unaffected by the whole quiz add/edit/delete cycle  (actual: 4)
PASS  addNewStudent still a function (Phase 1-3 untouched)  (actual: "function")
PASS  logPayment still a function (Item 3 untouched)  (actual: "function")
PASS  no console errors across the whole run  (actual: [])
PASS  no uncaught page errors across the whole run  (actual: [])

PASS: 63/63 checks passed (http://localhost:8931/index.html)
```

**Design decision this run validates**: all three entities reuse their
existing add modal for editing (one shared save handler branching on a
module-level `editingXId`, reset by "+ New ..." and set by
`openEditXModal(id)`) rather than a separate saveXEdit()-style function
pair like students have. The riskiest part of that design is state leaking
between a cancelled edit and the next add — the "lesson B is a genuinely
new second record" checks above exist specifically to prove that risk
didn't materialize.

`dump-store.mjs` (fresh test profile, then seeded with the §6 fixture from
`sailaja-os-data-model-and-migrations`, then re-run unseeded to confirm
persistence — run pre-fix; the same-origin `NO_APP_URL` mechanism this
script relies on is unaffected by the fix, so this output still holds):

```
teach_os_students: null
sailaja-dark: null

Seeded teach_os_students with 3 record(s) from /tmp/sailaja-seed.json
teach_os_students: [{"id":1752999000000,"name":"Test Aarav",...}, ...]
sailaja-dark: null

(second run, no seed arg)
teach_os_students: [{"id":1752999000000,"name":"Test Aarav",...}, ...]   ← unchanged, confirms persistence
sailaja-dark: null
```

**Float-precision note observed during this run**: the fixture's
`1752999000000.4271` round-trips through `JSON.stringify`/`page.evaluate` as
`1752999000000.427` — a `float64` significant-digits limit at ~15-17 digits,
not a script bug. Consistent with `sailaja-os-data-model-and-migrations`' own
warning that `initDatabase()`'s `Date.now() + Math.random()` ids are floats
and nothing reads `id` today — don't design a future lookup assuming exact
float equality on seeded ids.

## When NOT to use this skill

- **Whether a change needs a browser run at all, and which change class it
  is** → `sailaja-os-change-control`. This skill is the *how*; that one is
  the *when/what*.
- **Store shape, canonical seed JSON, migration catalog** →
  `sailaja-os-data-model-and-migrations`.
- **The plan and phases for the persistence-resurrection work these scripts
  will verify** → `sailaja-os-daily-use-campaign`.
- **Historical incidents and why non-negotiable #1 exists** →
  `sailaja-os-failure-archaeology`.
- **Running/serving the app day-to-day outside of tests** — this repo has no
  dedicated env/deploy skill yet; `python3 -m http.server <port>` from the
  repo root is the whole story (see `lib.mjs`'s `startServer`).

## Provenance and maintenance

Authored 2026-07-21 against HEAD `9fef6e5` (`index.html`, then 1987 lines).
`lib.mjs` was authored 2026-07-20 (per its header comment) but had never been
run until this skill's scripts were written and executed against it the same
day. The same day, in sequence: the daily-use-campaign Phase 1-3(d) fix
landed (`smoke.mjs` updated, `verify-crud.mjs`/`verify-content-crud.mjs`
added), then Item 2 (React removal + font vendoring) landed on top
(`smoke.mjs` updated again, `verify-tweaks-panel.mjs`/`verify-offline.mjs`
added), then Item 4 (backup automation) landed on top of that
(`verify-backup.mjs` added, no changes needed to the other six scripts),
then Item 5's live-counts/Recent-Sessions pass landed on top of that
(`verify-live-counts.mjs` added, no changes needed to the other seven
scripts), then Item 3 (fees & payments ledger, built on explicit owner
sign-off) landed on top of that (`verify-fees.mjs` added; `BACKUP_KEYS`
updated to include the new `teach_os_payments` key, so `verify-backup.mjs`'s
claims about "the full store" now implicitly cover fees too even though its
own assertions weren't rewritten), then Item 5's schedule-aware-dashboard
sub-item (its last piece, closing out the entire roadmap) landed on top of
that (`verify-schedule.mjs` added, no changes needed to the other nine
scripts), then edit/delete for lessons/exams/quiz landed on top of THAT,
on explicit owner request after the roadmap was already fully done
(`verify-content-edit-delete.mjs` added, no changes needed to
`verify-content-crud.mjs` — the add flows it tests were untouched by the
edit/delete work) — all as working-tree changes at time of writing;
confirm each has been committed before trusting its claims blindly.
Re-verify the whole suite with:

```bash
export PW_PATH=/Users/mponamgi/Documents/Personal-finance-tracker/node_modules
node .claude/skills/sailaja-os-browser-verification/scripts/smoke.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/verify-crud.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/verify-content-crud.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/verify-tweaks-panel.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/verify-offline.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/verify-backup.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/verify-live-counts.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/verify-fees.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/verify-schedule.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/verify-content-edit-delete.mjs
```

Expect `11/11`, `25/25`, `26/26`, `17/17`, `10/10`, `19/19`, `50/50`,
`32/32`, `16/16`, `63/63` — everything green means persistence (students/
sessions/edit-delete/reload-survival), Phase 3(d) content (both add and
edit/delete), the vanilla tweaks panel, offline-completeness, the
backup/restore round-trip, live counts + CBSE Recent Sessions, the fees
ledger, and the schedule-aware dashboard are all intact. (`verify-schedule.mjs`'s
exact expected numbers depend on the real weekday it's run on — see its
own PREDICTIONS comment — but `16/16 PASS` should hold regardless of day.)
If any regress, re-read `sailaja-os-failure-archaeology` Incidents 1 and 2
before assuming you know the cause — both were counter-intuitive on first
read.

- `PW_PATH` points at a sibling repo by absolute path — if
  `Personal-finance-tracker` moves or its `node_modules` is pruned, either
  update the path or run this repo's own `npm i -D playwright` (Quick start).
- Selector/flow table: re-grep `onclick="showPage\|onclick="openModal\|onclick="closeModal` in `index.html`.
- Recorded output goes stale the moment `index.html` changes in a way that
  touches any asserted selector or the founding-defect functions — re-run and
  replace this section rather than hand-editing the numbers.
