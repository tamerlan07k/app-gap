import { generatePromptParse } from "~/lib/ai/supplemental/parse";
import { recordEvent } from "~/lib/events";
import { recordFeatureUsage } from "~/lib/feature-usage";
import { authorizeEssayRequest } from "~/lib/supplemental/route-helpers";
import { extractWordLimit } from "~/lib/supplemental/text";

// Prompt-first parse endpoint. Metered under "supplementalCoach" (Gemini). Reads
// the essay's prompt text, extracts archetype/directives/constraints, and caches
// the result per (essay_id, kind="parse"). Cheap and cached — re-run only when
// the prompt text changes.
export async function POST(req: Request) {
  const auth = await authorizeEssayRequest(req, "supplementalCoach");
  if ("response" in auth) return auth.response;
  const { userId, admin, essay, tier, model } = auth.context;

  const detected = essay.word_limit ?? extractWordLimit(essay.prompt_text);

  try {
    const { parse, promptTokens, completionTokens } = await generatePromptParse(
      essay.prompt_text,
      detected,
      model,
    );

    await recordFeatureUsage(admin, userId, "supplementalCoach", tier);

    const { error: upsertError } = await admin
      .from("supplemental_essay_analyses")
      .upsert(
        {
          essay_id: essay.id,
          user_id: userId,
          kind: "parse",
          analysis: parse,
          model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "essay_id,kind" },
      );
    if (upsertError) {
      console.error(
        "[API] supplemental parse: failed to store parse:",
        upsertError.message,
      );
    }

    // If the parse found a word limit and the essay has none stored, persist it.
    if (parse.wordLimit != null && essay.word_limit == null) {
      await admin
        .from("supplemental_essays")
        .update({ word_limit: parse.wordLimit })
        .eq("id", essay.id)
        .eq("user_id", userId);
    }

    await recordEvent(
      admin,
      userId,
      "supplemental_prompt_parsed",
      "Analyzed a supplemental prompt",
      { archetype: parse.primaryArchetype },
    );

    return Response.json({ success: true, parse });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] supplemental parse error:", message);
    return Response.json(
      { error: "Couldn't analyze this prompt. Please try again." },
      { status: 500 },
    );
  }
}
