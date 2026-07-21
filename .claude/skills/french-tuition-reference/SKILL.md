---
name: french-tuition-reference
description: >-
  French-tuition domain theory as it appears in the Sailaja Teaching OS
  (index.html). Load when touching quiz, lesson, exam, schedule, or parent-comms
  content; when interpreting currBadge, levelBadge, data-curr, data-band, the
  WORDS array, or any CEFR label; when authoring or editing any French text in
  the app (accents, apostrophe escaping, gender labels, typography); or for any
  task mentioning CEFR, A1–C2, DELF/DALF, CBSE French, Cambridge / IGCSE /
  Checkpoint French, IBDP / IB French B, SL/HL, Paper 1/2, IO, Alliance
  Française, passé composé, conjugaison, or vocabulaire. Explains what the
  domain terms MEAN here; the mechanics of adding content →
  sailaja-os-content-authoring.
---

# French Tuition Reference (as used in Sailaja's Teaching OS)

Domain-theory pack for engineers (and Sonnet-class models) who know HTML/JS
but have **no French and no Indian/international-schooling background**. The
app is one file, `index.html` (1987 lines): a dashboard for one solo French
teacher in Hyderabad teaching 14 students across four tracks. Every claim
below is tied to what the app actually shows. Line numbers verified
2026-07-20; they drift — navigate by the greps in §8 when in doubt.

**Two markers used throughout:**
- **[APP]** = verified content/behavior of `index.html` (ground truth: the file, cited `index.html:NNN`).
- **[DOMAIN]** = standard, uncontroversial domain knowledge (CEFR, exam boards). Where the app diverges from the real-world system, the divergence is called out honestly — the app's own content stays the ground truth for UI work.

**When NOT to use this skill:** mechanically adding a quiz/lesson/student row
(the HOW: markup patterns, where to insert) → `sailaja-os-content-authoring`
(this skill owns the WHAT-IT-MEANS). Schema/fields of the localStorage student
records → `sailaja-os-data-model-and-migrations`. App structure, no-build
constraints → `sailaja-os-architecture-contract`. Any change still passes
`sailaja-os-change-control` gates before commit, including the two house
rules: **never endanger saved student data** (localStorage key
`teach_os_students`, `index.html:1882` — real parent names and phone numbers
live there once the teacher edits) and **verify in a real browser** before
shipping, not by reading the diff.

---

## 1. CEFR levels — the A1…C2 axis

**[DOMAIN]** CEFR = Common European Framework of Reference for Languages, the
standard six-level scale of language proficiency. It measures *how well a
person speaks*, not *which school board they study under*.

| Level | One-line meaning [DOMAIN] | In this app [APP] |
|---|---|---|
| **A1** | Beginner: basic phrases, introduce yourself | Main tuition track: 4 "A1/A2" students (`index.html:836-871`), `badge-a1`, 7 WORDS entries |
| **A2** | Elementary: routine everyday exchanges | "A1→A2" student Meera S. (`index.html:856`), "A2 Bridge" module (`index.html:904`), 9 WORDS entries |
| **B1** | Intermediate: handle travel, express opinions simply | The teacher's own certification ("B1 Certified · Alliance Française", `index.html:478`); 8 WORDS entries |
| **B2** | Upper-intermediate: fluent-ish interaction, complex text | 5 WORDS entries only — no student is labeled B2 |
| **C1** | Advanced: flexible, effective language for academic use | 1 WORDS entry (`nuancer`, `index.html:1748`) |
| **C2** | Mastery: near-native precision | **Not covered.** Appears only inside the "TV5Monde … Free videos A1–C2" resource blurb (`index.html:1433`) |

**Where the app uses CEFR labels [APP]:**
- **Word-of-the-day**: each `WORDS` entry has a `level` field
  (`index.html:1718-1749`) rendered into the `#wotd-level` pill
  (`index.html:537`, `renderWord` at `index.html:1753-1760`). Distribution at
  HEAD: A1×7, A2×9, B1×8, B2×5, C1×1, C2×0 (30 entries total).
