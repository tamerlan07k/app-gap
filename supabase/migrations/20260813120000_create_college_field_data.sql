-- College field / program data layer.
--
-- Powers the SECOND recommendation dimension: academic/field fit (distinct from
-- admission chance). Source-attributed and human-verifiable, exactly like the
-- other reference tables — and, like them, NOTHING is invented: a college has no
-- field strength until one is ingested from a real source. The matching engine
-- treats a missing row as `unknown`, never as weak or strong.
--
-- `field_key` is the student's intended-field taxonomy key (matches
-- profiles.major_category: cs, engineering, bio-premed, business, ...), so a
-- student's field maps directly onto a college's strength in that field.

do $$ begin
  create type public.college_field_strength as enum
    ('excellent', 'strong', 'moderate', 'limited', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.college_field_resource_type as enum
    ('program', 'research_area', 'opportunity', 'course', 'entrepreneurship', 'other');
exception when duplicate_object then null; end $$;

-- ─── college_field_strengths ──────────────────────────────────────────────────
-- One overall strength rating per (college, field). This is what the field-fit
-- scorer reads. Empty until ingested.

create table if not exists public.college_field_strengths (
  id          uuid primary key default gen_random_uuid(),
  college_id  uuid not null references public.colleges(id) on delete cascade,
  field_key   text not null,
  strength    public.college_field_strength not null default 'unknown',
  headline    text, -- one-line human summary of why (source-derived)
  notes       text,
  source_type public.college_source_type not null default 'manual',
  source_url  text,
  source_date date,
  verified_at timestamptz,
  verified_by text,
  confidence  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (college_id, field_key)
);

alter table public.college_field_strengths enable row level security;

create index if not exists college_field_strengths_college_id_idx
  on public.college_field_strengths (college_id);
create index if not exists college_field_strengths_field_key_idx
  on public.college_field_strengths (field_key);

create policy "college_field_strengths_select_anon"
  on public.college_field_strengths for select to anon using (true);
create policy "college_field_strengths_select_auth"
  on public.college_field_strengths for select to authenticated using (true);

-- ─── college_field_resources ──────────────────────────────────────────────────
-- Concrete evidence items that back a field strength and enrich reasoning:
-- relevant programs, research areas, undergraduate opportunities, standout
-- courses, entrepreneurship/startup resources. Each is source-attributed.

create table if not exists public.college_field_resources (
  id            uuid primary key default gen_random_uuid(),
  college_id    uuid not null references public.colleges(id) on delete cascade,
  field_key     text, -- null = applies broadly, not to one field
  resource_type public.college_field_resource_type not null,
  title         text not null,
  description   text,
  url           text,
  source_url    text,
  source_date   date,
  verified_at   timestamptz,
  verified_by   text,
  created_at    timestamptz not null default now()
);

alter table public.college_field_resources enable row level security;

create index if not exists college_field_resources_college_field_idx
  on public.college_field_resources (college_id, field_key);

create policy "college_field_resources_select_anon"
  on public.college_field_resources for select to anon using (true);
create policy "college_field_resources_select_auth"
  on public.college_field_resources for select to authenticated using (true);
