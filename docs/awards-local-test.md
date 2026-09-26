# Awards section — local end-to-end test runbook

Automated checks already pass (typecheck, lint, 264 tests, build). This runbook is
the live-flow test that needs a running local Supabase stack (Docker). It was NOT
run in the implementation session because Docker's Linux engine requires WSL2,
which was not installed on that machine (`wsl --install` needs admin + reboot).

> Never run `supabase db push` / `--linked` during this — everything here is LOCAL
> only. Your hosted/production database must stay untouched.

## 0. Prerequisites (one-time)

1. Enable WSL2 (elevated PowerShell), then reboot:
   ```
   wsl --install
   ```
2. Start Docker Desktop and wait until it says **Engine running**.

## 1. Bring up local Supabase + apply migrations/seed

```bash
npx supabase start          # boots local Postgres + Auth + API + Studio
npx supabase db reset       # replays ALL migrations, incl. the 2 new ones + opportunity seed
npx supabase status         # copy: API URL, anon key, service_role key
```

`db reset` should end cleanly and load ~16 seeded rows into `public.opportunities`.
Confirm:
```bash
# in Studio SQL (http://127.0.0.1:54323) or psql:
select count(*) from opportunities where verified_at is not null;   -- expect ~16
select column_name from information_schema.columns
  where table_name='awards' and column_name in
  ('organization','placement','student_explanation','evidence_url');  -- expect 4 rows
select to_regclass('public.award_recognition_analyses');            -- not null
```

## 2. Point the app at LOCAL (temporarily)

Back up and override the three Supabase vars only (keep `AI_GATEWAY_API_KEY` real so
the AI tools work):
```bash
cp .env.local .env.local.hosted.bak
# then set in .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from `supabase status`>
#   SUPABASE_SERVICE_ROLE_KEY=<service_role key from `supabase status`>
```
Restore afterwards: `mv .env.local.hosted.bak .env.local`.

## 3. Create a test user WITH existing application data

Recognition Map is only meaningful with real profile data, so complete onboarding:
```bash
pnpm dev
```
- Sign up at http://localhost:3000/auth/signup, then finish onboarding so you have a
  profile with an **intended field** (e.g. CS), a few **activities** (include a
  service/volunteering one and a robotics/coding one), and a couple of **awards**
  (e.g. a coding competition + a math award). This gives the map themes + a gap.
- (Optional Pro test) In Studio SQL:
  `update profiles set subscription_tier='pro', subscription_status='active' where id='<uid>';`

## 4. Walk the 22-item flow

| # | Check | How / expected |
|---|-------|----------------|
| 1 | My Profile → Awards nav | Sidebar shows **Awards** (unlocked, no lock icon); click it |
| 2 | Page loads | `/dashboard/profile/awards` renders the hero, Test-an-Opportunity, and the Recognition Map \| Opportunity Finder tabs |
| 3 | Existing awards display | Awards added in onboarding appear under **My awards** with org/scope/placement |
| 4 | Add an award | "Add award" → fill → Save; row appears without full reload |
| 5 | Edit an award | Pencil → change fields → Save changes; updates in place |
| 6 | Delete an award | Trash → Confirm delete; row disappears |
| 7 | Recognition Map runs | Click **Analyze my recognition**; spinner → collective card + per-award "Why this matters" |
| 8 | Uses existing data | The collective read + gaps reference your real awards/activities/field (e.g. flags a **service** gap if you volunteer but have no service award) |
| 9 | Caching works | Reload the page — the analysis is still there (from `award_recognition_analyses`); the button reads "Refresh analysis" with a "Last analyzed …" date |
| 10 | Finder shows opportunities | Opportunity Finder tab lists seeded opps as cards with status badges |
| 11 | Feasibility filtering | A near-deadline + long-prep opp is **Not enough time**; a near-deadline + quick opp is **Time-sensitive** |
| 12 | Past deadlines | Recurring deadlines roll to the next occurrence (never shown as "past"); nothing shows a date earlier than today |
| 13 | Unrealistic prep deprioritized | "Not enough time" cards sort last, are dimmed, and are filterable |
| 14 | Test an Opportunity works | Paste text → **Test it** → concise result |
| 15 | Real competition | e.g. paste "Regeneron Science Talent Search"; response should reason about research/timing/senior-year |
| 16 | 🟢/🟡/🔴 structure | Result shows one verdict chip (Potentially worthwhile / Limited / Low value-high cost) + short What-it-adds / Overlaps / Gap / Effort / Timing / Why |
| 17 | Metering | `select feature, count(*) from feature_usage group by feature;` — each Analyze = 1 `awardsRecognition`; each Test = 1 `opportunityExperiment` |
| 18 | No AI on page load | Watch the `pnpm dev` console: loading the page prints **no** `[AI]` line; only clicking Analyze / Test it prints `[AI] Awards recognition…` / `[AI] Opportunity experiment…` |
| 19 | Entitlements | As **free**, run Analyze twice in a week → 2nd returns the weekly-limit message (429). Test an Opportunity: free = 3/week. As **pro**, higher monthly caps apply |
| 20 | Responsive | Narrow the window / mobile emulate: tabs, cards, and the award form reflow without horizontal scroll |
| 21 | Chancing intact | `/dashboard/analysis` still shows the AppGap Score with an **Awards** component; deleting rich fields didn't change the score inputs (only name/level/grade feed it) |
| 22 | Other features work | Personal Statement, Supplemental Essays, Activities, Coursework, My Colleges all still load and run |

## 5. Tear down

```bash
mv .env.local.hosted.bak .env.local   # restore hosted config
npx supabase stop                     # stop local stack (optional)
```
Nothing here should be committed.
