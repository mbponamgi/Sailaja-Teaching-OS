---
name: sailaja-os-content-authoring
description: >
  How to add or edit teaching CONTENT in the Sailaja Teaching OS
  (index.html): quiz questions, word-of-the-day entries, parent-communication
  templates, lesson plans, exam rows, resources, curriculum-page cards,
  student-table demo rows, or any French text anywhere in the app. Load this
  skill whenever a task says add/edit/translate/fix content, a quiz, a word,
  a template, a lesson, an exam, a resource, or French wording — it carries
  the verified markup patterns, the id/onclick conventions each mechanism
  needs, the masked-phone privacy rule, and the warning that student-table
  rows double as the future localStorage seed.
---

# Sailaja OS content authoring

The app is one file, `index.html` (1987 lines at HEAD `9fef6e5`). All
teaching content is hand-authored HTML and JS inside that same file — there
is no CMS, no data files, no build step. "Content" and "code" share one
`<script>` block's blast radius: a stray apostrophe in the wrong context
kills navigation for the whole app.

House rules that bind every content edit (owner, 2026-07-20; details →
`sailaja-os-change-control`):

1. Content edits are **class (b)** — the lightest change class, but NOT
   exempt from verification: the page must load in a real browser with zero
   console errors and the new content visible.
2. Anything touching `onclick` handlers, `id`s, `data-*` attributes, or the
   students table is **behavior-adjacent** — full change-control gates.
3. **Never commit real personal data.** Parent phone numbers in committed
   content are always masked (`98765XXXXX` pattern). Real data enters only
   through Sailaja's own data entry in her browser, never through git.

Jargon used below: **WOTD** = word of the day ("Mot du jour" card);
**seed** = the initial student data the (currently dead) `initDatabase()`
will scrape from the HTML table into localStorage on first run.

## 1. Content-surface map

All anchors are `index.html` line numbers, verified 2026-07-20 at HEAD.
Pages live between `<div class="content">` (503) and its close (1443);
modals 1452–1588; the live script block is 1593–1786; the **dead**
`type="text/babel"` block is 1789–1985 (never executes — no Babel is
loaded; see `sailaja-os-change-control`, founding incident).

| Content type | Where | Mechanism | Risk class |
|---|---|---|---|
| Word of the day | `WORDS` array 1718–1749; rotation 1751; render 1753–1760 | JS object array in the live script block | Pure content, but a bad escape breaks ALL app JS |
| Quiz questions | 1261–1300 (4 × `.quiz-card`); handler `answerQuiz` 1634–1646 | Static HTML + `onclick="answerQuiz(this,true|false)"` | Behavior-adjacent (onclick attrs) |
| Parent-comm templates | 1314–1393 (6 × `.comm-card`); handler `copyTemplate` 1780–1785 | `id="t-<id>"` body + `onclick="copyTemplate('<id>')"` button | Behavior-adjacent (id contract) |
| Students table | 724–873; 15 rows at 737–871 | Static HTML rows + `data-curr`/`data-band`; **future DB seed** (§5) | Behavior-adjacent + data-seed — highest-risk content surface |
| Dashboard | greeting 512–513; stat cards 544–581; sessions 594–618; cohort progress 629–648; deadlines 661–680 | Static HTML | Pure content (numbers are hand-maintained, see count-drift note §5) |
| A1/A2 page | progress 893–896; curriculum map 901–904 | Static HTML (`.lesson-item`) | Pure content |
| CBSE page | tab panes 926–985 (`.profile-card` + Recent Sessions) | Static HTML; tab ids `cbse-<band>` wired to `showTab` (921–924) | Content inside panes pure; pane ids behavior-adjacent |
| Cambridge page | 4 profile cards 1000–1019 | Static HTML | Pure content |
| IBDP page | student cards + component tables 1034–1061; assessment calendar 1063–1071 | Static HTML tables | Pure content |
| Lesson plans | template table 1093–1103; lesson banks 1104–1119 | Static HTML (`.lesson-item`) | Pure content |
| Schedule | weekly table 1136–1152; static May-2026 calendar 1157–1189 | Static HTML | Pure content (calendar is hand-drawn, not generated) |
| Exams | upcoming table 1208–1216; prep checklists 1219–1238 | Static HTML; checklist items carry an inline `onchange` toggle (1222) | Table pure; checklist behavior-adjacent (copy the existing handler verbatim) |
| Resources | 1407–1440 | Static HTML (compact `.lesson-item` variant) | Pure content |
| Greetings | `GREETINGS` 1698–1704 | JS array | Pure content, same escape rules as WORDS |
| Modal `<select>` rosters | Log Session 1490; Add Exam 1541 | Static `<option>` lists mirroring the student table | Must stay consistent with table edits (§5) |
| Topbar date | 495 (`Sunday, 3 May 2026`) | Static text — NOT live | Pure content; known demo artifact |

