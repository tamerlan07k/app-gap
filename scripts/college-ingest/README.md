# College data ingestion

Populates the centralized college database (see
[`docs/college-data-architecture.md`](../../docs/college-data-architecture.md)).
Runs **outside the app** as Node ESM scripts. Nothing here is invented — fields a
source does not provide are stored as `not_reported`/left null.

## Prerequisites

1. **Apply the schema migration** (`20260811120000_create_college_data.sql`):
   ```bash
   npx supabase db push --dry-run   # preview
   npx supabase db push             # apply
   ```
2. **Secrets** — set in your environment or `.env.local` (never commit these):
   | Var | Used for |
   |---|---|
   | `COLLEGE_SCORECARD_API_KEY` | Scorecard API (free key: https://api.data.gov/signup/) |
   | `NEXT_PUBLIC_SUPABASE_URL` | live DB target (already in `.env.local`) |
   | `SUPABASE_SERVICE_ROLE_KEY` | RLS-bypassing writes (already in `.env.local`) |

## Run

```bash
# Dry run — fetches + maps + prints, writes NOTHING. Falls back to DEMO_KEY if
# no key is set (low rate limit), so it's safe to run anywhere.
node scripts/college-ingest/ingest-scorecard.mjs --dry-run --limit 5

# Live ingest — writes colleges + college_admission_stats (source=scorecard) and
# stores the raw payload in college_ingest_raw. Idempotent (safe to re-run).
node scripts/college-ingest/ingest-scorecard.mjs

# Optional: label the Scorecard vintage year explicitly (see note below).
node scripts/college-ingest/ingest-scorecard.mjs --year 2022-2023
```

The dry run prints each resolved match (`unitid`, city/state, admit rate, SAT)
and flags **ambiguous** matches and **no-match** seeds for manual resolution.
Review that output before running live.

## What each source fills

| Layer | Source | This pipeline |
|---|---|---|
| Admit rate, SAT/ACT ranges, enrollment, location, control | **Scorecard / IPEDS** | ✅ `ingest-scorecard.mjs` (automated) |
| Historical admissions factors (CDS C7), GPA/rank distributions | **CDS** | ⏳ semi-automated + manual verification (not built yet) |
| Current rounds, deadlines, decision dates, current test policy | **Official admissions sites** | ✍️ manual / scraper + **required human verification** (not built yet) |
| Logos | official brand assets → self-hosted; monogram fallback | ✍️ manual verification (not built yet) |

## Notes

- **Academic year:** Scorecard "latest" is the most recent federally reported
  year (typically lagged ~2 years). The row is labeled `scorecard_latest` unless
  you pass `--year`; set the real vintage with `--year` once you confirm it, so
  provenance is exact.
- **Idempotent:** re-running updates the existing `(college, year, source)` stats
  row rather than duplicating. Colleges upsert on `ipeds_unitid`.
- **Verification:** Scorecard numeric rows may publish at lower confidence;
  current rounds/deadlines and CDS factors must be human-verified
  (`verified_at`/`verified_by`) before the matching layer treats them as
  authoritative.
- **Aliases, schools/programs, application cycles/rounds, and logos** are
  populated by later steps, not this script.
