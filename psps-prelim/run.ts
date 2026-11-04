// ─────────────────────────────────────────────────────────────────────────────
// PS EVALUATOR — 24-CALL REPEATABILITY PRELIMINARY (read-only w.r.t. production)
//
// Scores the 3 ORIGINAL synthetic essays 8× each (= 24 calls) through the CURRENT
// production `generateEvaluation`, using the CURRENT production model config and
// temperature (NO model override). Measures run-to-run repeatability only.
//
// SAFETY / ISOLATION (see the plan shown to the user):
//   • Imports production modules READ-ONLY. Writes NOTHING to src/, to any
//     production file, or to the historical experiment folder in Documents/.
//   • All output goes to a UNIQUE, TIMESTAMPED dir under the session scratchpad.
//   • Exactly 24 logical evaluation calls. This runner performs ZERO retries of
//     its own: a failed call is recorded and the loop moves on. The only possible
//     extra HTTP attempts are the AI SDK's inherited default (maxRetries = 2 →
//     ≤3 attempts per logical call on retryable errors). Max logical calls = 24.
//   • A hard counter aborts before a 25th generateEvaluation invocation.
//
// Does NOT run recommendations, revisions, external judges, or any other model
// call. Essays and prompt texts are copied verbatim from the preserved fixtures.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { it } from "vitest";

// ── Load .env.local (repo root) WITHOUT the t3-env Zod validation, before any
//    dynamic import of the engine. Mirrors the preserved harness's load-env. ──
const envPath = fileURLToPath(new URL("../.env.local", import.meta.url));
for (const raw of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  const key = line.slice(0, eq).trim();
  let val = line.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  )
    val = val.slice(1, -1);
  if (process.env[key] === undefined) process.env[key] = val;
}
process.env.SKIP_ENV_VALIDATION = "1";

// Documented (not resolved) gateway endpoint — see src/lib/ai/client.ts.
const GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";
const GATEWAY_HOST = "ai-gateway.vercel.sh";
const HARD_CAP = 24; // absolute ceiling on REAL gateway requests.

// ── RUNNER-ONLY fetch interceptor (does NOT touch production). The AI SDK
//    resolves `globalThis.fetch` per request (provider-utils getOriginalFetch),
//    and client.ts passes no custom fetch, so patching the global here captures
//    EVERY gateway attempt — including the SDK's internal retries. Installed at
//    module load, before the engine is dynamically imported.
//
//    Guarantees: (1) at most HARD_CAP real requests ever leave this process;
//    (2) the run aborts on the FIRST retry. Because the loop is strictly
//    sequential, the k-th logical call's one legitimate request is gateway
//    request #k; any request beyond `logicalCallsStarted` is a retry/extra and
//    is BLOCKED before any network I/O (we throw without calling realFetch, so
//    nothing is sent). Non-gateway requests pass through untouched. Only sent
//    requests increment the counter. ──
const guard = {
  realGatewayRequests: 0,
  logicalCallsStarted: 0,
  aborted: false,
  abortReason: "" as string,
};
const realFetch: typeof globalThis.fetch = globalThis.fetch.bind(globalThis);
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url ?? "";
}
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (!urlOf(input).includes(GATEWAY_HOST)) return realFetch(input, init);
  const wouldBe = guard.realGatewayRequests + 1; // this attempt's ordinal
  const isRetryOrExtra = wouldBe > guard.logicalCallsStarted;
  if (guard.aborted || isRetryOrExtra || wouldBe > HARD_CAP) {
    guard.aborted = true;
    guard.abortReason ||= isRetryOrExtra
      ? `retry/extra gateway request blocked (attempt #${wouldBe} while only ${guard.logicalCallsStarted} logical calls started)`
      : `hard cap ${HARD_CAP} reached (attempt #${wouldBe})`;
    throw new Error(`[FETCH-GUARD] ${guard.abortReason} — nothing sent.`);
  }
  guard.realGatewayRequests = wouldBe;
  return realFetch(input, init);
}) as typeof globalThis.fetch;

// Unique timestamped output dir under the SESSION SCRATCHPAD (never the repo,
// never Documents/). %Y%m%d-%H%M%S local time.
const stamp = new Date()
  .toISOString()
  .replace(/[:T]/g, "-")
  .replace(/\..+$/, "");
const OUT_DIR =
  "C:/Users/tamer/AppData/Local/Temp/claude/C--Users-tamer-Downloads-Code-app-gap/" +
  `c196e256-2324-4078-8f8e-bce9093f87ec/scratchpad/psps-prelim-${stamp}`;

const REPEATS = 8;
const MAX_LOGICAL_CALLS = 24; // 3 essays × 8; hard ceiling enforced below.

// ── Essay inputs — copied VERBATIM from the preserved fixtures.ts (originals) ──
const E1_PROMPT =
  "The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?";