- **As a "curriculum"**: `A1/A2` is one of the four tracks — sidebar pill
  (`index.html:448`), nav badge (`index.html:460`), a1a2 page
  (`index.html:881-907`), `data-curr="a1"` rows, `badge-a1` CSS
  (`index.html:235`). See §7.1 for why this is a modeling quirk.
- **Student "level"**: A1-track students are tracked by *week* ("Week 14"),
  not grade (`index.html:839` etc.).

The app's teachable range is effectively **A1–A2** (the tuition track) with
word-of-day vocabulary reaching B1/B2/C1 for the teacher's own enrichment.

---

## 2. The four tracks (what "curriculum" means here)

The app's single curriculum axis has four values: **CBSE, Cambridge, IBDP,
A1/A2** (filter bar `index.html:711-715`, sidebar `index.html:447-452`).
Three are school boards; one is a CEFR-labeled private-tuition track.

### 2.1 CBSE — Indian national board [APP: page `index.html:912-986`]

**[DOMAIN]** CBSE = Central Board of Secondary Education, India's national
school board. French is an elective second/third language; the externally-set
**board exams** happen in Grade 10 and Grade 12 — that's why the app's
"secondary"/"senior" students are all "Board exam prep".

**[APP]** 5 students, Grades 4–12, in four tabs (`index.html:921-924`):
Grade 4 · Primary (Aarav T.), Grade 7 · Middle (Diya R.), Grade 9–10 · Board
(Neha P., Rohan K.), Grade 12 · Senior (Kabir S.). Named teaching materials:
"CBSE French Primer Grade 4" (`index.html:933`), "**Apprenons le Français**
Grade 7" (`index.html:948`; a real CBSE-market textbook series — the name
means "Let's learn French"), plus resources "CBSE French textbooks Gr 3–12
(Apprenons le Français series)", board past papers 2019–2024, and Gr 10+12
marking schemes (`index.html:1409-1413`). Topics on the CBSE pages are
grammar-first: tenses, negation, letter/essay composition, comprehension.

### 2.2 Cambridge — Cambridge International [APP: page `index.html:991-1021`]

**[DOMAIN]** Cambridge International (CAIE) stages: **Primary** (≈Gr 1–5) →
**Lower Secondary** (≈Gr 6–8, capped by **Checkpoint** tests) → **IGCSE**
(≈Gr 9–10, the externally-examined qualification). IGCSE French — Foreign
Language is syllabus code **0520**, assessed by four skill papers (listening,
reading, speaking, writing), targeting roughly CEFR A2–B1.

**[APP]** 4 students: Sara M. Gr 5 "Cambridge Primary French"
(`index.html:1002`), Ravi C. Gr 7 "Cambridge Lower Secondary"
(`index.html:1007`), Ananya S. Gr 8 "Checkpoint prep" (`index.html:1012`),
Layla H. "IGCSE Gr 10" — "IGCSE Papers 1/2/3/4 — Reading, Writing, Listening,
Speaking" (`index.html:1017`). Resources name "Cambridge IGCSE French (0520)"
and "Checkpoint French guide Gr 7–8" (`index.html:1417-1418`).
⚠ **[DOMAIN] divergence:** in the official 0520 syllabus the numbering is
Paper 1 Listening, Paper 2 Reading, Paper 3 Speaking, Paper 4 Writing — the
app's line, read as pairs, mismatches. The four *skills* are right; don't
propagate the app's ordering into new content that names specific paper
numbers.

### 2.3 IBDP — IB Diploma Programme [APP: page `index.html:1026-1072`]

**[DOMAIN]** IBDP = International Baccalaureate Diploma Programme, the 2-year
pre-university programme (≈Gr 11–12). French is offered as **Language B**
(for students with prior French; SL = Standard Level, HL = Higher Level) and
separately as **ab initio** (true beginners, SL only). **[APP]** The app
references only Language B — resource "IB French B guide (2023)"
(`index.html:1424`), badges "IBDP SL"/"IBDP HL", add-student options "IBDP
SL"/"IBDP HL" (`index.html:1463`). **The app does not encode ab initio.**

