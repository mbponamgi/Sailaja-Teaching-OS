---
name: sailaja-os-failure-archaeology
description: >
  Historical record of every incident (settled or open) in the Sailaja
  Teaching OS repo, mined from its full git history (7 commits, one app).
  Load this BEFORE you: "fix" the dead persistence layer or the tweaks
  panel; investigate why a feature that "looks shipped" doesn't work; wonder
  why `sailaja_teaching_os_v2.html` exists or what happened to Babel; trust a
  commit message as evidence of current behavior; or revert/redesign/delete
  existing code. This repo has one real incident so far, but it is the same
  shape as every incident in the sibling Family Finance OS repo's
  archaeology — a commit message claiming a shipped feature that never once
  executed — so read it before repeating it.
---

# Sailaja OS Failure Archaeology

The chronicle of this repo's git history, mined and verified against code at
HEAD. **All "current code" facts verified 2026-07-21 at HEAD `9fef6e5`**
(the app files haven't changed since 2026-07-20; only a docs commit,
`f8e76f8`, has landed on top). Re-verify before trusting line numbers — see
Provenance.

**The single lesson of this repo so far, stated once so it doesn't need
re-discovering: a commit message describing a feature is not evidence the
feature ran.** `9fef6e5`'s subject is "feat: added emoji favicon,
pre-compiled JSX, and dynamic localStorage" — the favicon works, the JSX
precompile is half-right, and the "dynamic localStorage" has never executed a
single time since the commit landed, over two months before anyone checked in
a browser (`sailaja-os-browser-verification` §Recorded outputs re-confirms
this today). This mirrors Family Finance OS's own Incident 1
(`ffos-failure-archaeology`, the Great Rollback) — a different repo, the same
species of failure: intention committed as fact, never checked in a browser.

## Settled — nothing to reopen

