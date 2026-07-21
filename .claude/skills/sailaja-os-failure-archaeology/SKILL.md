---
name: sailaja-os-failure-archaeology
description: >
  Historical record of every incident (settled or open) in the Sailaja
  Teaching OS repo, mined from its full git history (7 commits, one app).
  Load this BEFORE you: touch the persistence layer, session logging, or the
  tweaks panel (all now live — Incidents 1 and 2 are the record of how they
  got that way, including a scraper bug the fix's own verification caught);
  investigate why a feature that "looks shipped" doesn't work; wonder why
  `sailaja_teaching_os_v2.html` exists or what happened to Babel; trust a
  commit message as evidence of current behavior; or revert/redesign/delete
  existing code. Two settled incidents share the same shape as every
  incident in the sibling Family Finance OS repo's archaeology — a claim
  (a commit message, or an assumption about "the rest of a scrape working")
  that doesn't survive contact with a real browser — so read them before
  repeating the pattern.
---

# Sailaja OS Failure Archaeology

The chronicle of this repo's git history, mined and verified against code at
HEAD. **"Current code" facts verified 2026-07-20/21**; the persistence-layer
facts were re-verified 2026-07-21 immediately after the daily-use-campaign
fix landed (a working-tree change at time of writing — confirm it's
committed before trusting "SETTLED" claims blindly). Re-verify before
trusting line numbers — see Provenance.

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
  was correct and verified working *at the time* — the precompiled file
  exported its globals via `Object.assign(window, {...})`, loaded via a
  plain `<script src>`, and `typeof window.useTweaks === 'function'` was
  confirmed live. **Superseded 2026-07-21**: React was removed entirely
  (`sailaja-os-frontier-and-method` Item 2) — `tweaks-panel.jsx` was
  deleted, `tweaks-panel.js` is now hand-written vanilla JS with a
  different API (`createTweaksPanel`/`tweakSlider`/etc., no `useTweaks`).
  The compiled-pair discipline this bullet used to protect is retired, not
  just satisfied — there is no pair anymore.
- **GitHub Actions scaffolding** (`b9815ed`, `14f193a`, merged `1bdc49e`,
  2026-04-20): stock "Claude PR Assistant" / "Claude Code Review" workflow
  files, unmodified since. No incidents; not app code.
- **The entire student-persistence layer and the tweaks-panel mount**
  (Incident 1, SETTLED 2026-07-21) — was dead code for over two months;
  `addNewStudent`/`initDatabase`/`renderStudents` are now real functions,
  `teach_os_students` is written on load, the tweaks panel mounts once
  activated. Everything catalogued as CANDIDATE gaps in
  `sailaja-os-frontier-and-method` Item 1 (session logging, attendance,
  student edit/delete, progress) shipped in the same fix — see
  `sailaja-os-daily-use-campaign` for the executed phases.
- **The level-badge scraper bug** (Incident 2, SETTLED 2026-07-21 — found
  and fixed the same day it was introduced-by-discovery) — see below.

## Open — verified still true at HEAD (2026-07-21)

1. **`sailaja_teaching_os_v2.html`'s origin is undocumented** — see Incident
   3. Not broken (it's inert, unlinked from `index.html`), but its "legacy
   prototype" framing (`sailaja-os-change-control`) is itself an inference,
   not a sourced fact — flagged here so a future session doesn't upgrade the
   inference to a certainty by repetition.
2. **Update, 2026-07-21: every catalog item shipped.** Items 2, 3, and 4
   (offline-complete vendoring, the fees & payments ledger built on
   explicit owner sign-off, backup automation), plus all three of Item 5's
   sub-items ("Live counts", "Real Recent Sessions", and — last to land,
   turning out not to need the structured schedule data model its own
   roadmap entry predicted — the schedule-aware dashboard) — see
   `sailaja-os-frontier-and-method` for what each actually shipped and how
   it was verified. Nothing on the original catalog remains CANDIDATE;
   anything built from here needs fresh owner direction, not a resumed
   backlog.

---

## Incident 1 — The dead database: `9fef6e5` shipped a feature it also disabled in the same diff (2026-05-12; discovered 2026-07-20; SETTLED 2026-07-21)

**Status: SETTLED.** Dead for over two months; fixed in one session once a
real browser was pointed at it. The most instructive incident in this
repo so far.

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

**Resolution (2026-07-21).** Fixed exactly as the mechanism predicted: the
plain-JS functions (`initDatabase`, `renderStudents`, `addNewStudent`, plus
new `saveStudentEdit`/`deleteStudent`/session functions) were ported out of
the `text/babel` block into a plain `<script>` — they never belonged in a
JSX block and never needed to be there. `TweaksApp` was rewritten JSX-free
(plain `React.createElement` calls) rather than given a second precompiled
pair — simpler, and it meant the whole fix shipped with zero new build
tooling and zero new external requests. No Babel CDN was re-added.
Verified: `typeof addNewStudent === 'function'`, a full add student → log
session → edit → **reload** → delete cycle survives intact
(`sailaja-os-browser-verification`'s `verify-crud.mjs`, 25/25 PASS,
including the same five predictions above with the first three now
inverted and the two negatives re-confirmed).

**Lesson.** A commit that touches two unrelated things (a working
precompile + a new feature) can make the *new* thing depend on something the
commit itself just removed, purely by both landing in the same file at the
same time. Splitting "vendor tweaks-panel" and "add persistence" into two
commits would not have prevented the bug, but it would have made this
archaeology entry a one-line diff instead of a diff-the-parent exercise —
encoded as house style in `sailaja-os-docs-and-commits` (small, single-purpose
commits) and gated going forward by `sailaja-os-change-control` non-negotiable
#1 (a browser run on `9fef6e5` at the time would have caught it same-day).

## Incident 2 — The level-badge scraper: a second dead-on-arrival bug, caught the moment Incident 1's fix ran for real (2026-05-12; discovered and fixed 2026-07-21)

**Status: SETTLED, same day it surfaced.** Notable less for its severity
than for being a direct, immediate demonstration of why
`sailaja-os-browser-verification`'s non-negotiable exists: this bug had been
sitting in the code since `9fef6e5` (2026-05-12), completely invisible,
because it lived inside the same dead block as Incident 1 and had never
once executed either.

**Symptom.** The instant Incident 1's fix made `initDatabase()` reachable,
the very first assertion of `verify-crud.mjs` failed: `teach_os_students`
held **0 records**, not the 15 expected from the static seed table.

**Root cause.** `initDatabase()`'s per-row scraper read the level-badge
column with `row.querySelector('td:nth-child(3) .badge').innerText` — no
null guard. The four A1/A2 student rows render their level as plain styled
text ("Week 14"), not inside a `.badge` span (`index.html`, static rows
~836 onward: `<td style="font-size:0.75rem;color:var(--french-blue);">Week
14</td>` vs. the CBSE/Cambridge/IBDP rows' `<td><span class="badge
badge-primary">Grade 4</span></td>`). For those four rows the selector
returned `null`, and `.innerText` on `null` threw a `TypeError` **inside the
`forEach` callback**, which aborted the entire loop — `localStorage.setItem`
never ran, and the scrape produced zero records instead of "11 records,
4 missing." A partial failure would have been easy to spot; a total,
silent one looked exactly like Incident 1 all over again on first glance.

**Evidence.** Isolated with a throwaway diagnostic script
(`page.evaluate` walking each of the 15 rows, checking which selectors
resolved): rows 0–10 (CBSE/Cambridge/IBDP) all had a `.badge` in column 3;
rows 11–14 (the four A1/A2 students — Priya R., Arjun M., Meera S., Kiran
P.) did not. `page.on('pageerror')` caught the exact exception:
`TypeError: Cannot read properties of null (reading 'innerText')`.

**Resolution.** `initDatabase()` now falls back to the cell's own text when
no `.badge` child exists: `row.querySelector('td:nth-child(3) .badge') ||
row.querySelector('td:nth-child(3)')`. Re-ran `verify-crud.mjs`: 15/15
records scraped correctly on the next attempt, including all four A1/A2
students with their real "Week N" level text.

**Lesson.** A codebase that has been silently broken for two months
(Incident 1) can be hiding MORE than one bug behind the same silence — don't
declare victory the moment the first symptom's mechanism is understood; run
the fix for real and let the verification script itself go looking. This is
also a second, independent instance of
`sailaja-os-data-model-and-migrations`'s general fragility warning ("one
missing selector aborts the entire seed") going from a documented risk to
an actually-observed failure — the risk was real, not theoretical.

## Incident 3 — `sailaja_teaching_os_v2.html`'s origin: uncertain, and worth saying so (2026-05-12)

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

- **Live triage of a NEW bug happening right now** — this repo has no
  dedicated debugging-playbook skill yet; if it resembles Incidents 1 or 2
  (something "looks shipped" but a function is undefined, or a scrape/parse
  silently returns fewer records than expected), read those first before
  assuming it's novel — but if the persistence layer's own founding-defect
  checks are clean (`verify-crud.mjs` green), it's a genuinely new bug, not
  a regression of either.
- **How to make/commit a change safely** → `sailaja-os-change-control`,
  `sailaja-os-docs-and-commits`.
- **Current architecture rules and invariants** →
  `sailaja-os-architecture-contract`.
- **Schema, `teach_os_students`/`teach_os_sessions`/`sailaja-dark`,
  migration mechanics** → `sailaja-os-data-model-and-migrations`.
- **Running Playwright / what counts as verification evidence** →
  `sailaja-os-browser-verification`.
- **The roadmap these incidents feed into, and the research method that
  produced the evidence above** → `sailaja-os-frontier-and-method`.
- **The phased plan that fixed Incidents 1 and 2, and what's still open**
  → `sailaja-os-daily-use-campaign`.

## Provenance and maintenance

Everything above comes from `git log --all --format='%h %ai %s'` (7 commits
+ 2 merges + this skill library's own commits), `git show --stat` and
`git diff` on each app-touching commit, and live Playwright runs against
HEAD `9fef6e5` — Incident 1's original diagnosis and Incident 2's discovery
both performed 2026-07-21, in the same session, minutes apart (Incident 2
was found BY the verification script written to confirm Incident 1's fix).
No narrative was invented; Incident 3 still says "uncertain" precisely
where its trail ran out — that entry is unaffected by the persistence fix.
Re-mine with:

- Full dated map: `git log --all --format='%h %ai %s'` (only 9 commits as of
  this writing — read all of them, this repo is small enough to).
- New incidents since this was written: `git log --oneline --since=2026-07-21`.
- Re-confirm Incidents 1 and 2 are still fixed: run
  `node .claude/skills/sailaja-os-browser-verification/scripts/verify-crud.mjs`
  (see that skill's Provenance) — `25/25 PASS` means both hold; a scraped
  count other than 15, or `addNewStudent` back to `'undefined'`, means one of
  them regressed.
- Re-check the exact diff behind Incident 1:
  `git diff 3c98fac 9fef6e5 -- index.html`.
- Re-check Incident 2's fix is present: `grep -n "levelEl = row.querySelector" index.html`.
- Re-check Incident 3's diff-size evidence:
  `git show 3c98fac:index.html | diff - sailaja_teaching_os_v2.html | wc -l`.
- Script tag inventory (should show exactly zero live
  `<script type="text/babel">` tags, only historical comments mentioning
  one): `grep -n '<script\|text/babel' index.html`.
- If Incidents 1 or 2 ever regress, flip their status back to OPEN here and
  re-check every skill that currently describes the persistence layer as
  live (`sailaja-os-data-model-and-migrations` §0,
  `sailaja-os-change-control` §2, `sailaja-os-architecture-contract` W1-W3,
  `sailaja-os-frontier-and-method` Item 1, `sailaja-os-daily-use-campaign`
  phase statuses) — they will all be simultaneously wrong the instant
  `typeof addNewStudent` goes back to `'undefined'`.
