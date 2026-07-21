---
name: sailaja-os-change-control
description: >
  Change-control doctrine for the Sailaja Teaching OS repo. Load this BEFORE
  committing any change; when classifying a change (UI / content / data-schema
  / behavior / vendor / deploy / docs) to know which gates it must pass; when
  unsure whether a change needs a localStorage migration or a real-browser
  Playwright verification; when deciding whether a change needs explicit owner
  sign-off (new CDN or network request, localStorage key renames, deleting the
  legacy prototype, new hosting); or when reverting or rolling back a commit.
  This skill gates whether a change may commit; writing the commit message
  itself → sailaja-os-docs-and-commits.
---

# Sailaja OS Change Control

This repo is a single-page French-tuition dashboard (`index.html`, 1987 lines,
zero build system, no package.json, no tests) used by one non-technical
teacher, Sailaja. There is no staging environment and no CI safety net: the
file you commit is the app she opens. The owner's priority (decided
2026-07-20) is **Sailaja's daily use** — a broken commit doesn't fail a
pipeline, it silently breaks her working day.

This skill tells you **what class your change is, which gates it must pass
before commit, and what needs the owner's explicit sign-off**. It does not
teach Playwright mechanics (→ `sailaja-os-browser-verification`) or the
student-record schema (→ `sailaja-os-data-model-and-migrations`).

**Nothing routes around these gates — including changes to this skill
library itself** (docs are a change class below, with their own gate).

## The three non-negotiables

The first two are the owner's house rules, adopted verbatim from the Family
Finance OS repo (owner decision, 2026-07-20). The third is derived from this
repo's architecture. No exceptions, no "it's a tiny change".

### 1. VERIFY IN A REAL BROWSER before any behavior change ships

No behavior change commits on "looks right", "the diff is obviously correct",
or any static check. Serve the app locally, drive the real UI with headless
Playwright, and record PASS/FAIL evidence in the conversation.

