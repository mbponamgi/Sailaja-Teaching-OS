---
name: sailaja-os-docs-and-commits
description: >
  House style for documentation and commit messages in the Sailaja Teaching
  OS repo. Load when: writing or reviewing a commit message; documenting an
  incident, bug investigation, or root-cause finding; adding or updating a
  skill in .claude/skills/; asked where the docs live, what to do about
  README.md, what the commit-message format is, or how knowledge is preserved
  in this repo; or writing anything Sailaja herself will read (plain-language
  notes about her workflow). Provides the commit body template (Root cause /
  Fix / Verified / Data-safety), the incident write-up template for
  sailaja-os-failure-archaeology, the skills-library maintenance rules, and
  the README / for-Sailaja doc policies.
---

# Sailaja OS docs and commits

This skill defines how knowledge is recorded in this repo: where the docs of
record live, how to write a commit message, how to write up an incident, how
to keep the skills library from rotting, and how to write for the one
non-technical reader who matters (Sailaja, the teacher).

Two owner non-negotiables (adopted verbatim from the sibling Family Finance
OS repo, owner decision 2026-07-20) shape everything below:

1. **Never break saved data.** Any commit touching the `teach_os_students`
   store (or `sailaja-dark`) must say what happens to existing data.
2. **Verify in a real browser** — and the commit body must *state* what was
   verified, with evidence, not just that "it works".

Audience for all docs here: zero-context Sonnet-class models, plus occasional
plain-language artifacts for Sailaja herself (§6).

## 1. Docs-of-record map

There is no `docs/` directory (as of 2026-07-20). The documentation of
record is exactly two places:

