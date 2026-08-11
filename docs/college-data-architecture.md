# College Data Infrastructure — Architecture & Ingestion Plan

Status: **foundation** (schema + ingestion pipeline). The My Colleges UI and the
matching/chancing experience are built **on top of** this and are intentionally
out of scope until the data foundation is verified.

## 1. Guiding principles

1. **The structured database is the single source of truth.** No college facts
   are hard-coded in React components and none are recalled by the AI from
   memory. Every fact the app shows or reasons over comes from a row that carries
   a source and an academic year.
2. **IPEDS `unitid` is the spine.** Every U.S. Title-IV institution has a stable
   federal `unitid`; keying on it lets federal data join cleanly and makes
   expansion "add more unitids."
3. **Three data classes are kept in separate tables** so they are never
   conflated: (1) historical/standardized statistics, (2) current
   application-cycle data, (3) provenance (source + year), attached to every
   data-bearing row.
4. **Source priority is encoded structurally, not by convention:**
   - **College Scorecard / IPEDS** → standardized numeric data (admit rate,
     SAT/ACT ranges, enrollment, location, control).
   - **Common Data Set (CDS)** → historical admissions *factors* (Section C7) and
     distributions (GPA / class rank), per academic year.
   - **Official admissions websites** → current application rounds, deadlines,
     decision-release dates, and current-cycle test policy.
   The CDS is **never** the source of truth for current rounds/deadlines — those
   live only in the current-cycle tables sourced from official sites.
5. **Never invent data.** Missing ≠ zero. A value is either `reported`,
   `not_reported` (the college does not publish it), `not_applicable`, or
   `pending` (not yet ingested). The matching system treats anything not
   `reported`+`verified` as unavailable and says so.

## 2. Data model

Postgres (Supabase). All reference tables are **public-read** (colleges are
public information): `select` is granted to `anon` + `authenticated`. **All
writes go through the service-role ingestion pipeline** — there are no client
write policies (same pattern as `feature_usage`). Raw ingestion tables are
internal (no public read).

### Identity & structure
- **`college_systems`** — groupings such as the University of California or Penn
  State. Handles **multiple campuses**: each campus is its own `colleges` row
  (own `unitid`, own stats) linked by `system_id`.
- **`colleges`** — one row per institution (per `unitid`). Core identity, links,
  location, `institution_type`, and logo reference columns.
- **`college_aliases`** — former names, abbreviations, nicknames, common
  misspellings. Powers search + name matching and disambiguates **duplicate /
  alias names** ("UPenn" vs "University of Pennsylvania" vs "Penn", distinct from
  "Penn State").
