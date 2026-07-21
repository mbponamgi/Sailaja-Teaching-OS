---
name: sailaja-os-daily-use-campaign
description: >
  Executable, phase-gated campaign that resurrected the Sailaja Teaching
  OS's dead persistence layer — the owner's #1 priority (2026-07-20). Core
  phases (0-3a/b/c) are DONE as of 2026-07-21. Load this when: extending the
  persistence work further (lesson/exam/quiz persistence, live counts, or
  anything else in Item 5's "nice to have" table, only if Sailaja actually
  asks); resuming Phase 3(d) or a new phase; understanding HOW and WHEN the
  student/session CRUD fix was sequenced (the record of what shipped and in
  what order); or as the template for phase-gating any future multi-session
  campaign in this repo. NOT for diagnosing a bug in the now-live
  persistence layer (→ sailaja-os-failure-archaeology, Incidents 1 and 2 —
  already diagnosed and fixed; if something NEW is broken, that's a new
  incident there, not a reason to redo these phases) or for a change
  unrelated to persistence (→ the relevant other skill).
---

# Sailaja OS Daily-Use Campaign

**Status: core campaign DONE, 2026-07-21.** This skill documents a
multi-session campaign that turned the Sailaja Teaching OS from a demo that
*looked* like a working app into one Sailaja (a non-technical French tutor)
can actually run her daily practice on. The owner's frame, dated 2026-07-20
(`sailaja-os-frontier-and-method` §"The owner's frame"): **priority #1,
outranking everything else**, was resurrecting the dead persistence layer.
Phases 0 through 3(a)(b)(c) below executed Item 1 of that skill's roadmap in
a single session and are now complete; Phase 3(d) and beyond stay open for
future work Sailaja actually asks for. The phase structure is kept (not
deleted) both as the historical record and as a template for any future
campaign here.

**Why this campaign existed, in one sentence:** the app's own HEAD commit
(`9fef6e5`) shipped "dynamic localStorage" inside a script block that had
never once executed — full mechanism in `sailaja-os-failure-archaeology`
Incident 1 — so every "Save" button in the app was a toast with no memory
behind it, and a teacher who trusted it would have lost her students' data
the first time she reloaded the page.