## 2. Add a quiz question

The verified pattern (copy of `index.html:1261–1269`):

```html
<div class="quiz-card">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><span class="badge badge-a1">A1</span><span style="font-size:0.7rem;color:var(--ink3);">Vocabulary · Leçon 1</span></div>
  <div class="quiz-q">1. "Bonjour" is used to say:</div>
  <div class="quiz-options">
    <div class="quiz-opt" onclick="answerQuiz(this,false)">Goodbye</div>
    <div class="quiz-opt" onclick="answerQuiz(this,true)">Good morning / Hello</div>
    <div class="quiz-opt" onclick="answerQuiz(this,false)">Good night</div>
    <div class="quiz-opt" onclick="answerQuiz(this,false)">Thank you</div>
  </div>
</div>
```

Checklist:

- [ ] Place inside `#page-quizzes` (1245–1301), after the last `.quiz-card`.
- [ ] **Exactly one option has `answerQuiz(this,true)`.** The `true` marks
      the correct answer; `answerQuiz` (1634–1646) styles the click and, on a
      wrong pick, reveals the correct one by scanning siblings for an
      `onclick` attribute containing the substring `'true'` (1640–1643).
      Two `true`s = two "correct" reveals; zero = wrong answers reveal
      nothing. Also: because the reveal is a substring test, never put the
      word "true" anywhere else in an option's `onclick`.
- [ ] Every option keeps `class="quiz-opt"` — the handler disables and
      scans `parentElement.querySelectorAll('.quiz-opt')` (1635); an option
      without the class is skipped by disable/reveal and unstyled.
- [ ] Badge in the header matches curriculum: `badge-a1` / `badge-cbse` /
      `badge-cam` / `badge-ibdp` (real usages at 1262, 1272, 1282, 1292).
- [ ] Number the question to follow the previous card (`1.`–`4.` exist).
- [ ] Apostrophes in French text here are **plain HTML text** — write
      `j'ai mangé` literally (as at 1276), never `j\'ai mangé`; backslash
      escapes are a JS-string convention (§3) and would render visibly.
- [ ] Filter buttons (1255–1259) are cosmetic only — `filterBtns` (1672)
      toggles the active pill and filters nothing; no `data-*` needed.
- [ ] Browser smoke per change-control class (b): page loads, 0 console
      errors, click a wrong option → correct one highlights + toast.

## 3. Add a word of the day

Entry shape — a real one, verbatim (`index.html:1719`):

```js
{ word: 'apprendre', type: 'verb', translation: 'to learn', example: 'J\'aime apprendre le français.', level: 'A1' },
```

Checklist:

- [ ] Append inside the `WORDS` array (1718–1749), before the closing `];`.
- [ ] All five keys required: `word`, `type`, `translation`, `example`,
      `level` — `renderWord` (1753–1760) reads each with no fallback.
- [ ] `type` values in use: `verb`, `noun (m)`, `noun (f)`, `adjective`,
      `adverb`, `verb (refl.)`. Nouns carry their article in `word`
      (`'la fenêtre'`, 1720).
- [ ] `level` is a CEFR label; observed range A1–C1 (single C1: `nuancer`,
      1748). What the levels MEAN and which level a word deserves →
      `french-tuition-reference`. This skill only owns the markup.
