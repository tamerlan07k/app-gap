import {
  generateRedundancy,
  type RedundancyContext,
} from "~/lib/ai/supplemental/redundancy";
import { recordEvent } from "~/lib/events";
import { recordFeatureUsage } from "~/lib/feature-usage";
import { authorizeEssayRequest } from "~/lib/supplemental/route-helpers";

// Application-level redundancy / value-add endpoint. Metered under
// "supplementalCoach" (Gemini). Compares this supplement against the Personal
// Statement, Activities, Additional Information, and other FINALIZED supplements
// for the same college. Diagnostic only — never changes the essay's score.
// Caches per (essay_id, kind="redundancy").
export async function POST(req: Request) {
  const auth = await authorizeEssayRequest(req, "supplementalCoach", {
    requireContent: true,
  });
  if ("response" in auth) return auth.response;
  const { userId, admin, essay, profile, tier, model } = auth.context;

  // Personal Statement — prefer a finalized version, else the current draft.
  let personalStatement: string | null = null;
  const { data: statement } = await admin
    .from("personal_statements")
    .select("id, finalized_content")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (statement) {
    const finalized = (statement.finalized_content as string | null) ?? null;
    if (finalized?.trim()) {
      personalStatement = finalized;
    } else {
      const { data: drafts } = await admin
        .from("personal_statement_drafts")
        .select("content, is_current, sort_order")
        .eq("statement_id", statement.id)
        .eq("user_id", userId)
        .order("sort_order");
      const current = drafts?.find((d) => d.is_current) ?? drafts?.[0] ?? null;
      personalStatement = (current?.content as string | null) ?? null;
    }
  }

  // Other finalized supplements for the SAME college.
  const { data: others } = await admin
    .from("supplemental_essays")
    .select("prompt_text, finalized_content")
    .eq("user_id", userId)
    .eq("college_id", essay.college_id)
    .neq("id", essay.id)
    .not("finalized_at", "is", null);
  const otherSupplements = (others ?? [])
    .map((o) => ({
      promptText: (o.prompt_text as string) ?? "",
      content: (o.finalized_content as string | null) ?? "",
    }))
    .filter((o) => o.content.trim());

  const ctx: RedundancyContext = {
    personalStatement,
    activities: profile.activities.map((a) => ({
      name: a.name,
      role: a.leadershipRole,
      description: a.description,
    })),
    additionalInfo: profile.additionalContext ?? null,
    otherSupplements,
  };

  try {
    const { analysis, promptTokens, completionTokens } =
      await generateRedundancy(essay.content, essay.prompt_text, ctx, model);

    await recordFeatureUsage(admin, userId, "supplementalCoach", tier);

    const { error: upsertError } = await admin
      .from("supplemental_essay_analyses")
      .upsert(
        {
          essay_id: essay.id,
          user_id: userId,
          kind: "redundancy",
          analysis,
          model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "essay_id,kind" },
      );
    if (upsertError) {
      console.error(
        "[API] supplemental redundancy: failed to store analysis:",
        upsertError.message,
      );
    }

    await recordEvent(
      admin,
      userId,
      "supplemental_redundancy",
      "Checked a supplement against the rest of the application",
      { repetition: analysis.repetition },
    );

    return Response.json({ success: true, analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] supplemental redundancy error:", message);
    return Response.json(
      { error: "Couldn't run the application check. Please try again." },
      { status: 500 },
    );
  }
}
