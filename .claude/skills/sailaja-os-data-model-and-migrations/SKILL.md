---
name: sailaja-os-data-model-and-migrations
description: >
  Complete catalog of the Sailaja Teaching OS's persisted data model (the
  'teach_os_students' localStorage store and the 'sailaja-dark' preference)
  and the migration discipline that will protect Sailaja's real student
  roster once the store goes live. Load this skill when: adding, renaming,
  or removing ANY field on a student record; touching initDatabase(),
  renderStudents(), or addNewStudent(); reading or writing either
  localStorage key; writing or reviewing a data migration; authoring seed
  data or test fixtures for the students table; or interpreting the
  contents of 'teach_os_students'. Also covers the DOM-scrape seeding
  pipeline (the static HTML table IS the seed fixture) and a canonical
  minimal seed JSON for browser tests.
---

# Sailaja OS Data Model and Migrations

All dynamic user data for this app is designed to live in **one localStorage
key**: `teach_os_students`, managed by three functions (`initDatabase`,
`renderStudents`, `addNewStudent`) in `index.html`. There is no server, no
IndexedDB, no build step, no export button. Once real data exists, that key
holds Sailaja's actual student roster and is **irreplaceable** — the owner's
house rule (adopted verbatim from Family Finance OS, 2026-07-20) applies:
**never ship anything that can wipe or corrupt the store; schema changes need
migrations once data is live; removing or renaming keys/fields needs explicit
owner sign-off.**

## 0. Read this first: the store is DESIGNED BUT NOT LIVE (2026-07-20)

The entire database layer sits inside `<script type="text/babel">` at
`index.html:1789` — and **no Babel is loaded anywhere in the page** (React
18.3.1 UMD and `tweaks-panel.js` are the only scripts; `grep -ci babel`
matches nothing but the `type` attribute). Browsers skip script tags with
unknown types, so **the block never executes**. Verified in a real browser
with Playwright on 2026-07-20: `typeof addNewStudent === 'undefined'`, and
`teach_os_students` is never created. The "Add Student" button
(`index.html:1477`) throws on click. HEAD's commit message ("dynamic
localStorage") oversells; the code is present but dead.

Consequences for you:

- The schema below is the **designed contract**, not yet live behavior. Say
  so in anything you write about it.
- The resurrection fix is a campaign item → `sailaja-os-daily-use-campaign`.
  The moment it ships, Sailaja's real roster starts accumulating in this key
  and every rule in §4 applies with full force. Design as if data is live.
- The `sailaja-dark` key, by contrast, is **live today** — it is written from
  the plain `<script>` block (line 1593 onward), which does execute.

All line numbers below are **as of 2026-07-20** (index.html = 1987 lines,
HEAD 9fef6e5). Re-verify with the commands in "Provenance and maintenance"
before trusting them.

## 1. Complete catalog of persisted state

Two localStorage keys. Nothing else persists (`grep -n localStorage
index.html` → lines 1682, 1686, 1885, 1903, 1910, 1966, 1968 only;
`tweaks-panel.js` and `tweaks-panel.jsx` contain no localStorage calls).
localStorage is **per-origin**: `http://localhost:8000` and
`http://localhost:8001` are different stores — a port change makes the app
"forget" everything (triage for that → `sailaja-os-debugging-playbook`).

| Key | Status | Value | Written by | Read by |
|---|---|---|---|---|
| `teach_os_students` | designed, NOT live | JSON array of student records (schema below) | `initDatabase()` (1903), `addNewStudent()` (1968) | `renderStudents()` (1910), `addNewStudent()` (1966) |
| `sailaja-dark` | **LIVE** | string `'1'` or `'0'` | `toggleDark()` (1682) | restore IIFE (1686), runs before DOMContentLoaded |

`DB_KEY = 'teach_os_students'` is declared at `index.html:1882`. Use the
constant, never a fresh string literal, in any new code inside that block.

### Student record schema

One record per student, newest first (`addNewStudent` uses `unshift`,
line 1967). Exact shape, cross-checked against both writers
(`initDatabase` 1884–1905, `addNewStudent` 1944–1979) and the reader
(`renderStudents` 1907–1942):

