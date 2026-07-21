---
name: sailaja-os-data-model-and-migrations
description: >
  Complete catalog of the Sailaja Teaching OS's persisted data model — eight
  localStorage keys as of 2026-07-21: 'teach_os_students', 'teach_os_sessions',
  'teach_os_lessons', 'teach_os_exams', 'teach_os_quiz', 'teach_os_payments'
  (all live), the 'teach_os_last_export' backup-freshness stamp, and the
  'sailaja-dark' preference — and the migration discipline protecting
  Sailaja's real student roster now that the store is live. Load this skill
  when: adding, renaming, or removing ANY field on a student, session,
  lesson, exam, quiz-question, or payment record; touching initDatabase(),
  renderStudents(), addNewStudent(), saveStudentEdit(), deleteStudent(), the
  session functions, addLesson()/addExam()/addQuizQuestion(),
  logPayment()/renderViewStudentPayments(), or
  exportData()/handleRestoreFile(); reading or writing any of the eight
  localStorage keys; writing or reviewing a data migration; authoring seed
  data or test fixtures; or interpreting stored contents. Also covers the
  DOM-scrape seeding pipeline (the static HTML table IS the seed fixture)
  and a canonical minimal seed JSON for browser tests.
---

# Sailaja OS Data Model and Migrations

All dynamic user data for this app is designed to live in **one localStorage
key**: `teach_os_students`, managed by three functions (`initDatabase`,
`renderStudents`, `addNewStudent`) in `index.html`. There is no server, no
IndexedDB, no build step. An in-app export/restore button now exists (Item
4, `sailaja-os-frontier-and-method`, DONE 2026-07-21) but is still a manual
action Sailaja must trigger — it is not automatic or continuous. Once real
data exists, that key holds Sailaja's actual student roster and is
**irreplaceable** — the owner's
house rule (adopted verbatim from Family Finance OS, 2026-07-20) applies:
**never ship anything that can wipe or corrupt the store; schema changes need
migrations once data is live; removing or renaming keys/fields needs explicit
owner sign-off.**

## 0. Status: LIVE as of 2026-07-21 (daily-use-campaign Phase 1-3 fix)

For over two months (2026-05-12 → 2026-07-20), the entire database layer sat
inside a dead `<script type="text/babel">` block with no Babel runtime
loaded — `addNewStudent` was `undefined`, `teach_os_students` was never
created, clicking "Add Student" threw. Full incident:
`sailaja-os-failure-archaeology` Incident 1.