**[APP]** 2 students with per-component tables:
- **Ishaan M., Gr 11, SL** (`index.html:1035-1047`): Paper 1 — Writing 25%,
  Paper 2 — Reading/Listening 50%, Individual Oral (IO) 25%. Themes listed:
  "Identities · Experiences · Human ingenuity" (`index.html:1040`).
- **Zara F., Gr 12, HL** (`index.html:1048-1061`): Paper 1 25%, Paper 2 40%,
  **HL Essay (IA) 20%**, IO 15%. Literary works: *Le Petit Prince* · selected
  poems (`index.html:1053`).

**[DOMAIN] framing and divergence:** In the official Language B model (first
assessment 2020): Paper 1 = productive (writing), Paper 2 = receptive
(listening + reading), IO = internal assessment (IA), at **25/50/25 for both
SL and HL**; HL adds the study of two literary works (Le Petit Prince fits).
The app's SL table matches. The app's **HL table does not**: "HL Essay" is a
Language **A** component, not Language B, and 25/40/20/15 is not the official
weighting. Treat the HL card as the app's own bookkeeping, ground truth for
the UI — but do not cite its weights as IB fact in new content, and flag to
the owner before "correcting" it (change-control). The five official Language
B themes are Identities, Experiences, Human Ingenuity, Social Organization,
Sharing the Planet — the app lists only the first three; it does not encode
the other two.

Vocab: **IA** = Internal Assessment (teacher-marked, IB-moderated); **IO** =
Individual Oral; **SL/HL** = Standard/Higher Level.

### 2.4 A1/A2 tuition track & DELF [APP: page `index.html:881-907`]

Private conversational-French tuition outside any school board, labeled by
CEFR level and week number. Curriculum map (`index.html:901-904`): M1
*Premiers pas* (first steps: greetings, alphabet, numbers), M2 *La vie
quotidienne* (daily life: family, colours, food), M3 *En ville* (in town:
directions, transport, shopping), "A2 Bridge" (past tense, opinions, travel).

**DELF/DALF:** **[DOMAIN]** DELF = Diplôme d'études en langue française, the
official French-government proficiency diplomas at A1–B2; DALF covers C1–C2;
in India they're administered through Alliance Française centres. **[APP]**
The app mentions DELF exactly twice: the a1a2 subtitle "4 students ·
Conversational French · **DELF pathway**" (`index.html:885`) and the resource
"Alliance Française HYD — DELF exam resources" (`index.html:1436`). **DALF is
never mentioned, and no DELF sitting is actually tracked.**

### 2.5 Exams the app actually tracks [APP: `index.html:1198-1240`]

The exams table (`index.html:1208-1216`) enumerates, completely: CBSE Board
Mock (Rohan, May 15), IBDP Paper 1 Practice (Ishaan, May 18), Cambridge IGCSE
Mock (Layla, May 22), **A1 Module 1 Assessment** (Meera, May 24 — an
*internal* assessment, not DELF), IBDP HL Essay Draft Review (May 25), IBDP
Paper 2 Mock (June 3), IBDP Individual Oral Practice (June 10). Everything is
a mock/practice/internal milestone — **the app tracks no real external exam
sitting.** (All dates are static May–June 2026 demo data; the topbar date is
hardcoded "Sunday, 3 May 2026", `index.html:495`.)

---

## 3. Student bands (primary / middle / secondary / senior)

**[APP]** Bands are age/grade groupings, orthogonal to curriculum. Defined by
the filter buttons' own labels (`index.html:716-719`) and confirmed by the
grades on the rows carrying each `data-band` (`index.html:737-871`):

| Band (`data-band`) | Filter label | Grades actually present at HEAD | Badge class |
|---|---|---|---|
| `primary` | Gr 3–5 | Grade 4 (CBSE), Grade 5 (Cambridge) | `badge-primary` (`index.html:236`) |
| `middle` | Gr 6–8 | Grade 7 ×2, Grade 8 | `badge-middle` |
| `secondary` | Gr 9–10 | Grade 9, Grade 10, IGCSE Gr 10 | `badge-secondary` |
| `senior` | Gr 11–12 | Grade 12 (CBSE), Gr 11 SL + Gr 12 HL (IBDP) | `badge-senior` |
| `a1` | — (no filter) | the 4 A1/A2 students (tracked by Week, not grade) | none (level cell is plain text) |

