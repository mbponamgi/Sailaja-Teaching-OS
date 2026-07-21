---
name: sailaja-os-frontier-and-method
description: >
  The roadmap AND the research method for the Sailaja Teaching OS repo, merged
  into one skill because the ambition here is deliberately modest. Load this
  when: asked for feature ideas, a roadmap, or "what should we build next";
  when someone proposes "smart"/AI/ambitious features (quiz generation,
  analytics, parent portal, backend) — the ANTI-ROADMAP answer lives here;
  when forming a hypothesis about a bug's cause; when deciding whether an idea
  should be adopted or retired; or when asked "how do we know this is true /
  better?". Contains the owner's 2026-07-20 scope decisions, per-item first
  steps with falsifiable milestones, the hypothesis template, the idea
  lifecycle, and the anti-patterns this repo has already paid for.
---

# Sailaja OS: Frontier and Method

One skill, two halves. **Half 1** is the roadmap: what this app should
eventually become, item by item, with first steps and falsifiable milestones —
plus the anti-roadmap of things the owner has explicitly ruled out. **Half 2**
is the method: how a hunch becomes an accepted result in this repo.

They are merged (the sibling FFOS library keeps them as two skills) because
the frontier here is deliberately small: there is no research program, only a
short list of honest work and one discipline for doing it.

All app-state claims below were verified 2026-07-20 against the working tree
at HEAD `9fef6e5` (`index.html`, 1987 lines, the canonical app). Line numbers
will drift; the Provenance section has re-check commands.

**Terms used throughout (defined once):**

- **CRUD** — Create, Read, Update, Delete: the four operations a record needs
  before a feature counts as "real". Most of this app today has C of nothing
  and R of hardcoded HTML.
- **Falsifiable** — stated so that a specific observation could prove it
  FALSE ("after reload the student count is N+1" is falsifiable; "persistence
  works better" is not).
- **CANDIDATE** — an idea that is documented and plausible but NOT promised,
  scheduled, or proven. Every roadmap item below is a CANDIDATE. A CANDIDATE
  becomes real work only through the lifecycle in Half 2 and the gates in
  `sailaja-os-change-control`.

## The owner's frame (2026-07-20 — these decisions BOUND this file)

**The end state is modest on purpose:** a reliable, local-first "teaching OS"
for one teacher's (Sailaja's) daily practice. Full CRUD for students and
sessions, offline-capable, private, zero backend. That's the whole frontier.

**Explicitly NOT wanted** (see the Anti-Roadmap below for the full list):
AI-native features (quiz generation, analytics/ML), parent-facing surfaces,
multi-user. Do not re-propose these without new, explicit owner direction in
the conversation — "it would be easy to add" is not direction.