const E2_PROMPT =
  "Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you? What or who do you turn to when you want to learn more?";
const E3_PROMPT =
  "Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.";

const E1 = `Ever since I was a little kid, I have always loved the game of soccer. It has taught me so many valuable lessons about life, teamwork, and perseverance that I will carry with me forever. Soccer is more than just a sport to me; it is a way of life.

During my junior year, I was named captain of the varsity soccer team. This was a huge honor and a great accomplishment. As captain, I learned a lot about leadership and responsibility. I had to lead by example and make sure everyone on the team was working hard and staying positive. It was not always easy, but I rose to the challenge.

Midway through the season, I suffered a serious ankle injury during a game. The doctor told me I would be out for at least six weeks. I was devastated. Soccer was my life, and not being able to play was one of the hardest things I have ever gone through. I felt like I had let my team down.

But instead of giving up, I decided to stay positive and support my team from the sidelines. I came to every practice and every game and cheered my teammates on. I helped the coach with strategy and mentored the younger players. Even though I could not play, I was still a leader.

When I finally recovered, I came back stronger than ever. We ended up making it to the playoffs that year, and it was one of the proudest moments of my life. Looking back, I realized that this experience taught me that true leadership is not about what you do on the field, but about how you support the people around you.

This challenge made me a stronger and more resilient person. I learned that when life knocks you down, you have to get back up and keep fighting. I know that these lessons will help me succeed in college and in whatever career I choose to pursue. Soccer will always be a part of who I am.`;

const E2 = `The first radio I ever took apart was my grandfather's, a cracked 1970s transistor set that hummed when you shook it. I was eleven, and I was not supposed to be using a screwdriver on it. By the time my mother found me, there were forty-one pieces spread across the kitchen table in rows, and I could not get a single one back in.

It took me three weeks to reassemble it, and it never worked again. But something had happened to me in those three weeks. I had seen the inside. I had learned that the hum was a failing capacitor, that the dial was connected to a variable resistor, that there was a logic to the thing that I could follow if I was patient enough.

Since then I have taken apart almost everything in our house that my parents will let me: two toasters, a cassette player, a doorbell, and an entire window air-conditioning unit that I was eventually told to stop. I keep a plastic bin of parts I have salvaged, labeled with masking tape. When a competition circuit on my robotics team shorts out at midnight, I am the person who can usually find which trace is burned, because I have spent years learning what the inside of things is supposed to look like.

What captivates me is not really the electronics. It is the moment when something opaque becomes legible, when a sealed box turns into a diagram I can read. A broken machine is a question, and I have never been able to leave a question alone.

I know that engineering is the field where people get paid to keep asking those questions, and that is why I want to study it. I am excited to learn even more and to one day build things that other curious kids will take apart.`;

const E3 = `I learned to read insurance letters before I could drive. My parents speak Fuzhounese and enough English to run their restaurant, but not enough for the envelopes that arrived in official fonts, so by thirteen I was the family's translator for anything that came with a return address.

I was not good at it. I did not know what a "deductible" was, or why a "final notice" was different from a "notice," and I translated both as just "letter" for almost a year before I understood I had been hiding things from my parents without meaning to. The day I realized the clinic had been sending us a bill, not a form, I felt the specific heat of having failed at a job no one had asked me whether I wanted.

So I started keeping a notebook. On the left I wrote the English I did not know; on the right, my best guess, and then later, the real meaning once I had looked it up at the library. "Premium" was not a compliment. "Grace period" had nothing to do with grace. I was building a dictionary for a language that pretended to be the language I already spoke.

What changed was not my English, which was always fine. What changed was that I stopped translating word by word and started translating worry. When my mother handed me an envelope, she was not asking me what it said. She was asking whether we were okay. I learned to answer that question first, and then explain the details once her shoulders had come down.

I used to think of this as a chore I had been assigned by accident of birth order. Now I think it taught me the thing I am actually good at: standing in the gap between a system and the person it was supposed to serve, and refusing to let the person be the one who has to bend. I do not know yet if that makes me an engineer, a translator, or something there is not a word for. But I know I will always look for the people squinting at the official font, and sit down next to them.`;

// Synthetic profile — copied VERBATIM from the preserved fixtures.ts. Held
// constant across all 24 calls. The profile feeds only the feedback-only context
// block, never the four scores, so it cannot affect the repeatability measured.
const SYNTH_PROFILE = {
  gradeLevel: "12",
  unweightedGpa: 3.8,
  satScore: 1420,
  actScore: null,
  schoolType: "public",
  courses: [],
  majorCategory: "engineering",
  academicMajor: "",
  academicInterests: [],
  specificMajor: "Mechanical Engineering",
  careerInterest: "Engineer",
  activities: [
    {
      name: "Varsity Soccer",
      category: "sports",
      grades: ["9", "10", "11", "12"],
      leadershipRole: "Captain",
      description: "",
      hoursPerWeek: 10,
      weeksPerYear: 30,
      meaningfulness: 4,
    },
    {
      name: "Robotics Club",
      category: "stem",
      grades: ["10", "11", "12"],
      leadershipRole: "",
      description: "",
      hoursPerWeek: 5,
      weeksPerYear: 25,
      meaningfulness: 5,
    },
  ],
  awards: [],
};