`filterStudents(filter, btn)` (`index.html:1649-1661`) shows a row when
`filter === 'all'`, or `row.dataset.curr === filter`, or the filter is one of
the four bands in `bandMap` (`index.html:1653`) and `row.dataset.band`
matches. ⚠ `'a1'` appears as **both** a `data-curr` value (matched by the
A1/A2 filter) and a `data-band` value (in no filter — A1 students belong to
no band; there is deliberately no "Gr 3–5"-style button that finds them).

---

## 4. Glossary — every French/domain term in the UI

French terms a non-French-speaking engineer will hit in the markup/JS:

| Term [APP location] | Meaning |
|---|---|
| **Bonjour** (`index.html:1699`, comms templates, quiz 1) | "Hello / good day" — the default daytime greeting |
| **Bon après-midi** (`index.html:1700`) | "Good afternoon" |
| **Bonsoir** (`index.html:1701`) | "Good evening" |
| **Bonne nuit** (`index.html:1702-1703`) | "Good night" |
| **Mot du jour** (`index.html:526`) | "Word of the day" |
| **Suivant** (`index.html:538`) | "Next" (the next-word button) |
| **Leçon** (`index.html:601, 1262`) | "Lesson" (Leçon 7, Leçon 1) |
| **révision** (`index.html:596`) | "revision / review" (exam prep) |
| **la conjugaison** (`index.html:1742`) | conjugation — a verb's forms per person/tense (je mange, tu manges…) |
| **le vocabulaire** (`index.html:1740`) | vocabulary |
| **passé composé** (`index.html:1108, 1272-1278`) | the standard French past tense, built with an auxiliary (usually *avoir*) + past participle: *j'ai mangé* = "I ate" (correct quiz answer, `index.html:1276`) |
| **ER verbs** (`index.html:1107`) | the largest, regular verb family (infinitives ending -er: *manger*, *parler*) |
| **avoir** (`index.html:1108`) | "to have"; the main auxiliary verb for passé composé |
| **ne…pas / ne…jamais** (`index.html:616, 953`) | negation ("not" / "never") — wraps around the verb: *je ne parle pas* |
| **Salut** (`index.html:1285`) | informal "hi" — quiz distractor: **wrong** register for a formal letter |
| **Monsieur / Madame,** (`index.html:1286`) | "Sir / Madam," — the correct formal-letter opening (quiz answer) |
| **Cher professeur** (`index.html:1288`) | "Dear teacher" — distractor, too informal for the exam register |
| **Très bien** (`index.html:1645`) | "Very good" (correct-answer toast) |
| **À bientôt** (`index.html:1322`) | "See you soon" (letter sign-off) |
| **Merci / Merci beaucoup** (`index.html:1337, 1391`) | "Thank you / thanks a lot" |
| **Merci de votre compréhension** (`index.html:1378`) | "Thank you for your understanding" |
| **Bon courage** (`index.html:1352`) | "Good luck / hang in there" (exam-prep sign-off) |
| **Félicitations** (`index.html:1365`) | "Congratulations" |
| **Premiers pas** (`index.html:901`) | "First steps" (module M1) |
| **La vie quotidienne** (`index.html:902`) | "Daily life" (module M2) |
| **En ville** (`index.html:903`) | "In town" (module M3) |
| **Les couleurs / Les animaux** (`index.html:601, 938-939`) | "colours / animals" (topic titles) |
| **mon avenir** (`index.html:981`) | "my future" (essay topic) |
| **Apprenons le Français** (`index.html:948, 1410`) | "Let's learn French" — CBSE textbook series name |
| **Alliance Française** (`index.html:478, 1436`) | France's official cultural/language institute network; certifies levels, runs DELF. "HYD" = Hyderabad |
| **la francophonie** (`index.html:1732`) | the French-speaking world |
| **Le Petit Prince** (`index.html:1053, 1234, 1425`) | *The Little Prince* (Saint-Exupéry) — the HL literary text |
| **élèves** (in WORDS examples, e.g. `index.html:1730`) | "pupils/students" |
| **s'il te plaît / s'il vous plaît** (`index.html:1720, 1724`) | "please" (informal *te* / formal *vous*) |

