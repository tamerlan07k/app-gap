import {
  type AssessmentAnswers,
  scoreAssessment,
} from "~/lib/roadmap/assessment";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Career Path Assessment persistence. Deterministic (no AI): the result is scored
// in code from the answers. Two modes:
//   • "assessment" — save questionnaire answers + computed suggested fields, and
//     confirm the career-direction foundation step.
//   • "confirm"    — the student confirms an existing clear major instead of
//     retaking the assessment.
// Saving/confirming never consumes any generation allowance.

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { mode?: unknown; answers?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const admin = createAdminClient();
  const nowISO = new Date().toISOString();

  if (body.mode === "confirm") {
    // Confirm the existing profile direction.
    const { error } = await admin.from("career_assessments").upsert(
      {
        user_id: user.id,
        source: "profile",
        confirmed: true,
        result: {},
        updated_at: nowISO,
      },
      { onConflict: "user_id" },
    );
    if (error) {
      return Response.json(
        { error: "Couldn't save your confirmation. Please try again." },
        { status: 500 },
      );
    }
    return Response.json({ success: true, confirmed: true });
  }

  // Default: save the assessment answers + computed result.
  const answers = (body.answers ?? {}) as AssessmentAnswers;
  if (typeof answers !== "object" || Array.isArray(answers)) {
    return Response.json({ error: "Invalid answers." }, { status: 400 });
  }
  const result = scoreAssessment(answers);

  const { error } = await admin.from("career_assessments").upsert(
    {
      user_id: user.id,
      answers,
      result,
      source: "assessment",
      confirmed: true,
      updated_at: nowISO,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    return Response.json(
      { error: "Couldn't save your assessment. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ success: true, result });
}
