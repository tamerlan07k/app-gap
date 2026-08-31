-- Add a verified degree type to college_programs so the per-college Program
-- selector can auto-suggest the correct degree (e.g. Cornell CS in Engineering →
-- B.S., in Arts & Sciences → B.A.) instead of a blind manual pick.
--
-- Nullable on purpose: when the granting degree isn't verified, it stays null
-- and the selector falls back to a manual choice + "Not sure yet". We never
-- fabricate a degree. This carries only the DEFAULT/verified degree; the
-- student's own choice still lives on user_colleges.degree_type and can override.

alter table public.college_programs
  add column if not exists degree text;
