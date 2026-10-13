import { generateText } from "ai";
import { buildRoadmapContext } from "~/lib/roadmap/context";
import {
  buildFromIds,
  deterministicRoadmap,
  eligibleTemplates,
} from "~/lib/roadmap/select";
import type { RoadmapContext, SavedMilestone } from "~/lib/roadmap/types";
import { gateway } from "./client";
import { AI_FEATURES } from "./config";
import type { FullProfile } from "./prompt";
import { buildRoadmapPrompt, ROADMAP_SYSTEM_PROMPT } from "./roadmap-prompt";
import { roadmapGenerationSchema } from "./roadmap-schema";

// The single, bounded personalization call for My Roadmap. It selects/orders
// milestones from the APPROVED catalog only; everything structural is looked up
// from the library by id. Behavior on error is split deliberately:
//   • generateText() throwing (network / gateway / timeout) PROPAGATES, so the
//     caller can mark the generation recoverable-failed WITHOUT consuming the
//     user's lifetime allowance.
//   • A response that is non-JSON, fails schema validation, or yields no valid
//     milestone ids falls back to the DETERMINISTIC roadmap — the student still
//     gets a real, usable plan rather than being blocked by one bad response.
// Either way the output is validated against the library, so invalid model
// output can never create an arbitrary milestone or route.

export async function generateRoadmap(
  profile: FullProfile,
  opts: {
    now?: Date;
    targetCollegeCount?: number;
    modelOverride?: string;
  } = {},
): Promise<{ milestones: SavedMilestone[]; usedFallback: boolean }> {
  const ctx: RoadmapContext = buildRoadmapContext(profile, {
    now: opts.now,
    targetCollegeCount: opts.targetCollegeCount,
  });
  const eligible = eligibleTemplates(ctx);

  // Nothing applies at all (degenerate profile) — deterministic empty/near-empty.
  if (eligible.length === 0) {
    return { milestones: deterministicRoadmap(ctx), usedFallback: true };
  }

  const { model: defaultModel, temperature } = AI_FEATURES.roadmapGeneration;
  const model = opts.modelOverride ?? defaultModel;

  // Transient failures here propagate to the caller (recoverable, no usage spent).
  const result = await generateText({
    model: gateway(model),
    system: ROADMAP_SYSTEM_PROMPT,
    prompt: buildRoadmapPrompt(profile, ctx, eligible),
    temperature,
  });

  // Unusable output → deterministic fallback (a real roadmap, not an error).
  try {
    const clean = result.text
      .replace(/^```(?:json)?\s*\n?|\s*```\s*$/g, "")
      .trim();
    const parsed = roadmapGenerationSchema.parse(JSON.parse(clean));
    const ids = parsed.milestones.map((m) => m.id);
    const notes: Record<string, string> = {};
    for (const m of parsed.milestones) {
      if (m.note) notes[m.id] = m.note;
    }
    const built = buildFromIds(ids, ctx, notes);
    if (built) return { milestones: built, usedFallback: false };
  } catch {
    // fall through to deterministic fallback
  }

  return { milestones: deterministicRoadmap(ctx), usedFallback: true };
}