**Grammatical labels in `WORDS[].type` [APP `index.html:1718-1749`]:**

| Label | Meaning | Convention in the data |
|---|---|---|
| `noun (m)` / `noun (f)` | masculine / feminine noun — every French noun has a grammatical gender that controls its article and agreement | The `word` field carries the matching definite article: **le** cahier (m), **la** fenêtre (f). Keep article and gender label consistent when adding entries |
| `verb` | plain verb, given as infinitive (*apprendre*) | |
| `verb (refl.)` | reflexive verb — conjugates with a self-pronoun (*se souvenir* → *tu **te** souviens*; *s'épanouir* → *elle **s'**épanouit*) | Infinitive keeps the *se/s'* |
| `adjective` | describing word; French adjectives **agree** in gender/number with their noun | Given in masculine singular (*curieux*, *bavard*) |
| `adverb` | invariable connector/modifier (*néanmoins*, *pourtant*) | |

**Greetings logic [APP `index.html:1698-1715`]:** `GREETINGS` maps the local
browser hour to a French greeting: 05–12 Bonjour, 12–18 Bon après-midi, 18–21
Bonsoir, 21–24 and 00–05 Bonne nuit (`h >= from && h < to`; fallback
Bonjour). `updateGreeting()` injects it into `#dashboard-greeting` on load
and every 60 s; the tweaks panel can swap the name (`index.html:1845-1847`).
**[DOMAIN]** nuance: in real usage *Bonjour* serves all day until evening —
*Bon après-midi* and *Bonne nuit* are normally **farewells**, not greetings.
The app's choice is deliberate UI charm; don't "fix" it without the owner,
but don't copy this pattern into student-facing teaching content as if it
were standard French.

---

## 5. Authoring French content in this codebase

Rules for anyone writing new WORDS entries, quiz questions, lesson titles, or
comms templates:

1. **Accents are mandatory, not decorative.** é è ê à ç î ô ù etc. change
   meaning (*mangé* "eaten" vs *mange* "eats"; *leçon* needs the ç). The
   existing content is consistently accented — *fenêtre, révision, Leçon,
   après-midi, Français* — including on capitals (*À bientôt*,
   `index.html:1322`). Never strip accents to "keep it ASCII"; the file is
   UTF-8.
2. **Apostrophes in JS strings must be escaped.** The `WORDS` array uses
   single-quoted strings, and French elides constantly (*j'ai, s'il, l'examen,
   aujourd'hui*), so every entry escapes: `'J\'aime apprendre le français.'`
   (`index.html:1719`). The app uses the ASCII apostrophe `'` throughout, not
   the typographic `’` — follow the file's existing convention.
3. **French typography — what the app actually does (checked honestly):**
   - **Space before `? ! : ;`** — the French convention. The `WORDS` examples
     **do** follow it, with a plain ASCII space: *«…cette leçon ?»*
     (`index.html:1723`), *«C'est difficile ; néanmoins…»* (`index.html:1722`),
     *«…aujourd'hui !»* (`index.html:1731`). But the English-context UI strings
     do **not**: `'✓ Correct! Très bien!'` (`index.html:1645`),
     `Félicitations!` (`index.html:1365`), quiz option `Salut!`
     (`index.html:1285`). House style, then: full French sentences (WORDS
     examples, dictation/reading passages) take the space; short French
     interjections embedded in English UI text don't. (Ideal French uses a
     narrow no-break space; the app uses a normal space — fine, but a normal
     space can line-wrap before the `?`.)
   - **Guillemets « »** — French quotation marks. **The app does not use
     them**: `renderWord` wraps examples in English curly quotes
     `“…”` (`index.html:1758`). Match the app unless the owner asks
     for guillemets.
4. **Gender marking:** new nouns in `WORDS` need `(m)` or `(f)` in `type`
   **and** the matching article in `word` (*le/la*, or *l'* + gender label
   when elided). Adjectives go in masculine singular.
