import { generateLineByLine } from "~/lib/ai/supplemental/line-by-line";
import { recordEvent } from "~/lib/events";
import { recordFeatureUsage } from "~/lib/feature-usage";
import { authorizeEssayRequest } from "~/lib/supplemental/route-helpers";
import { parseSchema } from "~/lib/supplemental/schemas";

// Line-by-line endpoint. Deep-coach tier (Opus), metered under
// "supplementalDeepCoach" (shared with evaluation). Requires a cached prompt
// parse so it can flag any unaddressed directives. Caches per
// (essay_id, kind="line_by_line").
export async function POST(req: Request) {
  const auth = await authorizeEssayRequest(req, "supplementalDeepCoach", {
    requireContent: true,
  });
  if ("response" in auth) return auth.response;
  const { userId, admin, essay, tier, model } = auth.context;

  const { data: parseRow } = await admin
    .from("supplemental_essay_analyses")
    .select("analysis")
    .eq("essay_id", essay.id)
    .eq("kind", "parse")
    .maybeSingle();
  const parsed = parseSchema.safeParse(parseRow?.analysis);
  if (!parsed.success) {
    return Response.json(
      { error: "Analyze the prompt first, then run the line-by-line pass." },
      { status: 400 },
    );
  }

  try {
    const { analysis, promptTokens, completionTokens } =
      await generateLineByLine(
        essay.content,
        essay.prompt_text,
        parsed.data,
        model,
      );

    await recordFeatureUsage(admin, userId, "supplementalDeepCoach", tier);

    const { error: upsertError } = await admin
      .from("supplemental_essay_analyses")
      .upsert(
        {
          essay_id: essay.id,
          user_id: userId,
          kind: "line_by_line",
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
        "[API] supplemental line-by-line: failed to store analysis:",
        upsertError.message,
      );
    }

    await recordEvent(
      admin,
      userId,
      "supplemental_line_by_line",
      "Ran a line-by-line pass on a supplemental essay",
      { comments: analysis.comments.length },
    );

    return Response.json({ success: true, analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] supplemental line-by-line error:", message);
    return Response.json(
      { error: "Couldn't run the line-by-line pass. Please try again." },
      { status: 500 },
    );
  }
}
