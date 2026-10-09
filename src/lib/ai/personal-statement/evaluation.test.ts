// Personal-statement evaluation tests — lock in that the four 0–100 category
// scores judge the ESSAY TEXT ALONE and cannot drift because of what else is on
// the student's application, while the application context is still available
// for qualitative feedback. Guards the fix for the "same essay, different score
// on a profile that lists Soccer Team (Captain)" bug.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AI_FEATURES } from "~/lib/ai/config";
import { overallScore } from "~/lib/personal-statement/scoring";
import type { FullProfile } from "../prompt";

// Isolate the engine from the AI SDK and the env-backed gateway client.
const generateTextMock = vi.fn();
vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}));
vi.mock("../client", () => ({
  gateway: (id: string) => ({ id }),
}));

import {
  buildContextBlock,
  buildEssayBlock,
  buildPrompt,
  evaluationSchema,
  generateEvaluation,
  SYSTEM_PROMPT,
} from "./evaluation";
import { DIAGNOSTIC_LENSES, ESSAY_SCORING_LENSES } from "./lenses";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ESSAY =
  "When the final whistle blew, I realized the season had changed how I think about failure.";
const PROMPT_TEXT = "Share an essay on any topic of your choice.";

function makeProfile(activities: FullProfile["activities"] = []): FullProfile {
  return {
    gradeLevel: "12",
    unweightedGpa: 3.9,
    satScore: 1500,
    actScore: null,
    courses: [],
    majorCategory: "cs",
    academicMajor: "",
    academicInterests: [],
    specificMajor: "Computer Science",
    careerInterest: "Software engineer",
    activities,
    awards: [],
  };
}

const SOCCER: FullProfile["activities"][number] = {
  name: "Soccer Team",
  category: "sports",
  grades: ["11", "12"],
  leadershipRole: "Captain",
  description: "",
  hoursPerWeek: 10,
  weeksPerYear: 30,
  meaningfulness: 5,
};

const profileNoSoccer = makeProfile([]);
const profileWithSoccer = makeProfile([SOCCER]);

const CANNED_EVALUATION = {
  overview: "A reflective draft with a clear turning point.",
  categories: [
    { key: "voice", score: 70, summary: "s", strengths: [], improvements: [] },
    { key: "depth", score: 60, summary: "s", strengths: [], improvements: [] },
    {
      key: "storytelling",
      score: 80,
      summary: "s",
      strengths: [],
      improvements: [],
    },
    {
      key: "creativity",
      score: 65,
      summary: "s",
      strengths: [],
      improvements: [],
    },
  ],
};

beforeEach(() => {
  generateTextMock.mockReset();
  generateTextMock.mockResolvedValue({
    text: JSON.stringify(CANNED_EVALUATION),
    usage: { inputTokens: 100, outputTokens: 50 },
  });
});

// ─── The scoring input is essay-only ─────────────────────────────────────────

describe("scoring input is independent of the profile", () => {
  it("builds an identical essay/scoring block whether or not Soccer is listed", () => {
    const promptA = buildPrompt(ESSAY, PROMPT_TEXT, profileNoSoccer);
    const promptB = buildPrompt(ESSAY, PROMPT_TEXT, profileWithSoccer);

    const essayBlock = buildEssayBlock(ESSAY, PROMPT_TEXT);

    // The scoring block is byte-identical and present in both prompts.
    expect(promptA).toContain(essayBlock);
    expect(promptB).toContain(essayBlock);

    // The essay/scoring block never contains the activity data.
    expect(essayBlock).not.toContain("Soccer");
    expect(essayBlock).not.toContain("Captain");
  });

  it("confines the profile difference to the feedback-only context block", () => {
    const promptA = buildPrompt(ESSAY, PROMPT_TEXT, profileNoSoccer);
    const promptB = buildPrompt(ESSAY, PROMPT_TEXT, profileWithSoccer);

    // The two prompts differ (context differs)...
    expect(promptA).not.toBe(promptB);

    // ...but only inside the context block. Strip each context block and the
    // remainder (which includes the whole scoring block) is identical.
    const withoutContext = (prompt: string, profile: FullProfile) =>
      prompt.replace(buildContextBlock(profile), "");
    expect(withoutContext(promptA, profileNoSoccer)).toBe(
      withoutContext(promptB, profileWithSoccer),
    );

    // The activity only ever appears in the feedback context block.
    expect(buildContextBlock(profileWithSoccer)).toContain(
      "Soccer Team (Captain)",
    );
    expect(buildEssayBlock(ESSAY, PROMPT_TEXT)).not.toContain("Soccer");
  });

  it("passes an identical system prompt and scoring block to the model for both profiles", async () => {
    await generateEvaluation(ESSAY, PROMPT_TEXT, profileNoSoccer);
    await generateEvaluation(ESSAY, PROMPT_TEXT, profileWithSoccer);

    const callA = generateTextMock.mock.calls[0][0];
    const callB = generateTextMock.mock.calls[1][0];

    // Same instructions, and the same essay/scoring block reaches the model —
    // so activities cannot directly move any of the four numeric scores.
    expect(callA.system).toBe(callB.system);
    const essayBlock = buildEssayBlock(ESSAY, PROMPT_TEXT);
    expect(callA.prompt).toContain(essayBlock);
    expect(callB.prompt).toContain(essayBlock);
  });
});