| Where | What it records | Format |
|---|---|---|
| `git log` (commit bodies) | Changelog + root-cause record: what changed, why, how it was verified. | Conventional commit + body template (§2) |
| `.claude/skills/` | Operating knowledge: how the app works, how to run/verify/debug it, teaching-domain reference. | skill library (`ls .claude/skills/` for the current count — 10 as of 2026-07-21, was 7 complete + 2 broken stubs the day before), house format (§4) |
| `README.md` | **Nothing yet.** Its entire content is `# friendly-robot` — the GitHub auto-generated repo name (the repo's real name is `sailaja-teaching-tuition-OS`). Candidate outline in §5; do not rewrite it unasked. | Honest gap |

**The survival rule.** Chat transcripts, scratchpads, and PR comment threads
do not survive. Knowledge that must survive goes in:

1. a **commit body** (always — the permanent record of the change), and
2. a **skill update in the same change** if the knowledge is operational (a
   procedure, a gotcha, a schema fact someone will need again).

If you learned something the hard way and it lives only in the conversation,
it is already lost. Write it down before you finish.

## 2. Commit message template

### Format

```
type(scope): imperative subject, ≤72 chars

Root cause: the MECHANISM of the problem, not just its location.
  Quote the failing code/line if short. Explain WHY it failed.

Fix: why THIS approach; alternatives considered and rejected if any.

Verified: exactly what was run and observed — the real-browser /
  Playwright evidence (non-negotiable #2). Name the verify script,
  quote its PASS summary, name observed values and counts.

Data-safety: impact on 'teach_os_students' and 'sailaja-dark'
  localStorage keys — what happens to existing data, what migration
  shipped and where. If neither key is affected in any way: "none".
```

Section labels are a discipline, not a rigid syntax; cover all that apply.
For a pure feat, "Root cause" becomes "Why" (the motivation).

**Types:** `feat`, `fix`, `chore`, `docs`, and — repo-specific — `content:`
for teaching-content-only changes (quiz questions, lesson text, vocab lists,
message templates; the class-(b) changes of `sailaja-os-change-control`).
Do not invent further types; if none fits, `chore` with a clear subject.

**The Verified rule (hard):** `Verified:` must cite actual browser evidence
— the verify script's name plus its printed PASS summary and the measured
numbers. "Tested manually", "works locally", or "looks good" are banned
phrases. If you have no script output to quote, you have not verified, and
per `sailaja-os-change-control` you may not commit a behavior change at all.

**The Data-safety rule (hard):** every commit body states the impact on
`teach_os_students` / `sailaja-dark`, or literally "Data-safety: none".
Writing "none" is a checked claim, not a default — check the diff for
`localStorage`, `DB_KEY`, and the key names first (the change-control
pre-commit checklist does exactly this grep).

### Worked example — the dead-script fix, as it SHOULD be written

Hypothetical body for the fix that resurrects the dead student database
(this fix has NOT shipped as of 2026-07-20 — the bug is live at HEAD; this
is the template filled in, not a record of a real commit):

```
fix: execute student-db script block (was dead text/babel, never ran)

Root cause: index.html:1789 wraps the entire student-database layer
  (DB_KEY 'teach_os_students' at :1882, initDatabase, renderStudents,
  addNewStudent at :1944) in <script type="text/babel">, but no Babel
  runtime is loaded anywhere in the page. Browsers silently skip
  script tags with unrecognized types, so none of this code has ever
  executed; the "Add Student" button (index.html:1477) threw
  ReferenceError: addNewStudent is not defined.

Fix: stripped the JSX portions out of the block (moved to the
  tweaks-panel.jsx -> tweaks-panel.js compiled pair) and converted the
  remaining plain-JS database code to a normal <script> tag.
  Rejected alternative: loading Babel standalone from a CDN at runtime
  — adds an external network request (owner sign-off list) and is
  against the vendoring direction.

Verified: scripts/verify-add-student.mjs (headless Playwright against
  http://localhost:8931/index.html):
  - typeof addNewStudent === 'function' (was 'undefined' at HEAD)
  - clicked "Add Student", filled the form, saved: localStorage
    'teach_os_students' went from null to an array of 1 record with
    the expected 8 fields
  - page reload: the student re-renders from storage; 0 console errors
  - dark-mode toggle still persists ('sailaja-dark' = '1' after toggle)
  Script printed: "PASS 5/5 checks, 0 console errors".

Data-safety: 'teach_os_students' — write path enabled for the first
  time; no existing data at risk (Playwright-verified 2026-07-20 that
  the key was null: it had never been written). 'sailaja-dark':
  untouched. No migration needed.
```

Note what makes the Verified section pass the bar: it names the script,
quotes the PASS line, and gives before/after values (`'undefined'` →
`'function'`, `null` → 1 record) and counted zeros. That is the standard.

### Anti-exemplar — HEAD itself (the cautionary tale)

`9fef6e5` (2026-05-12), the current HEAD, subject:

> feat: added emoji favicon, pre-compiled JSX, and dynamic localStorage

No body. And two of its three claims are false at runtime: the "dynamic
localStorage" student database and the JSX-dependent code shipped inside a
dead `<script type="text/babel">` block (`index.html:1789`) with no Babel
runtime on the page — Playwright-verified 2026-07-20 that
`typeof addNewStudent === 'undefined'` and `teach_os_students` was never
written. The message records the author's *intent*; the browser records the
truth. Nobody noticed for over two months because nothing was verified.

**The rule this produced:** a commit message records what was VERIFIED, not
what was intended. If the `Verified:` section can't quote evidence, the
subject line may not claim the feature. (Full incident record →
`sailaja-os-failure-archaeology`; the gate that prevents recurrence →
`sailaja-os-change-control` non-negotiable #1.)

The rest of the history (7 commits total, 2026-04-20 to 2026-05-12) is
pre-discipline and mixed-style: quoted subjects (`b9815ed "Claude PR
Assistant workflow"`), bare subjects (`baba712 first commit`), merges. None
have bodies. Do not imitate any of it; the template above is the standard
from now on.

### Mechanics

- Subject: imperative mood, ≤72 chars, no trailing period.
- Body: wrap at ~74 chars; blank line between subject and body.
- Co-author trailer per current tooling convention
  (`Co-Authored-By: Claude ... <noreply@anthropic.com>`).
- One logical change per commit. If the body needs two unrelated "Root
  cause" sections, it is two commits.

## 3. Incident write-up template (for sailaja-os-failure-archaeology)

When an investigation is worth remembering, the entry lands in
`sailaja-os-failure-archaeology`. Use this exact structure:

```markdown
## <Incident name> (<start date> – <end date or "ongoing">)

Symptom: what was observed, verbatim where possible.

Root cause: the mechanism. Quote the failing code if short.

Evidence (measured): commit hashes, file:line refs, and the actual
  measurements (Playwright assertions, console output, localStorage
  contents) — numbers, not adjectives. No real student/parent PII.

Status: OPEN | OPEN-latent | SETTLED | SUPERSEDED
  OPEN        = broken on a path users hit today
  OPEN-latent = defect confirmed present but not yet on a user-facing
                path (e.g. XSS in code that never executes)
  SETTLED     = fixed AND the fix is browser-verified at current HEAD
  SUPERSEDED  = the affected code no longer exists / was replaced
  ("SETTLED" requires real-browser evidence; otherwise it stays OPEN.)

Fix commit: hash, or "none yet".

Lessons: the one-sentence takeaway, and WHICH SKILL now encodes it
  (name the skill and section you added/updated).
```

### Filled example — the founding incident

```markdown
## Dead text/babel block: flagship feature never executed
   (2026-05-12 – ongoing)

Symptom: "Add Student" button does nothing; no student data ever
  persists despite HEAD's commit claiming "dynamic localStorage".

Root cause: index.html:1789 wraps the student DB layer and React
  tweaks panel in <script type="text/babel">; no Babel runtime is
  loaded (index.html:8–11 load only fonts, React 18.3.1, and
  tweaks-panel.js). Browsers silently skip unknown script types.

Evidence (measured): Playwright, 2026-07-20 —
  typeof addNewStudent === 'undefined';
  localStorage.getItem('teach_os_students') === null;
  #tweaks-root has 0 children. Claim source: 9fef6e5 (2026-05-12).

Status: OPEN

Fix commit: none yet (resurrection is the job of
  sailaja-os-daily-use-campaign).

Lessons: commit messages are claims, not evidence — verify in a real
  browser before shipping AND before believing git log. Encoded in
  sailaja-os-change-control (non-negotiables #1 and #3, rollback
  protocol) and sailaja-os-docs-and-commits (§2 Verified rule).
```

Rules: every claim traceable to a hash or file:line ref; date-stamp the
entry; if the lesson changed a procedure, the same change updates the
relevant skill — an archaeology entry whose lesson lives nowhere operational
is a tombstone, not a record.

## 4. Skills-library maintenance

Skills live at `.claude/skills/<name>/SKILL.md`. Library manifest
(2026-07-20), 12 skills:

sailaja-os-architecture-contract, sailaja-os-change-control,
sailaja-os-debugging-playbook, sailaja-os-failure-archaeology,
sailaja-os-data-model-and-migrations, french-tuition-reference,
sailaja-os-browser-verification, sailaja-os-env-run-deploy,
sailaja-os-daily-use-campaign, sailaja-os-content-authoring,
sailaja-os-docs-and-commits (this skill), sailaja-os-frontier-and-method.

The library was authored in parallel on 2026-07-20 — at this skill's
authoring time only `sailaja-os-change-control` had content on disk; the
manifest above is the project brief's final roster. Re-verify what actually
exists with `ls .claude/skills/`.

### The core rule (change-control-adjacent)

**When a code change invalidates a skill claim, the SAME commit updates the
skill.** Not a follow-up, not a TODO — the same commit. Treat a stale skill
fact like broken saved data: the next reader loads it and acts on it. This
rule operates alongside `sailaja-os-change-control` class (g): skill edits
are docs-class (no browser run), EXCEPT any runnable command or script a
skill ships must actually be run before committing.

### House format for every skill

- Frontmatter with `name:` and a trigger-rich `description:` ("Load when:
  …") — the description is what makes the skill load; write triggers, not a
  synopsis.
- **One home per fact.** Each fact lives in exactly one skill; siblings
  cross-reference by name (`→ sailaja-os-change-control`) instead of
  duplicating. Duplicated facts rot independently and then disagree.
- A "When NOT to use" section pointing at sibling skills.
- **Date-stamp volatile facts** (line numbers, versions, library counts,
  "no real data yet"): "As of 2026-07-20, …".
- Every skill ends with a **"Provenance and maintenance"** section:
  authoring date plus copy-pasteable re-verification one-liners for its
  volatile claims. When you doubt a skill's claim, run its one-liners before
  trusting or citing it; when you author or update a skill, add/refresh
  them.
- No oversell: label anything unproven per §7.

## 5. README policy

`README.md` currently reads `# friendly-robot` in its entirety — the GitHub
auto-generated repo name, never edited (verified 2026-07-20). That is an
honest gap, not a task: improving it is the owner's call; do not rewrite it
unasked.

**CANDIDATE outline** for when the owner wants a real README (status:
CANDIDATE — not written, not approved):

1. What the app is: single-page French-tuition dashboard for one teacher
   (Sailaja); `index.html` is the app, zero build step.
2. How to run it: serve locally (e.g. `python3 -m http.server`) and open
   `index.html` — details → `sailaja-os-env-run-deploy`.
3. Where the knowledge lives: `.claude/skills/` is the system of record.
4. Data-safety warning: student data lives only in browser localStorage
   (`teach_os_students`) — one browser, no backend. A real backup exists
   (the "Backup & Restore" nav page, Item 4) — tell Sailaja to use it
   regularly, and export before risky changes.

If a README lands, update the §1 map in this skill in the same commit (§4
core rule).

## 6. Plain-language docs for Sailaja

When a change affects Sailaja's workflow (how she adds a student, where a
button moved, a new backup step), produce or update a short non-technical
note for her.

House style for these notes:

- Numbered steps, one action per step.
- No jargon: never "localStorage", "commit", "toggle the flag" — say "the
  browser remembers your list on this computer", "click the moon button".
- French terms she uses in teaching are fine (niveau, devoirs, séance…) —
  the technical vocabulary is the problem, not the French.
- Short: one screen, one task per note.

**Where they live: `docs/for-sailaja/` — CANDIDATE.** This directory does
not exist yet (verified 2026-07-20; there is no `docs/` at all). Create it
with the first real note, and when that happens, update the §1 docs map in
the same commit. Until then, notes for Sailaja delivered ad hoc (chat,
artifact) do not count as docs of record — the survival rule (§1) applies.

## 7. House prose style (all docs, all skills, all commit bodies)

- **Honest status labels**, always: OPEN / OPEN-latent / CANDIDATE /
  SETTLED / SUPERSEDED. Never present a candidate as done or an intended
  behavior as a shipped one — that is exactly the `9fef6e5` failure, in
  prose form.
- **Measured numbers over adjectives.** "0 console errors, 5/5 checks
  PASS", not "works great". "1987 lines", not "large file". If you didn't
  measure it, don't state it.
- **Date-stamp volatile claims.** Line numbers, "README is a stub", "no
  real data yet", CDN lines — all drift. "As of 2026-07-20, …".
- **No oversell.** Subjects and summaries claim only what the Verified
  evidence covers.
- Imperative runbook voice; define jargon once at first use; copy-pasteable
  commands with repo-rooted paths, never pseudo-commands.

## When NOT to use this skill

- **Whether a change may commit at all** (gates, change classes, owner
  sign-off, rollback protocol) → `sailaja-os-change-control`. This skill
  only covers how to *write up* what you did.
- **How to produce the browser evidence** the Verified section cites →
  `sailaja-os-browser-verification`.
- **The history itself** — reading or adding incident entries → they live
  in `sailaja-os-failure-archaeology`; this skill only supplies their
  template (§3).
- **Content inside the app** (quiz questions, lesson text, vocab — what to
  write and where in `index.html`) → `sailaja-os-content-authoring`. §6
  here covers only docs *about* the app written for Sailaja.
- **Schema/migration mechanics** behind a Data-safety line →
  `sailaja-os-data-model-and-migrations`.

## Provenance and maintenance

Authored 2026-07-20 against the working tree at HEAD `9fef6e5`. All hashes,
quotes, line numbers, and the README stub verified directly from `git log` /
`git show` / `grep` during authoring; the dead-script runtime facts
(`typeof addNewStudent === 'undefined'`, `teach_os_students` never written)
are the 2026-07-20 Playwright measurements recorded in
`sailaja-os-change-control` and `sailaja-os-failure-archaeology`. The §2
worked example is a hypothetical (labeled as such): no fix commit exists yet.

Re-verification one-liners (run from the repo root):

```bash
# History is still 7 commits ending at 9fef6e5; refresh §2 anti-exemplar
# and this provenance note when new commits land:
git log --format='%h %ad %s' --date=short

# HEAD's commit still has no body:
git show -s 9fef6e5

# README is still the stub (rewrite §1 and §5 the day a real one lands):
cat README.md

# Dead babel block / DB_KEY / addNewStudent line numbers cited in §2–§3:
grep -n 'text/babel\|DB_KEY\|addNewStudent' index.html

# Library manifest vs. reality (siblings were in-flight on 2026-07-20):
ls .claude/skills/

# docs/ and docs/for-sailaja/ still absent (update §1 and §6 when created):
ls docs 2>&1
```

Volatile facts to re-check when citing this skill later: the 7-commit
history and its no-body claim (dated 2026-07-20), README stub status, the
12-skill manifest vs. `ls .claude/skills/`, the dead-block line numbers
(1789/1882/1944/1477 — all shift when the daily-use campaign edits
`index.html`), and the incident's OPEN status (flip the §3 example to
SETTLED only with browser evidence of the fix).