- **`college_schools`** — undergraduate sub-units that can admit separately
  (Cornell's colleges, Michigan CoE, UT-Austin by major). Stats/rounds/policies
  may reference a `school_id`, so **multiple undergraduate schools** and
  **different policies by program/school** need no special-casing.
- **`college_programs`** — majors/programs where availability or policy differs
  (`offered`, `cip_code`). Backs **intended-major availability**.

### (1) Historical / standardized statistics — keyed by academic year + source
- **`college_admission_stats`** — one row per
  `(college_id, school_id?, academic_year, source)`: applicants/admits/enrolled,
  admit & yield rates, SAT (EBRW/Math/Total 25·50·75), ACT composite 25·50·75,
  GPA average + distribution, class rank, the year's test policy, plus a
  `field_status` map (see §5) and verification columns.
- **`college_admission_factors`** — CDS Section C7: one row per
  `(college_id, academic_year, factor)` with an `importance` enum
  (`very_important` / `important` / `considered` / `not_considered`).

### (2) Current application-cycle data — keyed by cycle + official source
- **`application_cycles`** — one row per `(college_id, cycle_year)` (e.g.
  `2025-2026` = fall-2026 entry) carrying the **current `test_policy`**
  (`test_required` / `test_optional` / `test_blind` / `test_flexible`). A new row
  per cycle means **test-policy changes by cycle** are preserved as history and
  the current policy is unambiguous.
- **`application_rounds`** — one row per round actually offered:
  `round_type` ∈ `EA`, `REA`, `ED`, `ED_II`, `RD`, `ROLLING`, `PRIORITY`, with
  `deadline_date`, `decision_release_date`, and `is_binding` / `is_restrictive` /
  `is_rolling` flags. **Different deadlines per round = separate rows.** REA
  (restrictive, non-binding) vs ED (binding) vs EA (open) is expressed by the
  flags, not the label alone. A round not offered has no row (or `offered=false`).

### (3) Provenance — on every data-bearing row
`source_type` (`scorecard` / `ipeds` / `cds` / `official_site` / `manual`),
`source_url`, `source_date`, `academic_year` / `cycle_year`, and
`verified_at` / `verified_by` / `confidence` (human sign-off).

### Raw staging
- **`college_ingest_raw`** — untransformed API/CDS payloads with `fetched_at`, so
  data can be re-transformed without re-fetching and every value is traceable to
  a captured source. Internal (service-role only).

### "Unavailable vs unknown"
Value columns are nullable **plus** each data row carries `field_status (jsonb)`
mapping tracked field → `reported` / `not_reported` / `not_applicable` /
`pending`. A null SAT with `{"sat":"not_reported"}` renders as "Not reported";
`pending` means "not yet ingested." We never fabricate to fill a gap.

## 3. Edge cases → handling

| Case | Handling |
|---|---|
| Multiple undergraduate schools | `college_schools`; stats/rounds reference `school_id` |
| Different app policy by program | `college_programs` + optional `program_id`/`school_id` on rounds |
| Test policy changes by cycle | New `application_cycles` row per `cycle_year` |
| EA / REA / ED / ED II / RD / Rolling | `round_type` enum + `is_binding` / `is_restrictive` / `is_rolling` |
| Different deadlines per round | One `application_rounds` row per round |
| No CDS published | Fall back to IPEDS/Scorecard for stats; factors table stays empty; `source_type` records which source was used |
| Multiple campuses | Separate `colleges` rows sharing a `system_id` |
| Duplicate / alias names | `college_aliases` + unique `slug` / `ipeds_unitid` as the real key |

## 4. Sources

| Source | Provides | Automation |
|---|---|---|
| **College Scorecard API** (api.data.gov) | admit rate, SAT/ACT mid-ranges, enrollment, location, control | **Full** (machine-readable JSON) |
| **IPEDS** (NCES) | admissions + enrollment for *every* institution; CDS fallback | Full |
| **Common Data Set** | C7 factors, GPA/rank distributions, per-year test policy | **Semi** (per-institution PDFs; parse or manual) |
| **Official admissions sites** | current rounds, deadlines, decision dates, current test policy | **Manual / scraper + required human verification** |

## 5. Ingestion & update architecture

A pipeline that runs **outside app runtime** (`scripts/college-ingest/`):

1. **Fetch → `college_ingest_raw`** — store the raw payload + `fetched_at`.
2. **Normalize → typed tables** via idempotent upserts keyed by
   `(unitid, academic_year, source)`. Historical rows are **append-only per
   year** (never overwrite a prior year); current-cycle rows update in place with
   a bumped `source_date`.
3. **Verify → human sign-off** sets `verified_at` / `verified_by`. Current rounds
   /deadlines and CDS factors **require** verification before the app treats them
   as authoritative; federal numeric data may auto-publish at lower `confidence`.

**Secrets:** the Scorecard key is read from `COLLEGE_SCORECARD_API_KEY` (env /
local secret) — never hard-coded or committed. Live DB writes require
`SUPABASE_SERVICE_ROLE_KEY`; the ingester refuses to write with the public
`DEMO_KEY`.

**Cadence:** Scorecard/IPEDS annually; CDS each fall; official rounds/deadlines
each cycle (spring–summer) — the high-touch part.

## 6. Initial dataset (V1)

**~50 colleges**, chosen to (a) prove the whole pipeline end-to-end and (b) hit
every edge case with a small set: the Ivies + T20 national universities (complex
EA/REA/ED/ED II rounds), ~10 top liberal-arts colleges, high-volume public
flagships (UC → **test-blind** + system modeling; UT-Austin → **by-major**
admission; a couple of **rolling**-admission publics), and several
mid/less-selective schools so chancing can produce "target/likely," not only
"reach." Seeded by **name + state**; the ingester resolves the `unitid` via
Scorecard and logs matches for human verification (we do not hard-code
possibly-wrong unitids).

## 7. Expansion without architecture change

Because the schema is keyed on `unitid` + source and the app reads generic
tables, **adding colleges = running the ingest pipeline for more unitids** — no
schema or app changes. Schema is touched only for a genuinely new *shape* (e.g. a
new round type), which the enums / `schools` / `programs` tables already absorb.

## 8. Logos

- **Real official logos where they can be reliably sourced and verified, with a
  generated monogram fallback. The UI never depends on hotlinked logos.**
- **Self-hosted** in a Supabase Storage bucket (`college-logos`). The DB stores a
  reference only: `logo_asset_path` (bucket path) + `logo_source_url` +
  `logo_license` + `logo_variant` (`official` | `monogram`).
- Logos are **trademarks**; nominative use for identification is generally fine,
  but licensing/quality is **verified manually per logo**. Where a logo can't be
  safely sourced, the fallback is a generated monogram (initials on the school's
  brand color), so rendering never breaks and there is no trademark risk.

## 9. AI matching / chancing — no hallucination

- **Retrieval-grounded only.** The app retrieves the relevant college rows and
  passes them to the model as structured context. Contract: *"Use ONLY the
  provided data; if a field is missing, say it's unavailable; never estimate or
  recall facts."*
- **Chancing is computed in code**, comparing the student's GPA/SAT/ACT to the
  college's DB ranges + admit rate to produce a deterministic Reach/Target/Likely
  band. The LLM only explains the numbers it was given.
- **Name matching is Postgres** (`pg_trgm` over `colleges` + `college_aliases`),
  not the LLM. If the LLM ever disambiguates input, it must pick from a
  DB-supplied candidate list — it can only return an id that exists.
- Every displayed fact is tagged with source + year; unavailable fields render as
  "Not reported." Anything `pending`/`not_reported`/unverified is treated as
  unavailable.

## 10. What is automated vs. manual

- **Automated** (ingester runs against official machine-readable sources): admit
  rate, SAT/ACT mid-ranges, undergrad enrollment, city/state, institution type,
  `unitid` — College Scorecard + IPEDS.
- **Semi-automated** (script + human verification): CDS C7 factors and GPA/rank
  distributions.
- **Manual** (or scraper + required human sign-off; never trusted from automation
  alone): current rounds, exact deadlines, decision dates, per-school/per-major
  policies, and the upcoming cycle's test policy.
- **Logos:** fetch is automatable; licensing/quality verification is manual.

Nothing is fabricated: automation fills what official machine-readable sources
provide; everything else stays `pending` / `not_reported` until a human verifies.
