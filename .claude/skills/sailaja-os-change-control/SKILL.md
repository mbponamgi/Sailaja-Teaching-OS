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

Mechanics — serving, the Playwright script templates, what to assert, how to
print PASS/FAIL — live in `sailaja-os-browser-verification`. The gate here is
binary: **no browser evidence, no commit.**

### 2. NEVER endanger saved data once `teach_os_students` is live

**Honest status as of 2026-07-20: no real data exists yet.** The
`teach_os_students` key has never been written (see incident above); the only
live localStorage key is `sailaja-dark` (dark-mode flag, `index.html:1682`
and `:1686`).

But the daily-use campaign (`sailaja-os-daily-use-campaign`) will resurrect
the database and put **Sailaja's real student roster** into
`teach_os_students`. From the moment real data exists there, it is
irreplaceable — one teacher's actual records, in one browser, with no backend
and no backup. From that moment:

- Any change to the shape of a student record (fields on the objects in the
  `teach_os_students` array — currently designed as `id, name, parent,
  currBadge, levelBadge, focus, schedule, progress`, see
  `index.html:1901`/`1955`) **must ship a migration** so old saved data loads
  correctly under new code. Schema catalog and migration patterns →
  `sailaja-os-data-model-and-migrations`.
- **No renaming or removing localStorage keys without a migration** that
  copies the data — a renamed key is silent total data loss.
- **Backup before any risky change**: before verifying a schema-touching or
  storage-touching change against a browser profile that may hold real data,
  export the store first (mechanics → `sailaja-os-data-model-and-migrations`).
- Never ship code that can wipe or corrupt the store on an ordinary code
  path. `renderStudents()` (`index.html:1907`) reads with
  `JSON.parse(localStorage.getItem(DB_KEY)) || []` — note that a corrupted
  (non-JSON) value would **throw**, not fall back; the `||` only catches
  `null`. Treat "what happens to existing data when this runs?" as a
  mandatory design question.

Your dev localStorage is fresh; Sailaja's is not. New code always meets old
data.

### 3. NO raw JSX may ever ship to the browser

This is the architectural lesson of the founding incident. The repo has no
build step, so the browser executes exactly what is committed — and browsers
do not execute JSX or `type="text/babel"` blocks.

