---
name: sailaja-os-architecture-contract
description: >
  The architecture contract for the Sailaja Teaching OS (this repo): the
  load-bearing design decisions with their WHY, the invariants every change
  must preserve, a section map of index.html and tweaks-panel.js with line
  anchors, and the honest weak points. Load this skill when: planning any
  feature; deciding where new code goes (new page, modal, persisted entity,
  or tweak); tempted to add a build step, framework, npm dependency, CDN
  `<script>`, or any external network call; before any refactor of index.html
  or tweaks-panel.js; questioning why the app is a zero-build single-file SPA,
  why there are two tweaks-panel files, or what sailaja_teaching_os_v2.html
  is. Pairs with sailaja-os-change-control (commit gates) and
  sailaja-os-data-model-and-migrations (storage schema).
---

# Sailaja OS Architecture Contract

The Sailaja Teaching OS is a zero-build, single-file SPA (single-page
application: one HTML page, navigation switches DOM sections instead of
loading new pages) — a French-tuition dashboard for one non-technical
teacher, Sailaja. The whole app is `index.html` (1987 lines) plus one
sanctioned helper pair (`tweaks-panel.jsx` → `tweaks-panel.js`). No
package.json, no tests, no build system, no backend, no docs beyond
`.claude/skills/`. All line numbers below are **as of 2026-07-20 at HEAD
`9fef6e5`**; re-verify with the commands in "Provenance and maintenance"
before relying on them.

**The owner's two non-negotiables (adopted verbatim from Family Finance OS,
2026-07-20)** — full doctrine in sailaja-os-change-control:

1. **NEVER endanger saved data.** localStorage (the browser's built-in
   per-site key-value store) is the only persistence this app will ever
   have. Schema changes ship migrations.
2. **VERIFY IN A REAL BROWSER.** No behavior change ships without headless
   Playwright evidence with printed PASS/FAIL. This repo's own HEAD commit
   shipped a flagship feature that went unexecuted for over two months (W1,
   below — fixed 2026-07-21, but the case for the rule stands regardless of
   current status) — the entire case for this rule, in one commit.

## 1. Load-bearing decisions — what, why, and what each forbids

| # | Decision | Why | What it forbids |
|---|----------|-----|-----------------|
| a | **Single-file, zero-build SPA.** All markup, CSS, and app logic live in `index.html`. The browser executes exactly what is committed — there is no compile step to transform anything. | One file to read, one file to serve; any static host works; no toolchain to rot; the owner (and a zero-context model) can audit the whole app top to bottom. The stated frontier is deliberately modest: a reliable local-first teaching OS, no AI-native features (owner, 2026-07-20). | Frameworks, bundlers, TypeScript, npm runtime deps, a build step of any kind — owner sign-off required to change this. |
| b | **Raw JSX must never ship to the browser.** JSX is React's HTML-in-JS syntax; browsers cannot execute it — it requires compilation. `type="text/babel"` marks a script for the Babel compiler; **without Babel loaded, browsers silently skip the whole block**. Decision (a) was bent once — an inline `text/babel` block that shipped the whole database dead for two months (W1, SETTLED 2026-07-21 by rewriting the same component as plain `React.createElement` calls, no Babel needed). | The tension is inherent: zero-build + JSX don't mix. The repo already paid for bending it once; the fix proves the bend was never necessary — the component didn't need JSX syntax, just React's API, which plain JS can call directly. | Any new `<script type="text/babel">` block; adding a runtime Babel CDN to "fix" one; committing `.jsx` edits without the recompiled `.js` sibling. |
| c | **The pre-compiled pair `tweaks-panel.jsx` → `tweaks-panel.js` is the only sanctioned JSX path.** The `.jsx` (425 lines) is source; the committed `.js` (364 lines) is its plain-JS compile output, loaded by `index.html:11`, exposing 12 components as window globals via `Object.assign(window, {...})` at its line 351. Recompile command → sailaja-os-change-control non-negotiable #3. | Keeps React ergonomics for the tweaks panel without a build step in the serving path: compilation happens at authoring time, the browser only ever sees plain JS. | Editing `tweaks-panel.js` by hand (it is generated output); shipping one half of the pair. |
| d | **`index.html` is THE app; `sailaja_teaching_os_v2.html` is frozen history.** v2 (1361 lines) is an older, purely static prototype — no React, no localStorage database. Verified 2026-07-20: `grep -c "React\|localStorage\|text/babel" sailaja_teaching_os_v2.html` returns 0. | v2 is historical evidence (→ sailaja-os-failure-archaeology). Serving it to Sailaja would hand her a dead-end app with no persistence path. | Editing v2, "fixing" v2, serving v2 to Sailaja. Deleting it needs owner sign-off. |
| e | **localStorage-only persistence; no backend, ever.** Three live keys as of 2026-07-21: `'sailaja-dark'` (dark-mode flag), `'teach_os_students'` (`DB_KEY`, student roster — now load-bearing, W1 fixed), `'teach_os_sessions'` (`SESSIONS_KEY`, session log, new). | Privacy: student names and parents' contact details are personal data about children. No server to breach, no account to phish, nothing leaves the device. | Any backend, cloud sync, analytics, telemetry, or fetch to any host. Sailaja's data never leaves the device — hard line, owner sign-off cannot be assumed. |
| f | **Direction of travel: vendor all deps locally, eliminate external network** (owner, 2026-07-20). Current known deviation: `index.html:8–10` — Google Fonts (Instrument Serif, Figtree) and unpkg CDN React 18.3.1 + ReactDOM 18.3.1 **development** UMD builds (UMD = a plain-`<script>` bundle that attaches globals like `window.React`, as opposed to a module) with SRI hashes (SRI = Subresource Integrity, an `integrity="sha384-..."` attribute making the browser refuse a tampered file). | Same privacy/reliability logic as (e): a CDN outage or a coffee-shop captive portal must not kill Sailaja's working day. The 3 CDN lines are tolerated as-is until vendoring lands, not blessed. | ADDING any external `<script>`, `<link>`, font host, or request (owner sign-off). Growing lines 8–10 in any way. |

