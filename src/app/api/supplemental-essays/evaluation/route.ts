import { generateEvaluation } from "~/lib/ai/supplemental/evaluation";
import { recordEvent } from "~/lib/events";
import { recordFeatureUsage } from "~/lib/feature-usage";
import { authorizeEssayRequest } from "~/lib/supplemental/route-helpers";
import { parseSchema } from "~/lib/supplemental/schemas";
import { loadVerifiedCollege } from "~/lib/supplemental/verified-college";

// Graded evaluation endpoint. Deep-coach tier (Opus), metered under
// "supplementalDeepCoach" (shared with line-by-line). Requires a cached prompt
// parse (run the parse route first — the workspace does this automatically).
// Caches the RAW model evaluation per (essay_id, kind="evaluation"); the
// deterministic scoring (coverage adjustment + weighted overall) is applied on
// read from the parse + this raw evaluation.
export async function POST(req: Request) {
  const auth = await authorizeEssayRequest(req, "supplementalDeepCoach", {
    requireContent: true,
  });
  if ("response" in auth) return auth.response;
  const { userId, admin, essay, collegeName, fieldKey, tier, model } =
    auth.context;

  // The evaluation needs the parsed directives + archetype.
  const { data: parseRow } = await admin
    .from("supplemental_essay_analyses")
    .select("analysis")
    .eq("essay_id", essay.id)
    .eq("kind", "parse")
    .maybeSingle();
  const parsed = parseSchema.safeParse(parseRow?.analysis);
  if (!parsed.success) {
    return Response.json(
      { error: "Analyze the prompt first, then score the essay." },
      { status: 400 },
    );
  }

  const verified = await loadVerifiedCollege(admin, essay.college_id, fieldKey);

  try {
    const { evaluation, promptTokens, completionTokens } =
      await generateEvaluation(
        essay.content,
        essay.prompt_text,
        parsed.data,
        collegeName,
        verified.block,
        model,
      );

    await recordFeatureUsage(admin, userId, "supplementalDeepCoach", tier);

    const { error: upsertError } = await admin
      .from("supplemental_essay_analyses")
      .upsert(
        {
          essay_id: essay.id,
          user_id: userId,
          kind: "evaluation",
          analysis: evaluation,
          model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "essay_id,kind" },
      );
    if (upsertError) {
      console.error(
        "[API] supplemental evaluation: failed to store evaluation:",
        upsertError.message,
      );
    }

    await recordEvent(
      admin,
      userId,
      "supplemental_evaluated",
      "Scored a supplemental essay",
      {},
    );

    return Response.json({ success: true, evaluation });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] supplemental evaluation error:", message);
    return Response.json(
      { error: "Couldn't score your essay. Please try again." },
      { status: 500 },
    );
  }
}
