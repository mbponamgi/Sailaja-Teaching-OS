---
name: sailaja-os-daily-use-campaign
description: >
  Executable, phase-gated campaign to resurrect the Sailaja Teaching OS's
  dead persistence layer and make the app usable in Sailaja's actual daily
  practice — the owner's #1 priority (2026-07-20). Load this when: asked to
  fix or wire up "Add Student"/session logging/attendance/student
  edit-delete "properly", not as a one-off patch; picking up multi-session
  work on `initDatabase`/`renderStudents`/`addNewStudent`, the
  `<script type="text/babel">` block, or `teach_os_students`; deciding the
  session/attendance/fees store shape; or resuming after a previous session
  left this campaign mid-phase. NOT for diagnosing why one specific click
  fails right now (→ sailaja-os-failure-archaeology Incident 1, already
  diagnosed) or for a change unrelated to persistence (→ the relevant other
  skill).
---

# Sailaja OS Daily-Use Campaign

You are executing a multi-session campaign to turn the Sailaja Teaching OS
from a demo that *looks* like a working app into one Sailaja (a
non-technical French tutor) can actually run her daily practice on. The
owner's frame, dated 2026-07-20 (`sailaja-os-frontier-and-method` §"The
owner's frame"): **priority #1, outranking everything else**, is resurrecting
the dead persistence layer. Everything in this skill executes Item 1 of that
skill's roadmap; read that item's "why it matters" once — this skill only
covers *how* and *when*, phase by phase.

**Why this campaign exists, in one sentence:** the app's own HEAD commit
(`9fef6e5`) shipped "dynamic localStorage" inside a script block that has
never once executed — full mechanism in `sailaja-os-failure-archaeology`
Incident 1 — so today every "Save" button in the app is a toast with no
memory behind it, and a teacher who trusts it will lose her students' data
the first time she reloads the page.

