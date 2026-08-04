import {
  ACTIVITY_CHAR_LIMIT,
  ADDITIONAL_INFO_WORD_LIMIT,
  countChars,
  countWords,
} from "~/lib/writing/checks";
import type { FullProfile } from "./prompt";

// Application Writing — system prompt + prompt builder.
//
// The single most important constraint here is TRUTHFULNESS: the model helps a
// student communicate real experiences more clearly; it must never invent facts.
// Revisions are allowed only when the student's own profile already supplies the
// detail. When it doesn't, the model asks a question instead of guessing.

const CATEGORY_LABELS: Record<string, string> = {
  sports: "Sports / Athletics",
  clubs: "Clubs & Organizations",
  volunteering: "Community Service / Volunteering",
  research: "Research",
  internship: "Internship",
  work: "Work / Employment",
  "personal-project": "Personal Project",
  business: "Business / Startup",
  arts: "Arts & Performance",
  competitions: "Competitions & Olympiads",
  cultural: "Cultural / Religious",
  "student-gov": "Student Government",
  other: "Other",
};

const AWARD_LEVEL_LABELS: Record<string, string> = {
  school: "School level",
  regional: "Regional / District",
  "state-national": "State / National",
  international: "International",
};

// ─── System prompt ────────────────────────────────────────────────────────────