**That is now fixed.** `initDatabase`/`renderStudents`/`addNewStudent` (plus
new session/edit/delete functions) were ported into the live plain
`<script>` block, and `teach_os_students` is written on first load.
Verified in a real browser with Playwright, 2026-07-21:
`typeof addNewStudent === 'function'`, the store holds 15 scraped records
after load, and a full add→session→edit→**reload**→delete cycle survives
intact (`sailaja-os-browser-verification`'s `verify-crud.mjs`, 25/25 PASS).

**Consequence: `teach_os_students` and `teach_os_sessions` may now hold real
data the moment Sailaja uses the app.** Every rule in §4 applies with full
force from here on — no more "design as if data is live," it now actually
is. `sailaja-dark` remains the only *other* live key, written from the same
script block (line ~1593 onward originally; both blocks were merged, see §7).

The schema below (§1) is the **live** shape, not a design proposal. A second
latent bug surfaced the moment the scraper actually ran for the first time —
see §2.1 and `sailaja-os-failure-archaeology` Incident 2 — fixed in the same
change.

All line numbers below are **as of 2026-07-20** unless marked otherwise
(index.html = 1987 lines then; the 2026-07-21 fix added ~150 lines and
removed the dead block, so absolute line numbers have shifted — re-grep
before citing, per "Provenance and maintenance").

## 1. Complete catalog of persisted state

Eight localStorage keys as of 2026-07-21 (was two before that day's work —
the persistence-layer fix added `teach_os_sessions`, Phase 3(d) afterward
added `teach_os_lessons`/`teach_os_exams`/`teach_os_quiz`, Item 4 added
`teach_os_last_export`, and Item 3 added `teach_os_payments`). Nothing else
persists (`tweaks-panel.js` contains no localStorage calls). localStorage is
**per-origin**: `http://localhost:8000` and `http://localhost:8001` are
different stores — a port change makes the app "forget" everything (triage
for that → `sailaja-os-debugging-playbook`).

| Key | Status | Value | Written by | Read by |
|---|---|---|---|---|
| `teach_os_students` | **LIVE** since 2026-07-21 | JSON array of student records (schema below) | `initDatabase()`, `addNewStudent()`, `saveStudentEdit()`, `deleteStudent()` | `renderStudents()`, `viewStudent()`, `populateSessionStudentSelect()`, `populateExamStudentSelect()`, `populatePaymentStudentSelect()`, `populateFeeReminderStudentSelect()` |
| `teach_os_sessions` | **LIVE** since 2026-07-21 | JSON array of session records — also serves as the attendance record (a session with `studentId`+`date` IS attendance; no separate feature was built, per `sailaja-os-frontier-and-method` Item 1) | `logSession()`, `deleteStudent()` (cascade-removes a deleted student's sessions) | `getSessionsForStudent()`, `renderViewStudentSessions()` |
| `teach_os_lessons` | **LIVE** since 2026-07-21 (new, Phase 3(d)) | JSON array of lesson-plan records (schema below) | `addLesson()` | `renderLessons()` |
| `teach_os_exams` | **LIVE** since 2026-07-21 (new, Phase 3(d)) | JSON array of exam records (schema below) | `addExam()` | `renderExams()` |
| `teach_os_quiz` | **LIVE** since 2026-07-21 (new, Phase 3(d)) | JSON array of quiz-question records (schema below) | `addQuizQuestion()` | `renderQuiz()` |
| `teach_os_payments` | **LIVE** since 2026-07-21 (new, Item 3) | JSON array of payment records (schema below) | `logPayment()`, `deleteStudent()` (cascade-removes a deleted student's payments) | `getPaymentsForStudent()`, `isPaidForMonth()`, `renderViewStudentPayments()` |
| `teach_os_last_export` | **LIVE** since 2026-07-21 (new, Item 4) | ISO-8601 timestamp string, e.g. `"2026-07-21T09:24:32.501Z"` | `exportData()`, on every successful backup download | `renderBackupStatus()`, `checkBackupNudge()` — **not** one of `BACKUP_KEYS`, so it is never itself included in or overwritten by a backup/restore round-trip |
| `sailaja-dark` | **LIVE** (unchanged) | string `'1'` or `'0'` | `toggleDark()` | restore IIFE, runs before DOMContentLoaded |

`DB_KEY = 'teach_os_students'` and `SESSIONS_KEY = 'teach_os_sessions'` are
declared together near the top of the plain `<script>` block that now holds
the whole persistence layer. Use the constants, never a fresh string
literal, in any new code.

**Schema decision recorded** (`sailaja-os-daily-use-campaign` Phase 1): kept
`teach_os_students` as the same bare-array key rather than introducing a
versioned wrapper — since the key had never been written before the fix,
this is the cheapest possible case of "no migration needed" (nothing to
migrate away from). `teach_os_sessions` is a new sibling key, not a field
added to the students array, so the two entities can be queried/paginated
independently as the app grows.

### Student record schema (live shape, 2026-07-21)

One record per student, newest first (`addNewStudent` uses `unshift`).
Written by three functions now (`initDatabase`, `addNewStudent`,
`saveStudentEdit`) — all three go through the same `deriveCurrBand()`
helper for the three curriculum-derived fields, so they can't drift out of
sync the way the pre-fix code's two separate derivations could have:

| Field | Type | Example | Quirks you must know |
|---|---|---|---|
| `id` | Number, always integer | `1`, `16` | **Fixed 2026-07-21**: was two inconsistent generators (`Date.now()` vs. `Date.now() + Math.random()`, producing float ids that lose precision on JSON round-trip — see `sailaja-os-browser-verification`'s recorded output for a measured example). Now one `nextId(records)` helper (`max(existing ids) + 1`) used everywhere, always an integer, no collision risk regardless of how many records are created in the same millisecond. `initDatabase()`'s 15 scraped records get ids `1`–`15` in table order. **Now read everywhere** — `viewStudent`, `saveStudentEdit`, `deleteStudent`, and every session's `studentId` foreign-key it. |
| `name` | String | `"Aarav T."` | **Fixed 2026-07-21**: now passed through `esc()` before `innerHTML` interpolation in `renderStudents()` — the stored-XSS-shaped defect (`sailaja-os-architecture-contract` W2) no longer applies to the render path. Storage itself is still unsanitized (as it should be — escape at the render boundary, not at rest). |
| `parent` | String | `"Parent: Mrs. T · 98765XXXXX"` or `"Mrs. Sharma — 98765XXXXX"` | **Prefix inconsistency preserved as-is** (not in scope for this fix): seeded records include the literal `"Parent: "` prefix (scraped verbatim from the static rows); hand-added/edited records store the raw form input without it. Default `'Parent Info N/A'` when left blank. Also now escaped before render. |
| `currBadge` | String | `"CBSE"`, `"Cambridge"`, `"IBDP"`, `"A1/A2"` | Unchanged truncation behavior (`deriveCurrBand()` keeps only the select value's first word) — `"Cambridge Primary (Gr 3–5)"` → `"Cambridge"`, `"IBDP SL"` → `"IBDP"`, `"A1/A2 Language Tuition"` → `"A1/A2"`. `renderStudents` now branches on the new `curr` field (below) instead of re-lowercasing `currBadge` every render. |
| `curr` | String — **new field** | `'cbse'` \| `'cambridge'` \| `'ibdp'` \| `'a1'` | Normalized curriculum key, set once by `deriveCurrBand()` and stored (previously `renderStudents` re-derived an equivalent `currAttr` from `currBadge` on every render — now derived once at write time). Drives badge color class and the `data-curr` attribute `filterStudents()` matches on. |
| `band` | String — **new field, fixes a real bug** | `'primary'` \| `'middle'` \| `'secondary'` \| `'senior'` \| `'a1'` | **Fixes the hardcoded-`data-band="primary"` defect** (`sailaja-os-architecture-contract` W-class, `sailaja-os-daily-use-campaign` Phase 1 obligation): the old `renderStudents()` set every dynamic row's `data-band` to the literal string `'primary'`, which would have made the Gr 6–8/9–10/11–12 filter buttons show nobody the moment the store went live. `initDatabase()` now reads the real band straight off each static row's `data-band` attribute (the static rows already carried it correctly); `deriveCurrBand()` derives it for new/edited records — directly from the curriculum select for Cambridge (`Primary`→`primary`, `Lower Secondary`→`middle`, `IGCSE`→`secondary`) and IBDP (always `senior`), or by parsing a grade number out of the free-text level field for CBSE (`bandFromGradeText()`: 3–5→`primary`, 6–8→`middle`, 9–10→`secondary`, 11–12→`senior`; unparseable falls back to `'primary'`, non-fatal). |
| `levelBadge` | String | `"Grade 4"`, `"Week 14"` | Free text; default `'Grade N/A'`. **Scraper fixed 2026-07-21**: `initDatabase()` used to require a `.badge` span in this column and threw on any row without one — the four A1/A2 rows show plain styled text instead, which aborted the *entire* scrape (0 records, not 11). Now falls back to the cell's own text when no `.badge` child exists. Full incident: `sailaja-os-failure-archaeology` Incident 2. |
| `focus` | String | `"Board exam prep"` | Free text; default `'General'`. Escaped before render. |
| `schedule` | String | `"Tue · 4:00 PM"` | Unchanged: `day.substring(0,3) + ' · ' + time`. Display-only — nothing parses it. Escaped before render. |
| `progress` | String | `"55%"`, `"0%"` | **A string, not a number** (unchanged design). `renderStudents` does `parseInt(s.progress) || 0`. New students still get `'0%'`. **Now editable** — `saveStudentEdit()` writes whatever the profile modal's `#vs-progress` field holds; there's still no separate "progress" UI beyond the student-edit form, per the campaign's Phase 3(c) decision not to build one without Sailaja asking. |
| `monthlyFee` | Number or `null` — **new field, 2026-07-21 (Item 3)** | `2500`, `null` | `null` means "no fee configured" — a deliberately distinct state from `0` (a free/waived-fee student), so `renderViewStudentPayments()` can show "No fee set" instead of a false "Due" status or a fabricated ₹0 due amount. Set via `#new-student-fee`/`#vs-fee` (both blank → `null`, never `0` by default). Read by `openPaymentModalFor()` to prefill the Record Payment amount, and by `copyFeeReminder()` to fill the Fee Reminder template's Amount blank. |

There is no schema-version field, no wrapper object, no metadata — the
stored value is still a bare JSON array of the records above (see the
schema-decision note in §1 for why no wrapper was introduced). The other 11
pages and the `modal-add-lesson`/`modal-add-quiz`/`modal-add-exam` modals
still persist nothing — out of scope for the daily-use-campaign unless
Sailaja specifically asks (`sailaja-os-frontier-and-method` Item 5).

### Session record schema (new, 2026-07-21)

One record per logged session, append-only (`sessions.push`, no unshift —
`getSessionsForStudent()` sorts by date descending for display):

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | Number, integer | `1` | Same `nextId()` scheme as students, independent counter (its own array). |
| `studentId` | Number | `16` | Foreign key into `teach_os_students`' `id`. `deleteStudent()` cascade-deletes every session with a matching `studentId` — there is no orphan-session state reachable through the app's own UI. |
| `date` | String (`YYYY-MM-DD`) | `"2026-07-21"` | From the `<input type="date">` — required, `logSession()` alerts and refuses to save without it. |
| `topic` | String | `"Passé composé — irregular verbs"` | Free text, optional. |
| `performance` | String | `"Excellent"` | One of the add-session modal's four fixed options. |
| `homework` | String | `"Exercises p.34–35"` | Free text, optional. |
| `notes` | String | `"Key observations..."` | Free text, optional. |
| `parentUpdate` | String | `"No — routine class"` | One of the add-session modal's four fixed options; nothing currently *acts* on this beyond storing it (no auto-send — parent comms stay copy-paste WhatsApp templates, `sailaja-os-frontier-and-method` anti-roadmap). |

A session record with `studentId` + `date` **is** the attendance record —
no separate attendance feature exists or is planned (`sailaja-os-frontier-and-method`
Item 1 rules this out explicitly; don't re-propose it without new owner
direction).

### Payment record schema (new, 2026-07-21, Item 3)

One record per recorded payment, append-only (`payments.push`, no unshift —
`getPaymentsForStudent()` sorts by month then paid-on date, descending, for
display). Built on explicit owner sign-off obtained in-conversation
("let us complete item 3"), per that item's hard gate:

| Field | Type | Example | Notes |
|---|---|---|---|
| `id` | Number, integer | `1` | Same `nextId()` scheme as students/sessions, independent counter (its own array). |
| `studentId` | Number | `16` | Foreign key into `teach_os_students`' `id`. `deleteStudent()` cascade-deletes every payment with a matching `studentId`, same pattern as sessions — there is no orphan-payment state reachable through the app's own UI. |
| `month` | String (`YYYY-MM`) | `"2026-07"` | From the `<input type="month">` in the Record Payment modal — required, `logPayment()` alerts and refuses to save without it. A payment record with `studentId`+`month` **is** the paid/due fact for that month — no separate "invoice" or "status" field, matching the sessions-as-attendance design precedent (`sailaja-os-frontier-and-method` Item 1). `isPaidForMonth(id, monthKey)` just checks whether any payment record matches both. |
| `amount` | Number, integer | `2500` | Required. Prefilled from the student's `monthlyFee` when opening the modal via "+ Record Payment", but editable per payment — a month with a partial or adjusted payment isn't forced to match the configured monthly fee. |
| `paidOn` | String (`YYYY-MM-DD`) | `"2026-07-21"` | Defaults to today's date when the modal opens; editable for backdating a payment recorded late. |

There is no `payments` field on the student record itself and no
`monthlyFee` history — changing a student's `monthlyFee` via the profile
edit form does not retroactively touch any already-recorded `amount`, by
design (a payment is a fact about what was actually paid, not a computed
function of the current fee setting).

### Lesson, exam, and quiz-question schemas (new, 2026-07-21, Phase 3(d))

Built on explicit owner request, after Item 1's core CRUD. No edit/delete
path exists for any of these three — add-and-persist only, deliberately
smaller in scope than the student/session work. `nextId()` and `esc()` are
shared with the student/session functions.

**`teach_os_lessons`** (append via `unshift`, newest first, matching the
students convention):

| Field | Type | Notes |
|---|---|---|
| `id` | Number, integer | `nextId()`, own counter (independent of students/sessions) |
| `title` | String | Required — `addLesson()` alerts and refuses to save without it |
| `curr` | String | `'a1'`\|`'cbse'`\|`'cambridge'`\|`'ibdp'` — derived from `currLabel` via `currKeyFromLabel()`, the same four-option select used by the quiz curriculum field |
| `currLabel` | String | The raw select value (`"A1/A2"`, `"CBSE"`, `"Cambridge"`, `"IBDP"`) — kept alongside `curr` so the exact display label survives without re-deriving it |
| `level` | String | Free text, optional |
| `duration` | String | One of the select's four fixed values (`"45 minutes"` etc.) |
| `objectives`, `activities`, `homework` | String | Free text, optional |

**`teach_os_exams`** (append via `push`; `renderExams()` sorts by
`examDate` ascending for display, unlike students/lessons which show
newest-first):

| Field | Type | Notes |
|---|---|---|
| `id` | Number, integer | Own counter |
| `studentValue` | String | Either a bulk sentinel (`'all-cbse'`\|`'all-cambridge'`\|`'all-ibdp'`) or a real student's `id` as a string — whichever the `#exam-student` select held at save time |
| `studentLabel` | String | Resolved display text at save time (`examStudentLabel()`): the bulk label, or the matching student's `name`. **Snapshotted, not live** — if a student is later renamed or deleted, existing exam records keep the OLD label; there's no foreign-key-style re-resolution on render. Acceptable for this feature's scope; flag if that ever needs to change. |
| `examName`, `examDate` | String | Both required — `addExam()` alerts and refuses to save without either |
| `curriculum` | String | One of the select's four fixed values |
| `prepStatus` | String | One of `"Not started"`/`"In preparation"`/`"On track / Ready"` — `prepBadgeClass()` maps to the existing `badge-needs`/`badge-working`/`badge-good` CSS classes |
| `notes` | String | Free text, optional |

**`teach_os_quiz`** (append via `push`; rendered after the 4 static
built-in quiz cards, numbered continuing from 5):

| Field | Type | Notes |
|---|---|---|
| `id` | Number, integer | Own counter |
| `curr`, `currLabel` | String | Same derivation as lessons |
| `category` | String | One of the select's five fixed values |
| `question`, `optA`, `optB`, `optC`, `optD` | String | All required — `addQuizQuestion()` alerts if the question or any option is blank |
| `correct` | String | `'A'`\|`'B'`\|`'C'`\|`'D'` — `renderQuiz()` compares each rendered option's letter against this to wire the existing `answerQuiz(el, correct)` handler (reused unchanged, not reimplemented) |

## 2. The seeding pipeline — the static HTML table IS the seed fixture

`initDatabase()` runs on DOMContentLoaded, **only when `teach_os_students`
is absent**, and builds the first-run database by scraping the 15 static
`<tr>` rows of `#students-table tbody` (5 CBSE, 4 Cambridge, 2 IBDP,
4 A1/A2). Per row it reads, via `innerText`:

| Field | Selector |
|---|---|
| name | `.student-name` (row skipped entirely if absent) |
| parent | `.student-parent` |
| currBadge | `td:nth-child(2) .badge` |
| levelBadge | `td:nth-child(3) .badge`, **falling back to `td:nth-child(3)` itself if no `.badge` child exists** (fixed 2026-07-21 — see §2.1) |
| focus | `td:nth-child(4)` |
| schedule | `td:nth-child(5)` |
| progress | `.mini-pct` |
| curr, band | `row.dataset.curr`, `row.dataset.band` — read directly, not derived (fixed 2026-07-21, see §1's `band` field entry) |

`renderStudents()` then wipes the tbody (`innerHTML = ''`) and rebuilds it
from the store. The static rows are only ever visible until that first
rerender (or if JS is disabled entirely — see §2.1).

### 2.1 Incident: the level-badge selector aborted the ENTIRE scrape (found and fixed 2026-07-21)

The four A1/A2 rows show their level as plain styled text ("Week 14"), not a
`.badge` span — `td:nth-child(3) .badge` returns `null` for those rows, and
the original code called `.innerText` on it unconditionally. That threw
partway through the `forEach`, which meant `localStorage.setItem` **never
ran and the whole 15-row scrape produced zero stored records**, not "11
records, 4 missing." This was found the moment the persistence fix first ran
for real (`sailaja-os-browser-verification`'s `verify-crud.mjs` caught it on
its very first assertion) — full writeup:
`sailaja-os-failure-archaeology` Incident 2. Fixed with a fallback to the
cell's own text when no `.badge` child exists.

**The general lesson survives the fix**: this scraper is still a DOM-shape
contract, not decoration — the fallback only covers the one column that was
actually inconsistent. Any *other* selector still going `null` (a genuinely
missing `.student-parent`, an empty `td:nth-child(4)`) still throws and still
aborts the whole scrape. Treat the tbody HTML as a **data fixture under
change control**.

### The fragility contract (remaining, after the 2026-07-21 fixes)

1. **Editing the static table edits the first-run database.** Reordering or
   inserting a `<td>` shifts every `nth-child` selector — fields land in the
   wrong properties, or seeding throws. Renaming `.student-name`,
   `.student-parent`, `.mini-pct`, or `.badge` breaks the scrape.
2. **A missing selector (other than the now-tolerant level-badge column)
   still aborts the entire seed.** Only `.student-name` and `levelBadge`
   are null-guarded. Any other row with a missing element still throws a
   TypeError out of the `forEach` — `setItem` never runs, and (since the key
   stays absent) it retries every load until fixed.
3. **Seeding is one-shot.** Once the key exists, the static rows are dead
   weight: editing them changes nothing Sailaja sees, and the HTML silently
   diverges from her real roster. Never "fix" live data by editing the table
   — use the app's own Add Student / edit flow, or
   `sailaja-os-browser-verification`'s `dump-store.mjs` for scripted seeding.
4. ~~`renderStudents` loses band data~~ **Fixed 2026-07-21** — see §1's
   `band` field entry.
5. ~~Hardcoded counts~~ **Fixed 2026-07-21** — the filter buttons' labels,
   nav badge, dashboard stat cards, and page subtitles all now read live
   from the store via `renderLiveCounts()`, called on load and after every
   add/edit/delete. `sailaja-os-frontier-and-method` Item 5, "Live counts."
6. **No JSON error handling (unchanged).** `renderStudents` does a bare
   `JSON.parse(localStorage.getItem(DB_KEY)) || []` — a *missing* key is
   fine, but a *corrupted* value throws uncaught and the table renders
   empty. Never hand-edit the stored JSON into an invalid state on a machine
   with real data.
7. ~~Unescaped render~~ **Fixed 2026-07-21** — see §1's `name` field entry
   (`esc()` now runs on every interpolated field in `renderStudents()` and
   `renderViewStudentSessions()`).

## 3. How to inspect the store

DevTools path: **DevTools → Application tab → Storage → Local Storage →
your origin** (e.g. `http://localhost:8000`). Keys appear only after first
write.

Console one-liners, with expected output in both worlds:

```js
// The roster (raw)
localStorage.getItem('teach_os_students')
// First load on a fresh profile: '[{"id":1,"name":"Aarav T.",...}]' (15 scraped records)

// Count records safely
JSON.parse(localStorage.getItem('teach_os_students') || '[]').length
// First run: 15 (grows/changes with real use)

// Sessions (new key)
JSON.parse(localStorage.getItem('teach_os_sessions') || '[]').length
// 0 until the first "Save Session"

// Is the database layer alive? (should be 'function' — if 'undefined', the
// persistence layer has regressed; see sailaja-os-failure-archaeology
// Incident 1 before assuming you know why)
typeof addNewStudent

// Dark-mode preference (live, unaffected by this fix)
localStorage.getItem('sailaja-dark')
// null until first toggle, then '1' (dark) or '0' (light)
```

If `typeof addNewStudent` is `'undefined'`, do not waste time debugging the
store — the persistence layer isn't executing at all (check for a
regressed `<script type="text/babel">` block first).

## 4. Migration discipline

**Current state, stated honestly: NO versioning exists.** There is no
schema-version field, no migration hook, and no migration has ever been
written in this repo. The bare-array shape in §1 (now including `curr` and
`band`) is the implicit v1. **The 2026-07-21 fix did not need a migration**
because `teach_os_students` had never been written before it — there was no
old-shape data to migrate away from (`sailaja-os-daily-use-campaign` Phase
1's reasoning). That is the *last* free pass this repo gets: from here on,
`teach_os_students` and `teach_os_sessions` can hold Sailaja's real data, and
the very next field-shape change is the first one this discipline actually
has to earn its keep on.

The following is the **CANDIDATE discipline — not yet exercised for real**
(no migration has actually been written yet; adopt it at the next schema
change):

1. **Read–migrate–write on load.** Add a migration step in the
   DOMContentLoaded handler (line 1981), between `initDatabase()` and
   `renderStudents()`: parse the stored array, detect old shapes by a
   **sentinel** (e.g. `records.length && records[0].band === undefined`),
   transform in place, write back. Never key off anything but the data's own
   shape — there are no app version numbers. Prove **idempotency**: running
   the migration twice on the same blob must be a no-op.
2. **Additive-first.** Prefer adding fields with tolerant readers
   (`s.band || 'primary'`-style defaults in `renderStudents`) over
   restructuring. A brand-new field on records needs either a migration to
   backfill old records or a defaulting reader — old records will simply
   lack it.
3. **Never rename `teach_os_students` without copying.** Rename = read old
   key → write new key → verify in a real browser → only then (and only
   with owner sign-off) remove the old key. Never `removeItem` as step one.
4. **Removing or renaming any field, or either key, requires explicit owner
   sign-off** — house rule, gated by `sailaja-os-change-control`.
5. **Every migration ships with a real-browser before/after proof**: seed
   the OLD shape (snippet in §6), load, assert the migrated in-memory and
   re-serialized shapes, and assert the UI renders the migrated values.
   Mechanics and proof recipes → `sailaja-os-browser-verification`. Test the
   three paths: old-shape data, current-shape data (no-op), and absent key
   (fresh-seed path).
6. **Every migration ships with a backup step** for the owner's machine —
   copy the raw JSON out before the new code runs. Backup mechanics: use the
   in-app "Backup & Restore" page's Download Backup button (`exportData()`
   in `index.html`, Item 4, DONE 2026-07-21) — no DevTools console ritual
   needed anymore.
7. If the array ever gains a wrapper (e.g. `{v: 2, students: [...]}`), audit
   every touch point in §1's table first: `initDatabase`'s
   `!localStorage.getItem(DB_KEY)` guard still works, but both
   `JSON.parse(...) || []` sites assume a bare array.

## 5. Field-change checklist

**Adding a field** (e.g. a hypothetical `attendanceStatus`) — update ALL of,
in one change:

1. `addNewStudent()`'s object literal — plus `saveStudentEdit()`'s merge, and
   a form input in `modal-add-student`/the view-student modal if user-entered.
2. `renderStudents()` — render it, with a tolerant default for pre-existing
   records that lack it.
3. `initDatabase()`'s scrape — derive it from the static rows, or old
   fixtures won't carry it.
4. The canonical seed JSON in §6 of this skill, and the field table in §1.
5. Verify in a real browser on both paths: fresh seed (key absent) and
   existing store (inject §6 seed *without* the new field, confirm no
   crash and sensible default) → `sailaja-os-browser-verification`. Run
   `verify-crud.mjs` too — a new field must not break the add/edit/delete
   flow it exercises.

**Removing or renaming a field or key**: owner sign-off first
(`sailaja-os-change-control`), then a copy-preserving migration per §4 —
never a silent drop. Unknown fields already present in stored records must
be preserved, not stripped.

## 6. Canonical minimal seed + injection

Three records, valid against the live §1 schema (integer ids, `curr`/`band`
present), exercising: all three curriculum branches (CBSE with a
grade-derived band / Cambridge with a select-derived band / A1 fall-through),
the `"Parent: "` prefix quirk, the `'A1/A2'` split quirk, and the `'0%'`
new-student default. One session record for the first student exercises
`teach_os_sessions`.

```json
{
  "teach_os_students": [
    {"id": 1, "name": "Test Aarav", "parent": "Parent: Mrs. T · 98765XXXXX", "currBadge": "CBSE", "curr": "cbse", "band": "primary", "levelBadge": "Grade 4", "focus": "French basics · grammar", "schedule": "Tue · 4:00 PM", "progress": "55%"},
    {"id": 2, "name": "Test Meera", "parent": "Mrs. M — 91234XXXXX", "currBadge": "Cambridge", "curr": "cambridge", "band": "secondary", "levelBadge": "Grade 9", "focus": "IGCSE prep", "schedule": "Thu · 5:00 PM", "progress": "40%"},
    {"id": 3, "name": "Test Zara", "parent": "Parent Info N/A", "currBadge": "A1/A2", "curr": "a1", "band": "a1", "levelBadge": "A1 Week 3", "focus": "General", "schedule": "Sat · 10:00 AM", "progress": "0%"}
  ],
  "teach_os_sessions": [
    {"id": 1, "studentId": 1, "date": "2026-07-20", "topic": "Passé composé", "performance": "Good — on track", "homework": "", "notes": "", "parentUpdate": "No — routine class"}
  ]
}
```

Inject (browser console, or `page.addInitScript` before `goto` in
Playwright — full test mechanics → `sailaja-os-browser-verification`):

```js
localStorage.setItem('teach_os_students', JSON.stringify([
  {"id": 1, "name": "Test Aarav", "parent": "Parent: Mrs. T · 98765XXXXX", "currBadge": "CBSE", "curr": "cbse", "band": "primary", "levelBadge": "Grade 4", "focus": "French basics · grammar", "schedule": "Tue · 4:00 PM", "progress": "55%"},
  {"id": 2, "name": "Test Meera", "parent": "Mrs. M — 91234XXXXX", "currBadge": "Cambridge", "curr": "cambridge", "band": "secondary", "levelBadge": "Grade 9", "focus": "IGCSE prep", "schedule": "Thu · 5:00 PM", "progress": "40%"},
  {"id": 3, "name": "Test Zara", "parent": "Parent Info N/A", "currBadge": "A1/A2", "curr": "a1", "band": "a1", "levelBadge": "A1 Week 3", "focus": "General", "schedule": "Sat · 10:00 AM", "progress": "0%"}
]));
localStorage.setItem('teach_os_sessions', JSON.stringify([
  {"id": 1, "studentId": 1, "date": "2026-07-20", "topic": "Passé composé", "performance": "Good — on track", "homework": "", "notes": "", "parentUpdate": "No — routine class"}
]));
location.reload();
```

Reset to a virgin first-run state:

```js
localStorage.removeItem('teach_os_students');
localStorage.removeItem('teach_os_sessions');
location.reload();
```

After injection + reload the table shows exactly the 3 seeded rows
(injection suppresses the DOM scrape, since the key already exists); after
reset + reload, `initDatabase` re-seeds the 15 static rows and
`teach_os_sessions` stays absent until a session is logged. Use the seed
both ways: as fixture data for UI tests and as the "existing store" input
for migration proofs (§4.5) once a migration is actually written.

## When NOT to use this skill

- Playwright/server mechanics for injecting or asserting during tests →
  `sailaja-os-browser-verification` (this skill owns the *schema and
  content* of seeds; that one owns the injection *mechanics*).
- "Data disappeared" / table blank / live triage right now →
  `sailaja-os-debugging-playbook`.
- The plan and phasing behind this fix, and remaining daily-use-campaign
  work (further UI polish, offline-completeness, backup) →
  `sailaja-os-daily-use-campaign`.
- Whether a change may commit, and what needs owner sign-off →
  `sailaja-os-change-control`.

## Provenance and maintenance

Schema originally cataloged 2026-07-20 against HEAD `9fef6e5` while the
persistence layer was still dead; updated 2026-07-21 after the
daily-use-campaign Phase 1-3 fix landed (working-tree change at time of
writing — verify it's been committed before trusting "LIVE" claims blindly).
Every "live" fact above (§0, §1's `curr`/`band`/integer-`id` fields, §2.1's
incident) was verified in a headless browser via
`sailaja-os-browser-verification`'s `verify-crud.mjs` (25/25 PASS) the same
day. Re-verify with (run from repo root):

- Persistence layer alive: `PW_PATH=<...> node .claude/skills/sailaja-os-browser-verification/scripts/verify-crud.mjs` — expect `25/25 PASS`.
- Every localStorage touch point: `grep -n "localStorage" index.html tweaks-panel.js`
- The whole database + session layer: `grep -n "DB_KEY\|SESSIONS_KEY" index.html` then read outward from there.
- No dead script remains: `grep -n "text/babel" index.html` (expect only comment references to the historical incident, no live `<script type="text/babel">` tag).
- Static fixture rows: `awk '/<tbody>/,/<\/tbody>/' index.html | grep -c "student-name"` (currently 15).
- Level-badge fallback still present (§2.1's fix): `grep -n "levelEl = row.querySelector" index.html`.
- Add-student/view-student form ids: `grep -n "new-student-\|vs-\|session-" index.html`.
- Dark-mode key: `grep -n "sailaja-dark" index.html`.

If any grep result or verify-script output contradicts this file, the CODE
(and the browser) wins — update this skill.