**Campaign success metric — MET, 2026-07-21** (measurable, never judged by
eye — per `sailaja-os-frontier-and-method` §Half 2's evidence bar): a
Playwright script drives the real UI through add student → log a session →
edit the student → **reload the page** → delete the student, asserting
counts and field values at each step against predictions written before the
probe ran. Result: 25/25 assertions passed
(`sailaja-os-browser-verification`'s `verify-crud.mjs`, now a permanent
regression test). Before this fix, that script failed at step 1 with a
`ReferenceError`.

## Non-negotiables (owner, 2026-07-20 — adopted verbatim, no exceptions)

Full text and rationale: `sailaja-os-change-control` §"The three
non-negotiables". Restated here because every phase below is gated by them:

1. **Verify in a real browser before any behavior change ships.** No phase
   step below is done on "the diff looks right" — mechanics:
   `sailaja-os-browser-verification`.
2. **Never endanger saved data.** Status update, 2026-07-21: Phase 2 has
   shipped — `teach_os_students`/`teach_os_sessions` are now written on real
   use, and Sailaja's actual roster can accumulate there from this point
   forward. Every step from here treats them as irreplaceable (backup
   reasoning, migration discipline: `sailaja-os-data-model-and-migrations`
   §4). No migration was needed for THIS launch (the key had never been
   written before — see Phase 1's decision, below) — that reasoning does
   NOT carry forward to the next schema change.
3. **No raw JSX may ever ship to the browser.** The fix for Incident 1 must
   not "solve" the dead block by adding a Babel CDN back — that starts a new
   external-network line (owner sign-off required) and doesn't even fix
   anything, since the DB functions never needed JSX in the first place
   (`sailaja-os-failure-archaeology` Incident 1's root-cause section).

No phase below may route around `sailaja-os-change-control`'s gates. This
skill sequences the work; that one still decides what may commit.

## Current-state map (post-campaign, verified 2026-07-21)

All in `index.html` (grew from 1987 lines by ~150 during this fix — absolute
line numbers below are stale by design, re-grep function names):

- **Two live plain `<script>` blocks**: the first (dark mode, toasts, quiz
  logic, `saveAndClose` for the still-unwired lesson/exam/quiz modals) is
  unchanged by this campaign. The second was the dead `<script
  type="text/babel">` block — now rewritten plain JS, holding `TweaksApp`
  (JSX-free `React.createElement` calls) and the entire persistence layer.
- **Three live stores**: `teach_os_students` (student roster),
  `teach_os_sessions` (session log, new), `sailaja-dark` (unchanged). Full
  schema → `sailaja-os-data-model-and-migrations` §1.
- **The seed fixture did its job once**: the 15 static `<tr>` rows in
  `#students-table tbody` were scraped into `teach_os_students` on first
  load (with one scraper bug found and fixed along the way — see Phase 2).
  Editing them now is a no-op (`sailaja-os-data-model-and-migrations` §2
  item 3) — that was already true by design, unchanged.
- **Storage-backed surfaces**: add-student, add-session (student select now
  dynamic), and the rebuilt view-student modal (edit + delete) all persist
  for real. add-lesson/add-exam/add-quiz remain toast-only — out of scope
  unless Sailaja asks (Phase 3(d), below).
- **Verification tooling**: `sailaja-os-browser-verification`'s `smoke.mjs`
  (now asserts the LIVE state, 11/11) and the new `verify-crud.mjs` (the
  full add→session→edit→reload→delete regression, 25/25 — this is the
  campaign's success metric made permanent).

---

# PHASE 0 — BASELINE (DONE; re-run at the start of every future session)

Confirms nothing has drifted since the campaign landed. The baseline this
gate checks for FLIPPED on 2026-07-21 — it now expects the LIVE state, not
the dead one it originally checked for:

```bash
export PW_PATH=/Users/mponamgi/Documents/Personal-finance-tracker/node_modules
node .claude/skills/sailaja-os-browser-verification/scripts/verify-crud.mjs
```

**Expected (measured 2026-07-21, post-fix): `25/25 PASS`** — the full add
student → log session → edit → **reload** → delete cycle. (A quicker
partial check, `smoke.mjs`, expects `11/11 PASS` and includes
`typeof addNewStudent === 'function'`, `teach_os_students` written on
first load, tweaks panel renders once activated via `postMessage`.)

## GATE 0

- **25/25 (or 11/11 for the quick check) PASS** → the persistence layer is
  intact; proceed to Phase 3(d) or whatever new work this session is for.
- **`typeof addNewStudent === 'undefined'`, or any of the founding-defect
  predictions flip back to their old (dead) values** → STOP. The
  persistence layer has regressed — re-read `sailaja-os-failure-archaeology`
  Incident 1 before assuming you know why (check first for a re-introduced
  `<script type="text/babel">` block), fix, and re-verify before continuing
  any other work.
- **Any other check fails, or the script itself errors** → the environment
  or an unrelated change broke; fix that first (`PW_PATH` / server mechanics
  → `sailaja-os-browser-verification`'s Quick start).

---

# PHASE 1 — DESIGN THE STORE (DONE, 2026-07-21)

**Decision made** (recorded here as the historical record; full live schema
→ `sailaja-os-data-model-and-migrations` §1):

- **Kept `teach_os_students` as the same bare array, no versioned wrapper.**
  Rejected the originally-recommended `{v:1, students:[...], sessions:[...]}`
  wrapper in favor of the simpler option this phase's own text flagged as an
  alternative: since the key had never been written, renaming it would have
  been pure churn for zero migration benefit. Added `teach_os_sessions` as a
  **new sibling key** instead of nesting sessions inside student records —
  keeps the two entities independently queryable.
- **Fate of the never-written `teach_os_students` key**: confirmed no real
  data existed (Phase 0's GATE 0), so this was the cheapest possible case of
  non-negotiable #2 — no migration was needed for this launch. This
  reasoning does NOT carry forward to future schema changes.
- **Id generation fixed**: replaced the dual `Date.now()` /
  `Date.now() + Math.random()` scheme with one `nextId(records)` helper
  (`max(existing ids) + 1`) — always an integer, no float-precision loss, no
  same-millisecond collision risk. Used for both students and sessions.
- **Latent defects fixed, not ported**: `renderStudents()`'s unescaped
  `innerHTML` interpolation is now run through a new `esc()` helper; the
  hardcoded `data-band="primary"` is now a real `band` field, read directly
  off the static rows' `data-band` for the initial seed and derived by a new
  `deriveCurrBand()`/`bandFromGradeText()` pair for new/edited records.

**Result confirmed:** the schema is documented in
`sailaja-os-data-model-and-migrations` §1 with every field typed and every
quirk from the old (designed-but-dead) schema explicitly kept, renamed, or
fixed.

**Gates passed:** data-model schema recorded; no owner sign-off was required
(no key rename, no data loss — see reasoning above).

---

# PHASE 2 — PORT THE FUNCTIONS OUT OF THE DEAD BLOCK (DONE, 2026-07-21)

1. **Done.** `initDatabase`, `renderStudents`, `addNewStudent` moved out of
   the dead `<script type="text/babel">` block into a plain `<script>`
   (which the block itself became — see step 2). No Babel runtime was
   added (non-negotiable #3 held).
2. **Done — and NOT deferred.** `TweaksApp` was rewritten JSX-free as plain
   `React.createElement`/`h()` calls in the same change, rather than being
   tracked as a separate item — turned out to be little extra work once the
   DB functions were already being moved out of the same block, and leaving
   it dead would have meant the tweaks panel stayed collateral damage of a
   fix that didn't need to break it.
3. **Done.** The add-student form's inputs already had real `id`s (since
   `9fef6e5`); once `addNewStudent()` became a real function, the existing
   Save button worked with no HTML change beyond what Phase 3(a)/(b) needed
   for its own modals.
4. **Done** — see Phase 1's `nextId()` decision.

**Also found and fixed, not in the original plan**: `initDatabase()`'s
level-badge scraper threw on the four A1/A2 rows (no `.badge` span in that
column), which silently produced ZERO stored records instead of 15 — this
would have made the whole fix look broken on first real-browser
verification if not caught. Fixed with a fallback selector. Full writeup:
`sailaja-os-failure-archaeology` Incident 2. This is exactly the kind of
thing Phase 0's baseline gate and real-browser verification exist to catch;
it did.

**Result confirmed**: `sailaja-os-browser-verification`'s `smoke.mjs`
(updated to assert the new expected values) shows
`typeof addNewStudent === 'function'`, and a fresh page load with no
existing store scrapes all 15 static rows. **Negative predictions held**:
dark mode toggle, quizzes, nav, and `tweaks-panel.js`'s existing globals are
all unaffected (asserted in both `smoke.mjs` and `verify-crud.mjs`).

**Gates passed:** `sailaja-os-change-control` classes (c)+(d), full
`sailaja-os-browser-verification` run (`11/11` then `25/25`), both
predicted before the probe ran.

---

# PHASE 3 — SOLUTION MENU (a/b/c DONE 2026-07-21; d still open, needs an ask)

Directly executes `sailaja-os-frontier-and-method` Item 1's four gaps, in
its stated priority order.

**(a) Session logging — DONE.** Every add-session input got a real `id`;
`#session-student` is populated dynamically from `teach_os_students`;
`logSession()` appends `{id, studentId, date, topic, performance, homework,
notes, parentUpdate}` to `teach_os_sessions` and re-renders the
view-student modal's session list if it's open for that student. *This item
alone also satisfies "attendance"* — confirmed no separate feature was
built. **Acceptance confirmed**: logged a session for a test student,
reloaded, session count for that student was unchanged (still 1) —
persistence, not just a successful write.

**(b) Student edit/delete — DONE.** The view-student modal (was a
placeholder labeled "Replace with actual data when setting up the real
database") is now a real form: fields populated from the clicked row's
record via `viewStudent(id)`, `saveStudentEdit()` for edits,
`deleteStudent()` for delete (with a native `confirm()`, cascades to that
student's sessions). **Acceptance confirmed**: edited a student's name,
reloaded, new name persisted; deleted a student, reloaded, gone along with
their session — a typo is no longer permanent.

**(c) Progress updates — DONE, folded into (b).** Decided NOT to build a
separate progress-tracking UI (no owner ask existed for one, per the
anti-roadmap discipline) — `progress` is now just another field in the
student-edit form (`saveStudentEdit()`), same free-text `"NN%"` format as
before.

**(d) Everything else that routes through `saveAndClose`** (add-lesson,
add-exam, add-quiz — `sailaja-os-frontier-and-method`'s Item 5 "nice to
have" table) **stays toast-only, unchanged** — still not in scope unless
Sailaja specifically asks for it. This is the one item in this phase that
is genuinely still open.

**Result confirmed** (echoing `sailaja-os-frontier-and-method`'s falsifiable
milestones): one Playwright script performed all three actions in sequence,
**reloaded the page**, and asserted the post-reload state matched
predictions written before the probe ran —
`sailaja-os-browser-verification`'s `verify-crud.mjs`, 25/25 PASS. Reload
was the whole test; nothing here only works pre-reload.

**Gates passed:** `sailaja-os-change-control` classes (c)+(d),
`sailaja-os-browser-verification`. **Note on "one item per commit"**: (a),
(b), and (c) landed together in one working-tree change rather than three
separate commits — they're genuinely interdependent (a half-shipped
persistence layer with sessions but no edit/delete, or vice versa, isn't a
coherently testable state), so bundling them was a deliberate exception, not
a lapse. The rule still applies to (d) and any future Phase 3 item, which
have no such interdependency forcing a bundle.

---

# PHASE 4 — VALIDATION & PROMOTION PROTOCOL (followed for Phases 1-3; stays in force for future work)

Every phase-2/3 change, in order, no skipping (same discipline as the
sibling FFOS import-hardening campaign, adapted). This protocol was
followed for the 2026-07-21 fix (see the "Result confirmed"/"Gates passed"
lines in each phase above) and remains the checklist for Phase 3(d) or any
future extension:

1. **Phase 0 baseline green before** (`verify-crud.mjs` — or `smoke.mjs` for
   a quicker partial check).
2. **Prediction written first** — the exact `typeof`/count/string you expect,
   before running anything (`sailaja-os-frontier-and-method` §Half 2's
   evidence bar; a prediction edited after seeing output is disqualified,
   start a new one).
3. **Implement** the smallest coherent diff for one menu item.
4. **Verify** via `sailaja-os-browser-verification`, printed PASS/FAIL
   pasted into the report — including the reload step for anything
   persistence-shaped.
5. **`sailaja-os-change-control` checklist**, including the pre-commit grep
   for `text/babel` (must not have grown) and for new external URLs.
6. **Update the skills that describe the persistence layer's status** —
   done for this fix across `sailaja-os-data-model-and-migrations`,
   `sailaja-os-change-control`, `sailaja-os-architecture-contract`,
   `sailaja-os-frontier-and-method`, and this skill's own phase statuses,
   all in the same change as the code (per
   `sailaja-os-failure-archaeology`'s closing maintenance note). Repeat this
   step for any future phase that changes current-truth claims elsewhere.
7. **Commit** with a root-cause-style body
   (`sailaja-os-docs-and-commits`), stating HOW it was verified.

Session hygiene: kill the http server when done
(`lsof -ti :8931 | xargs kill`). Multi-session resumption = re-run Phase 0
first; GATE 0 decides whether you're starting fresh work or just confirming
nothing regressed.

---

# FENCED WRONG PATHS (each fence has a scar behind it)

- **"Fix" the dead block by adding a Babel CDN back.** Scar:
  `sailaja-os-failure-archaeology` Incident 1 — the DB functions never
  needed JSX; adding Babel back would have reintroduced an external network
  request (owner sign-off, `sailaja-os-change-control`) to solve a problem
  that didn't require it. Avoided — `TweaksApp` was rewritten JSX-free
  instead (Phase 2), which is what let the fix ship with zero new deps.
- **Editing the static 15-row student table to "add real data".** Scar:
  `sailaja-os-data-model-and-migrations` §2 — seeding is one-shot; now that
  `teach_os_students` exists, the static rows are dead weight and editing
  them changes nothing Sailaja sees. Use the app's own add-student flow or a
  documented seed injection (`sailaja-os-browser-verification`'s
  `dump-store.mjs`), never the HTML.
- **Building a separate "attendance" feature.** Scar: none yet, but
  `sailaja-os-frontier-and-method` Item 1 explicitly rules this out — a
  session record with student + date already IS attendance; a parallel
  feature would just be two sources of truth to keep in sync.
- **Batching Phase 1's schema decision, Phase 2's port, and any Phase 3 item
  into one commit.** Violates `sailaja-os-change-control`'s "classify before
  you start" and this skill's own "one item per commit" rule — makes a
  future `sailaja-os-failure-archaeology` entry indistinguishable diff-noise
  if something in the batch turns out wrong.
- **Shipping any Phase 2/3 change without the reload step in verification.**
  The entire founding incident (`sailaja-os-failure-archaeology` Incident 1)
  is a UI that looked done pre-reload. A verify script that doesn't reload
  hasn't tested persistence at all, only toast messages.

---

# Files shipped with this skill

None directly — this skill is the plan; `sailaja-os-browser-verification`'s
`scripts/` dir hosts the actual tooling. That skill's `smoke.mjs` and
`dump-store.mjs` were built alongside this skill (2026-07-21, pre-fix);
`verify-crud.mjs` was added immediately after the Phase 1-3 fix landed and
is now the campaign's success metric made permanent — it graduated into
that skill's `scripts/` dir per its own lifecycle section, per this skill's
job being sequencing, not hosting scripts. Phase 3(d) or any future item
follows the same pattern: implement in `index.html`, verify with a script,
graduate durable scripts into `sailaja-os-browser-verification`.

# Provenance and maintenance

Authored 2026-07-21 against HEAD `9fef6e5` (`index.html`, then 1987 lines,
Phase 0 baseline `11/11 PASS` against the dead state). Phases 1-3(a)(b)(c)
executed the same day, in the same session, as a single working-tree change
(not yet committed at time of writing — confirm it's been committed before
trusting "DONE" claims blindly); Phase 0's baseline flipped to `25/25 PASS`
against the live state as a result. Owner directives (non-negotiables,
campaign priority) dated 2026-07-20, recorded verbatim in
`sailaja-os-frontier-and-method` and `sailaja-os-change-control`.

**Maintenance:** this skill's phase statuses were updated in the SAME
change as the code they describe (per Phase 4 step 6) — that discipline
continues for Phase 3(d) or any future phase: update the status line
("not yet started" → "in progress" → "DONE, see commit `<hash>`") in the
same commit as the work. The closing archaeology entry for this campaign's
core work lives in `sailaja-os-failure-archaeology` (Incident 1 moved from
OPEN to SETTLED, Incident 2 recorded as a bonus catch). Re-verify the whole
campaign's result with one command:
`PW_PATH=<...> node .claude/skills/sailaja-os-browser-verification/scripts/verify-crud.mjs`
— `25/25 PASS` means Phases 0-3(a)(b)(c) still hold.