**Priority #1** was the daily-use campaign — resurrecting the dead
persistence layer so the app is actually usable. **Status update,
2026-07-21: Item 1's core CRUD (students, sessions, edit/delete) is DONE**,
verified by a 25-check real-browser add→session→edit→reload→delete
regression (`sailaja-os-browser-verification`'s `verify-crud.mjs`). That
work was owned and sequenced by `sailaja-os-daily-use-campaign`, whose phase
statuses now reflect this; see Item 1 below for what shipped and what's
still open within it. Items 2-4 (offline-complete, fees ledger, backup) are
unaffected and remain CANDIDATE.

---

# HALF 1 — The (modest) frontier

## Ground truth: what the demo pretends vs. what exists

**Status as of 2026-07-21: the first four rows below are FIXED** (the
daily-use-campaign Phase 1-3 fix — verified by
`sailaja-os-browser-verification`'s `verify-crud.mjs`, 25/25 PASS). Kept in
the table with their fix noted, not deleted, so the table stays an honest
record of what changed and what's still true. Rows below that are
unchanged as of 2026-07-20 and still describe real gaps:

| Surface | Looks like | Status |
|---|---|---|
| Students table | Live roster with per-row "Log" buttons | **FIXED 2026-07-21.** Was static HTML rows with a dead `initDatabase`/`renderStudents`/`addNewStudent` layer (dead `<script type="text/babel">` block, no Babel loaded). Now live: 15 rows scraped on first load, add/edit/delete all persist and survive reload. |
| Log a session | "Save Session" button + full form | **FIXED 2026-07-21.** Was zero storage design (no `id`s, hardcoded 15-name `<select>`, toast-only Save). Now: real `id`s, a dynamically populated student select, `logSession()` writes to the new `teach_os_sessions` key — this doubles as attendance, per this item's own design call below. |
| Student edit/delete | Clicking a row opens "Student Profile" | **FIXED 2026-07-21.** Was a labeled placeholder ("Replace with actual data when setting up the real database") with no edit/delete path at all. Now a real form: edit any field, delete with confirm (cascades to that student's sessions). |
| Progress updates | A progress bar on each row | **FIXED 2026-07-21** (folded into the edit path, per this item's Phase 3(c) decision below — no separate progress UI was built). Editable via the student profile's Progress field; still a free-text `"NN%"` string, unchanged format. |
| Attendance | Implied by session history cards | Still no dedicated feature — **by design**, unchanged from the original plan: a session record (now real) with `studentId`+`date` IS the attendance record. The dashboard/per-curriculum "Recent Sessions" cards are still hardcoded static dates; wiring them to real session data was not in this fix's scope. |
| Fees | "Fee Reminder" card on the Parent Comms page | Unchanged. A copy-to-clipboard WhatsApp text template with fill-in blanks. No amounts, no ledger, no payment records — still needs an explicit owner yes before any work starts (Item 3, below). |
| Schedule | "Weekly Master Schedule" table | Unchanged. Hardcoded static table; "+ Schedule Class" opens the now-functional add-session modal, but nothing populates the schedule table from real data yet. |
| Exams / Lessons / Quiz bank | Add modals with Save buttons | Unchanged. Still toast-only `saveAndClose()` — explicitly out of this fix's scope (Item 5, "only if Sailaja actually asks"). |
| Counts everywhere | "14 students", "9 classes this week" | Unchanged. Still hardcoded strings — deliberately deferred (Item 5); adding a student does NOT update the nav badge or page subtitles yet. |
| What actually persists | — | Now three keys: `sailaja-dark` (unchanged), `teach_os_students`, `teach_os_sessions` (both new-live 2026-07-21). Full schema → `sailaja-os-data-model-and-migrations`. |

## How to read the catalog

Every item is **status: CANDIDATE** — recorded, prioritized, not promised.
Gates named per item are the sibling skills a real implementation must pass
through: **change-control** (`sailaja-os-change-control`, change classes
(a)–(g) and sign-off list), **data-model** (`sailaja-os-data-model-and-migrations`,
schema + migrations), **browser-verification** (`sailaja-os-browser-verification`,
Playwright evidence mechanics). "You have a result when…" is the falsifiable
milestone — predictions written BEFORE the verifying probe runs (Half 2,
evidence bar).

## Item 1 — Persistence everywhere the demo pretends (DONE 2026-07-21, core CRUD)

**Status: the four gaps below are all fixed.** Full evidence, mechanism, and
recorded output: `sailaja-os-failure-archaeology` Incident 1 (the fix),
Incident 2 (a second bug the fix's own verification caught),
`sailaja-os-browser-verification` (`verify-crud.mjs`, 25/25 PASS),
`sailaja-os-data-model-and-migrations` (live schema).

**Why it mattered for daily use:** this IS daily use. A teacher who logs a
session and loses it on reload will (rightly) go back to her notebook. Four
verified gaps, now all closed: (1) **sessions log** — real `id`s, dynamic
student select, `logSession()` persists to a new `teach_os_sessions` key;
(2) **attendance** — deliberately NOT built as a separate feature; a session
record with a student + date IS the attendance record, per the original
design call, still correct; (3) **student edit/delete** — the view-student
modal is now a real form with Save and Delete (cascade-deletes sessions);
(4) **progress updates** — folded into the edit path per step 3 below,
rather than building a dedicated progress UI (no owner ask for one existed).

**What actually happened, vs. the three steps originally planned:**

1. **Store design, decided**: kept `teach_os_students` as the same bare
   array (no versioned wrapper) since the key had never been written — the
   cheapest possible "no migration needed" case. Added a new sibling key
   `teach_os_sessions` rather than nesting sessions inside student records.
   Full reasoning → `sailaja-os-data-model-and-migrations` §1's schema-decision
   note.
2. **Ported the persistence functions** out of the dead `text/babel` block
   into a (now JSX-free) plain `<script>` — did NOT add Babel at runtime.
   Fixed both latent defects in the same change: `renderStudents()` now
   escapes every interpolated field (`esc()`), and `data-band` is now a real
   derived field instead of a hardcoded `'primary'`. **Also fixed a defect
   the plan didn't anticipate**: the level-badge scraper threw on the four
   A1/A2 rows (no `.badge` span in that column), which silently produced
   ZERO records instead of 15 — caught by the verify script's first
   assertion. Full writeup → `sailaja-os-failure-archaeology` Incident 2.
3. **Wired the add-session modal and rebuilt view-student** as planned —
   plus `TweaksApp` (the dead block's other occupant) was rewritten as
   plain `React.createElement` calls so the tweaks panel is no longer
   collateral damage of the JSX ban.

**Result, measured** (not just claimed — this is what "you have a result
when…" asked for): a Playwright script drove the real UI through add a
student (15→16) → log a session (0→1) → edit her name → **reload the page**
→ delete her (16→15, cascade-removed her session, 1→0). All 25 assertions
passed, including two negative controls (dark mode, `filterStudents`) and
zero console/page errors across the whole run.

**Gates passed:** data-model (schema decision recorded), change-control
classes (c)+(d) (no owner sign-off was required — no key was renamed or
removed), browser-verification (25/25 PASS, `verify-crud.mjs` graduated into
the permanent suite).
**Execution record:** `sailaja-os-daily-use-campaign` Phases 1-3 marked done
there; this entry records the roadmap-level outcome.

## Item 2 — Offline-complete app (CANDIDATE)

**Why it matters for daily use:** tuition happens at homes with flaky Wi-Fi.
Verified: the app makes exactly three external requests (`index.html:8–10`) —
Google Fonts, and React + ReactDOM 18.3.1 **development** builds from unpkg.
Offline today, fonts fall back and the tweaks panel dies; the owner's
direction (recorded in `sailaja-os-change-control`) is vendor-locally /
no-external-network. Ties to the daily-use campaign's Phase 3.

**First three steps in this repo:**

1. Decide React's fate first (it may be removable): its only consumer is
   `tweaks-panel.js` plus the dead block. Either vendor
   `react`/`react-dom` production UMD builds locally, or rewrite the tweaks
   panel React-free — decide with the owner, don't drift into it.
2. Vendor the two fonts (Instrument Serif, Figtree) as local woff2 +
   `@font-face`, replacing the `fonts.googleapis.com` link.
3. Verify offline-complete: Playwright run with **all network routes to
   non-localhost aborted**, asserting zero failed requests, zero console
   errors, panel mounts, fonts render.

**You have a result when…** the network-blocked Playwright run passes with
**0 external requests attempted and 0 console errors**, and the normal
(network-on) smoke run is byte-identical in behavior. Zero is a predicted
number too.

**Gates:** change-control class (e) (vendor — removing CDNs is aligned,
adding any is owner-sign-off), browser-verification.

## Item 3 — Fees & payments ledger (CANDIDATE — pure greenfield)

**Honest status: nothing exists.** Verified 2026-07-20: the only fee-related
artifact in the app is the "Fee Reminder" WhatsApp copy-template (lines
1382–1391). No amounts, no per-student fee field, no payment records, no
ledger page. This item is invented from the domain (tuition = income), not
from any existing surface — which is exactly why step 1 is asking.

**Why it matters for daily use:** chasing monthly fees across 14 families is
real recurring friction, and the data (student, month, amount, paid-on) is
tiny and private — a natural fit for the local-first constraint.

**First three steps in this repo:**

1. Ask the owner whether Sailaja actually wants fee tracking here (she may
   have a working system; this is the only catalog item adding a new domain).
   No owner yes → this item stays parked at CANDIDATE.
2. If yes: schema via the data-model gate — e.g. `payments:
   [{studentId, month, amount, paidOn}]` plus an optional per-student
   `monthlyFee` — as an extension of Item 1's store (hard dependency: needs
   real student ids, so Item 1 lands first).
3. Smallest useful surface: a per-student paid/due line on the (by then real)
   student profile, and wire the existing Fee Reminder template's
   `[Parent Name]`/`[Month]`/`[Student]` blanks to fill from records.

**You have a result when…** record a payment for one student, reload: her
status reads paid for that month, every other student still reads due, and
the copied reminder text contains her actual parent name, month, and amount —
all asserted by script against predicted strings.

**Gates:** owner sign-off to even start, then data-model, change-control
(c)+(d), browser-verification.

## Item 4 — Backup automation (CANDIDATE)

**Why it matters for daily use:** once Item 1 lands, Sailaja's entire roster
lives in one localStorage key in one browser profile — a cleared cache is
total loss. Verified: the app has **no** export, backup, or download feature
(zero hits); today's only "backup" would be a DevTools-console ritual no
teacher should be asked to perform.

**First three steps in this repo:**

1. Add an "Export data" button (settings area or sidebar) that downloads the
   full store as a dated JSON file via `Blob` + `a[download]` — works fully
   offline, zero backend, no new permissions.
2. Add the restore path: file input → parse → validate shape/version →
   explicit confirm → overwrite store → re-render.
3. Add the nudge: stamp `lastExport` at each export; on load, if it's older
   than ~30 days (or absent with data present), show a non-blocking toast
   reminding her to export.

**You have a result when…** a Playwright round-trip passes: seed a known
store, export, capture the file, wipe localStorage (fresh context), restore
from the file, and assert student/session counts and one spot-checked record
are byte-equal to the seed. NEGATIVE prediction: restore of a malformed file
changes nothing and says so.

**Gates:** change-control (c)+(d) (restore path can destroy data — design
the confirm carefully), data-model (versioned export shape),
browser-verification. Depends on Item 1.

## Item 5 — Polish, honestly labeled nice-to-have (CANDIDATE — optional)

None of these earn a session of their own before Items 1–4; they ride along
or wait. Recorded so they aren't re-invented as big ideas:

| Nice-to-have | Verified gap today | One-line milestone |
|---|---|---|
| Schedule-aware dashboard | "9 classes this week · 3 exams coming up" is a hardcoded string (line 513); schedule page is a static May-2026 table (line 1125) | Dashboard counts computed from stored schedules match a hand-counted seed |
| Live counts | Nav badge "14" (457), page subtitles (704, 885, 916…) hardcoded | Add a student → every count increments, no hardcoded numbers left in those elements |
| Real "Recent Sessions" | Hardcoded April entries (594–618, 938–981) | Cards render the seed's newest sessions, newest first |
| Lesson-plan / exam / quiz persistence | add-lesson, add-exam, add-quiz modals are toast-only (1530/1552/1572) | Same reload-survival test as Item 1, per entity — only if Sailaja actually asks |

## THE ANTI-ROADMAP (owner ruled these OUT, 2026-07-20)

Recorded so no future session re-proposes them as fresh ideas. Each needs
**new, explicit owner direction in the conversation** to reopen — a user
saying "make it smarter" is a prompt to show this table, not to start
building.

| Ruled out | What it would look like | Why it's out |
|---|---|---|
| AI-native features | Quiz/exercise generation, progress-prediction ML, analytics dashboards, LLM anything | Owner decision: the frontier is a reliable notebook-replacement, not an AI product. Also: no backend, no network egress to any model API (child-related personal data — hard privacy line in `sailaja-os-change-control`) |
| Parent-facing surfaces | Parent portal, shareable links, emailed reports | Owner decision. The app is for ONE user, Sailaja; parent comms stay as copy-paste WhatsApp templates (page 1306), which already fit her workflow |
| Multi-user / accounts | Logins, roles, sync between devices | Owner decision. One teacher, one browser. Multi-device backup need is served by Item 4's export file, not by sync |
| Backend / server / cloud | Any server, database, hosted API, cloud storage of student data | Owner decision: zero backend is the end state, not a temporary limitation |
| Frameworks / build step | Migrating to React-as-app / Vue / a bundler | Change-control sign-off list; the app is deliberately zero-build so it stays maintainable by anyone with a text editor. (The tweaks panel's compiled-pair React usage is legacy, not precedent — Item 2 step 1 may remove it) |

---

# HALF 2 — The method

How a hunch becomes an accepted result here. This repo's founding incident
(the dead script, below) is the whole argument: its HEAD commit message
claims a feature that never once executed, and nobody noticed for over two
months. The house rules this method serves (adopted verbatim from the FFOS
repo, owner 2026-07-20): verify in a real browser with measurable evidence;
never endanger saved data; no external network.

## 1. The evidence bar

A root-cause or mechanism claim is ACCEPTED only when BOTH hold:

1. **One mechanism explains ALL observations — including the negatives.**
   If your explanation covers the broken thing but not why the working
   things still work, you have a correlation, not a mechanism.
2. **Predictions were written BEFORE the probe ran, as numbers or exact
   strings.** If you looked at output and then decided it "looks right", you
   verified by eyeball — the exact failure this repo already paid for.

**Worked example — the dead-script investigation (2026-07-20), this repo's
one owned specimen of the bar being met:**

- **Reading first.** `index.html` loads exactly three scripts (lines 9–11):
  React and ReactDOM UMD from unpkg, and `tweaks-panel.js`. No Babel,
  standalone or otherwise. Yet the entire persistence layer + tweaks
  UI sits in `<script type="text/babel">` at line 1789.
- **Hypothesis (a mechanism, with a *because*).** Browsers execute only
  script types they recognize; `text/babel` is unknown without the Babel
  runtime, so the block is inert text — *therefore* none of its functions
  exist and no storage is ever written.
- **Predictions, written BEFORE running anything:**
  1. `typeof initDatabase === 'undefined'` (and `renderStudents`,
     `addNewStudent`).
  2. `localStorage.getItem('teach_os_students') === null` after load.
  3. Clicking the modal's "Add Student" button (line 1477,
     `onclick="addNewStudent()"`) throws
     `ReferenceError: addNewStudent is not defined`.
  4. NEGATIVE: **no console error at page load** — browsers *silently skip*
     unknown script types; a load-time error would refute this mechanism.
  5. NEGATIVE: `tweaks-panel.js` globals (e.g. `useTweaks`) DO exist —
     it loads via a plain `<script src>`, so the mechanism predicts it runs.
- **Probe.** Serve locally, drive with headless Playwright, evaluate each
  prediction in the real page.
- **Result.** Every prediction confirmed, including both negatives (and
  `#tweaks-root` had 0 children — the React panel never mounts, consistent).
- **Verdict.** CONFIRMED. One mechanism (unknown script type → inert)
  explains the dead database, the dead panel, the clean console at load,
  AND the still-working plain-script features. Nothing left unexplained →
  stop hunting, start designing the fix.

Contrast what the eyeball would have said: page loads fine, no errors,
buttons show success toasts. Every surface signal said "working".

## 2. Hypothesis template (copy-paste this verbatim)

For any non-trivial bug or mechanism claim. Keep the filled block in your
notes; paste it into the commit body or the failure-archaeology entry.

```
## Hypothesis: <one-line name>
Date: YYYY-MM-DD

SYMPTOM(S):
  1. <observable fact, with the number/string: "Save Session shows a toast
     but sessions count stays 0">
  2. ...

HYPOTHESIS (mechanism, not location — a sentence with a "because"):
  <Bad: "bug in saveAndClose". Good: "the babel block never executes because
  no Babel runtime is loaded, so its functions are never defined".>

PREDICTS (written BEFORE running anything):
  1. <quantitative: "typeof addNewStudent === 'undefined'">
  2. <quantitative: "localStorage key X is null after load">
  3. NEGATIVE: <"Y should STILL work under this mechanism"> (>=1 required)

PROBE (the command / script that will test it):
  <e.g. "python3 -m http.server 8931 + scratch Playwright script evaluating
  the three predictions against http://localhost:8931/" — mechanics in
  sailaja-os-browser-verification. Scratch script: scratchpad, not committed.>

RESULT:
  <actual output, pasted — not paraphrased>

VERDICT: CONFIRMED | REFUTED | INCONCLUSIVE (-> new hypothesis: ...)
```

Rules of use: every prediction gets a number or an exact string; at least one
NEGATIVE prediction is mandatory (it's what catches the fix that breaks
something else); if RESULT ≠ PREDICTS the verdict is REFUTED or
INCONCLUSIVE — never edit PREDICTS after running, start a new block.

## 3. The idea lifecycle

```
hunch
  -> throwaway browser probe (scratch script in the scratchpad — NOT committed)
    -> CANDIDATE (documented, with status, in the relevant skill — Half 1 here,
       or the campaign/data-model skill it belongs to)
      -> gated implementation (classes + gates per sailaja-os-change-control)
        -> SETTLED  (entry recorded in sailaja-os-failure-archaeology)
        or RETIRED  (recorded there too, WITH the reason and the numbers
                     that killed it — a documented dead end is a deliverable)
```

Stage notes:

- **Hunch → probe:** free and cheap. One sentence with a *because*, then the
  cheapest real-browser check that could refute it. Probes never commit; a
  probe that "worked" is not a feature.
- **Probe → CANDIDATE:** write it down where the next session will look
  (this file for roadmap-shaped ideas), status CANDIDATE, with its
  falsifiable "result when…" declared BEFORE building. If you cannot state
  the milestone, you are not ready to build.
- **CANDIDATE → implementation:** only through change-control's gates —
  classification, browser verification, migrations, sign-off list. No idea
  skips from probe to commit.
- **→ SETTLED / RETIRED:** either way, `sailaja-os-failure-archaeology` gets
  the entry. Retirement records the mechanism that killed it and what would
  revive it ("nothing" is a valid answer).

## 4. Anti-patterns this repo has already paid for

1. **Shipping intention as fact.** Commit `9fef6e5` (2026-05-12) — subject:
   "feat: added emoji favicon, pre-compiled JSX, and dynamic localStorage".
   The JSX was not pre-compiled and the localStorage layer never ran once;
   the flagship feature was dead on arrival and stayed dead 2+ months until
   the 2026-07-20 investigation. The commit describes the author's
   *intention*; the browser held the *fact*. Never write (or believe) "added
   X" without evidence X executed.
2. **Trusting commit messages.** Corollary of #1, worth its own line:
   `git log` in this repo contains at least one claim that is simply false.
   Evidence of behavior comes from the tree at a commit, run in a browser —
   never from the message. (Rollback implications →
   `sailaja-os-change-control`, rollback protocol.)
3. **Fixing symptoms before explaining mechanisms.** The tempting "fix" for
   the dead block was adding the Babel-standalone CDN — one line, toasts turn
   into real saves, demo looks fixed. It treats the symptom (block doesn't
   run) while ignoring the mechanism's implications (dev-only in-browser
   compilation, a new external network request against the no-network
   direction, XSS-shaped `innerHTML` code suddenly going live). Meet the
   Section-1 bar first; the fix that follows a confirmed mechanism is usually
   obvious and singular.
4. **Verifying by eyeball.** The reason `9fef6e5` survived: the page loads
   cleanly, buttons respond, toasts say "Session logged!" — every visual
   signal reported success while zero data was written. This app's UI is
   *specifically* good at looking like it works (that's what a demo is).
   Success is a script asserting pre-declared numbers
   (→ `sailaja-os-browser-verification`); a screenshot is not verification.

## 5. Where good changes come from here

**Sailaja's actual daily friction outranks engineering aesthetics.** She is
one non-technical teacher running French tuitions across four curricula; the
app competes with a paper notebook that never crashes and never loses data.

**The priority test — ask it of every proposal:** *"does this help her run
tomorrow's classes?"* Item 1 (a session she logs is still there tomorrow)
passes instantly. A TypeScript migration, a component framework, an AI quiz
generator — fail. When two candidates both pass, prefer the one closer to
the top of Half 1's catalog; when something passes the test but isn't in the
catalog, add it as a CANDIDATE (with this file's format) rather than just
building it.

---

## When NOT to use this skill

- **Executing the current priority** (resurrecting persistence, phases,
  sequencing) → `sailaja-os-daily-use-campaign`. This file says WHY Item 1 is
  first; that one owns HOW and WHEN.
- **Probe/verification mechanics** (serving, Playwright templates, what to
  assert, PASS/FAIL format) → `sailaja-os-browser-verification`.
- **Whether/how a change may commit** (classes, gates, sign-off, rollback) →
  `sailaja-os-change-control`.
- **Schema details and migrations** → `sailaja-os-data-model-and-migrations`.
- **Settled history and incident write-ups** →
  `sailaja-os-failure-archaeology` (that skill receives this skill's SETTLED
  and RETIRED entries).
- **Commit-message style** → `sailaja-os-docs-and-commits`.

## Provenance and maintenance

Authored 2026-07-20 against HEAD `9fef6e5` while the persistence layer was
dead. Updated 2026-07-21 after the daily-use-campaign Phase 1-3 fix closed
Item 1's four gaps (working-tree change at time of writing — confirm it's
committed before trusting "DONE" claims blindly). One-line re-checks before
relying on volatile facts:

- **Owner decisions dated 2026-07-20 — re-confirm with the owner before
  overriding anything in "The owner's frame" or the Anti-Roadmap.** They are
  recorded here precisely so silence doesn't get read as permission.
- No live dead babel block (Item 1 fixed 2026-07-21 — should match only
  historical comments): `grep -n 'type="text/babel"' index.html`
- Student edit/delete now wired: `grep -n "function saveStudentEdit\|function deleteStudent" index.html` (expect hits — if empty, Item 1 has regressed)
- Add-session modal now storage-backed: `grep -n "function logSession" index.html` (expect a hit)
- `saveAndClose` still toast-only for add-lesson/add-exam/add-quiz (unchanged, out of scope): `grep -n "function saveAndClose" index.html`
- No fees feature beyond the template (unchanged, Item 3 needs an owner yes first): `grep -ni "fee\|payment\|ledger" index.html`
- No separate attendance feature (unchanged — by design, see Item 1):
  `grep -ci attendance index.html` (expect 0)
- No export/backup feature yet (Item 4, unchanged): `grep -ni "export\|backup\|download" index.html` (expect 0 feature hits)
- External requests still lines 8–10 (Item 2, unchanged): `grep -n "https://" index.html`
- Live localStorage keys (now three, was two): `grep -n "localStorage" index.html`
- Hardcoded counts (Item 5, unchanged — adding a student doesn't update these): `grep -n "nav-badge\|9 classes this week" index.html`
- Persistence layer alive end-to-end: `PW_PATH=<...> node .claude/skills/sailaja-os-browser-verification/scripts/verify-crud.mjs` (expect `25/25 PASS`)

**Maintenance:** when an item ships or is retired, change its status here
(CANDIDATE → SETTLED/RETIRED with a one-line outcome + pointer to the
failure-archaeology entry) rather than deleting it. When the owner reopens an
anti-roadmap item, move it into the catalog with the dated new decision.
Milestones are proposals set 2026-07-20; a session may renegotiate them
*before* starting an item, never after seeing results.