- [ ] **Escape every apostrophe as `\'`** — these are single-quoted JS
      strings (`'J\'aime…'`, `'s\'il te plaît'`). One unescaped apostrophe
      is a SyntaxError that kills the ENTIRE live script block (1593–1786):
      no `showPage`, no navigation, dead app. This is why "just a word"
      still gets a browser load.
- [ ] Don't add quotation marks around `example` — `renderWord` wraps it in
      curly quotes at display time (`'“' + w.example + '”'`, 1758).
- [ ] Rotation math (1751): `wotdIndex = floor(Date.now()/86400000) %
      WORDS.length` — days-since-epoch (UTC) mod array length. Appending a
      word changes the modulus, so "today's word" jumps to a different
      entry — **harmless by design**; order in the array carries no meaning.
      (Side effect of UTC: the daily flip lands at 05:30 IST, not midnight.
      Known, harmless.)
- [ ] Verify: load the page, click "Suivant →" (1538) through your new
      entry; check the example renders with its accents.

## 4. Add or edit a parent-comm template

The verified pattern (abridged from `index.html:1314–1324`):

```html
<div class="comm-card">
  <div class="comm-card-header"><span class="comm-type">Session Reminder</span><button class="btn btn-ghost btn-sm" onclick="copyTemplate('reminder')">Copy</button></div>
  <div class="comm-body" id="t-reminder">Bonjour <span class="fill-blank">[Parent Name]</span>,

Reminder: <span class="fill-blank">[Student]</span>'s French class …

À bientôt,
Sailaja</div>
</div>
```

Checklist:

- [ ] Place inside the `.grid-2` of `#page-comms` (1313–1394).
- [ ] **The id contract:** body `id="t-<id>"` must match the button's
      `copyTemplate('<id>')` — `copyTemplate` (1780–1785) does
      `getElementById('t-' + id)`. Existing pairs: `reminder` (1316),
      `progress` (1327), `examprep` (1342), `milestone` (1357), `cancel`
      (1370), `fee` (1383). Pick a new short lowercase id; a mismatch =
      TypeError on click.
- [ ] **Write body lines flush-left.** `.comm-body` is `white-space:
      pre-line` (CSS line 345), so source line breaks and indentation ARE
      the copied message. Every existing template starts its continuation
      lines at column 0 (see 1316–1323) — indenting "nicely" would indent
      Sailaja's WhatsApp message.
- [ ] Placeholders are `<span class="fill-blank">[Like This]</span>`;
      `copyTemplate` copies `innerText`, so the bracketed text lands in the
      clipboard for Sailaja to fill in.
- [ ] Clipboard caveat: `navigator.clipboard` exists only in secure
      contexts (https or localhost). Served locally the Copy button works;
      opened as `file://` the call throws (the `.catch` at 1784 only
      handles promise rejection, not `clipboard` being undefined). Verify
      via `http://localhost:…`, per `sailaja-os-browser-verification`.
- [ ] House voice (observed in all six): greeting `Bonjour [Parent Name],`
      → body in English with French sign-off (`À bientôt,` / `Merci,` /
      `Bon courage,` / `Félicitations!` / `Merci de votre compréhension,`)
      → `Sailaja`. Fees are `₹` + UPI (1387–1389).

## 5. Editing the students table — WARNING BLOCK

**These 15 rows (737–871) are not just display. They are the future
first-run database seed.** The dead `initDatabase()` (1884–1905) — to be
resurrected by the daily-use campaign — scrapes this exact tbody into
localStorage `teach_os_students` on first run when the key is absent. A
content edit here is an edit to Sailaja's future initial data.

Row anatomy (verified, `index.html:737–745`):

```html
<tr data-curr="cbse" data-band="primary" onclick="openModal('view-student')">
  <td><span class="student-name">Aarav T.</span><span class="student-parent">Parent: Mrs. T · 98765XXXXX</span></td>
  <td><span class="badge badge-cbse">CBSE</span></td>
  <td><span class="badge badge-primary">Grade 4</span></td>
  <td>French basics · grammar</td>
  <td>Tue · 4:00 PM</td>
  <td><div class="mini-prog"><div class="mini-track"><div class="mini-fill" style="width:55%;background:var(--cbse)"></div></div><span class="mini-pct">55%</span></div></td>
  <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openModal('add-session')">Log</button></td>
</tr>
```