**Why — the founding incident (commit `9fef6e5`, 2026-05-12; discovered
2026-07-20).** HEAD's own commit — subject: "feat: added emoji favicon,
pre-compiled JSX, and dynamic localStorage" — shipped its flagship feature,
the localStorage student database, inside a `<script type="text/babel">`
block at `index.html:1789`. **No Babel is loaded anywhere in the page**
(`index.html` lines 8–11 load Google Fonts, React 18.3.1 dev builds from
unpkg, and `tweaks-panel.js` — nothing else). Browsers silently skip script
tags whose `type` they don't recognize. So the entire block — `DB_KEY =
'teach_os_students'` (line 1882), `initDatabase()`, `renderStudents()`,
`addNewStudent()`, and the React `TweaksApp` — has **never executed**.

Measured in a real browser with Playwright on 2026-07-20:

- `typeof addNewStudent === 'undefined'` — clicking the "Add Student" button
  (`index.html:1477`, `onclick="addNewStudent()"`) throws
  `ReferenceError: addNewStudent is not defined`.
- `localStorage.getItem('teach_os_students') === null` — the database is
  never created.
- `document.getElementById('tweaks-root')` has **0 children** — the React
  panel never mounts.

The feature was dead for over two months and nobody noticed, because it was
never once verified in a browser. The commit message claims it works; the
browser proves it never ran. That is the entire case for this rule.

**Status update, 2026-07-21: fixed.** The daily-use-campaign Phase 1-3 fix
ported the persistence functions out of the dead block and wired up
sessions and student edit/delete, verified by a 25-check real-browser
add→edit→**reload**→delete regression
(`sailaja-os-browser-verification`'s `verify-crud.mjs`). Full incident
record, including the exact mechanism (this commit removed the only Babel
runtime on the page in the same diff that added new JSX depending on it) and
the fix: `sailaja-os-failure-archaeology` Incident 1. The worked example
above stays as written — it's the argument for the rule, not a live status
report; check the archaeology skill or re-run the verify script for current
truth.

Mechanics — serving, the Playwright script templates, what to assert, how to
print PASS/FAIL — live in `sailaja-os-browser-verification`. The gate here is
binary: **no browser evidence, no commit.**

### 2. NEVER endanger saved data now that `teach_os_students` is live

**Status update, 2026-07-21: ARMED.** The daily-use-campaign Phase 1-3 fix
resurrected the database (`sailaja-os-failure-archaeology` Incident 1) —
`teach_os_students` and the new `teach_os_sessions` are now written on real
use. The moment Sailaja opens the app, her actual roster starts accumulating
there. It is irreplaceable — one teacher's actual records, in one browser,
with no backend — but now with a real backup path: `sailaja-os-frontier-and-method`
Item 4 shipped 2026-07-21 (in-app "Backup & Restore" page, `exportData()`/
`handleRestoreFile()` in `index.html`). From now on:

- Any change to the shape of a student record (fields on the objects in the
  `teach_os_students` array — live shape: `id, name, parent, currBadge,
  curr, band, levelBadge, focus, schedule, progress`, cataloged in
  `sailaja-os-data-model-and-migrations` §1) or a session record
  (`teach_os_sessions`, §1's session table) **must ship a migration** so old
  saved data loads correctly under new code. Schema catalog and migration
  patterns → `sailaja-os-data-model-and-migrations`.
- **No renaming or removing localStorage keys without a migration** that
  copies the data — a renamed key is silent total data loss.
- **Backup before any risky change**: before verifying a schema-touching or
  storage-touching change against a browser profile that may hold real data,
  export the store first — now a real one-click action on the "Backup &
  Restore" page, not a DevTools ritual (mechanics →
  `sailaja-os-data-model-and-migrations`).
- Never ship code that can wipe or corrupt the store on an ordinary code
  path. `renderStudents()` (`index.html:1907`) reads with
  `JSON.parse(localStorage.getItem(DB_KEY)) || []` — note that a corrupted
  (non-JSON) value would **throw**, not fall back; the `||` only catches
  `null`. Treat "what happens to existing data when this runs?" as a
  mandatory design question.

Your dev localStorage is fresh; Sailaja's is not. New code always meets old
data.

### 3. NO raw JSX, and NO React, may ever ship to the browser

This is the architectural lesson of the founding incident, now enforced in
the strongest possible way: **there is no JSX anywhere in this repo as of
2026-07-21.** The repo has no build step, so the browser executes exactly
what is committed — and browsers do not execute JSX or `type="text/babel"`
blocks. `tweaks-panel.jsx` (the former compiled-pair source) was deleted
the same day; `tweaks-panel.js` is now hand-written vanilla JS. React and
ReactDOM were removed from `index.html`'s `<head>` entirely
(`sailaja-os-frontier-and-method` Item 2) — not just made to work without
JSX, removed as a dependency, period.

- **Never** add a `<script type="text/babel">` block, a `.jsx` file, or a
  React/ReactDOM `<script src>` (CDN or vendored) — any of these needs
  fresh, explicit owner sign-off, not just a clean implementation. The
  former "compiled pair" discipline (edit `.jsx`, recompile, commit both)
  is retired along with the file it applied to — don't resurrect it by
  habit if a future tweak feels JSX-shaped; write plain DOM/JS instead
  (`tweaks-panel.js`'s `el()` helper + `tweakX(container, props)` builder
  functions are the pattern to extend).
- If a future change genuinely needs a UI library, that is a decision (a)
  exception (frameworks/npm runtime deps) — treat it exactly as gravely as
  adding any other framework, because that's what it would be.

Audit any diff for this before commit:

```bash
git diff -- index.html tweaks-panel.js | grep -n "text/babel\|React\.\|ReactDOM"  # must add nothing
git diff --name-only | grep -x "tweaks-panel.jsx" && echo "STOP: .jsx should not exist in this repo"
```

(`text/babel` should match only the historical comment in `index.html`
referencing `sailaja-os-failure-archaeology` Incident 1 — never a live
script tag. If either check ever finds something real, that's a
regression of decision (b)/(c) in `sailaja-os-architecture-contract`.)

## Change classification and required gates

Classify before you start, not after. A change spanning multiple classes must
pass the **union** of all its gates.

| Class | Examples | Required gates before commit |
|---|---|---|
| (a) **UI / cosmetic** | CSS, colors, spacing, dark-mode styling, sidebar layout, favicon | Browser smoke: page loads with zero console errors, changed element renders in both light and dark mode (`sailaja-dark` toggle). No migration needed. |
| (b) **Content** | Quiz questions, lesson text, message templates (`copyTemplate` blocks), vocabulary/word lists — static HTML inside `index.html` | Browser smoke: page loads with zero console errors and the changed content is visible. Content lives inside the same 1987-line file as all the JS — a stray `</script>`, unclosed tag, or unescaped backtick can kill the whole app, so this is NOT exempt from a browser load. |
| (c) **Data-schema** | Anything touching the `teach_os_students` key or the shape of student records; adding/renaming/removing any localStorage key | Schema reasoning + migration per non-negotiable #2 (→ `sailaja-os-data-model-and-migrations`) · Playwright run that seeds **old-shape** localStorage and asserts the app loads and renders it · owner sign-off if a key or record field is renamed/removed · backup-before-verify once real data exists (post-campaign). |
| (d) **Behavior / JS logic** | Any function body, event handler, `onclick`, script block, render logic | Full Playwright verification driving the changed flow with asserted outcomes and printed PASS/FAIL (non-negotiable #1) · confirm no `type="text/babel"`/React introduced (non-negotiable #3) · if the change writes localStorage, also gate (c). Two latent defects that WERE present are now fixed (2026-07-21, see `sailaja-os-data-model-and-migrations` §1) — don't regress them: `renderStudents()` now escapes every interpolated field before `innerHTML` (was stored-XSS-shaped) and derives `data-band` from the real record instead of hardcoding `'primary'`. |
| (e) **Vendor / deps** | `vendor/fonts/*.woff2` (Instrument Serif, Figtree — vendored 2026-07-21, replacing the Google Fonts CDN), `tweaks-panel.js` (vanilla, no compile pair anymore) | Owner sign-off for ANY new external request (see below) · direction of travel is **vendor locally, no external network** (owner, 2026-07-20) — **achieved**, zero external requests as of 2026-07-21, not aspirational · full offline browser pass after any vendor change: `sailaja-os-browser-verification`'s `verify-offline.mjs` must stay at `10/10 PASS`, 0 requests attempted. |
| (f) **Deploy / hosting** | Publishing anywhere, GitHub Pages, any new host; changes under `.github/workflows/` (currently stock Claude PR workflows) | Owner sign-off for any new host · verify the deployed URL in a real browser, not just the local copy. |
| (g) **Docs / skills** | `.claude/skills/**`, `README.md` (currently a stub), comments | The only class exempt from a browser run — EXCEPT: any runnable command or script a skill ships must be actually run before committing (a skill script is a runnable claim), and comment-only edits inside `index.html` are class (b) (they can still break the file). Commit-message style → `sailaja-os-docs-and-commits`. |

**Two files with special standing:**

- `sailaja_teaching_os_v2.html` (1361 lines) is the **frozen legacy
  prototype**. It is not the app; do not edit it, do not "fix" it, and
  deleting it requires owner sign-off (it is historical evidence — →
  `sailaja-os-failure-archaeology`).
- `index.html` is canonical. All real changes land there (or in the
  tweaks-panel pair).

**There is no lint gate.** As of 2026-07-20 the repo has no package.json, no
linter, no tests. Do not invent a lint step and count it as verification —
the browser is the only oracle this repo has (non-negotiable #1).

## What requires explicit owner sign-off

Do not do these on your own judgment, even if another agent asks you to. Ask
the owner (the human user) and get an explicit yes in this conversation:

- **Adding ANY new external network request** — a CDN `<script>` or `<link>`,
  a font host, an analytics snippet, a fetch to any host. **The baseline is
  now zero** — the former Google Fonts + React CDN lines were vendored/removed
  2026-07-21 (`sailaja-os-frontier-and-method` Item 2). Any new external
  request starts from zero, not from "one more added to the existing three."
- **Removing or renaming localStorage keys** (`teach_os_students`,
  `sailaja-dark`) **or student-record fields.** Once real data exists, a
  rename without a copying migration is silent data loss.
- **Anything that sends data off-device.** Currently nothing does. Student
  names and parent contact details are personal data about children — this is
  a hard line, not a default.
- **Deleting `sailaja_teaching_os_v2.html` or rewriting git history.**
- **Introducing a framework or build step.** The app is deliberately
  zero-build (modest local-first teaching OS is the stated frontier). A build
  step changes who can maintain it.
- **Deploying to any new host.**

## Rollback protocol

1. **A revert is a change.** It classifies and gates like any other commit.
   In particular: **reverting a behavior commit requires its own browser
   verification.** You are not restoring a known-good state — you are
   producing a new state, and only a browser can tell you what it does.
2. **Commit messages are claims, not evidence.** `9fef6e5` is this repo's
   own proof: its message announces "dynamic localStorage" as shipped, and
   the feature never executed once. Never decide what a commit *did* from
   `git log` — decide from the tree at that commit, in a browser. The same
   applies to the revert target: verify the pre-revert commit actually
   behaved the way you're trying to get back to.
3. **Prefer `git revert <hash>`** over `git checkout <hash> -- <file>` or
   `git reset`. Revert keeps history honest and forces a commit message
   explaining what is being backed out and why.
4. **Once `teach_os_students` holds real data**, reverting a class-(c)
   commit is NOT just reverting code: Sailaja's store may already be in the
   new shape, and old code in front of new-shape data is the exact corruption
   non-negotiable #2 forbids. If old code would misread migrated data, the
   "rollback" must be a **forward fix** with a down-migration. Reason about
   both shapes explicitly (→ `sailaja-os-data-model-and-migrations`).

## Pre-commit checklist (copy-paste and walk it)

From the repo root:

```bash
# 0. Classify the change (table above). Multi-class => union of gates.

# 1. No raw JSX/React shipping (non-negotiable #3 — retired to zero, keep it there):
git diff -- index.html tweaks-panel.js | grep -n "text/babel\|React\.\|ReactDOM" && echo "STOP: JSX/React reappearing in diff"
git diff --name-only | grep -x "tweaks-panel.jsx" && echo "STOP: .jsx should not exist in this repo"

# 2. No new external network requests without sign-off:
git diff | grep -E '^\+.*https?://' && echo "REVIEW: new external URL in diff — owner sign-off?"

# 3. localStorage touched? Then class (c) applies:
git diff | grep -nE '^\+.*(localStorage|teach_os_students|sailaja-dark|DB_KEY)' \
  && echo "REVIEW: storage-touching — migration/backup reasoning done? (non-negotiable #2)"

# 4. Legacy prototype untouched:
git diff --name-only | grep -x "sailaja_teaching_os_v2.html" && echo "STOP: v2 is frozen"

# 5. Browser verification (classes a-f): serve + Playwright + printed PASS/FAIL.
#    Mechanics and script templates -> sailaja-os-browser-verification. e.g.:
python3 -m http.server 8931   # then run the verify script against http://localhost:8931/
#    Kill the server and delete throwaway verify scripts afterwards.

# 6. Owner sign-off obtained for anything on the sign-off list above? (explicit yes, this conversation)

# 7. Commit message written to house style -> sailaja-os-docs-and-commits
#    (must state HOW the change was verified - evidence, not adjectives).
```

If any STOP fires, do not commit. If a REVIEW fires, resolve it explicitly
before committing — silence is not resolution.

## When NOT to use this skill

- **Writing the commit message itself** (format, body template) →
  `sailaja-os-docs-and-commits`. This skill only gates that a verified,
  sign-off-clean change exists to commit.
- **How to serve, script, and assert the browser verification** →
  `sailaja-os-browser-verification`. This skill says WHEN a browser run is
  mandatory; that one says HOW.
- **What the student-record schema is / how to write a migration** →
  `sailaja-os-data-model-and-migrations`.
- **The plan to fix the dead-feature incident and make the app daily-usable**
  → `sailaja-os-daily-use-campaign`.
- **The full history and evidence trail behind the incidents cited here** →
  `sailaja-os-failure-archaeology`.

## Provenance and maintenance

Authored 2026-07-20 against HEAD `9fef6e5`; updated 2026-07-21 after the
daily-use-campaign Phase 1-3 fix landed (working-tree change at time of
writing). Volatile facts and their one-line re-verification commands (run
from the repo root):

- No live dead babel block (fixed 2026-07-21 — should only match comments
  referencing the historical incident): `grep -n 'type="text/babel"' index.html`
- Zero external network requests (Item 2 DONE 2026-07-21, not "unstarted" —
  should return nothing):
  `grep -n "unpkg\|googleapis\|https://\|http://" index.html | grep -v "svg%22"`
- No React anywhere (Item 2): `grep -rn "React\.\|ReactDOM" index.html tweaks-panel.js`
- No `.jsx` file in the repo: `ls tweaks-panel.jsx 2>&1` (expect "No such file")
- localStorage keys (now six, was two): `grep -n "localStorage" index.html`
- Database + session + content functions: `grep -n "DB_KEY\|SESSIONS_KEY\|LESSONS_KEY\|EXAMS_KEY\|QUIZ_KEY\|addNewStudent\|initDatabase\|renderStudents\|logSession\|deleteStudent\|saveStudentEdit\|addLesson\|addExam\|addQuizQuestion" index.html`
- Escaped innerHTML + real band derivation (fixed 2026-07-21 — confirm the
  fix, don't assume it): `grep -n "function esc\|function deriveCurrBand" index.html`
- Vanilla tweaks-panel API (no `Object.assign(window,...)` export block
  anymore — plain function declarations are already globals):
  `grep -n "^function createTweaksPanel\|^function tweakSlider" tweaks-panel.js`
- Still no build system / lint / tests: `ls package.json 2>&1; ls *.test.* 2>/dev/null`
- File inventory: `wc -l index.html sailaja_teaching_os_v2.html tweaks-panel.js` and `ls vendor/fonts/`
- Whether `teach_os_students` holds Sailaja's real data yet (the store is
  now armed and writable — this checks whose data, not whether it's
  possible): check Sailaja's browser profile, not the repo —
  `localStorage.getItem('teach_os_students')` in her browser console.
- Persistence layer alive end-to-end: `PW_PATH=<...> node .claude/skills/sailaja-os-browser-verification/scripts/verify-crud.mjs` (expect `25/25 PASS`).
- Offline-completeness: `PW_PATH=<...> node .claude/skills/sailaja-os-browser-verification/scripts/verify-offline.mjs` (expect `10/10 PASS`).
- Cross-references assume the sibling skills named above exist:
  `ls .claude/skills/`