## 2. Section map — `index.html` (1987 lines)

| Lines | Section | Key anchors |
|---|---|---|
| 1–11 | Head + deps | title (6), emoji-favicon data-URI (7), Google Fonts (8), React/ReactDOM dev UMD + SRI (9–10), `tweaks-panel.js` (11) — script order 9→10→11 is load-bearing (panel components call `React.*`) |
| 12–429 | All CSS, one `<style>` block | CSS custom properties on `:root` (14+); `--french-blue` and `--bg`-family variables are what TweaksApp mutates |
| 435–480 | Sidebar | nav buttons `onclick="showPage('<id>')"` (456–475), dark toggle in footer |
| 483–1444 | `<main>` — the 12 pages | breadcrumb target `id="breadcrumb-current"` (491). One `<div class="page" id="page-<id>">` each: dashboard 508, students 700, a1a2 881, cbse 912, cambridge 991, ibdp 1026, lessons 1077, schedule 1125, exams 1198, quizzes 1245, comms 1306, resources 1400 |
| 724–871 | Students table (inside page-students) | `id="students-table"` (724); **15 static seeded rows** (`<tr data-curr="..." data-band="...">`, first at 737) with masked parent phones (`98765XXXXX` style, e.g. 738). Note: the nav badge (457) and "All" filter button (711) both say 14 — static-content drift, see W7 |
| 1452–1589 | The 6 modals | `<div class="modal-bg" id="modal-<id>">`: add-student, add-session (Student select now dynamic, real `id`s on every field), add-lesson, add-exam, add-quiz (unchanged, toast-only), view-student (rewritten 2026-07-21 from a static placeholder into a real edit/delete form) |
| ~1591 | Toast | `<div class="toast" id="toast">` |
| ~1593–~1610 | **Plain `<script>` #1 — page nav, modals, toasts, quiz, filters, dark mode, greeting, word-of-the-day** | `breadcrumbLabels`, `showPage`, `openModal`/`closeModal`, backdrop-click binding, Escape handler, `showToast`, `saveAndClose`, `answerQuiz`, `filterStudents` (reads `row.dataset.curr`/`.band`), `showTab`, `filterBtns`, `toggleDark`, dark-restore IIFE, `GREETINGS`/`getGreeting`/`updateGreeting`, `WORDS` word-of-the-day array (30 entries), `renderWord`/`nextWord`, `copyTemplate`. Unchanged by the 2026-07-21 fix except the file's absolute line numbers shifted (the modal edits above added lines before this block) |
| — | `<div id="tweaks-root">` | React mount point — renders `null` until activated via `postMessage({type:'__activate_edit_mode'})` (by the panel's own design, not a defect); confirmed alive via `sailaja-os-browser-verification`'s `verify-crud.mjs` |
| **~1806–end** | **Plain `<script>` #2 — REWRITTEN 2026-07-21, no longer `text/babel`, W1/W2/W3 SETTLED** | `TWEAK_DEFAULTS`, `TweaksApp` (now plain `React.createElement`/`h()` calls — no JSX syntax), `mountTweaks`. Then the live persistence layer: `esc()` (new — output escaping), `nextId()` (new — monotonic integer ids), `bandFromGradeText()`/`deriveCurrBand()` (new — single source of truth for `curr`/`band`/`currBadge`), `fullCurrLabel()` (new — reverse mapping for the edit form), `DB_KEY`/`SESSIONS_KEY`, `initDatabase` (now with a level-badge fallback, see `sailaja-os-failure-archaeology` Incident 2), `renderStudents` (now escapes output, derives real `data-band`), `addNewStudent`, `viewStudent`/`saveStudentEdit`/`deleteStudent` (new), `populateSessionStudentSelect`/`openSessionModalFor`/`getSessionsForStudent`/`renderViewStudentSessions`/`logSession` (new), DOMContentLoaded init. Absolute line numbers are volatile — re-grep function names rather than citing numbers here. |

## 2b. Section map — `tweaks-panel.js` (364 lines, generated from the `.jsx`)

| Lines | What |
|---|---|
| 1–91 | `__TWEAKS_STYLE` — panel CSS as a template string, injected by TweaksPanel |
| 93 | `useTweaks(defaults)` — state hook; posts `__edit_mode_set_keys` to `window.parent` (98) |
| 102 | `TweaksPanel` — starts closed (`useState(false)`, 103); opens ONLY on a `__activate_edit_mode` postMessage (134), closes on `__deactivate_edit_mode` (135); announces `__edit_mode_available` to the parent frame on mount (138). This is W6: standalone (not in a host iframe), nothing ever sends that message |
| 188–350 | The controls: `TweakSection` 188, `TweakRow` 191, `TweakSlider` 194, `TweakToggle` 208, `TweakRadio` 222, `TweakSelect` 274, `TweakText` 281, `TweakNumber` 293, `TweakColor` 329, `TweakButton` 340 |
| 351 | `Object.assign(window, { useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider, TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton })` — the 12 globals index.html's TweaksApp consumes |

## 3. Invariants — must hold after every change

Each with a one-line check from the repo root.

1. **The page trinity.** Every `<div class="page" id="page-<id>">` has a
   matching `breadcrumbLabels` key AND at least one `showPage('<id>')`
   caller. All three counts are 12 today:
   `grep -c 'id="page-' index.html` · `sed -n '1595,1600p' index.html` ·
   `grep -o "showPage('[a-z0-9]*')" index.html | sort -u | wc -l`
2. **Modal id convention.** `openModal('<x>')`/`closeModal('<x>')` resolve
   `'modal-' + x` (lines 1614–1615), so every modal div is
   `id="modal-<x>"`. Cross-check args against divs:
   `grep -o "openModal('[a-z-]*')" index.html | sort -u` vs
   `grep -n 'class="modal-bg"' index.html`. New **static** modals must sit
   in the 1452–1589 modals section — the backdrop-click closer (1616–1618)
   binds once at parse time to modals already in the DOM; a modal injected
   later gets Escape (1619, delegated) but NOT backdrop-close.
3. **No raw JSX reaches the browser** (decision b/c). The diff adds no
   `text/babel`, and `.jsx` never changes without its recompiled `.js`:
   `git diff -- index.html | grep -n "text/babel"` (must be empty — the
   former block at decision b was removed 2026-07-21; only comments
   referencing the historical incident should match now).
4. **Storage keys are load-bearing.** `'sailaja-dark'`, `'teach_os_students'`,
   and `'teach_os_sessions'` are all live as of 2026-07-21 — the roster and
   session log are irreplaceable teacher data the moment Sailaja uses the
   app. No rename/removal without a copying migration
   (→ sailaja-os-data-model-and-migrations):
   `grep -n "sailaja-dark\|teach_os_students\|teach_os_sessions" index.html`
5. **External network = exactly lines 8–10, shrinking to zero.** None may
   be ADDED: `grep -n "https://\|http://" index.html | grep -v "svg%22"`
   must show only lines 8–10 (the favicon on line 7 is a data-URI, not a
   request); and `grep -rn "fetch(\|XMLHttpRequest\|WebSocket\|sendBeacon\|EventSource" index.html tweaks-panel.js` must be empty.
6. **Sailaja's data never leaves the device.** Follows from invariant 5 plus
   decision (e); any change that would transmit student or parent data
   off-device is owner-sign-off territory, full stop.
7. **Script order stands.** React (9) → ReactDOM (10) → tweaks-panel.js (11)
   in head; the plain `<script>` (1593) stays after the markup it wires
   (it binds listeners to existing `.modal-bg` nodes at parse time).
8. **v2 stays frozen.** `git diff --name-only | grep -x "sailaja_teaching_os_v2.html"` must be empty in every commit.

## 4. Honest weak points — verified 2026-07-20/21; W1-W3 now SETTLED, W4-W7 still OPEN

- **W1 — SETTLED 2026-07-21 (was OPEN).** The dead `text/babel` block. No
  Babel was loaded anywhere, so the browser silently skipped the entire
  block — TweaksApp AND the whole student database. Measured in a real
  browser (Playwright, 2026-07-20): `typeof addNewStudent === 'undefined'`;
  `localStorage.getItem('teach_os_students') === null`; `#tweaks-root` had
  0 children; clicking "Add Student" threw `ReferenceError`. **Fix**: the
  block was rewritten as plain `React.createElement` calls (TweaksApp) plus
  the persistence functions moved into the live plain `<script>`. Verified
  2026-07-21: `typeof addNewStudent === 'function'`, full
  add→session→edit→**reload**→delete cycle survives
  (`sailaja-os-browser-verification`'s `verify-crud.mjs`, 25/25 PASS). Full
  incident + fix mechanism → `sailaja-os-failure-archaeology` Incident 1.
- **W2 — SETTLED 2026-07-21 (was OPEN).** Stored-XSS-shaped
  `renderStudents()`. Every interpolated field now passes through a new
  `esc()` helper before `innerHTML` interpolation. Fixed in the same change
  that resurrected the database (was unreachable before that, but latent).
- **W3 — SETTLED 2026-07-21 (was OPEN).** `data-band` hardcode.
  `renderStudents()` used to set `data-band="primary"` on every dynamically
  rendered row regardless of the student's actual band, which would have
  broken the Gr 6–8/9–10/11–12 filters the moment the store went live. Fixed
  by adding a real `band` field to the record schema, read directly off the
  static rows' `data-band` in `initDatabase()` and derived by
  `deriveCurrBand()`/`bandFromGradeText()` for new/edited records — full
  derivation rules → `sailaja-os-data-model-and-migrations` §1.
- **W4 — OPEN. React development builds.** Lines 9–10 load
  `react.development.js` / `react-dom.development.js` — slower, larger,
  console-noisy builds meant for debugging, and the SRI hashes pin exactly
  those dev files. Production builds (or better, vendored local copies per
  decision f) are the target state.
- **W5 — OPEN. Offline fragility.** Three external requests (8–10). Fonts
  degrade gracefully; a failed React load leaves `window.React` undefined,
  which now (W1 fixed) would break both the tweaks panel AND the entire
  student database — higher stakes than when this was written. Vendoring
  (decision f) retires this; `sailaja-os-frontier-and-method` Item 2.
- **W6 — OPEN, now higher-stakes now that W1 is fixed. Panel needs a host
  iframe.** `TweaksPanel` opens only on a `__activate_edit_mode` postMessage
  from a parent frame (`tweaks-panel.js:134`) — an artifact-style host
  convention. Served standalone (as this app is for Sailaja), the panel can
  never open through any UI control of its own — confirmed 2026-07-21 by
  simulating the postMessage manually in `verify-crud.mjs` to prove the
  component tree works at all. Deciding whether Sailaja gets a standalone
  open control (a button that fires the same postMessage) is an owner call,
  not yet made.
- **W7 — OPEN (minor). Static-content drift.** The students table holds 15
  seeded rows, but the nav badge (457) and the "All" filter button (711)
  say 14. Symptom of hand-maintained duplicated counts; the real fix is the
  database rendering these numbers, not another hand edit.

## 5. Where new code goes

| You are adding… | Put it… | Also do… | Gates (→ sailaja-os-change-control) |
|---|---|---|---|
| **A new page** | `<div class="page" id="page-<id>">` inside `<main>`, before line 1444 | Add the `breadcrumbLabels` key (1595) and a sidebar nav button `onclick="showPage('<id>')"` — invariant 1 | Class (a)/(b): browser smoke, both themes |
| **A new modal** | `<div class="modal-bg" id="modal-<id>">` in the modals section (1452–1589, before the plain script) so backdrop-close binds — invariant 2 | Open via `openModal('<id>')`; close path via `saveAndClose`/`closeModal` | Class (a)/(d) depending on wiring |
| **A new persisted entity** (new localStorage key, or fields on `teach_os_students`/`teach_os_sessions` records) | Plain JS in either plain `<script>` block — both are live now (W1 fixed); put persistence logic near the existing `DB_KEY`/`SESSIONS_KEY` functions in script #2 | Schema + migration discipline first → sailaja-os-data-model-and-migrations. **Real data may now exist** — this is no longer a free design space | Class (c)+(d): migration reasoning, old-shape seed test, Playwright PASS/FAIL, `verify-crud.mjs` still green |
| **A new tweak** (new knob in the panel) | New reusable **control component** → edit `tweaks-panel.jsx`, recompile, commit the pair (decision c). New **knob wiring** (`TWEAK_DEFAULTS` + TweaksApp) lives in script #2, now live and JSX-free — edit `TweaksApp`'s `h(...)` calls directly, no compilation step needed for that part | — | Class (d) + pair discipline (only if `tweaks-panel.jsx` itself changes) |
| **Anything needing a framework, build step, npm dep, CDN, or network call** | Nowhere, yet | Stop and get explicit owner sign-off | Sign-off list in sailaja-os-change-control |

## When NOT to use this skill

- Commit gates, change classes, sign-off list, rollback protocol →
  **sailaja-os-change-control**
- Storage schema, student-record fields, writing migrations →
  **sailaja-os-data-model-and-migrations**
- Something is broken right now and you're diagnosing →
  **sailaja-os-debugging-playbook**
- The plan to fix W1 and get the app into daily use →
  **sailaja-os-daily-use-campaign**
- Serving locally, hosting, deploying → **sailaja-os-env-run-deploy**
- Playwright mechanics, what to assert, PASS/FAIL printing →
  **sailaja-os-browser-verification**
- History and evidence behind the incidents cited here →
  **sailaja-os-failure-archaeology**
- French-tuition domain (CEFR levels, curricula) →
  **french-tuition-reference**
- Authoring quizzes, lessons, word-of-the-day entries →
  **sailaja-os-content-authoring**
- Commit-message and docs style → **sailaja-os-docs-and-commits**
- Roadmap ambitions and research discipline →
  **sailaja-os-frontier-and-method**

## Provenance and maintenance

Originally authored 2026-07-20 against HEAD `9fef6e5` while W1-W3 were live
defects. Updated 2026-07-21 after the daily-use-campaign Phase 1-3 fix
landed (a working-tree change at time of writing — confirm it's been
committed before trusting "SETTLED" claims blindly). The fix added modal
markup and ~150 lines of script, so **most absolute line numbers in §2's
section map are now approximate ("~") or removed** — re-grep function names,
not line numbers, for anything precise. One-line re-verification commands
(repo root):

- File inventory / line counts: `wc -l index.html sailaja_teaching_os_v2.html tweaks-panel.js tweaks-panel.jsx`
- Head deps + CDN lines still 8–11: `sed -n '8,11p' index.html`
- CSS block bounds: `grep -n '<style\|</style>' index.html`
- Page divs (12) and their lines: `grep -n 'id="page-' index.html`
- Modals (6) and toast: `grep -n 'class="modal-bg"\|id="toast"' index.html`
- Plain-script bounds and symbols: `grep -n '<script>\|</script>' index.html` and `grep -n "breadcrumbLabels\|function showPage\|function toggleDark\|const WORDS\|function copyTemplate" index.html`
- No live dead block (W1 SETTLED — should match only historical comments):
  `grep -n 'type="text/babel"' index.html`
- Persistence + session symbols: `grep -n "DB_KEY\|SESSIONS_KEY\|initDatabase\|renderStudents\|addNewStudent\|saveStudentEdit\|deleteStudent\|logSession\|deriveCurrBand\|function esc" index.html`
- W2/W3 fixes present: `grep -n "function esc\|function deriveCurrBand\|function bandFromGradeText" index.html`
- Storage keys: `grep -n "sailaja-dark\|teach_os_students\|teach_os_sessions" index.html`
- tweaks-panel.js exports: `grep -n "Object.assign(window" tweaks-panel.js`
- Panel activation contract (W6, still relevant): `grep -n "__activate_edit_mode\|__edit_mode_available" tweaks-panel.js`
- Seeded rows (15) vs badge (14, still drifted — W7 unfixed): `grep -c '<tr data-curr=' index.html` and `grep -n 'nav-badge">14\|All (14)' index.html`
- WORDS entry count (30): `grep -c '{ word:' index.html`
- v2 still static: `grep -c "React\|localStorage\|text/babel" sailaja_teaching_os_v2.html` (must be 0 — but see `sailaja-os-failure-archaeology` Incident 2's caution about the "older" framing for this file)
- Still zero-build: `ls package.json 2>&1`
- Persistence layer alive end-to-end: `PW_PATH=<...> node .claude/skills/sailaja-os-browser-verification/scripts/verify-crud.mjs` (expect `25/25 PASS`)
- Sibling skills exist: `ls .claude/skills/`
