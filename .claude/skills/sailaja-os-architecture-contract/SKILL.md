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
  or tweaks-panel.js; questioning why the app is a zero-build single-file SPA
  with zero framework dependencies and zero external network requests (both
  true as of 2026-07-21), why tweaks-panel.js is vanilla JS with no `.jsx`
  source, or what sailaja_teaching_os_v2.html is. Pairs with
  sailaja-os-change-control (commit gates) and
  sailaja-os-data-model-and-migrations (storage schema).
---

# Sailaja OS Architecture Contract

The Sailaja Teaching OS is a zero-build, single-file SPA (single-page
application: one HTML page, navigation switches DOM sections instead of
loading new pages) — a French-tuition dashboard for one non-technical
teacher, Sailaja. The whole app is `index.html` (grew from 1987 lines
across 2026-07-21's persistence fix and Phase 3(d)) plus `tweaks-panel.js`
(hand-written vanilla JS since 2026-07-21 — no `.jsx` source, no compile
step; React was removed entirely, see decision c) and vendored assets
under `vendor/fonts/`. No package.json, no tests, no build system, no
backend, no external network requests at all, no docs beyond
`.claude/skills/`. Line numbers below are volatile — re-verify with the
commands in "Provenance and maintenance" before relying on them.

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
| b | **Raw JSX must never ship to the browser.** JSX is React's HTML-in-JS syntax; browsers cannot execute it — it requires compilation. `type="text/babel"` marks a script for the Babel compiler; **without Babel loaded, browsers silently skip the whole block**. Decision (a) was bent once — an inline `text/babel` block that shipped the whole database dead for two months (W1, SETTLED 2026-07-21, first by rewriting the component as plain `React.createElement` calls, then — same day — by removing React from the app entirely, see decision c). | The tension is inherent: zero-build + JSX don't mix. The repo paid for bending it once; the fix proved the bend was never necessary — the component didn't need JSX syntax, and it turned out not to need React's API either, just DOM calls any plain script can make. | Any `<script type="text/babel">` block; adding a runtime Babel CDN "fix." This constraint is now moot in the strongest possible way — there is no JSX anywhere in the repo, and no compiler that could run it even if there were. |
| c | **React removed entirely, 2026-07-21 — the tweaks panel is vanilla JS, no framework.** `sailaja-os-frontier-and-method` Item 2: the panel is ~10 simple form controls that never needed React's reconciler, and on a standalone deployed page it can only open via a `postMessage` from a parent frame that will never exist (W6) — so the framework was pure unused payload. `tweaks-panel.jsx` was deleted; `tweaks-panel.js` (now hand-written, not compiled) ships a `createTweaksPanel()` + `tweakSlider`/`tweakToggle`/`tweakRadio`/etc. builder-function API — same visual/interaction behavior, verified control-by-control (`sailaja-os-browser-verification`'s `verify-tweaks-panel.mjs`, 17/17). This supersedes the former "compiled JSX pair" discipline in `sailaja-os-change-control` non-negotiable #3, which is retired, not just satisfied. | Ends the app's only framework dependency and its only real JSX-shaped risk, for a feature that never needed either. Smaller payload matters directly for Item 2's stated reason to exist: "tuition happens at homes with flaky Wi-Fi." | Reintroducing React/any UI framework for this panel or anything else without fresh owner sign-off (decision a already requires this; this entry just removes the one standing exception). |
| d | **`index.html` is THE app; `sailaja_teaching_os_v2.html` is frozen history.** v2 (1361 lines) is an older, purely static prototype — no React, no localStorage database. Verified 2026-07-20: `grep -c "React\|localStorage\|text/babel" sailaja_teaching_os_v2.html` returns 0. | v2 is historical evidence (→ sailaja-os-failure-archaeology). Serving it to Sailaja would hand her a dead-end app with no persistence path. | Editing v2, "fixing" v2, serving v2 to Sailaja. Deleting it needs owner sign-off. |
| e | **localStorage-only persistence; no backend, ever.** Six live keys as of 2026-07-21: `'sailaja-dark'` (dark-mode flag), `'teach_os_students'` (`DB_KEY`, student roster — load-bearing, W1 fixed), `'teach_os_sessions'` (session log), `'teach_os_lessons'`, `'teach_os_exams'`, `'teach_os_quiz'` (Phase 3(d), owner-requested same day). Full catalog → `sailaja-os-data-model-and-migrations`. | Privacy: student names and parents' contact details are personal data about children. No server to breach, no account to phish, nothing leaves the device. | Any backend, cloud sync, analytics, telemetry, or fetch to any host. Sailaja's data never leaves the device — hard line, owner sign-off cannot be assumed. |
| f | **Vendor all deps locally, eliminate external network — DONE 2026-07-21** (owner direction, 2026-07-20; completed same day as decision c). The former `index.html:8–10` (Google Fonts + React/ReactDOM CDN, UMD = a plain-`<script>` bundle attaching globals, SRI = Subresource Integrity pinning) are gone: React is removed (decision c), and Instrument Serif + Figtree are vendored as local `.woff2` files under `vendor/fonts/` (only the "latin" Unicode subset — sufficient for this app's French/English content, verified against the actual word list). Figtree ships as one variable-font file covering all 5 weights, not 5 near-duplicate files. **Verified the actual claim, not just the absence of CDN lines**: `sailaja-os-browser-verification`'s `verify-offline.mjs` runs with every non-localhost network route aborted — 0 requests attempted, 0 console errors, app fully functional, fonts confirmed loaded via `document.fonts`. | Same privacy/reliability logic as (e): a CDN outage or a coffee-shop captive portal can no longer affect Sailaja's working day at all — not "less," zero. | ADDING any external `<script>`, `<link>`, font host, or request (owner sign-off, no exceptions now that zero is the achieved baseline, not an aspiration). |

## 2. Section map — `index.html` (1987 lines)

| Lines | Section | Key anchors |
|---|---|---|
| 1–~8 | Head + deps | title, emoji-favicon data-URI, `tweaks-panel.js` (`<script src>`, plain, no framework to load in any particular order anymore since React removal 2026-07-21). **Zero external network requests** — verified, not aspirational (`sailaja-os-browser-verification`'s `verify-offline.mjs`) |
| ~9–~440 | All CSS, one `<style>` block | Three `@font-face` rules at the top (added 2026-07-21, pointing at `vendor/fonts/*.woff2`, replacing the Google Fonts `<link>`), then CSS custom properties on `:root`; `--french-blue` and `--bg`-family variables are what the tweaks panel mutates |
| 435–480 | Sidebar | nav buttons `onclick="showPage('<id>')"` (456–475), dark toggle in footer |
| 483–1444 | `<main>` — the 12 pages | breadcrumb target `id="breadcrumb-current"` (491). One `<div class="page" id="page-<id>">` each: dashboard 508, students 700, a1a2 881, cbse 912, cambridge 991, ibdp 1026, lessons 1077, schedule 1125, exams 1198, quizzes 1245, comms 1306, resources 1400 |
| 724–871 | Students table (inside page-students) | `id="students-table"` (724); **15 static seeded rows** (`<tr data-curr="..." data-band="...">`, first at 737) with masked parent phones (`98765XXXXX` style, e.g. 738). Note: the nav badge (457) and "All" filter button (711) both say 14 — static-content drift, see W7 |
| 1452–1589 | The 6 modals | `<div class="modal-bg" id="modal-<id>">`: add-student, add-session (Student select now dynamic, real `id`s on every field), add-lesson, add-exam, add-quiz (unchanged, toast-only), view-student (rewritten 2026-07-21 from a static placeholder into a real edit/delete form) |
| ~1591 | Toast | `<div class="toast" id="toast">` |
| ~1593–~1610 | **Plain `<script>` #1 — page nav, modals, toasts, quiz, filters, dark mode, greeting, word-of-the-day** | `breadcrumbLabels`, `showPage`, `openModal`/`closeModal`, backdrop-click binding, Escape handler, `showToast`, `saveAndClose`, `answerQuiz`, `filterStudents` (reads `row.dataset.curr`/`.band`), `showTab`, `filterBtns`, `toggleDark`, dark-restore IIFE, `GREETINGS`/`getGreeting`/`updateGreeting`, `WORDS` word-of-the-day array (30 entries), `renderWord`/`nextWord`, `copyTemplate`. Unchanged by the 2026-07-21 fix except the file's absolute line numbers shifted (the modal edits above added lines before this block) |
| — | `<div id="tweaks-root">` | Mount point for the vanilla tweaks panel — renders nothing until activated via `postMessage({type:'__activate_edit_mode'})` (by the panel's own design, not a defect); confirmed alive via `sailaja-os-browser-verification`'s `verify-tweaks-panel.mjs` |
| **~1806–end** | **Plain `<script>` #2 — REWRITTEN 2026-07-21 twice: first JSX→plain-`React.createElement` (W1/W2/W3 SETTLED), then React removed entirely (decision c)** | `TWEAK_DEFAULTS`, `TWEAK_EFFECTS` (a plain object of per-key side-effect functions, replacing React `useEffect`s), `mountTweaks` (builds the panel via `createTweaksPanel`/`tweakSection`/`tweakColor`/etc. from `tweaks-panel.js`, no JSX, no `h()`). Then the live persistence layer, unchanged by the React removal: `esc()`, `nextId()`, `bandFromGradeText()`/`deriveCurrBand()`, `fullCurrLabel()`, `DB_KEY`/`SESSIONS_KEY`, `initDatabase` (level-badge fallback, `sailaja-os-failure-archaeology` Incident 2), `renderStudents`, `addNewStudent`, `viewStudent`/`saveStudentEdit`/`deleteStudent`, session functions, then (Phase 3(d)) `addLesson`/`renderLessons`, `addExam`/`renderExams`/`populateExamStudentSelect`, `addQuizQuestion`/`renderQuiz`, DOMContentLoaded init. Absolute line numbers are volatile — re-grep function names rather than citing numbers here. |

## 2b. Section map — `tweaks-panel.js` (hand-written vanilla JS since 2026-07-21, no `.jsx` source, no compile step)

App-agnostic reusable control library — knows nothing about this app's
pages/CSS vars; `index.html`'s `mountTweaks()` composes it with the
app-specific `TWEAK_DEFAULTS`/`TWEAK_EFFECTS`. Every top-level `function`
declaration is automatically a `window` global in a classic script — no
explicit `Object.assign(window, ...)` export block needed or present.

| What | Notes |
|---|---|
| `__TWEAKS_STYLE` | Panel CSS as a template string, unchanged from the React version — injected as a `<style>` node by `createTweaksPanel` |
| `el(tag, props, ...children)` | Minimal DOM-builder helper (new) — `className`/`style`(object)/`on<event>`(lowercase, `addEventListener`)/plain attributes. Not a virtual DOM — no diffing, builds real nodes directly |
| `tweakRow`, `tweakSection`, `tweakSlider`, `tweakToggle`, `tweakRadio`, `tweakSelect`, `tweakText`, `tweakNumber`, `tweakColor`, `tweakButton` | The controls — same 10 as the React version (renamed lowerCamelCase to signal they're imperative builders, not components: `builder(containerEl, props)` appends DOM and wires native events directly, rather than `Component(props)` returning an element tree). Each control manages its own visual state on interaction (e.g. the radio's thumb position, the toggle's `data-on` attribute) — no external re-render is ever triggered or needed |
| `createTweaksPanel(rootEl, { title, buildBody })` | Replaces `TweaksPanel` + `useTweaks`. Stays closed until `__activate_edit_mode` postMessage (still W6: standalone, nothing ever sends this without a host iframe); **rebuilds the whole body via `buildBody(el)` fresh on every open** (mirrors the React version's full unmount/remount on close — callers never see stale DOM); handles drag and viewport-clamping identically to before |

Verified control-by-control (not just "it mounts"):
`sailaja-os-browser-verification`'s `verify-tweaks-panel.mjs` drives the
slider, toggle, color picker, text input, and radio group, asserting each
one's real side effect (CSS var change, DOM style change, greeting text
update) — 17/17 PASS.

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
5. **External network = zero — achieved 2026-07-21, not aspirational.**
   None may be ADDED: `grep -n "https://\|http://" index.html | grep -v "svg%22"`
   must return **nothing** (the favicon is a data-URI, not a request; fonts
   are vendored under `vendor/fonts/`; React is removed); and
   `grep -rn "fetch(\|XMLHttpRequest\|WebSocket\|sendBeacon\|EventSource" index.html tweaks-panel.js`
   must be empty. Proven under an actual network-blocked run, not just by
   the absence of CDN lines: `sailaja-os-browser-verification`'s
   `verify-offline.mjs` (10/10 PASS, 0 requests attempted with everything
   non-localhost aborted).
6. **Sailaja's data never leaves the device.** Follows from invariant 5 plus
   decision (e); any change that would transmit student or parent data
   off-device is owner-sign-off territory, full stop.
7. **Script order — simplified 2026-07-21.** `tweaks-panel.js` is now the
   only head script (React removal, decision c) — no inter-script ordering
   constraint remains there. The plain `<script>`s in the body still stay
   after the markup they wire (they bind listeners to existing DOM nodes at
   parse time).
8. **v2 stays frozen.** `git diff --name-only | grep -x "sailaja_teaching_os_v2.html"` must be empty in every commit.

## 4. Honest weak points — verified 2026-07-20/21; W1-W3, W4, W5 SETTLED, W6-W7 still OPEN

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
- **W4 — SETTLED 2026-07-21 (was OPEN). React development builds.** Was:
  `react.development.js`/`react-dom.development.js` — slower, larger,
  console-noisy builds pinned by SRI. **Resolved by removing React
  entirely** (decision c), not by switching to a production build — no
  build-variant question left to have.
- **W5 — SETTLED 2026-07-21 (was OPEN). Offline fragility.** Was three
  external requests; a failed React load would have broken both the tweaks
  panel and (post-W1-fix) the entire student database. **Resolved**: React
  removed, fonts vendored under `vendor/fonts/` (latin subset only,
  verified sufficient for this app's content). Proven, not assumed:
  `sailaja-os-browser-verification`'s `verify-offline.mjs` runs the whole
  app with every non-localhost request aborted — 0 attempted, 0 console
  errors, fonts confirmed loaded via `document.fonts`.
- **W6 — OPEN, unaffected by the React removal. Panel needs a host
  iframe.** The (now vanilla) panel still opens only on a
  `__activate_edit_mode` postMessage from a parent frame — an
  artifact-style host convention carried over unchanged from the React
  version. Served standalone (as this app is for Sailaja), the panel can
  never open through any UI control of its own. Deciding whether Sailaja
  gets a standalone open control (a button that fires the same postMessage)
  is an owner call, not yet made — removing React made the panel cheaper to
  ship, not more reachable.
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
| **A new tweak** (new knob in the panel) | New reusable **control builder** (e.g. a hypothetical `tweakDate`) → add it directly to `tweaks-panel.js` as a new `tweakX(container, props)` function, no compile step. New **knob wiring** (`TWEAK_DEFAULTS`/`TWEAK_EFFECTS`/`mountTweaks`'s `buildBody`) lives in script #2 in `index.html` — call the new builder there | — | Class (d) only — no pair/compile discipline exists anymore (decision c) |
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
defects. Updated 2026-07-21 twice more, same day: after the daily-use-campaign
Phase 1-3(d) work landed, then after Item 2 (React removal + font vendoring)
landed on top of that (working-tree changes at time of writing — confirm
they've been committed before trusting "SETTLED"/"DONE" claims blindly).
**Most absolute line numbers in §2's section map are approximate ("~") or
removed** — re-grep function names, not line numbers, for anything precise.
One-line re-verification commands (repo root):

- File inventory: `wc -l index.html sailaja_teaching_os_v2.html tweaks-panel.js` and `ls vendor/fonts/` (`tweaks-panel.jsx` should no longer exist — `ls tweaks-panel.jsx` should fail)
- No CDN/external lines anywhere: `grep -n "https://\|http://" index.html | grep -v "svg%22"` (expect nothing)
- No React anywhere: `grep -rn "React\.\|ReactDOM" index.html tweaks-panel.js` (expect nothing but the historical comment in index.html referencing the old incident)
- CSS block + vendored @font-face rules: `grep -n '<style\|</style>\|@font-face' index.html`
- Page divs (12) and their lines: `grep -n 'id="page-' index.html`
- Modals (6) and toast: `grep -n 'class="modal-bg"\|id="toast"' index.html`
- Plain-script bounds and symbols: `grep -n '<script>\|</script>' index.html` and `grep -n "breadcrumbLabels\|function showPage\|function toggleDark\|const WORDS\|function copyTemplate" index.html`
- No live dead block (W1 SETTLED — should match only historical comments):
  `grep -n 'type="text/babel"' index.html`
- Persistence + session + content symbols: `grep -n "DB_KEY\|SESSIONS_KEY\|LESSONS_KEY\|EXAMS_KEY\|QUIZ_KEY\|initDatabase\|renderStudents\|addNewStudent\|saveStudentEdit\|deleteStudent\|logSession\|addLesson\|addExam\|addQuizQuestion\|deriveCurrBand\|function esc" index.html`
- Vanilla tweaks-panel API present (decision c): `grep -n "^function createTweaksPanel\|^function tweakSlider\|^function tweakToggle" tweaks-panel.js`
- Storage keys (six): `grep -n "sailaja-dark\|teach_os_students\|teach_os_sessions\|teach_os_lessons\|teach_os_exams\|teach_os_quiz" index.html`
- Panel activation contract (W6, still relevant, unaffected by the React removal): `grep -n "__activate_edit_mode\|__edit_mode_available" tweaks-panel.js`
- Seeded rows (15) vs badge (14, still drifted — W7 unfixed): `grep -c '<tr data-curr=' index.html` and `grep -n 'nav-badge">14\|All (14)' index.html`
- WORDS entry count (30): `grep -c '{ word:' index.html`
- v2 still static: `grep -c "React\|localStorage\|text/babel" sailaja_teaching_os_v2.html` (must be 0 — but see `sailaja-os-failure-archaeology` Incident 3's caution about the "older" framing for this file)
- Still zero-build: `ls package.json 2>&1`
- Persistence layer alive end-to-end: `PW_PATH=<...> node .claude/skills/sailaja-os-browser-verification/scripts/verify-crud.mjs` (expect `25/25 PASS`)
- Offline-completeness (decisions c+f): `PW_PATH=<...> node .claude/skills/sailaja-os-browser-verification/scripts/verify-offline.mjs` (expect `10/10 PASS`, 0 requests attempted)
- Sibling skills exist: `ls .claude/skills/`