- **Vendoring `tweaks-panel.jsx` → `tweaks-panel.js`** (part of `9fef6e5`):
  correct and verified working. The precompiled file exports its globals via
  `Object.assign(window, {...})` at line 351, loads via a plain
  `<script src="tweaks-panel.js">` (index.html:11), and
  `typeof window.useTweaks === 'function'` is confirmed live in a real
  browser (`sailaja-os-browser-verification` smoke.mjs, "negative control"
  check). Do not re-add a Babel CDN to make this file's *source* (`.jsx`)
  compile in-browser — the compiled pair discipline is correct; keep it
  (`sailaja-os-change-control` non-negotiable #3).
- **GitHub Actions scaffolding** (`b9815ed`, `14f193a`, merged `1bdc49e`,
  2026-04-20): stock "Claude PR Assistant" / "Claude Code Review" workflow
  files, unmodified since. No incidents; not app code.

## Open wounds — verified still true at HEAD (2026-07-21)

1. **The entire student-persistence layer and the tweaks-panel mount are
   dead code** (Incident 1, below) — `addNewStudent`, `initDatabase`,
   `renderStudents` are all `undefined` in the browser; `teach_os_students`
   has never been written; `#tweaks-root` has 0 children.
2. **`sailaja_teaching_os_v2.html`'s origin is undocumented** — see Incident
   2. Not broken (it's inert, unlinked from `index.html`), but its "legacy
   prototype" framing (`sailaja-os-change-control`) is itself an inference,
   not a sourced fact — flagged here so a future session doesn't upgrade the
   inference to a certainty by repetition.
3. Everything catalogued as CANDIDATE gaps in `sailaja-os-frontier-and-method`
   (session logging, attendance, student edit/delete, fees, offline-complete,
   backup) is a consequence of #1, not a separate wound — fixing #1 is Item 1
   there and the whole subject of `sailaja-os-daily-use-campaign`.

Fixing #1 = go through `sailaja-os-change-control` + `sailaja-os-browser-verification`
+ (because it touches `teach_os_students`'s shape) `sailaja-os-data-model-and-migrations`.
Execution plan: `sailaja-os-daily-use-campaign`.

---

## Incident 1 — The dead database: `9fef6e5` shipped a feature it also disabled in the same diff (2026-05-12; discovered 2026-07-20)

**Status: OPEN.** The repo's only real bug so far, and its most instructive
one.

**Symptom.** HEAD's commit message says "added ... dynamic localStorage".
`index.html` visibly has an "Add Student" button, a full student database
design, and a live-looking "Add Student" flow. None of it has ever written to
`localStorage`. Clicking "Add Student"
(`index.html:1477`, `onclick="addNewStudent()"`) throws
`ReferenceError: addNewStudent is not defined`.

**Root cause — the exact mechanism, not just "no Babel is loaded".**
`git diff 3c98fac 9fef6e5 -- index.html` shows this commit did **two**
different things to the page's script tags at once:

1. **Correctly removed the Babel-standalone CDN.** At `3c98fac` (the
   original dashboard commit), `index.html` loaded
   `@babel/standalone@7.29.0/babel.min.js` from unpkg and used
   `<script type="text/babel" src="tweaks-panel.jsx">` — genuine in-browser
   JSX compilation, and it worked. `9fef6e5` swapped this for the precompiled
   pair (`tweaks-panel.jsx` source + `tweaks-panel.js` compiled output,
   loaded via a plain `<script src>`) and **deleted the Babel CDN line**
   entirely. This half is a real, verified-working improvement (see Settled,
   above).
2. **In the same commit, added a brand-new `<script type="text/babel">`
   block** (`index.html:1789`–1985) containing `TweaksApp` — a component
   that genuinely uses JSX syntax (`return (<TweaksPanel>...</TweaksPanel>)`,
   `index.html:1848`) — **and appended the new `initDatabase`/
   `renderStudents`/`addNewStudent` functions directly after it**
   (`index.html:1882`–1985), even though none of those three functions
   contain any JSX at all; they're plain `querySelector`/`localStorage`
   calls that would run fine in an ordinary `<script>` tag.

The mechanism: browsers silently skip `<script>` tags whose `type` they
don't recognize (verified: no console error, no page error at load — see
predictions below). `text/babel` requires a Babel runtime to mean anything.
Step 1 removed the only Babel runtime on the page. Step 2 added new code that
depended on it. Both changes are individually defensible — precompiling one
file, adding a new feature — but they collided inside one commit and nobody
ran the page in a browser afterward to notice. The DB functions didn't need
to be in that block at all; they ended up dead purely by proximity to
`TweaksApp`, which did need JSX.

**Evidence — predictions written before probing, then run for real**
(`sailaja-os-browser-verification` smoke.mjs, 2026-07-21, HEAD `9fef6e5`):

1. `typeof addNewStudent === 'undefined'` → **confirmed**.
2. `localStorage.getItem('teach_os_students') === null` → **confirmed**.
3. `document.getElementById('tweaks-root').children.length === 0` (the React
   panel never mounts either — same dead block) → **confirmed**.
4. NEGATIVE: `typeof window.useTweaks === 'function'` — the *other* half of
   the same commit, which loads via a plain `<script src>` and needs no
   Babel, DOES work → **confirmed**. This is what proves the mechanism is
   "unrecognized script type," not some broader page failure.
5. NEGATIVE: **zero console errors, zero page errors at load** — browsers
   skip unknown script types silently; a load-time error would refute this
   mechanism → **confirmed** (0/0 in the same run).

One mechanism explains all five observations, including why the *rest* of
the page (dark mode, quizzes, nav, the tweaks-panel.js half) works perfectly
— that's the evidence bar `sailaja-os-frontier-and-method` §Half 2 asks for,
met on the first attempt because the sibling FFOS repo's method was adopted
verbatim.

**Resolution.** None yet. Fix is Item 1 of `sailaja-os-frontier-and-method`,
executed via `sailaja-os-daily-use-campaign`: port the plain-JS functions
(`initDatabase`, `renderStudents`, `addNewStudent`) out of the `text/babel`
block into the live plain `<script>` (lines 1593–1786) — they don't belong
in a JSX block and never needed to be there — while leaving `TweaksApp`
either genuinely precompiled (a second `.jsx`→`.js` pair) or rewritten
JSX-free, per `sailaja-os-change-control` non-negotiable #3. Do **not** fix
by re-adding a Babel CDN — that's a new external network request against the
owner's vendor-locally direction and was never load-bearing for the DB
functions in the first place.

**Lesson.** A commit that touches two unrelated things (a working
precompile + a new feature) can make the *new* thing depend on something the
commit itself just removed, purely by both landing in the same file at the
same time. Splitting "vendor tweaks-panel" and "add persistence" into two
commits would not have prevented the bug, but it would have made this
archaeology entry a one-line diff instead of a diff-the-parent exercise —
encoded as house style in `sailaja-os-docs-and-commits` (small, single-purpose
commits) and gated going forward by `sailaja-os-change-control` non-negotiable
#1 (a browser run on `9fef6e5` at the time would have caught it same-day).

## Incident 2 — `sailaja_teaching_os_v2.html`'s origin: uncertain, and worth saying so (2026-05-12)

**Status: settled as "uncertain" — do not upgrade to a firmer story without
new evidence.**

`sailaja_teaching_os_v2.html` (1361 lines) was added complete, in a single
diff, inside `9fef6e5` — the same commit as Incident 1. It has no prior
history in this repo (it isn't a rename or a partial edit of any earlier
file: `git log --follow` on it starts at `9fef6e5`). It is **not** a copy of
the pre-`9fef6e5` `index.html` either —
`git show 3c98fac:index.html | diff - sailaja_teaching_os_v2.html` shows
~2,526 differing lines out of ~1,360–1,880, i.e. most of the file — so it
isn't a simple "snapshot before the flagship change" story.

`sailaja-os-change-control` and `sailaja-os-architecture-contract` both
describe it as "the frozen legacy prototype" — the latter more specifically
as "an **older**, purely static prototype — no React, no localStorage
database," backed by `grep -c "React\|localStorage\|text/babel"
sailaja_teaching_os_v2.html` returning 0 (re-confirmed 2026-07-21).

That zero-count is real, but **"older" is a stronger claim than the evidence
supports, and one piece of evidence points the other way**: v2's `<head>`
(lines 1–8) contains the *exact same* emoji-favicon `<link
rel="icon" href="data:image/svg+xml,...🇫🇷...">` that `9fef6e5` introduces —
and "added emoji favicon" is that commit's own headline feature, absent from
`3c98fac`. A file that predates React/localStorage but postdates (or is
exactly contemporaneous with) the favicon is not simply "older" — it reads
more like an alternate, React-free draft authored *during* the same session
as `9fef6e5`'s other changes, not a fossil from before `3c98fac`. Both
readings are consistent with "no React/localStorage/babel"; only one is
consistent with the shared favicon.

Treat the origin as **genuinely uncertain, and specifically flag the
"older" part of the existing framing as unverified** — if the owner confirms
or corrects it in conversation, update this entry and the two skills that
cite it (search: `grep -rln "legacy prototype\|older.*static prototype"
.claude/skills/`).

**Lesson.** When evidence runs out, say "uncertain" and stop — don't let a
plausible label (LSB "legacy" and "v2" invite the story) calcify into fact
through repeated citation across skills. This is the same discipline
`ffos-failure-archaeology` states as its house rule (§ Provenance: "where
evidence ran out, the entry says 'uncertain'").

---

## When NOT to use this skill

- **Live triage of a bug happening right now** — this repo has no dedicated
  debugging-playbook skill yet; for the one known live bug, jump straight to
  Incident 1 above and `sailaja-os-browser-verification`'s Recorded outputs.
- **How to make/commit a change safely** → `sailaja-os-change-control`,
  `sailaja-os-docs-and-commits`.
- **Current architecture rules and invariants** →
  `sailaja-os-architecture-contract`.
- **Schema, `teach_os_students`/`sailaja-dark`, migration mechanics** →
  `sailaja-os-data-model-and-migrations`.
- **Running Playwright / what counts as verification evidence** →
  `sailaja-os-browser-verification`.
- **The roadmap this incident feeds into, and the research method that
  produced the evidence above** → `sailaja-os-frontier-and-method`.
- **The phased plan to actually fix Incident 1** →
  `sailaja-os-daily-use-campaign`.

## Provenance and maintenance

Everything above comes from `git log --all --format='%h %ai %s'` (7 commits
+ 2 merges + this skill library's own commit `f8e76f8`), `git show --stat`
and `git diff` on each app-touching commit, and a live Playwright run against
HEAD `9fef6e5`, all performed 2026-07-21. No narrative was invented; Incident
2 says "uncertain" precisely where the trail ran out. Re-mine with:

- Full dated map: `git log --all --format='%h %ai %s'` (only 8 commits as of
  this writing — read all of them, this repo is small enough to).
- New incidents since this was written: `git log --oneline --since=2026-07-21`.
- Re-confirm Incident 1's mechanism: run
  `node .claude/skills/sailaja-os-browser-verification/scripts/smoke.mjs`
  (see that skill's Provenance) — `11/11 PASS` including the three
  founding-defect checks means this incident's "OPEN" status still holds.
- Re-check the exact diff behind Incident 1:
  `git diff 3c98fac 9fef6e5 -- index.html`.
- Re-check Incident 2's diff-size evidence:
  `git show 3c98fac:index.html | diff - sailaja_teaching_os_v2.html | wc -l`.
- Script tag inventory (should show exactly one `<script type="text/babel">`
  until the campaign lands): `grep -n '<script' index.html`.
- When Incident 1 is fixed, move it to "Settled" with a pointer to the
  campaign's completion, and update every skill that currently describes the
  DB layer as "designed but not live" (`sailaja-os-data-model-and-migrations`
  §0, `sailaja-os-change-control` §2, `sailaja-os-frontier-and-method` Item 1)
  in the same change-controlled commit — they will all be simultaneously
  stale the moment `typeof addNewStudent` stops being `'undefined'`.