5. **Level labels:** `level` must be one of the CEFR strings the app already
   uses (`'A1'`, `'A2'`, `'B1'`, `'B2'`, `'C1'`); it's rendered verbatim into
   the level pill. Pick the level of the *word in context*, and remember the
   audience: A1/A2 students and a B1-certified teacher — B2/C1 entries are
   teacher-enrichment, C2 is out of scope.
6. **Register matters in comms/quiz content:** templates address parents with
   formal French formulas (*Merci de votre compréhension*, vous-form); quiz
   "wrong" options are often register errors on purpose (*Salut!* in a formal
   letter). Keep distractors plausible-but-wrong, like the existing ones
   (`j'ai mangais` is a deliberate conjugation error, `index.html:1275`).
7. **Verify rendered accents in a real browser** (house rule) — mojibake from
   a bad edit (Ã©…) is exactly the class of bug a diff-read misses.

---

## 6. Domain-to-code mapping

| Domain concept | Where it lives [APP] |
|---|---|
| CEFR level of a word | `WORDS[].level` string (`index.html:1718-1749`) → `#wotd-level` pill (`index.html:537`, `renderWord` `index.html:1759`) |
| CEFR level as a track | `data-curr="a1"` rows; `badge-a1` (`index.html:235`); filter value `'a1'` (`index.html:715`); a1a2 page (`index.html:881`) |
| Curriculum (board) | `data-curr` attr: `cbse` \| `cambridge` \| `ibdp` \| `a1` (`index.html:737-871`); badge classes `badge-cbse`/`badge-cam`/`badge-ibdp`/`badge-a1` (`index.html:232-235`); theme colors `--cbse`/`--cambridge`/`--ibdp` (`index.html:32-37`); persisted as free-text `currBadge` (scraped badge text: "CBSE", "Cambridge", "IBDP", "A1", "A1→A2") in `initDatabase` (`index.html:1895`) |
| Grade/level of a student | Third table column: a band badge with grade for board students ("Grade 7", "IGCSE Gr 10", "Gr 11 · SL"), **plain text** "Week N" for A1 students (`index.html:839`); persisted as free-text `levelBadge` (`index.html:1896`) |
| Band (age group) | `data-band` attr: `primary`/`middle`/`secondary`/`senior`/`a1`; `bandMap` in `filterStudents` (`index.html:1653`); CBSE page tab ids `cbse-primary` … `cbse-senior` (`index.html:926-972`) |
| Schedule slot | Free-text string "Tue · 4:00 PM" (5th column); built by `addNewStudent` as `day.substring(0,3) + ' · ' + time` (`index.html:1962`); weekly master table (`index.html:1136-1152`) |
| Time-of-day greeting | `GREETINGS`/`getGreeting`/`updateGreeting` (`index.html:1698-1715`) |
| Exam / assessment | Static rows in exams page table (`index.html:1208-1216`); add-exam modal (`index.html:1536-1555`) is toast-only, persists nothing |
| Parent-comms formulas | Six templates `#t-reminder` … `#t-fee` (`index.html:1314-1393`), copied verbatim by `copyTemplate` (`index.html:1780`) — French salutations/sign-offs included, `[Square-bracket]` spans are fill-in blanks |
| Persisted student record | localStorage `teach_os_students` (`DB_KEY`, `index.html:1882`): `{id, name, parent, currBadge, levelBadge, focus, schedule, progress}` — all display strings, scraped from the static table on first run (`initDatabase`, `index.html:1884-1905`) |

---

## 7. What a mid-level engineer gets wrong here

1. **Conflating curriculum with CEFR level — the app does it on purpose.**
   CBSE/Cambridge/IBDP are *boards*; A1 is a *proficiency level*. The app
   flattens them onto one axis: `data-curr` ∈ {cbse, cambridge, ibdp, a1},
   and the same `currBadge` field holds "CBSE" or "A1→A2"
   (`index.html:711-715, 1895`). A CBSE Gr 7 student is *also* roughly
   A1/A2-proficient, but the app never CEFR-labels board students. When
   filtering or grouping, treat `a1` as "the private-tuition track", not "the
   proficiency A1". Don't "normalize" this axis without owner sign-off — it's
   load-bearing in filters, badges, and the localStorage records.
