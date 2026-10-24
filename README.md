# AppGap

**Understand your college application profile — before you apply.**

AppGap is an AI-powered college admissions platform that helps students see their
application the way an admissions office would. It analyzes a student's academic and
extracurricular profile, surfaces the *gaps* between where they are and where their
target schools expect applicants to be, estimates realistic admission chances, and
gives concrete, personalized guidance on how to close those gaps — from choosing
colleges, to strengthening activities and coursework, to writing the essays.

> This is a private, in-development product. The sections below document how the app is
> structured and how to run it locally.

---

## What the app does

AppGap is organized around a student's profile and a set of AI-assisted workspaces:

### Onboarding & profile
A guided, multi-step onboarding (`/profile/*`) collects the student's background: an
"About you" page, school type, career direction (area → major → specialization), class
rank and GPA (native scales normalized to 4.0), activities, and a first personal
statement draft — ending in a review step.

### AppGap Score & gap analysis
A holistic score, **computed in code** from six LLM-generated category scores plus a
coherence gate, tells the student how their profile reads overall and where it's weak.
Scores are absolute (percentile-based), decoupled from any specific college list.
See `/dashboard/analysis` and `src/lib/ai`.

### My Colleges
A searchable dataset of **1,500+ colleges** (self-hosted official logos, SAT/ACT,
tuition, location, admit rates) with:
- **Matching & field-fit** — how well each school fits the student's profile and intended field.
- **Admission chancing (V2)** — a holistic-aware engine producing a probability range,
  confidence, and the drivers behind it, with selectivity ceilings and honest percentiles.
- **Application plans** per college.
- Filters by state, region, and bordering states.

See `/dashboard/colleges` and `src/lib/colleges`.

### Application writing
AI workspaces that score and improve application materials:
- **Activities** — each scored /10 on verb strength, specificity, and impact, with
  polish / rewrite / template modes and a live 150-character counter.
- **Additional Info** — guided against current Common App criteria.
- **Personal Statement** (Pro) — drafts with cloning and finalize snapshots, brainstorming,
  draft analysis, line-by-line feedback, evaluation/grading, and revision.
- **Supplemental Essays** — per-college, prompt-first parsing, dynamically weighted
  grading, and an app-level redundancy check across essays.

See `/dashboard/application-writing` and `src/lib/{writing,personal-statement,supplemental}`.

### Profile workspaces
- **Activities** analysis — strength/alignment bands and continue/deepen verdicts.
- **Awards & Recognition** — a recognition map plus a date-aware opportunity finder.
- **Coursework** analysis — a gap/opportunity engine (not a course recommender) that
  accounts for what each student's school actually offers.

### My Roadmap
Personalized, four-branch planning (`/dashboard/workspace`, `/dashboard/roadmap`) that
blends a static milestone library with a single bounded AI call, plus a calendar that
generates dated tasks.

### Billing & accounts
Stripe-based **Free / Pro** tiers with per-feature generation limits enforced server-side,
a customer portal, webhooks, and in-app billing notifications. Supabase Auth handles
sign-up, login, and sessions.

### Admin
An internal admin panel (`/admin`) with analytics, billing control (complimentary
overrides that pause Stripe), college content management, and user feedback.

---

## Tech stack

| Area | Choice |
|------|--------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router), React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 with OKLCH design tokens, light/dark themes, Radix UI primitives |
| Backend / DB | [Supabase](https://supabase.com/) — Postgres, Auth, Storage, Row-Level Security |
| AI | [Vercel AI SDK](https://sdk.vercel.ai/) via an AI Gateway (hybrid model routing) |
| Payments | [Stripe](https://stripe.com/) |
| Email | [Resend](https://resend.com/) |
| Env validation | `@t3-oss/env-nextjs` + Zod (`src/env.ts`) |
| Linter / Formatter | [Biome](https://biomejs.dev/) |
| Tests | [Vitest](https://vitest.dev/) |
| Package manager | pnpm (enforced), Node 22 |

---

## Getting started

### Prerequisites
- Node.js 22.x
- [pnpm](https://pnpm.io/) 11.7+ (the `preinstall` hook enforces pnpm)
- A [Supabase](https://supabase.com/) project (or the Supabase CLI for local dev)

### Setup

```bash
# Install dependencies
pnpm install

# Create your local env file and fill in the values (see below)
cp .env.example .env.local   # if present; otherwise create .env.local
$EDITOR .env.local

# Start the dev server
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

---

## Environment variables

All env vars are validated at startup through `src/env.ts` (Zod). **Never read
`process.env` directly in application code** — import the typed `env` object instead:

```ts
import { env } from "~/env";
env.NEXT_PUBLIC_SUPABASE_URL;
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server only) |
| `AI_GATEWAY_API_KEY` | API key for the AI gateway used by the LLM features |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the Stripe webhook endpoint |
| `STRIPE_PRO_PRICE_ID` | Stripe price ID for the Pro tier |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `NEXT_PUBLIC_APP_URL` | Public base URL of the app |
| `NODE_ENV` | `development` \| `production` \| `test` |

---

## Database & migrations

All schema changes go through **Supabase CLI migrations** in `supabase/migrations/`
(44+ migrations) — never modify the database manually. Each migration enables RLS and
defines granular, per-operation/per-role policies.

```bash
# Create a new migration
npx supabase migration new <short_description>

# Reset and replay all migrations locally
npx supabase db reset

# Check status
npx supabase migration list

# Deploy to the linked remote project
npx supabase db push --dry-run   # preview first
npx supabase db push             # apply
```

**Rules:** never reset or revert a migration already deployed to production (roll
forward), never edit an applied migration file, and commit all migration files.

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the development server |
| `pnpm build` | Build for production |
| `pnpm start` | Run the production build |
| `pnpm test` | Run the test suite (Vitest) |
| `pnpm typecheck` | Type-check with `tsc --noEmit` |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Format with Biome |

---

## Project structure

```
src/
  app/
    page.tsx            # landing page
    contact/ partners/ privacy/ terms/ notes/  # marketing & legal
    profile/            # multi-step onboarding flow
    dashboard/          # authenticated product
      analysis/         # AppGap Score & gap analysis
      colleges/         # My Colleges (matching, chancing, plans)
      application-writing/  # activities, personal statement, supplemental
      profile/          # activities, awards, coursework workspaces
      roadmap/, workspace/  # My Roadmap & planning
      calendar/, billing/, account/
    admin/              # analytics, billing control, college content, feedback
    api/                # route handlers (AI endpoints, billing, webhooks, auth)
    auth/               # login, signup, OAuth callback
  lib/
    ai/                 # scoring, prompts, model routing
    colleges/           # college dataset, matching, chancing (admission model V2)
    activities/ awards/ coursework/ writing/
    personal-statement/ supplemental/ roadmap/ calendar/
    supabase/           # typed Supabase clients (server/browser)
  env.ts                # validated environment variables
supabase/migrations/    # SQL migrations (source of truth for the schema)
```

Conventions and deeper rules live in `CLAUDE.md` and `.claude/rules/`.

---

## Conventions

- **Styling** — Tailwind v4 utility classes with design tokens from `globals.css`
  (`text-foreground`, `bg-background`, …); merge conditional classes with `cn()` from
  `~/lib/utils`. Avoid hardcoded colors.
- **Imports** — `~/` is an alias for `./src/*`.
- **Env** — access only via the typed `env` object from `~/env`.