**Campaign success metric (measurable, never judged by eye — per
`sailaja-os-frontier-and-method` §Half 2's evidence bar):** a Playwright
script drives the real UI through add student → log a session → edit the
student → **reload the page** → delete the student, asserting counts and
field values at each step against predictions written before the probe
runs. Today that script would fail at step 1 with a `ReferenceError`.

## Non-negotiables (owner, 2026-07-20 — adopted verbatim, no exceptions)

Full text and rationale: `sailaja-os-change-control` §"The three
non-negotiables". Restated here because every phase below is gated by them:

1. **Verify in a real browser before any behavior change ships.** No phase
   step below is done on "the diff looks right" — mechanics:
   `sailaja-os-browser-verification`.
2. **Never endanger saved data.** Honest status today: `teach_os_students`
   has never been written, so there is no real data to endanger *yet* — but
   the moment Phase 2 ships, Sailaja's actual roster starts accumulating
   there, and every step after that must treat it as irreplaceable (backup
   reasoning, migration discipline: `sailaja-os-data-model-and-migrations`
   §4).
3. **No raw JSX may ever ship to the browser.** The fix for Incident 1 must
   not "solve" the dead block by adding a Babel CDN back — that starts a new
   external-network line (owner sign-off required) and doesn't even fix
   anything, since the DB functions never needed JSX in the first place
   (`sailaja-os-failure-archaeology` Incident 1's root-cause section).

No phase below may route around `sailaja-os-change-control`'s gates. This
skill sequences the work; that one still decides what may commit.

## Current-state map (orient before touching anything; verified 2026-07-21, HEAD `9fef6e5`)

All in `index.html` (1987 lines, zero build step):

- **Two trailing script blocks**: a live plain `<script>` at line 1593
  (dark mode, toasts, quiz logic, `saveAndClose`) and a dead
  `<script type="text/babel">` at line 1789 (`TweaksApp` — genuine JSX,
  never compiled — plus, bolted on after it for no JSX-shaped reason,
  `initDatabase`/`renderStudents`/`addNewStudent`, lines 1882–1985).
- **The one designed store**: `teach_os_students`, bare JSON array, schema
  and every quirk cataloged in `sailaja-os-data-model-and-migrations` §1.
  **Not live** — nothing has ever written it.
- **The one live store**: `sailaja-dark`, written by `toggleDark()` (line
  1682), unaffected by any of this.
- **The seed-fixture-in-disguise**: the 15 static `<tr>` rows in
  `#students-table tbody` (lines 737–870) that `initDatabase()` is designed
  to scrape on first run — editing them today is silent no-op UI decoration;
  post-fix they become the one-time real seed (`sailaja-os-data-model-and-migrations`
  §2).
- **Storage-free surfaces everywhere else**: add-session modal (inputs have
  no `id`s), view-student modal (a labeled placeholder, no edit/delete path
  at all), add-lesson/add-exam/add-quiz modals — every one of these Saves
  routes to `saveAndClose(id, msg)` (line 1631), which only closes the modal
  and toasts. Full gap table: `sailaja-os-frontier-and-method` §"Ground
  truth" table.
- **Verification tooling**: already built and run —
  `sailaja-os-browser-verification`'s `smoke.mjs` (asserts the dead state)
  and `dump-store.mjs` (reads/seeds the test-profile store without running
  app JS).

---

# PHASE 0 — BASELINE (done; re-run at the start of every session)

Confirms nothing has drifted since this skill was authored. Already run
once, 2026-07-21 (`sailaja-os-browser-verification`'s Recorded Outputs):

```bash
export PW_PATH=/Users/mponamgi/Documents/Personal-finance-tracker/node_modules
node .claude/skills/sailaja-os-browser-verification/scripts/smoke.mjs
```

**Expected (measured 2026-07-21): `11/11 PASS`**, in particular:
`typeof addNewStudent === 'undefined'`, `teach_os_students === null`,
`#tweaks-root` has 0 children, `typeof window.useTweaks === 'function'`
(negative control — proves the mechanism, not a broader breakage).

## GATE 0

- **All 11 pass, dead-state checks read as expected** → proceed to whichever
  phase this session is resuming at.
- **The three founding-defect checks flip** (i.e. `addNewStudent` is now a
  function) → STOP. Someone already shipped part of this campaign outside
  it, or the file changed some other way. Read `git log` since `9fef6e5`,
  reconcile against the phases below (you may be resuming mid-Phase-2, not
  starting Phase 1), and update `sailaja-os-failure-archaeology` Incident 1's
  status before continuing.
- **Any other check fails, or the smoke script itself errors** → the
  environment or an unrelated change broke; fix that first (this skill has
  no env-setup section of its own — the `PW_PATH` / server mechanics live in
  `sailaja-os-browser-verification`'s Quick start).

---

# PHASE 1 — DESIGN THE STORE (not yet started; do this before writing code)

**This phase is a decision, not a diff.** `sailaja-os-data-model-and-migrations`
§4.7 already flags the consequence: today's store is a bare array; the
moment sessions/attendance need to live somewhere too, the shape must
change, and "if the array ever gains a wrapper, audit every touch point."

**Decision to make (recommend, then confirm with the owner if this is the
first time it's being decided in conversation — new-schema decisions are the
data-model gate in `sailaja-os-change-control` class (c)):**

- **Recommended**: introduce ONE new versioned key,
  `teach_os_students_v2` (or keep `teach_os_students` but wrap it —
  pick one and be explicit, per `sailaja-os-change-control` non-negotiable #2
  "no renaming without a migration"): `{v: 1, students: [...], sessions: [...]}`.
  `students[]` keeps every field in the existing catalog
  (`sailaja-os-data-model-and-migrations` §1's table) plus an `id`-stable
  reference other records can point at (today's dual `Date.now()` /
  `Date.now() + Math.random()` id generation is float-precision-fragile —
  see the note in `sailaja-os-browser-verification`'s Recorded Outputs —
  fix the generator to always produce integers while you're in this code).
  `sessions[]` is new: minimally `{id, studentId, date, notes}` — a session
  record with a student + date **is** the attendance record (do not build a
  separate attendance feature; `sailaja-os-frontier-and-method` Item 1 says
  this explicitly).
- **Fate of the never-written `teach_os_students` key**: since it has never
  been written (Phase 0's GATE 0 confirms this every session), there is no
  real data to migrate away from — this is a rename with no live data behind
  it, the cheapest possible case of non-negotiable #2. State this reasoning
  explicitly in the commit body per `sailaja-os-docs-and-commits`, so a
  future reader doesn't assume a migration was needed and go looking for
  one.
- **Fate of the dead block's latent defects** (`sailaja-os-data-model-and-migrations`
  §2.7, §2.4): do not port `renderStudents`' unescaped `innerHTML`
  interpolation (lines 1931–1939) or the hardcoded `data-band="primary"`
  (line 1928) verbatim. Escape user-controlled text before interpolating
  (a student name is not trusted input just because it came from your own
  form), and derive `data-band` from a real field instead of hardcoding —
  today's static rows already carry correct `data-band` attributes to copy
  the mapping from.

**You have a result when…** the schema is written down (in this section, as
a change-controlled edit to this skill, once decided) with every field typed
and every quirk from the old schema explicitly kept, renamed, or dropped —
before Phase 2 writes a line of app code.

**Gates:** data-model (`sailaja-os-data-model-and-migrations`), owner
awareness of the key-shape decision (`sailaja-os-change-control` class (c)).

---

# PHASE 2 — PORT THE FUNCTIONS OUT OF THE DEAD BLOCK (not yet started)

1. Move `initDatabase`, `renderStudents`, `addNewStudent` (today
   `index.html:1882`–1985) into the **live** plain `<script>` block (starts
   line 1593) — verbatim function bodies first, schema changes from Phase 1
   applied as a second, separable diff so a reviewer can see "moved" and
   "changed" as distinct steps. **Do not add a Babel runtime** to make the
   old location work instead (non-negotiable #3).
2. `TweaksApp` (the only genuinely JSX-shaped code in the dead block) needs
   its own fix, independent of the DB functions: either a second
   `.jsx`→`.js` precompiled pair (same recipe as `tweaks-panel.jsx`,
   `sailaja-os-change-control` non-negotiable #3) or a JSX-free rewrite
   (`React.createElement` or plain DOM). This is a separate, smaller fix —
   don't block Phase 2 on it if the owner only cares about the student
   database; track it as its own item if deferred.
3. Wire the add-student form: inputs already have real `id`s since
   `9fef6e5` (`#new-student-name`, `#new-student-curr`, etc. —
   `sailaja-os-browser-verification`'s selector table) — the Save button
   already calls `addNewStudent()` (line 1477); once that function exists
   and is reachable, the button works with no further HTML change.
4. Fix the id generator while you're here (Phase 1's note): both writers
   should use one consistent, integer-safe scheme.

**You have a result when…** `sailaja-os-browser-verification`'s
`smoke.mjs` — updated to assert the NEW expected values — shows
`typeof addNewStudent === 'function'`, and a fresh page load with no
existing store scrapes the 15 static rows into the new key shape.
**NEGATIVE prediction** (must still hold): dark mode toggle, quizzes, nav,
and `tweaks-panel.js`'s existing globals are unaffected — write this
prediction before running the probe, per `sailaja-os-frontier-and-method`
§Half 2.

**Gates:** `sailaja-os-change-control` classes (c) (schema, from Phase 1)
+ (d) (behavior/JS), full `sailaja-os-browser-verification` run, both
predicted before the probe.

---

# PHASE 3 — SOLUTION MENU (ranked; each independently shippable)

Directly executes `sailaja-os-frontier-and-method` Item 1's four gaps, in
its stated priority order. Work top-down; one item per commit; each gets its
own Phase 4 promotion.

**(a) Session logging.** The add-session modal (`index.html:1483`–1510) is
fully designed but has no input `id`s and no save handler
(`saveAndClose` only toasts). Give every input a real `id`, add a
`logSession()` function appending `{id, studentId, date, notes}` to
`sessions[]` (Phase 1 schema), `save()` (or equivalent write-through), and
re-render anywhere session counts/lists are shown. *This item alone also
satisfies "attendance" — do not build a separate feature for it.*
Acceptance: log a session for student X, reload, X's session count is
unchanged-but-persisted (N stays N after reload, was N before reload too —
the falsifiable check is that it survives reload, not that it increments
forever across test runs).

**(b) Student edit/delete.** The view-student modal
(`index.html:1578`–1588) is currently a placeholder with only Close and
"Log Session →" — literally labeled "Replace with actual data when setting
up the real database" (line 1582). Replace it with: fields populated from
the clicked row's real record, an edit-save path, and a delete with confirm.
Acceptance: edit a student's name, reload, new name persists; delete a
student, reload, gone; a typo is no longer permanent (today's honest state
per `sailaja-os-frontier-and-method`'s gap table).

**(c) Progress updates.** `progress` is currently a write-once string
(`'0%'` on creation, never updated — `sailaja-os-data-model-and-migrations`
§1's table). Decide with the owner whether this needs its own UI or should
just become editable from the student-profile edit path in (b) — don't
build a separate progress-tracking feature without asking, per the
anti-roadmap discipline in `sailaja-os-frontier-and-method`.

**(d) Everything else that routes through `saveAndClose`** (add-lesson,
add-exam, add-quiz — `sailaja-os-frontier-and-method`'s Item 5 "nice to
have" table) stays toast-only until Sailaja specifically asks for it. Not
in scope for this campaign unless she does.

**You have a result when…** (per item, echoing
`sailaja-os-frontier-and-method`'s falsifiable milestones) — a Playwright
script performs the action, **reloads the page**, and asserts the
post-reload state matches a prediction written before the probe ran. Reload
is the whole test; anything that only works pre-reload is not done.

**Gates per item:** `sailaja-os-change-control` classes (c)+(d),
`sailaja-os-browser-verification`, one item per commit — never batch.

---

# PHASE 4 — VALIDATION & PROMOTION PROTOCOL

Every phase-2/3 change, in order, no skipping (same discipline as the
sibling FFOS import-hardening campaign, adapted):

1. **Phase 0 baseline green before** (`smoke.mjs`, or its Phase-2-updated
   successor once the founding-defect checks flip on purpose).
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
6. **Update the stale-by-construction skills** the moment Phase 2 lands:
   `sailaja-os-data-model-and-migrations` §0 ("designed but not live"),
   `sailaja-os-change-control` §2 ("no real data exists yet"),
   `sailaja-os-frontier-and-method` Item 1 status, and this skill's Phase
   statuses — all in the same change-controlled commit, per
   `sailaja-os-failure-archaeology`'s closing maintenance note. They will
   all be simultaneously wrong the instant `typeof addNewStudent` stops
   being `'undefined'`.
7. **Commit** with a root-cause-style body
   (`sailaja-os-docs-and-commits`), stating HOW it was verified.

Session hygiene: kill the http server when done
(`lsof -ti :8931 | xargs kill`). Multi-session resumption = re-run Phase 0
first; GATE 0 decides whether you're starting Phase 1 or resuming later.

---

# FENCED WRONG PATHS (each fence has a scar behind it)

- **"Fix" the dead block by adding a Babel CDN back.** Scar:
  `sailaja-os-failure-archaeology` Incident 1 — the DB functions never
  needed JSX; adding Babel back reintroduces an external network request
  (owner sign-off, `sailaja-os-change-control`) to solve a problem that
  doesn't require it. Only `TweaksApp` genuinely needs a JSX answer, and its
  fix (precompile or rewrite) is independent of the DB functions.
- **Editing the static 15-row student table to "add real data".** Scar:
  `sailaja-os-data-model-and-migrations` §2.3 — seeding is one-shot; once
  `teach_os_students` (or its v2 successor) exists, the static rows are dead
  weight and editing them changes nothing Sailaja sees. Use the app's own
  add-student flow (post-Phase-2) or a documented seed injection
  (`sailaja-os-browser-verification`'s `dump-store.mjs`), never the HTML.
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

None yet — this skill is the plan; `sailaja-os-browser-verification`'s
`smoke.mjs`/`dump-store.mjs`/`lib.mjs` are the tooling it runs on top of, and
were built and verified alongside this skill (2026-07-21). Phase 2/3
land their own scripts and code changes as separate, change-controlled
commits; when a fixture or verify script of durable value is produced, it
graduates into `sailaja-os-browser-verification`'s `scripts/` dir per that
skill's own lifecycle section — this skill's job is sequencing, not hosting
scripts.

# Provenance and maintenance

Authored 2026-07-21 against HEAD `9fef6e5` (`index.html`, 1987 lines,
Phase 0 baseline `11/11 PASS`). Owner directives (non-negotiables, campaign
priority) dated 2026-07-20, recorded verbatim in
`sailaja-os-frontier-and-method` and `sailaja-os-change-control`.

**Maintenance:** update each phase's status line ("not yet started" →
"in progress, resumed at step N" → "done, see commit `<hash>`") as sessions
land work — this is the resumption anchor for "pick up where we left off."
When Phase 1's schema decision is actually made, replace its "Decision to
make" section with the decided shape as fact, and propagate the change to
`sailaja-os-data-model-and-migrations` §1 in the same commit. When the whole
campaign completes, write the closing entry in
`sailaja-os-failure-archaeology` (Incident 1 moves from OPEN to settled) and
retire this skill's "not yet started" phases to a dated "done" note rather
than deleting them — a record of how the fix was sequenced is itself worth
keeping.