// ─── Feedback stays profile-aware ────────────────────────────────────────────

describe("feedback remains profile-aware", () => {
  it("still delivers the intended field and activities as feedback context", () => {
    const prompt = buildPrompt(ESSAY, PROMPT_TEXT, profileWithSoccer);
    expect(prompt).toContain("Computer Science");
    expect(prompt).toContain("Soccer Team (Captain)");
  });

  it("marks the context as feedback-only, not a scoring input", () => {
    const context = buildContextBlock(profileWithSoccer);
    expect(context).toMatch(/FEEDBACK ONLY/i);
    expect(context).toMatch(/not a scoring input/i);
  });
});

// ─── Prompt & lens wiring ────────────────────────────────────────────────────

describe("system prompt enforces the scoring/feedback split", () => {
  it("separates essay-only scoring from application-context feedback", () => {
    expect(SYSTEM_PROMPT).toMatch(/SCORING/);
    expect(SYSTEM_PROMPT).toMatch(/FEEDBACK/);
    expect(SYSTEM_PROMPT).toMatch(/ESSAY TEXT ALONE/);
    expect(SYSTEM_PROMPT).toMatch(/MUST NOT raise or lower any of the four/i);
  });

  it("preserves overlap as feedback, not a score penalty", () => {
    expect(SYSTEM_PROMPT).toMatch(/adds little beyond what your application/i);
  });

  it("drops the Resume test from the scored lenses but keeps it for coaching", () => {
    expect(SYSTEM_PROMPT).not.toContain("Resume test");
    expect(ESSAY_SCORING_LENSES).not.toContain("Resume test");
    // The shared coaching lenses are untouched.
    expect(DIAGNOSTIC_LENSES).toContain("Resume test");
  });
});

describe("DIAGNOSTIC_LENSES is unchanged for the coaching engines", () => {
  it("still contains every lens", () => {
    for (const name of [
      "Specificity test",
      "Voice test",
      "Roommate test",
      "Mirror test",
      "Thinking test",
      "Growth test",
      "Resume test",
    ]) {
      expect(DIAGNOSTIC_LENSES).toContain(`**${name}**`);
    }
  });
});

// ─── Determinism & scoring math ──────────────────────────────────────────────

describe("scoring is deterministic and averaged in code", () => {
  it("runs the deep-coach evaluation at temperature 0", () => {
    expect(AI_FEATURES.personalStatementDeepCoach.temperature).toBe(0);
  });

  it("passes temperature 0 to the model call", async () => {
    await generateEvaluation(ESSAY, PROMPT_TEXT, profileNoSoccer);
    expect(generateTextMock.mock.calls[0][0].temperature).toBe(0);
  });

  it("computes the overall as the average of the four category scores", () => {
    // 70 + 60 + 80 + 65 = 275 → 68.75 → 69
    expect(overallScore(CANNED_EVALUATION.categories)).toBe(69);
  });
});

// ─── Existing behavior still works ───────────────────────────────────────────