2. **`data-band="a1"` matches no band filter.** `bandMap` only knows the four
   grade bands (`index.html:1653`), so A1 students are invisible to Gr 3–5 /
   6–8 / 9–10 / 11–12 filters. That is current behavior, not an accident to
   silently fix.
3. **The rebuilt table degrades band and level fidelity [APP, code-read].**
   `renderStudents` (`index.html:1907-1942`) rebuilds every row from
   localStorage with `data-band` hardcoded to `'primary'`
   (`index.html:1928`) and every level badge as `badge-primary`
   (`index.html:1934`); anything whose `currBadge` isn't cbse/cambridge/ibdp
   falls through to `a1` (`index.html:1917-1922`). Band filters are therefore
   only correct against the static HTML, not the rebuilt table.
4. **`initDatabase` assumes a badge that A1 rows don't have [APP,
   code-read — verify in a browser before relying on it].** It scrapes
   `td:nth-child(3) .badge` (`index.html:1896`), but A1 rows' third cell is
   plain text (`index.html:839`), so `querySelector` returns `null` and the
   `.innerText` access throws on the first A1 row — seeding/rendering from
   localStorage cannot complete as written. Anyone touching student rows or
   the seed path must know the third-cell shape differs by track.
5. **`addNewStudent` drops SL/HL.** `currBadge = curr.split(' ')[0]`
   (`index.html:1959`) turns "IBDP SL" into "IBDP" and "Cambridge IGCSE
   (Gr 9–10)" into "Cambridge" — the SL/HL and stage distinctions survive
   only if the user retypes them in the free-text Level field.
6. **Don't cite the app's IBDP HL weights as IB fact.** The SL card matches
   the official Language B model (25/50/25); the HL card's "HL Essay (IA)
   20%" does not — HL Essay belongs to Language A (§2.3). App UI = app truth;
   IB claims in *new* teaching content should follow the official model.
7. **Don't pair IGCSE paper numbers to skills from the app's one-liner**
   (§2.2): official 0520 is P1 Listening, P2 Reading, P3 Speaking, P4
   Writing.
8. **"DELF pathway" ≠ a DELF exam in the system.** No DELF/DALF sitting
   exists anywhere in the app (§2.4-2.5); "A1 Module 1 Assessment" is
   internal.
9. **Grade ≠ level ≠ week.** Board students are tracked by school grade;
   A1/A2 students by tuition week; `levelBadge` is free text holding either.
   Never parse it as a number or assume "Grade N" format.
10. **French text is data, not chrome.** An accent or apostrophe regression
    in `WORDS`, quizzes, or templates is a *teaching-content* bug the
    teacher will copy to parents verbatim (`copyTemplate` copies raw text).
    Treat French strings with the same care as numbers in a finance app —
    and mind rule §5.2 (escaped `\'`) or the script breaks entirely.

---

## 8. Provenance and maintenance

- Written 2026-07-20 against `index.html` at HEAD (1987 lines; repo
  `sailaja-teaching-tuition-OS`, branch `main`). All `[APP]` claims verified
  by reading the file that day; §7.3–7.4 are code-read findings, not
  browser-verified. `[DOMAIN]` claims are standard CEFR/DELF/CBSE/CAIE/IB
  knowledge, deliberately kept to uncontroversial basics; exam-board syllabi
  change every few years — re-check paper structures against current official
  guides before authoring exam-specific content.
- One-line re-verification greps (run from repo root):
  - CEFR/WORDS: `grep -n "level: '" index.html` (distribution + array bounds)
  - Greetings: `grep -n "GREETINGS\|Bon après-midi" index.html`
  - Bands/filters: `grep -n "data-band\|bandMap\|filterStudents" index.html`
  - Curriculum axis: `grep -n "data-curr\|currBadge" index.html`
  - Exams tracked: `grep -n "Board Mock\|IGCSE Mock\|Module 1 Assessment" index.html`
  - DELF/IB/IGCSE claims: `grep -n "DELF\|French B\|0520\|Checkpoint" index.html`
- If any grep's shape changes (new levels, new bands, a real DELF exam row,
  a data-model rewrite of `renderStudents`), update the matching section here
  in the same commit — `sailaja-os-docs-and-commits` owns the how.
