---
name: sailaja-os-browser-verification
description: >
  MANDATORY pre-ship verification discipline for the Sailaja Teaching OS.
  Load this skill when: about to commit ANY behavior change; asked to verify
  or test a change; writing a verify script; seeding or reading
  `teach_os_students`/`sailaja-dark` in localStorage; testing the daily-use
  campaign's persistence work (students, sessions, lessons, exams, quiz
  questions); or whenever "how do I test this" comes up. Encodes the house
  rule (non-negotiable #1 in sailaja-os-change-control): no change ships on
  "looks right" alone — serve the app locally, drive the real UI with
  headless Playwright, and print PASS/FAIL evidence. Ships four working
  scripts (smoke test, store dumper/seeder, student/session CRUD-and-reload
  regression, lesson/exam/quiz CRUD-and-reload regression) plus the shared
  plumbing they all use.
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

# 4. Inspect or seed the persistent test-profile store (no app JS runs):
node .claude/skills/sailaja-os-browser-verification/scripts/dump-store.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/dump-store.mjs /path/to/seed.json

# 5. For a new behavior change, copy smoke.mjs's or verify-crud.mjs's
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
day. The daily-use-campaign Phase 1-3 fix landed later the same day as a
working-tree change (not yet committed at time of writing) — `smoke.mjs` and
this file were updated in step, and `verify-crud.mjs` was added. Re-verify
with one command:

```bash
export PW_PATH=/Users/mponamgi/Documents/Personal-finance-tracker/node_modules
node .claude/skills/sailaja-os-browser-verification/scripts/verify-crud.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/verify-content-crud.mjs
```

If both print `25/25 PASS` and `26/26 PASS`, the whole persistence layer
(students, sessions, edit/delete, reload-survival, plus lessons/exams/quiz)
is intact. Run `smoke.mjs` first for a faster minimum-bar check
(`11/11 PASS`). If any regress, re-read `sailaja-os-failure-archaeology`
Incidents 1 and 2 before assuming you know the cause — both were
counter-intuitive on first read.

- `PW_PATH` points at a sibling repo by absolute path — if
  `Personal-finance-tracker` moves or its `node_modules` is pruned, either
  update the path or run this repo's own `npm i -D playwright` (Quick start).
- Selector/flow table: re-grep `onclick="showPage\|onclick="openModal\|onclick="closeModal` in `index.html`.
- Recorded output goes stale the moment `index.html` changes in a way that
  touches any asserted selector or the founding-defect functions — re-run and
  replace this section rather than hand-editing the numbers.