describe("generateEvaluation still returns a parsed evaluation", () => {
  it("returns the four categories and token usage", async () => {
    const { evaluation, promptTokens, completionTokens } =
      await generateEvaluation(ESSAY, PROMPT_TEXT, profileWithSoccer);
    expect(evaluation.categories).toHaveLength(4);
    expect(evaluation.categories.map((c) => c.key)).toEqual([
      "voice",
      "depth",
      "storytelling",
      "creativity",
    ]);
    expect(promptTokens).toBe(100);
    expect(completionTokens).toBe(50);
  });

  it("honors a model override while keeping temperature deterministic", async () => {
    await generateEvaluation(
      ESSAY,
      PROMPT_TEXT,
      profileNoSoccer,
      "anthropic/claude-opus-5",
    );
    const call = generateTextMock.mock.calls[0][0];
    expect(call.temperature).toBe(0);
    expect(call.model).toEqual({ id: "anthropic/claude-opus-5" });
  });
});

// ─── strengths/improvements cap no longer fails the whole evaluation ──────────
// Root cause of the observed scoring crash: `strengths`/`improvements` were
// `z.array(z.string()).max(3)`, so a model response with 4+ valid items threw a
// Zod error and failed the entire scoring call. The fix trims extras to the
// first three instead of rejecting. These tests lock that in at 3, 4, and a
// large response, and confirm the numeric scores are untouched.

/** Build one category with `n` strengths and `n` improvements. */
function categoryWith(key: string, score: number, n: number) {
  return {
    key,
    score,
    summary: "s",
    strengths: Array.from({ length: n }, (_, i) => `strength ${i + 1}`),
    improvements: Array.from({ length: n }, (_, i) => `improvement ${i + 1}`),
  };
}

describe("strengths/improvements are capped, not rejected", () => {
  it("keeps all three when exactly three are returned", () => {
    const parsed = evaluationSchema.parse({
      overview: "o",
      categories: [categoryWith("voice", 70, 3)],
    });
    expect(parsed.categories[0].strengths).toHaveLength(3);
    expect(parsed.categories[0].improvements).toHaveLength(3);
    // Order is preserved (the first three).
    expect(parsed.categories[0].improvements).toEqual([
      "improvement 1",
      "improvement 2",
      "improvement 3",
    ]);
  });

  it("does not throw on four items — it keeps the first three", () => {
    expect(() =>
      evaluationSchema.parse({
        overview: "o",
        categories: [categoryWith("voice", 70, 4)],
      }),
    ).not.toThrow();

    const parsed = evaluationSchema.parse({
      overview: "o",
      categories: [categoryWith("voice", 70, 4)],
    });
    expect(parsed.categories[0].strengths).toEqual([
      "strength 1",
      "strength 2",
      "strength 3",
    ]);
    expect(parsed.categories[0].improvements).toHaveLength(3);
  });

  it("caps a maximum-size response (4 categories × many items) without failing", () => {
    const parsed = evaluationSchema.parse({
      overview: "o",
      categories: [
        categoryWith("voice", 70, 10),
        categoryWith("depth", 60, 10),
        categoryWith("storytelling", 80, 10),
        categoryWith("creativity", 65, 10),
      ],
    });
    expect(parsed.categories).toHaveLength(4);
    for (const c of parsed.categories) {
      expect(c.strengths).toHaveLength(3);
      expect(c.improvements).toHaveLength(3);
    }
    // The scoring math is unaffected by the display-list trimming.
    expect(overallScore(parsed.categories)).toBe(69); // (70+60+80+65)/4 → 69
  });

  it("generateEvaluation no longer crashes when the model returns four improvements", async () => {
    generateTextMock.mockResolvedValueOnce({
      text: JSON.stringify({
        overview: "o",
        categories: [
          categoryWith("voice", 70, 4),
          categoryWith("depth", 60, 4),
          categoryWith("storytelling", 80, 4),
          categoryWith("creativity", 65, 4),
        ],
      }),
      usage: { inputTokens: 100, outputTokens: 50 },
    });

    const { evaluation } = await generateEvaluation(
      ESSAY,
      PROMPT_TEXT,
      profileNoSoccer,
    );
    expect(evaluation.categories).toHaveLength(4);
    for (const c of evaluation.categories) {
      expect(c.strengths).toHaveLength(3);
      expect(c.improvements).toHaveLength(3);
    }
  });
});