const ESSAYS = [
  { id: "E1-soccer", promptText: E1_PROMPT, content: E1 },
  { id: "E2-radio", promptText: E2_PROMPT, content: E2 },
  { id: "E3-translator", promptText: E3_PROMPT, content: E3 },
];

it("PS repeatability preliminary — 3 originals × 8 on current production evaluator", async () => {
  mkdirSync(OUT_DIR, { recursive: true });

  // Dynamic import AFTER env is loaded. CURRENT production engine + config.
  const { generateEvaluation } = await import(
    "~/lib/ai/personal-statement/evaluation"
  );
  const { overallScore } = await import("~/lib/personal-statement/scoring");
  const { AI_FEATURES } = await import("~/lib/ai/config");

  const cfg = AI_FEATURES.personalStatementDeepCoach;
  const meta = {
    startedAt: new Date().toISOString(),
    resolvedModel: cfg.model, // current production model id (no override)
    temperature: cfg.temperature, // current production temperature
    gatewayBaseUrl: GATEWAY_BASE_URL,
    gatewayKeyPresent: !!process.env.AI_GATEWAY_API_KEY,
    aiSdkMaxRetriesDefault: 2,
    maxLogicalCalls: MAX_LOGICAL_CALLS,
    repeats: REPEATS,
    note: "Runner performs zero retries of its own; model override NOT passed, so production config is used.",
  };
  console.log("[meta]", JSON.stringify(meta));

  const runs: unknown[] = [];
  let totalIn = 0;
  let totalOut = 0;
  let failures = 0;

  try {
    outer: for (const essay of ESSAYS) {
      for (let run = 0; run < REPEATS; run++) {
        // Belt: never even start more than MAX_LOGICAL_CALLS.
        if (guard.logicalCallsStarted >= MAX_LOGICAL_CALLS) break outer;
        // Mark this logical call as started BEFORE the call, so the fetch guard
        // (which compares real requests against logicalCallsStarted) lets through
        // exactly one request for it and treats any further request as a retry.
        guard.logicalCallsStarted++;
        const n = guard.logicalCallsStarted;
        try {
          const { evaluation, promptTokens, completionTokens } =
            await generateEvaluation(
              essay.content,
              essay.promptText,
              SYNTH_PROFILE as never,
            );
          const cats: Record<string, number> = {};
          for (const c of evaluation.categories) cats[c.key] = c.score;
          const overall = overallScore(evaluation.categories);
          totalIn += promptTokens;
          totalOut += completionTokens;
          runs.push({
            essayId: essay.id,
            run,
            ok: true,
            overall,
            voice: cats.voice,
            depth: cats.depth,
            storytelling: cats.storytelling,
            creativity: cats.creativity,
            promptTokens,
            completionTokens,
          });
          console.log(
            `[${n}/${MAX_LOGICAL_CALLS}] ${essay.id} run${run} → overall ${overall} ` +
              `(v${cats.voice} d${cats.depth} s${cats.storytelling} c${cats.creativity}) ` +
              `tok ${promptTokens}/${completionTokens}`,
          );
        } catch (err) {
          failures++;
          const message = err instanceof Error ? err.message : String(err);
          runs.push({ essayId: essay.id, run, ok: false, error: message });
          console.error(
            `[${n}/${MAX_LOGICAL_CALLS}] FAIL ${essay.id} run${run}: ${message}`,
          );
        }
        // Stop the entire run the instant the fetch guard trips (first retry /
        // cap). Partial results are preserved by the finally block below.
        if (guard.aborted) {
          console.error(
            `[ABORT] ${guard.abortReason} — stopping run, preserving partial results.`,
          );
          break outer;
        }
      }
    }
  } finally {
    const payload = {
      meta: { ...meta, finishedAt: new Date().toISOString() },
      guard: {
        realGatewayRequests: guard.realGatewayRequests,
        logicalCallsStarted: guard.logicalCallsStarted,
        aborted: guard.aborted,
        abortReason: guard.abortReason || null,
        hardCap: HARD_CAP,
      },
      failures,
      tokenUsage: { in: totalIn, out: totalOut },
      runs,
    };
    writeFileSync(
      `${OUT_DIR}/prelim-results.json`,
      JSON.stringify(payload, null, 2),
    );
    console.log(
      `\nDONE. realGatewayRequests=${guard.realGatewayRequests} aborted=${guard.aborted} ` +
        `failures=${failures} tokens in=${totalIn} out=${totalOut}\nout: ${OUT_DIR}/prelim-results.json`,
    );
  }
});