**The scraper's column contract** (`initDatabase`, 1890–1901 — every
selector below must resolve or the scrape THROWS):

| Field | Selector | Notes |
|---|---|---|
| name | `.student-name` | row skipped entirely if absent (1892) |
| parent | `.student-parent` | keep the `Parent: Xxx. Y · NNNNNXXXXX` shape |
| currBadge | `td:nth-child(2) .badge` | text drives curriculum detection in `renderStudents` (1917–1922) |
| levelBadge | `td:nth-child(3) .badge` | **see defect below** |
| focus | `td:nth-child(4)` | plain text |
| schedule | `td:nth-child(5)` | `Day · Time` shape |
| progress | `.mini-pct` | `NN%` — parsed with `parseInt` (1924) |

- [ ] `data-curr` ∈ `cbse | cambridge | ibdp | a1` and `data-band` ∈
      `primary | middle | secondary | senior | a1` (all values verified in
      use; `filterStudents` 1649–1661 matches on them).
- [ ] **Known open defect — do not silently copy or "fix":** the four A1
      rows (836–871) put plain styled text in column 3 (`<td
      style="…">Week 14</td>`, e.g. 839) with **no `.badge`** — so
      `td:nth-child(3) .badge` is null and the resurrected scrape would
      throw mid-loop and seed nothing. A NEW row you add must include a
      `.badge` in column 3 (all CBSE/Cambridge/IBDP rows do). Repairing the
      four existing A1 rows or hardening the scraper is a data-schema call
      → `sailaja-os-data-model-and-migrations` + the campaign, not a
      drive-by content edit.
- [ ] **Masked phones, always.** All 17 committed numbers are 5 digits +
      `XXXXX` (`98765XXXXX`). Never commit a real number — this is
      committed demo/seed content about children's families. Guard:
      `grep -E '[0-9]{7,}' index.html` must return nothing (verified clean
      at HEAD).
- [ ] **Update the mirrors** — one student appears in up to six places:
      the table row; the Log Session `<select>` (1490, lists all 15); the
      Add Exam `<select>` (1541); the weekly schedule table (1136–1152);
      the curriculum page card (CBSE 926–985 / Cambridge 999–1020 / IBDP
      1034–1061 / A1 892–904); and any dashboard session/deadline rows.
