---
name: sailaja-os-browser-verification
description: >
  MANDATORY pre-ship verification discipline for the Sailaja Teaching OS.
  Load this skill when: about to commit ANY behavior change; asked to verify
  or test a change; writing a verify script; seeding or reading
  `teach_os_students`/`sailaja-dark` in localStorage; testing the daily-use
  campaign's persistence work; or whenever "how do I test this" comes up.
  Encodes the house rule (non-negotiable #1 in sailaja-os-change-control): no
  change ships on "looks right" alone — serve the app locally, drive the real
  UI with headless Playwright, and print PASS/FAIL evidence. Ships two working
  scripts (smoke test, store dumper/seeder) plus the shared plumbing they
  both use.
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
`typeof addNewStudent === 'function'` would have, instantly.

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

# 2. Inspect or seed the persistent test-profile store (no app JS runs):
node .claude/skills/sailaja-os-browser-verification/scripts/dump-store.mjs
node .claude/skills/sailaja-os-browser-verification/scripts/dump-store.mjs /path/to/seed.json

# 3. For a new behavior change, copy smoke.mjs's structure into a throwaway
#    verify-<change>.mjs (scratch dir, never committed) and adapt the
#    DRIVE/ASSERT section — see "Writing a new verify script" below.
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
| `smoke.mjs` | Boots the app in a **throwaway** context, asserts sidebar renders, dashboard is the default active page, the 15 static student rows exist, `toggleDark()` flips `sailaja-dark`, zero console/page errors/failed requests — **and** the three founding-defect predictions (`addNewStudent` undefined, `teach_os_students` never written, `#tweaks-root` has 0 children) plus one negative control (`tweaks-panel.js` globals DO load) | After every change; the minimum bar. Also doubles as this repo's dead-script regression check — if these three predictions ever flip to the opposite values *without* the daily-use-campaign fix having landed, something else changed and needs investigating before you trust anything else |
| `dump-store.mjs` | Uses a **persistent** test-profile context (survives across separate runs) to read, and optionally seed, `teach_os_students` — navigates to a same-origin 404 page (`NO_APP_URL`) so **zero app script runs**, meaning it never triggers `initDatabase()`'s one-shot first-run scrape | Inspecting the store shape; seeding old- or new-shape data for a migration test; preparing fixture state before a behavior-change verify script drives the real UI |

Both scripts were run for real while authoring this skill (2026-07-21, HEAD
`9fef6e5`, server on :8931) — recorded output below.

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
| Add-student form (has real `id`s since `9fef6e5`, still unwired) | `#new-student-name`, `#new-student-curr`, `#new-student-level`, `#new-student-day`, `#new-student-time`, `#new-student-parent`, `#new-student-focus`; Save button calls `addNewStudent()` — throws today (dead block) |
| Add-session / add-lesson / add-exam / add-quiz forms | No `id`s on inputs; Save buttons call `saveAndClose('<modal-id>', '<toast message>')`, which only closes the modal and shows a toast — no storage write exists yet |
| Student table rows | `#students-table tbody tr` — 15 static rows pre-campaign; row click opens `view-student` modal (currently a static placeholder, no per-row data) |

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

- **`typeof addNewStudent === 'function'` unexpectedly** (i.e. it's no longer
  `'undefined'`) — the daily-use-campaign resurrection fix has landed (or
  someone partially wired the block). Good news, but re-read
  `sailaja-os-data-model-and-migrations` before trusting *what* it now
  writes — the schema catalog there is the designed contract, not yet a
  verified-live one until you re-run this smoke test and it flips green on
  purpose.
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

## Recorded outputs (real runs, 2026-07-21, HEAD `9fef6e5`, server on :8931)

`smoke.mjs`:

```
PASS  sidebar brand renders  (actual: true)
PASS  dashboard is the default active page  (actual: true)
PASS  static student rows present (design fixture, §2 of data-model skill)  (actual: 15)
PASS  DB layer dead: typeof addNewStudent  (actual: "undefined")
PASS  DB layer dead: teach_os_students never written  (actual: null)
PASS  tweaks panel never mounts (JSX block also dead)  (actual: 0)
PASS  tweaks-panel.js globals DO load (plain <script src>, negative control)  (actual: "function")
PASS  toggleDark() flips sailaja-dark  (actual: true)
PASS  no console errors at load  (actual: [])
PASS  no uncaught page errors at load  (actual: [])
PASS  no failed requests  (actual: [])

PASS: 11/11 checks passed (http://localhost:8931/index.html)
```

`dump-store.mjs` (fresh test profile, then seeded with the §6 fixture from
`sailaja-os-data-model-and-migrations`, then re-run unseeded to confirm
persistence):

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

Authored 2026-07-21 against HEAD `9fef6e5` (`index.html`, 1987 lines).
`lib.mjs` was authored 2026-07-20 (per its header comment) but had never been
run until this skill's `smoke.mjs`/`dump-store.mjs` were written and executed
against it the same day as this file. Re-verify with one command:

```bash
export PW_PATH=/Users/mponamgi/Documents/Personal-finance-tracker/node_modules
node .claude/skills/sailaja-os-browser-verification/scripts/smoke.mjs
```

If it prints `11/11 PASS`, this skill's ground truth still holds — in
particular the three founding-defect predictions are still true and the
daily-use-campaign fix has not yet landed. If any of those three flip, some
other session changed the persistence layer; re-read the diff before
continuing any campaign work planned against the old (dead) state.

- `PW_PATH` points at a sibling repo by absolute path — if
  `Personal-finance-tracker` moves or its `node_modules` is pruned, either
  update the path or run this repo's own `npm i -D playwright` (Quick start).
- Selector/flow table: re-grep `onclick="showPage\|onclick="openModal\|onclick="closeModal` in `index.html`.
- Recorded output goes stale the moment `index.html` changes in a way that
  touches any asserted selector or the founding-defect functions — re-run and
  replace this section rather than hand-editing the numbers.