- JSX changes go through the committed pair: edit `tweaks-panel.jsx`
  (source), recompile, commit the resulting `tweaks-panel.js` (plain JS,
  exposes its components via `Object.assign(window, {useTweaks, TweaksPanel,
  ...})` at its line 351) **together with** the `.jsx`. Standard recompile
  invocation (verify the output in a browser afterwards — the compile
  succeeding is not the gate, non-negotiable #1 is):

  ```bash
  npm exec --yes --package=@babel/cli --package=@babel/core \
    --package=@babel/preset-react -- \
    babel tweaks-panel.jsx --presets @babel/preset-react -o tweaks-panel.js
  ```

- Or rewrite the code as plain JS (no JSX syntax, `React.createElement` or
  plain DOM) inside a normal `<script>` tag.
- **Never** add a `<script type="text/babel">` block, and never "fix" one by
  adding the Babel standalone CDN at runtime — that's a new external network
  request (owner sign-off, see below) and against the vendoring direction.
- Committing a `.jsx` edit without its recompiled `.js` sibling ships a lie:
  the browser only ever loads `tweaks-panel.js`.

Audit any diff for this before commit:

```bash
git diff -- index.html | grep -n "text/babel"        # must add nothing
git diff --name-only | grep -q "tweaks-panel.jsx" && \
  git diff --name-only | grep "tweaks-panel.js$" \
  || echo "OK: jsx untouched (or PAIR VIOLATION if jsx changed alone)"
```

(As of 2026-07-20 the one existing `text/babel` block at `index.html:1789` is
a known dead defect awaiting the campaign — do not add more, and do not
remove it casually either: removing/converting it IS the campaign's job and a
behavior + data-schema change.)

## Change classification and required gates

Classify before you start, not after. A change spanning multiple classes must
pass the **union** of all its gates.

| Class | Examples | Required gates before commit |
|---|---|---|
| (a) **UI / cosmetic** | CSS, colors, spacing, dark-mode styling, sidebar layout, favicon | Browser smoke: page loads with zero console errors, changed element renders in both light and dark mode (`sailaja-dark` toggle). No migration needed. |
| (b) **Content** | Quiz questions, lesson text, message templates (`copyTemplate` blocks), vocabulary/word lists — static HTML inside `index.html` | Browser smoke: page loads with zero console errors and the changed content is visible. Content lives inside the same 1987-line file as all the JS — a stray `</script>`, unclosed tag, or unescaped backtick can kill the whole app, so this is NOT exempt from a browser load. |
| (c) **Data-schema** | Anything touching the `teach_os_students` key or the shape of student records; adding/renaming/removing any localStorage key | Schema reasoning + migration per non-negotiable #2 (→ `sailaja-os-data-model-and-migrations`) · Playwright run that seeds **old-shape** localStorage and asserts the app loads and renders it · owner sign-off if a key or record field is renamed/removed · backup-before-verify once real data exists (post-campaign). |
| (d) **Behavior / JS logic** | Any function body, event handler, `onclick`, script block, render logic, the dead-block resurrection itself | Full Playwright verification driving the changed flow with asserted outcomes and printed PASS/FAIL (non-negotiable #1) · confirm no `type="text/babel"` introduced (non-negotiable #3) · if the change writes localStorage, also gate (c). Known latent defects to not regress or blindly copy: `renderStudents()` interpolates `${s.name}`/`${s.parent}`/etc. into `innerHTML` **unescaped** (`index.html:1931–1939`, stored-XSS-shaped) and hardcodes `data-band="primary"` on every dynamic row (`index.html:1928`). |
| (e) **Vendor / deps** | The CDN lines (`index.html:8–10`: Google Fonts + unpkg React 18.3.1 dev builds), the `tweaks-panel.jsx`/`.js` pair, vendoring deps locally | Owner sign-off for ANY new external request (see below) · direction of travel is **vendor locally, no external network** (owner, 2026-07-20) — removing a CDN in favor of a vendored copy is aligned, adding one is not · recompile-pair discipline per non-negotiable #3 · full offline browser pass after vendoring (app works with network blocked). |
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
  a font host, an analytics snippet, a fetch to any host. The existing three
  external lines (`index.html:8–10`) are a known deviation already slated for
  vendoring; do not grow the list.
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

# 1. No raw JSX shipping (non-negotiable #3):
git diff -- index.html | grep -n "text/babel" && echo "STOP: babel block in diff"
git diff --name-only | grep -x "tweaks-panel.jsx" && \
  { git diff --name-only | grep -qx "tweaks-panel.js" || echo "STOP: jsx changed without recompiled js"; }

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

Authored 2026-07-20; all facts verified against the working tree at HEAD
`9fef6e5` on that date. Volatile facts and their one-line re-verification
commands (run from the repo root):

- Dead babel block still at line 1789 (goes away when the campaign lands):
  `grep -n 'type="text/babel"' index.html`
- CDN/external lines still 8–10 (goes away when vendoring lands):
  `grep -n "unpkg\|googleapis" index.html`
- localStorage keys: `grep -n "localStorage" index.html | grep -v "DB_KEY)"`
- Database functions and DB_KEY: `grep -n "DB_KEY\|addNewStudent\|initDatabase\|renderStudents" index.html`
- Unescaped innerHTML + hardcoded band in renderStudents:
  `sed -n '1926,1940p' index.html`
- tweaks-panel globals export: `grep -n "Object.assign(window" tweaks-panel.js`
- Still no build system / lint / tests: `ls package.json 2>&1; ls *.test.* 2>/dev/null`
- File inventory and line counts: `wc -l index.html sailaja_teaching_os_v2.html tweaks-panel.js tweaks-panel.jsx`
- Whether `teach_os_students` holds real data yet (flips non-negotiable #2
  from "future" to "armed"): check Sailaja's browser profile, not the repo —
  `localStorage.getItem('teach_os_students')` in her browser console.
- Cross-references assume the sibling skills named above exist:
  `ls .claude/skills/`