- [ ] **Count labels are now LIVE, not static (fixed 2026-07-21 —
      `sailaja-os-architecture-contract` W7 SETTLED, `sailaja-os-frontier-
      and-method` Item 5's "Live counts").** The nav badges, dashboard stat
      cards, page subtitles, and the Students-page filter-bar pills all read
      `teach_os_students` live via `renderLiveCounts()` — nothing to
      hand-edit. But this checklist item is specifically about the STATIC
      demo table (the `initDatabase()` seed source): if you add a 16th
      static `<tr>` there, remember `renderLiveCounts()` only fires from
      `DOMContentLoaded`/add/edit/delete — a raw edit to the static table
      markup itself needs a real page load (or `initDatabase()` re-run
      against a cleared store) before the counts reflect it, since
      `initDatabase()` only scrapes into localStorage once, on first load
      with no existing `teach_os_students` key.
- [ ] Gates: this surface is behavior-adjacent AND seed-relevant — run the
      seed-consistency check from `sailaja-os-browser-verification`'s
      scripts (assert the row count, and once the scraper is live, that a
      fresh profile seeds `teach_os_students` with your row intact).

## 6. French text house style (as observed at HEAD)

Codified from what the file actually does — match it, don't import outside
conventions:

- **Accents are mandatory, including on capitals**: `Écris` (1724),
  `À bientôt` (1322), `Leçon`, `révision`, `passé composé`. Never strip an
  accent to dodge an encoding worry; the file is UTF-8 and full of them.
- **Apostrophes are straight `'` everywhere.** In JS strings escape as
  `\'` (§3); in HTML text write them literally (§2). No `’`, no `&rsquo;`
  (zero occurrences at HEAD).
- **No guillemets.** `«»` appear nowhere. Quoted text in HTML uses
  straight `"` (`"Bonjour" is used to say:`, 1263); the WOTD example gets
  curly `“ ”` added at runtime (1758). Don't introduce `« »`.
- **Spacing before `?` `!` `;` is mixed, deliberately by surface:** full
  French sentences in `WORDS` use the French thin-space convention typed as
  a normal space — `…cette leçon ?` (1723), `…une fois ?` (1739),
  `…aujourd'hui !` (1731), `…difficile ; néanmoins…` (1722). Short
  interjections in templates and quiz options don't — `Félicitations!`
  (1365), `Salut!` (1285). Rule: match the surface you are editing; never
  use `&nbsp;`.
- **Separator idiom** is the middle dot with spaces: `A1 · Vocabulary ·
  Leçon 1`, `Tue · 4:00 PM` — used in metas, schedules, subtitles.
- **Raw `&` is fine in HTML text** (`Exams & <em>Assessments</em>`, 1201);
  the file does not use `&amp;` in prose.
- **Bilingual register:** UI chrome and explanations are English; French
  appears as taught content, greetings, and sign-offs (`Très bien!` toast,
  1645). Keep that split.

## 7. Other card/section patterns — one verified example each

Reuse these exact class structures; dark mode (body.dark rules, 147–167)
and hover styles only come free if you do.

**Lesson-bank item** (`index.html:1107`) — `.lesson-item` >
`.lesson-num` + `.lesson-info` (`.lesson-title`, `.lesson-meta`) + status
badge (`badge-done` / `badge-upcoming` / `badge-draft`):

```html
<div class="lesson-item"><div class="lesson-num">1</div><div class="lesson-info"><div class="lesson-title">Present tense — ER verbs</div><div class="lesson-meta">60 min · Gr 7 · Conjugation drills</div></div><span class="badge badge-done">Done</span></div>
```

Add one: copy into the right bank card (CBSE 1105–1111, Cambridge+IBDP
1112–1118, A1 curriculum map 901–904) and increment `lesson-num`.

**Student profile card** (CBSE example 928–935) — `.profile-card` >
`.profile-card-band` (curriculum color) + `.profile-card-body` with a
`Focus / Textbook / Schedule / Parent` strong-label block and a
`.progress-track`. Cambridge cards 1000–1019 are the same pattern; IBDP
uses `.card` with a component-weight `<table>` instead (1042–1046).

**Session item** (dashboard 594–598; compact page variant at 938 adds
`style="grid-template-columns:60px 1fr;"`) — `.session-item` >
`.session-when` (`.session-day`, `.session-time`) + title/note div +
curriculum badge.

**Exam row** (1209) — plain `<tr>` in the upcoming table: date in
`<strong>`, student, curriculum badge, exam name, prep-status badge
(`badge-good` / `badge-working` / `badge-needs`).

**Prep checklist item** (1222) — copy the inline handler verbatim; it is
the existing convention, not a new handler:

```html
<label class="check-item"><input type="checkbox" onchange="this.closest('.check-item').classList.toggle('checked',this.checked)"> Letter writing — formal + informal format</label>
```

(State is visual only — nothing persists it at HEAD.)

**Resource item** (1410) — the compact `.lesson-item` variant, no
`lesson-num`: `style="padding:8px 10px;"` wrapping `.lesson-info` only.

**Deadline item** (661–664) — `.deadline-item` with paired inline colors:
`background:var(--X-pale);border-color:var(--X)` and the date in
`color:var(--X)`. Keep pale/solid pairs matched to the curriculum palette
(`--cbse`, `--cambridge`, `--ibdp`, `--french-blue`, `--rouge` = exam).

## 8. What NOT to do

- **Don't invent new `onclick` handlers or JS functions.** Reusing the
  existing conventions (`answerQuiz`, `copyTemplate`, `openModal`,
  `filterBtns`, the checklist `onchange`) inside copied markup is the
  ceiling for content work. A new handler = class (d) behavior change →
  full `sailaja-os-change-control` gates.
- **Don't add a page** without the full triple: `<div class="page"
  id="page-X">`, a `breadcrumbLabels` entry (1595–1600), and a sidebar
  `nav-item` with `showPage('X')` (456–475). That's an architecture
  change, not content — gate accordingly.
- **Don't put real personal data in committed content**: no real phone
  numbers (masked `XXXXX` pattern only), parents stay as initials
  (`Mrs. T`), no addresses. Committed students are demo/seed personas.
- **Don't touch the dead babel block (1789–1985) "while you're in
  there"** — resurrecting or editing it is the campaign's job and a
  behavior + data-schema change. Same for adding any `<script
  type="text/babel">` or CDN — see change-control non-negotiable #3.
- **Don't edit `sailaja_teaching_os_v2.html`** — frozen legacy prototype.
- **Don't trust the diff alone.** Content shares the file with all the JS;
  a lone `'`, backtick, or `</script>`-shaped string in the wrong context
  takes the app down. The class-(b) browser load is the whole safety net —
  there is no linter, no tests, no CI.

## When NOT to use this skill

- **What CEFR levels, CBSE/Cambridge/IBDP structures, DELF, or IGCSE
  papers MEAN** — and whether a word is "really" B1 →
  `french-tuition-reference`. This skill only owns where content lives and
  what markup it needs.
- **Whether/how a change may commit** (gates, sign-off, rollback) →
  `sailaja-os-change-control`; commit message style →
  `sailaja-os-docs-and-commits`.
- **Behavior changes** (new handlers, new pages, resurrection of the DB
  block) → `sailaja-os-change-control` + the architecture contract skill.
- **The seed/store schema, `teach_os_students`, migrations** →
  `sailaja-os-data-model-and-migrations`.
- **Browser-verification mechanics** (serving, Playwright templates, the
  seed-consistency script) → `sailaja-os-browser-verification`.

## Provenance and maintenance

Authored 2026-07-20 against the working tree at HEAD `9fef6e5`. Every
quoted snippet was copied from `index.html` and every line anchor verified
by direct read the same day. Sibling-skill cross-references: at authoring
time `.claude/skills/` contained `french-tuition-reference`,
`sailaja-os-change-control`, `sailaja-os-docs-and-commits`, and
`sailaja-os-frontier-and-method`; the remaining named siblings were being
authored in parallel — re-check with `ls .claude/skills/`.

Re-verification one-liners (run from the repo root; all were run during
authoring):

```bash
# Page divs and their line anchors (§1 map):
grep -n '<div class="page' index.html
# WORDS array bounds + rotation line (§3):
grep -n "const WORDS\|wotdIndex = Math.floor" index.html
# Quiz cards: 4 cards, exactly 4 true / 12 false (§2):
grep -c 'class="quiz-card"' index.html; grep -c "answerQuiz(this,true)" index.html; grep -c "answerQuiz(this,false)" index.html
# Comm template id pairs (§4):
grep -n "copyTemplate('\|id=\"t-" index.html
# pre-line rule that makes template indentation load-bearing (§4):
grep -n "white-space: pre-line" index.html
# Student rows: 15 total; per-curriculum counts (§5):
grep -c 'data-curr=' index.html; grep -o 'data-curr="[a-z0-9]*"' index.html | sort | uniq -c
# A1 rows' missing column-3 badge (open defect, §5):
sed -n '836,844p' index.html
# Scraper column contract (§5):
sed -n '1884,1905p' index.html
# Masked phones: 17 occurrences, zero long digit runs (§5):
grep -c "XXXXX" index.html; grep -E '[0-9]{7,}' index.html
# Stale "14" count labels (§5):
grep -n '>14<\|(14)\|14 students' index.html
# French style spot-checks: no guillemets, no curly apostrophes in source (§6):
grep -c "«" index.html; grep -c "’" index.html
# Dead babel block still starts at 1789 (§1, §8):
grep -n 'type="text/babel"' index.html
```

If any anchor drifts (line numbers move the moment anyone edits above
them), re-grep before citing — the patterns above are the durable
identifiers; the line numbers are a snapshot of 2026-07-20.