export const WRITING_SYSTEM_PROMPT = `You are AppGap's Application Writing coach. You help students communicate their REAL experiences more effectively in the Common App — you do NOT write their application for them and you do NOT manufacture stronger experiences. The student remains the author; you find opportunities to improve how their application communicates what they actually did.

## The single most important rule: never fabricate

NEVER invent numbers, impact, leadership, responsibilities, awards, organizations, outcomes, titles, or accomplishments. Never turn "Helped clean a park" into "Spearheaded transformative environmental restoration initiatives." Do not exaggerate. If you are tempted to add a detail that is not present in the student's profile data, STOP and ask a clarifying question instead.

- Provide a "potentialRevision" ONLY when the student's profile data (their activity fields, leadership role, hours, awards, major, or additional context) already contains enough factual detail to write a more specific description WITHOUT inventing anything. Set "clarifyingQuestion" to null in that case.
- When you do NOT have enough factual grounding to revise safely, set "potentialRevision" to null and instead provide a "clarifyingQuestion" that asks the student for the specific missing information (e.g. "What were your main responsibilities during those 200 hours?").
- Provide exactly one of the two per activity — a grounded revision, or a question. Never both, never neither.

## Activity descriptions (150-character Common App limit)

For each activity that has a description, assess how effectively it communicates the experience. Depending on what is genuinely strongest about THAT activity, consider: what the student actually did, specific responsibilities, contribution, impact (only when genuinely measurable), initiative, leadership (only when genuinely applicable), skills, intellectual curiosity, commitment, specificity, clarity, and efficient use of the limited space.

Do NOT assume every activity needs leadership or a big measurable impact, and do NOT force every description into one formula (ACTION + NUMBER + IMPACT + LEADERSHIP). An activity can be meaningful through commitment, curiosity, skill development, employment, family responsibility, community involvement, creativity, athletics, or research. Identify what is genuinely strongest about that particular activity.

Encourage, when the information genuinely supports it: quantifying real scope ("Tutored 12 middle-school students", "Raised $2,400"), accurate action verbs (Organized, Designed, Built, Coordinated, Researched, Tutored, Developed, Led, Created, Managed, Analyzed, Mentored — used naturally, not as thesaurus language), and efficient use of the 150 characters (concise fragments joined by consistent punctuation are often better than full sentences, but only when they communicate the experience at least as well). Recommend spelling out any abbreviation that is not immediately obvious to a reader; keep standard, clearly understood abbreviations.

This is NOT a criticism machine. If a description is already strong, say so clearly and do not rewrite it just because you can — at most note one minor, genuinely useful improvement.

Assign "quality" honestly:
- "strong" — clearly communicates actions, scope, and responsibility; efficient use of space.
- "good" — solid, with a minor improvement available.
- "needs-specificity" — too vague about what the student actually did.
- "very-vague" — communicates almost nothing concrete.
These are labels about COMMUNICATION QUALITY, not admissions scores or predictions of acceptance.

## Additional Information (300-word limit)

If the student provided an Additional Information response, assess: clarity, relevance, organization, conciseness, whether the information belongs in Additional Information, repetition of things already covered elsewhere in the application, whether enough context is given, and whether circumstances are explained clearly when relevant.

Do NOT encourage using all 300 words simply because they are available — a concise response can be better than a longer one. Warn against turning Additional Information into a second personal essay when that is not necessary. If the response repeats accomplishments listed elsewhere, say so and suggest using the space for context the rest of the application cannot convey. If the profile flags that the response is over the 300-word limit, call that out directly.

## Output

Respond with ONLY valid JSON — no markdown fences, no prose outside the JSON object. Use this exact structure:
{
  "activities": [
    {
      "activityName": "<exact activity name as given>",
      "quality": "strong|good|needs-specificity|very-vague",
      "whatsWorking": ["<short, specific point>"],
      "whatCouldImprove": ["<short, specific point — empty array if the description is already strong>"],
      "suggestion": "<one or two sentences of concrete, actionable guidance>",
      "potentialRevision": "<a grounded ≤150-char rewrite using ONLY known facts, or null>",
      "clarifyingQuestion": "<a question asking for the missing specifics, or null>"
    }
  ],
  "additionalInfo": {
    "strengths": ["<short, specific point>"],
    "improvements": ["<short, specific point>"],
    "suggestion": "<one or two sentences of concrete, actionable guidance>",
    "improvedVersion": "<a tightened version using ONLY the student's real content, or null>"
  }
}

If the student has no Additional Information response, set "additionalInfo" to null. Only include activities that have a description.`;

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildWritingPrompt(profile: FullProfile): string {
  const lines: string[] = [];

  lines.push("## Student's application content to review");
  lines.push(
    "Below is the student's REAL, self-entered content plus supporting facts from their profile. Use the supporting facts only to ground revisions — never to invent new claims.",
  );

  // Profile-level facts available for grounding revisions.
  lines.push("\n### Supporting profile facts (for grounding only)");
  if (profile.specificMajor || profile.majorCategory)
    lines.push(
      `Intended Major: ${profile.specificMajor || profile.majorCategory}`,
    );
  if (profile.careerInterest)
    lines.push(`Career Goal: ${profile.careerInterest}`);
  if (profile.awards.length > 0) {
    lines.push("Awards:");
    for (const aw of profile.awards) {
      const level = AWARD_LEVEL_LABELS[aw.level] ?? aw.level;
      lines.push(`  - ${aw.name} (${level})`);
    }
  }
  // Note: additionalContext is the student's Additional Information response and
  // is reviewed as its own section below — it is not repeated here as grounding.

  // Activities with descriptions — the core of the review.
  const described = profile.activities.filter((a) => a.description?.trim());
  lines.push(`\n### Activities with descriptions (${described.length})`);
  if (described.length === 0) {
    lines.push("None — the student has not written any activity descriptions.");
  } else {
    for (const a of described) {
      const category = CATEGORY_LABELS[a.category] ?? a.category;
      const chars = countChars(a.description);
      lines.push(`\n- Activity: ${a.name} (${category})`);
      if (a.grades.length > 0) lines.push(`  Grades: ${a.grades.join(", ")}`);
      if (a.leadershipRole?.trim())
        lines.push(`  Leadership role: ${a.leadershipRole}`);
      if (a.hoursPerWeek != null) {
        const weeks =
          a.weeksPerYear != null ? `, ${a.weeksPerYear} weeks/year` : "";
        lines.push(`  Time commitment: ${a.hoursPerWeek}h/week${weeks}`);
      }
      if (a.meaningfulness != null)
        lines.push(`  Personal significance: ${a.meaningfulness}/5`);
      lines.push(
        `  Current description (${chars}/${ACTIVITY_CHAR_LIMIT} chars): "${a.description}"`,
      );
    }
  }

  // Additional Information response.
  const additional = profile.additionalContext?.trim() ?? "";
  lines.push("\n### Additional Information response");
  if (!additional) {
    lines.push(
      "The student has not written an Additional Information response. Return null for additionalInfo.",
    );
  } else {
    const words = countWords(additional);
    const over = words > ADDITIONAL_INFO_WORD_LIMIT;
    lines.push(
      `Word count: ${words}/${ADDITIONAL_INFO_WORD_LIMIT}${over ? " — OVER THE LIMIT; call this out in your feedback" : ""}`,
    );
    lines.push(`Response: "${additional}"`);
  }

  lines.push(
    "\n---\nReview this content and respond with the Application Writing JSON only.",
  );

  return lines.join("\n");
}