| Field | Type | Example | Quirks you must know |
|---|---|---|---|
| `id` | Number | `1752999000000` or `1752999000000.4271` | **Inconsistent generation**: `addNewStudent` uses `Date.now()` (integer, line 1956); `initDatabase` uses `Date.now() + Math.random()` (non-integer float, line 1901). Both serialize as JSON *numbers*, not strings — seeded ids are floats like `1752999000000.4271`. All 15 seeded records get the same `Date.now()` millisecond; uniqueness rests entirely on `Math.random()`. **Nothing reads `id` today** — no edit/delete path exists — but any future lookup must not assume integer ids. |
| `name` | String | `"Aarav T."` | Rendered unescaped into innerHTML (line 1932) — XSS-shaped; sanitize before ever rendering untrusted input. |
| `parent` | String | `"Parent: Mrs. T · 98765XXXXX"` or `"Mrs. Sharma — 98765XXXXX"` | **Prefix inconsistency**: seeded records include the literal `"Parent: "` prefix (innerText of `.student-parent` is scraped verbatim); hand-added records store the raw form input without it (placeholder `"e.g. Mrs. Sharma — 98765XXXXX"`, line 1473). Default `'Parent Info N/A'` when left blank (line 1952). `renderStudents` displays it verbatim either way. |
| `currBadge` | String | `"CBSE"`, `"Cambridge"`, `"IBDP"`, `"A1/A2"` | `addNewStudent` stores `curr.split(' ')[0]` (line 1959) of the select value (line 1463): `"Cambridge Primary (Gr 3–5)"` → `"Cambridge"`, `"IBDP SL"` → `"IBDP"`, `"A1/A2 Language Tuition"` → `"A1/A2"` (note: NOT `"A1"`). `renderStudents` lowercases it and matches substrings `cbse`/`cambridge`/`ibdp` to pick badge + progress colors; everything else falls through to the A1 styling (lines 1917–1922). |
| `levelBadge` | String | `"Grade 4"`, `"A1 Week 3"` | Free text; default `'Grade N/A'` (line 1949). |
| `focus` | String | `"Board exam prep"` | Free text; default `'General'` (line 1953). |
| `schedule` | String | `"Tue · 4:00 PM"` | `addNewStudent` builds `day.substring(0,3) + ' · ' + time` (line 1962). The time input's placeholder invites `"4:30 PM · 60 min"`, so live values may carry a duration suffix. Display-only — nothing parses it. |
| `progress` | String | `"55%"`, `"0%"` | **A string, not a number.** `renderStudents` does `parseInt(s.progress) || 0` (line 1924). New students get `'0%'` (line 1963). No write path ever updates it after creation — the "Log" button only opens a modal. |

There is no schema-version field, no wrapper object, no metadata — the
stored value is a bare JSON array of the records above. That is the whole
database. The other 11 pages (12 `page-*` sections total; only
`page-students` has any dynamic-data design) and the other 5 modals
(`modal-add-session`, `modal-view-student`, `modal-add-lesson`,
`modal-add-quiz`, `modal-add-exam`) persist **nothing** — their forms are
props.

## 2. The seeding pipeline — the static HTML table IS the seed fixture

`initDatabase()` (lines 1884–1905) runs on DOMContentLoaded (line 1982),
**only when `teach_os_students` is absent**, and builds the first-run
database by scraping the 15 static `<tr>` rows of `#students-table tbody`
(lines 737–863: 5 CBSE, 4 Cambridge, 2 IBDP, 4 A1/A2). Per row it reads,
via `innerText`:

| Field | Selector (exact, line 1891–1899) |
|---|---|
| name | `.student-name` (row skipped entirely if absent) |
| parent | `.student-parent` |
| currBadge | `td:nth-child(2) .badge` |
| levelBadge | `td:nth-child(3) .badge` |
| focus | `td:nth-child(4)` |
| schedule | `td:nth-child(5)` |
| progress | `.mini-pct` |

`renderStudents()` then wipes the tbody (`innerHTML = ''`) and rebuilds it
from the store. The static rows are only ever visible until that first
rerender.

### The fragility contract (all consequences of the design above)

1. **Editing the static table edits the first-run database.** Reordering or
   inserting a `<td>` shifts every `nth-child` selector — fields land in the
   wrong properties, or seeding throws. Renaming `.student-name`,
   `.student-parent`, `.mini-pct`, or `.badge` breaks the scrape. Treat the
   tbody HTML (lines 736–864) as a **data fixture under change control**,
   not decoration.
