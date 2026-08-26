import { ArrowRight, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { resolveFeatureAccess } from "~/lib/ai/config";
import { brainstormInsightsSchema } from "~/lib/ai/personal-statement/brainstorm";
import {
  type DraftAnalysis,
  draftAnalysisSchema,
} from "~/lib/ai/personal-statement/draft-analysis";
import {
  type Evaluation,
  evaluationSchema,
} from "~/lib/ai/personal-statement/evaluation";
import {
  type LineByLineAnalysis,
  lineByLineSchema,
} from "~/lib/ai/personal-statement/line-by-line";
import {
  type Revision,
  revisionSchema,
} from "~/lib/ai/personal-statement/revision";
import { type EntitlementProfile, resolveEntitlement } from "~/lib/entitlement";
import {
  type BrainstormInputs,
  brainstormInputsSchema,
  EMPTY_BRAINSTORM_INPUTS,
} from "~/lib/personal-statement/brainstorm";
import {
  type ChatMessage,
  chatThreadSchema,
} from "~/lib/personal-statement/chat";
import { createClient } from "~/lib/supabase/server";
import type { DraftDTO, StatementDTO } from "./actions";
import { PersonalStatementWorkspace } from "./personal-statement-workspace";

// Personal Statement — the drafting + brainstorming workspace inside My Profile.
// Pro-only (enabled per-tier in FEATURE_ACCESS; Free → upgrade CTA). Loads the
// student's essays, their drafts (user-editable, owner RLS), and their saved
// brainstorming inputs/insights, and hands them to the client workspace.
export default async function PersonalStatementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select(
      "subscription_tier, subscription_status, admin_override, admin_override_tier, admin_override_expires_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  const entitlement = resolveEntitlement(
    profileRow as EntitlementProfile | null,
  );
  const access = resolveFeatureAccess(
    "personalStatementCoach",
    entitlement.tier,
  );
  if (!access.enabled) {
    return <ProUpsell />;
  }

  const [statementsRes, draftsRes, brainstormRes, analysesRes, chatsRes] =
    await Promise.all([
      supabase
        .from("personal_statements")
        .select(
          "id, title, prompt_id, custom_prompt, finalized_content, finalized_at, finalized_from_draft_id, finalized_from_label, finalized_word_count",
        )
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false }),
      supabase
        .from("personal_statement_drafts")
        .select(
          "id, statement_id, label, content, word_count, is_current, sort_order",
        )
        .eq("user_id", user.id)
        .order("sort_order"),
      supabase
        .from("personal_statement_brainstorms")
        .select("inputs, insights")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("personal_statement_analyses")
        .select("draft_id, kind, analysis")
        .eq("user_id", user.id)
        .in("kind", ["draft", "line_by_line", "evaluation", "revision"]),
      supabase
        .from("personal_statement_chats")
        .select("statement_id, messages")
        .eq("user_id", user.id),
    ]);

  const draftsByStatement = new Map<string, DraftDTO[]>();
  for (const row of draftsRes.data ?? []) {
    const d = row as {
      id: string;
      statement_id: string;
      label: string;
      content: string;
      word_count: number;
      is_current: boolean;
      sort_order: number;
    };
    const list = draftsByStatement.get(d.statement_id) ?? [];
    list.push({
      id: d.id,
      statementId: d.statement_id,
      label: d.label,
      content: d.content,
      wordCount: d.word_count,
      isCurrent: d.is_current,
      sortOrder: d.sort_order,
    });
    draftsByStatement.set(d.statement_id, list);
  }

  const statements: StatementDTO[] = (statementsRes.data ?? []).map((row) => {
    const s = row as {
      id: string;
      title: string;
      prompt_id: string;
      custom_prompt: string;
      finalized_content: string | null;
      finalized_at: string | null;
      finalized_from_draft_id: string | null;
      finalized_from_label: string | null;
      finalized_word_count: number | null;
    };
    return {
      id: s.id,
      title: s.title,
      promptId: s.prompt_id,
      customPrompt: s.custom_prompt,
      drafts: draftsByStatement.get(s.id) ?? [],
      // A non-null finalized_at is the flag that a frozen final version exists.
      final: s.finalized_at
        ? {
            content: s.finalized_content ?? "",
            finalizedAt: s.finalized_at,
            fromDraftId: s.finalized_from_draft_id,
            fromLabel: s.finalized_from_label ?? "",
            wordCount: s.finalized_word_count ?? 0,
          }
        : null,
    };
  });

  // Brainstorming inputs/insights, validated defensively (a row written by an
  // older shape simply falls back to empty / not-yet-generated).
  const brainstormRow = brainstormRes.data as {
    inputs: unknown;
    insights: unknown;
  } | null;
  const parsedInputs = brainstormRow
    ? brainstormInputsSchema.safeParse(brainstormRow.inputs)
    : null;
  const brainstormInputs: BrainstormInputs = parsedInputs?.success
    ? parsedInputs.data
    : EMPTY_BRAINSTORM_INPUTS;
  const parsedInsights = brainstormRow
    ? brainstormInsightsSchema.safeParse(brainstormRow.insights)
    : null;
  const brainstormInsights = parsedInsights?.success
    ? parsedInsights.data
    : null;

  // Cached per-draft feedback, keyed by draft id (validated defensively — a row
  // from an older schema is simply skipped). Split by kind.
  const draftAnalyses: Record<string, DraftAnalysis> = {};
  const lineByLine: Record<string, LineByLineAnalysis> = {};
  const evaluations: Record<string, Evaluation> = {};
  const revisions: Record<string, Revision> = {};
  for (const row of analysesRes.data ?? []) {
    const r = row as { draft_id: string; kind: string; analysis: unknown };
    if (r.kind === "draft") {
      const parsed = draftAnalysisSchema.safeParse(r.analysis);
      if (parsed.success) draftAnalyses[r.draft_id] = parsed.data;
    } else if (r.kind === "line_by_line") {
      const parsed = lineByLineSchema.safeParse(r.analysis);
      if (parsed.success) lineByLine[r.draft_id] = parsed.data;
    } else if (r.kind === "evaluation") {
      const parsed = evaluationSchema.safeParse(r.analysis);
      if (parsed.success) evaluations[r.draft_id] = parsed.data;
    } else if (r.kind === "revision") {
      const parsed = revisionSchema.safeParse(r.analysis);
      if (parsed.success) revisions[r.draft_id] = parsed.data;
    }
  }

  // GapCoach chat threads, keyed by statement id.
  const chats: Record<string, ChatMessage[]> = {};
  for (const row of chatsRes.data ?? []) {
    const r = row as { statement_id: string; messages: unknown };
    const parsed = chatThreadSchema.safeParse(r.messages);
    if (parsed.success) chats[r.statement_id] = parsed.data;
  }

  return (
    <PersonalStatementWorkspace
      initialStatements={statements}
      initialBrainstormInputs={brainstormInputs}
      initialBrainstormInsights={brainstormInsights}
      initialDraftAnalyses={draftAnalyses}
      initialLineByLine={lineByLine}
      initialEvaluations={evaluations}
      initialRevisions={revisions}
      initialChats={chats}
    />
  );
}

// Free-tier gate. Mirrors the "Upgrade to Pro" affordance used elsewhere
// (roadmaps page) but framed for this section.
function ProUpsell() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Personal Statement
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-teal/10">
          <Lock className="size-6 text-brand-teal" aria-hidden={true} />
        </div>
        <div className="max-w-md space-y-1.5">
          <p className="text-base font-semibold">A Pro feature</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Personal Statement workspace — prompt selection, unlimited
            drafts, and an AppGap writing coach — is part of AppGap Pro. Upgrade
            to draft and refine your Common App essay here.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/billing">
            <Sparkles />
            Upgrade to Pro
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
