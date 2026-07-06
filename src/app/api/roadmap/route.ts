import Anthropic from "@anthropic-ai/sdk";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "~/env";
import { getApplicationTimeline } from "~/lib/application-timeline";
import {
  buildRoadmapPrompt,
  buildSystemPrompt,
  type FullProfile,
} from "~/lib/roadmap-prompt";
import { createClient } from "~/lib/supabase/server";

export async function POST(_req: NextRequest) {
  if (!env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on this server." },
      { status: 500 },
    );
  }
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load full profile in parallel
  const [profileRes, coursesRes, activitiesRes, awardsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "grade_level, unweighted_gpa, sat_score, act_score, school_type, major_category, specific_major, career_interest, selectivity",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order"),
    supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order"),
    supabase
      .from("awards")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order"),
  ]);

  const p = profileRes.data;
  if (!p) {
    return NextResponse.json(
      { error: "Profile not found. Please complete Step 1 first." },
      { status: 400 },
    );
  }
  if (!p.grade_level || !p.major_category) {
    return NextResponse.json(
      {
        error:
          "Profile incomplete. Grade level and intended major are required.",
      },
      { status: 400 },
    );
  }

  // Assemble the FullProfile object
  const fullProfile: FullProfile = {
    step1: {
      info: {
        gradeLevel: p.grade_level,
        unweightedGpa: p.unweighted_gpa != null ? String(p.unweighted_gpa) : "",
        satScore: p.sat_score != null ? String(p.sat_score) : "",
        actScore: p.act_score != null ? String(p.act_score) : "",
      },
      courses: (coursesRes.data ?? []).map(
        (c: {
          id: string;
          name: string;
          type: string;
          status: string;
          grade_level: string;
          ap_exam_score: string;
        }) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          gradeLevel: c.grade_level,
          apExamScore: c.ap_exam_score,
        }),
      ),
    },
    schoolInfo: p.school_type ? { schoolType: p.school_type as string } : null,
    step2: {
      majorCategory: p.major_category,
      specificMajor: p.specific_major ?? "",
      careerInterest: p.career_interest ?? "",
      selectivity: p.selectivity ?? "",
    },
    step3: {
      activities: (activitiesRes.data ?? []).map(
        (a: {
          id: string;
          name: string;
          category: string;
          grades: string[];
          leadership_role: string;
          description: string;
          hours_per_week: number | null;
          weeks_per_year: number | null;
          meaningfulness: number | null;
        }) => ({
          id: a.id,
          name: a.name,
          category: a.category,
          grades: a.grades ?? [],
          leadershipRole: a.leadership_role,
          description: a.description,
          hoursPerWeek:
            a.hours_per_week != null ? String(a.hours_per_week) : "",
          weeksPerYear:
            a.weeks_per_year != null ? String(a.weeks_per_year) : "",
          meaningfulness: a.meaningfulness,
        }),
      ),
      awards: (awardsRes.data ?? []).map(
        (a: { id: string; name: string; level: string; grade: string }) => ({
          id: a.id,
          name: a.name,
          level: a.level,
          grade: a.grade,
        }),
      ),
    },
  };

  // Get timeline context from current server time
  const timeline = getApplicationTimeline(p.grade_level);

  // Build the prompt
  const prompt = buildRoadmapPrompt(fullProfile, timeline);

  // Call Claude
  let roadmapContent: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8192,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }
    roadmapContent = block.text;
  } catch (err) {
    console.error("Claude API error:", err);
    return NextResponse.json(
      { error: "Failed to generate roadmap. Please try again." },
      { status: 500 },
    );
  }

  // Save roadmap to Supabase
  const { data: roadmap, error: insertError } = await supabase
    .from("roadmaps")
    .insert({
      user_id: user.id,
      content: roadmapContent,
      grade_level: p.grade_level,
      timeline_stage: timeline.timelineStage,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Supabase insert error:", insertError);
    return NextResponse.json(
      { error: "Roadmap generated but failed to save. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ roadmapId: roadmap.id });
}