2. **One missing selector aborts the entire seed.** Only `.student-name` is
   null-guarded (line 1892). A row with a name but any other missing element
   throws a TypeError out of the `forEach`, `setItem` never runs, and
   `renderStudents` never gets called that load. (It will retry next load,
   since the key is still absent.)
3. **Seeding is one-shot.** Once the key exists, the static rows are dead
   weight: editing them changes nothing Sailaja sees, and the HTML silently
   diverges from her real roster. Never "fix" live data by editing the table.
4. **`renderStudents` loses band data.** Static rows carry correct
   `data-curr` and `data-band` attributes used by `filterStudents()`
   (lines 1649–1661); the dynamic render reconstructs `data-curr` from
   `currBadge` but **hardcodes `data-band="primary"`** (line 1928). After
   the store goes live, the Gr 3–5 filter shows everyone and Gr 6–8/9–10/
   11–12 show no one. Known open defect — fixing it properly means adding a
   band field to the record (see §5 checklist).
5. **Hardcoded counts.** The filter buttons' labels (lines 711–719, e.g.
   "All (14)" — which already disagrees with the 15 actual rows) never
   update from the store.
6. **No JSON error handling.** `renderStudents` does a bare
   `JSON.parse(localStorage.getItem(DB_KEY)) || []` — a *missing* key is
   fine (`JSON.parse(null)` → `null` → `[]`), but a *corrupted* value throws
   uncaught and the table renders empty. Never hand-edit the stored JSON
   into an invalid state on a machine with real data.
7. **Unescaped render.** Every field is interpolated raw into `innerHTML`
   (lines 1931–1939). A student name containing `<` or quotes breaks the
   row at best. Any hardening of this must not alter stored data.

## 3. How to inspect the store

DevTools path: **DevTools → Application tab → Storage → Local Storage →
your origin** (e.g. `http://localhost:8000`). Keys appear only after first
write.

Console one-liners, with expected output in both worlds:

```js
// The roster (raw)
localStorage.getItem('teach_os_students')
// TODAY (script dead):      null  — the key is never created
// POST-FIX, first load:     '[{"id":175...,"name":"Aarav T.",...}]'  (15 scraped records)

// Count records safely
JSON.parse(localStorage.getItem('teach_os_students') || '[]').length
// TODAY: 0        POST-FIX first run: 15 (grows/changes with real use)

// Is the database layer even alive?
typeof addNewStudent
// TODAY: 'undefined'        POST-FIX: 'function'

// Dark-mode preference (live today)
localStorage.getItem('sailaja-dark')
// null until first toggle, then '1' (dark) or '0' (light)
```

If `typeof addNewStudent` is `'undefined'`, do not waste time debugging the
store — the script block is not executing (§0).

## 4. Migration discipline

**Current state, stated honestly: NO versioning exists.** There is no
schema-version field, no `load()`-style migration hook, and no migration has
ever been written in this repo. The bare-array shape in §1 is the implicit
v1. That is acceptable *only* while the store is dead.

The following is the **CANDIDATE discipline — not yet adopted** (no code
implements it; adopt it with the first schema change after data goes live):

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
   copy the raw JSON out before the new code runs. Backup mechanics →
   `sailaja-os-env-run-deploy`.
7. If the array ever gains a wrapper (e.g. `{v: 2, students: [...]}`), audit
   every touch point in §1's table first: `initDatabase`'s
   `!localStorage.getItem(DB_KEY)` guard still works, but both
   `JSON.parse(...) || []` sites assume a bare array.

## 5. Field-change checklist

**Adding a field** (e.g. `band`) — update ALL of, in one change:

1. `addNewStudent()` object literal (line 1955) — plus a form input in
   `modal-add-student` (lines ~1459–1477) if user-entered.
2. `renderStudents()` (line 1907) — render it, with a tolerant default for
   pre-existing records that lack it.
3. `initDatabase()` scrape (line 1890) — derive it from the static rows
   (for `band`: `row.dataset.band`), or old fixtures won't carry it.
4. The canonical seed JSON in §6 of this skill, and the field table in §1.
5. Verify in a real browser on both paths: fresh seed (key absent) and
   existing store (inject §6 seed *without* the new field, confirm no
   crash and sensible default) → `sailaja-os-browser-verification`.

**Removing or renaming a field or key**: owner sign-off first
(`sailaja-os-change-control`), then a copy-preserving migration per §4 —
never a silent drop. Unknown fields already present in stored records must
be preserved, not stripped.

## 6. Canonical minimal seed + injection

Three records, valid against §1, exercising: integer id (manual-add style),
float id (scrape style), all three badge-mapping branches
(CBSE / Cambridge / fall-through A1), the `"Parent: "` prefix quirk, the
`'A1/A2'` split quirk, and the `'0%'` new-student default.

```json
[
  {"id": 1752999000000, "name": "Test Aarav", "parent": "Parent: Mrs. T · 98765XXXXX", "currBadge": "CBSE", "levelBadge": "Grade 4", "focus": "French basics · grammar", "schedule": "Tue · 4:00 PM", "progress": "55%"},
  {"id": 1752999000000.4271, "name": "Test Meera", "parent": "Mrs. M — 91234XXXXX", "currBadge": "Cambridge", "levelBadge": "Grade 7", "focus": "IGCSE prep", "schedule": "Thu · 5:00 PM", "progress": "40%"},
  {"id": 1752999000001, "name": "Test Zara", "parent": "Parent Info N/A", "currBadge": "A1/A2", "levelBadge": "A1 Week 3", "focus": "General", "schedule": "Sat · 10:00 AM", "progress": "0%"}
]
```

Inject (browser console, or `page.addInitScript` before `goto` in
Playwright — full test mechanics → `sailaja-os-browser-verification`):

```js
localStorage.setItem('teach_os_students', JSON.stringify([
  {"id": 1752999000000, "name": "Test Aarav", "parent": "Parent: Mrs. T · 98765XXXXX", "currBadge": "CBSE", "levelBadge": "Grade 4", "focus": "French basics · grammar", "schedule": "Tue · 4:00 PM", "progress": "55%"},
  {"id": 1752999000000.4271, "name": "Test Meera", "parent": "Mrs. M — 91234XXXXX", "currBadge": "Cambridge", "levelBadge": "Grade 7", "focus": "IGCSE prep", "schedule": "Thu · 5:00 PM", "progress": "40%"},
  {"id": 1752999000001, "name": "Test Zara", "parent": "Parent Info N/A", "currBadge": "A1/A2", "levelBadge": "A1 Week 3", "focus": "General", "schedule": "Sat · 10:00 AM", "progress": "0%"}
]));
location.reload();
```

Reset to a virgin first-run state:

```js
localStorage.removeItem('teach_os_students');
location.reload();
```

Expected behavior TODAY (dead script): injection and reset are inert — the
static 15-row table renders regardless, because `renderStudents` never runs.
Expected POST-FIX: after injection + reload the table shows exactly the 3
seeded rows (injection also suppresses the DOM scrape, since the key
exists); after reset + reload, `initDatabase` re-seeds the 15 static rows.
Use the seed both ways: as fixture data for UI tests and as the "existing
store" input for migration proofs (§4.5).

## When NOT to use this skill

- Playwright/server mechanics for injecting or asserting during tests →
  `sailaja-os-browser-verification` (this skill owns the *schema and
  content* of seeds; that one owns the injection *mechanics*).
- "Data disappeared" / table blank / live triage right now →
  `sailaja-os-debugging-playbook`.
- Shipping the fix that resurrects the dead script block →
  `sailaja-os-daily-use-campaign`.
- Whether a change may commit, and what needs owner sign-off →
  `sailaja-os-change-control`.

## Provenance and maintenance

All facts verified 2026-07-20 against the working tree at HEAD 9fef6e5
(index.html = 1987 lines) by reading the code; dead-script status verified
both structurally (no Babel loader) and in a headless browser (Playwright:
`typeof addNewStudent === 'undefined'`, key never created). Re-verify with
(run from repo root):

- Every localStorage touch point: `grep -n "localStorage" index.html tweaks-panel.js tweaks-panel.jsx`
- The whole database layer: `sed -n '1881,1985p' index.html`
- Dead-script check: `grep -n "text/babel\|babel" index.html` (a Babel `<script src>` appearing means §0 is obsolete — rewrite it)
- Seed selectors and record shape: `sed -n '1884,1905p' index.html`
- Static fixture rows: `awk '/<tbody>/,/<\/tbody>/' index.html | grep -c "student-name"` (currently 15)
- Band-loss defect: `grep -n "data-band" index.html` (line 1928 hardcodes `'primary'`)
- Add-student form ids and select values: `grep -n "new-student-" index.html`
- Dark-mode key: `grep -n "sailaja-dark" index.html`

If any grep result contradicts this file, the CODE wins — update this skill.
