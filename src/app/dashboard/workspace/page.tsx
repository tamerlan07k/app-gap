import { resolveFeatureAccess } from "~/lib/ai/config";
import { type EntitlementProfile, resolveEntitlement } from "~/lib/entitlement";
import { loadFullProfile } from "~/lib/profile-full";
import { MAJOR_LABELS } from "~/lib/profile-labels";
import type { AssessmentResult } from "~/lib/roadmap/assessment";
import { buildRoadmapContext } from "~/lib/roadmap/context";
import {
  computeFoundationState,
  hasClearMajor,
} from "~/lib/roadmap/foundation";
import { deriveRoadmap, roadmapProgress } from "~/lib/roadmap/select";
import type { SavedMilestone } from "~/lib/roadmap/types";
import { createClient } from "~/lib/supabase/server";
import { RoadmapClient, type WorkspaceView } from "./roadmap-client";

// My Roadmap — the connected journey. Students pass through a shared FOUNDATION
// (diagnostic → career direction → calendar → begin) before the four application
// branches are revealed. All foundation completion is derived deterministically
// from existing data + explicit confirmations.

export default async function WorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    loaded,
    profileRes,
    analysisRes,
    careerRes,
    calendarRes,
    calendarTasksRes,
    roadmapRes,
    collegesRes,
  ] = await Promise.all([
    loadFullProfile(supabase, user.id),
    supabase
      .from("profiles")
      .select(
        "subscription_tier, subscription_status, current_period_end, cancel_at_period_end, admin_override, admin_override_tier, admin_override_expires_at",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("ai_analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("career_assessments")
      .select("confirmed, result")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("calendars")
      .select("status, confirmed, provisional, deadline_label")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("calendar_tasks")
      .select("id, title, branch, due_date, deadline_sensitive")
      .eq("user_id", user.id)
      .order("due_date", { ascending: true }),
    supabase
      .from("roadmaps")
      .select("status, milestones, next_step_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_colleges")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const entitlement = resolveEntitlement(
    profileRes.data as EntitlementProfile | null,
    new Date(),
    user.email,
  );
  const entitled = resolveFeatureAccess(
    "roadmapGeneration",
    entitlement.tier,
  ).enabled;

  const profile = loaded?.profile ?? null;
  const ctx = profile
    ? buildRoadmapContext(profile, {
        targetCollegeCount: collegesRes.count ?? 0,
      })
    : null;

  // Diagnostic readiness: enough profile data to run the AppGap Analysis.
  const diagnosticMissing: string[] = [];
  if (profile) {
    if (!profile.gradeLevel) diagnosticMissing.push("your grade level");
    if (!profile.majorCategory && !profile.academicMajor)
      diagnosticMissing.push("an intended major or direction");
    if (profile.courses.length === 0 && profile.activities.length === 0)
      diagnosticMissing.push("at least one course or activity");
  } else {
    diagnosticMissing.push("your profile");
  }
  const profileReadyForDiagnostic = diagnosticMissing.length === 0;

  const hasAnalysis = (analysisRes.count ?? 0) > 0;
  const career = careerRes.data as {
    confirmed: boolean;
    result: AssessmentResult | null;
  } | null;
  const calendar = calendarRes.data as {
    status: string;
    confirmed: boolean;
    provisional: boolean;
    deadline_label: string | null;
  } | null;
  const calendarConfirmed =
    calendar?.status === "ready" && calendar?.confirmed === true;

  const roadmapRow = roadmapRes.data as {
    status: "generating" | "ready" | "failed";
    milestones: SavedMilestone[] | null;
    next_step_id: string | null;
  } | null;
  const journeyStarted = roadmapRow?.status === "ready";

  const clearMajor = hasClearMajor(
    profile?.majorCategory,
    profile?.academicMajor,
  );

  const foundation = computeFoundationState({
    hasAnalysis,
    profileReadyForDiagnostic,
    diagnosticMissing,
    careerConfirmed: career?.confirmed === true,
    hasClearMajor: clearMajor,
    calendarConfirmed,
    journeyStarted,
  });

  // Journey (branches) view.
  let milestones: WorkspaceView["milestones"] = [];
  let nextStepId: string | null = null;
  let progress = { completed: 0, total: 0, percent: 0 };
  let journeyStatus: WorkspaceView["journeyStatus"] = "none";
  if (roadmapRow?.status === "ready" && ctx) {
    const derived = deriveRoadmap(roadmapRow.milestones ?? [], ctx);
    milestones = derived.milestones;
    nextStepId = derived.nextStepId;
    progress = roadmapProgress(derived.milestones);
    journeyStatus = "ready";
  } else if (roadmapRow?.status === "generating") {
    journeyStatus = "generating";
  }

  const diagnosticHref = hasAnalysis
    ? "/dashboard/roadmaps"
    : profileReadyForDiagnostic
      ? "/profile/review"
      : "/profile";

  const existingMajorLabel = clearMajor
    ? (MAJOR_LABELS[profile?.majorCategory ?? ""] ?? null)
    : null;

  const view: WorkspaceView = {
    entitled,
    foundation,
    existingMajorLabel,
    careerResult: career?.result ?? null,
    calendarTasks:
      calendar && (calendarTasksRes.data?.length ?? 0) > 0
        ? (calendarTasksRes.data as WorkspaceView["calendarTasks"])
        : null,
    calendarConfirmed,
    calendarProvisional: calendar?.provisional ?? false,
    calendarDeadlineLabel: calendar?.deadline_label ?? null,
    diagnosticHref,
    diagnosticMissing,
    journeyStatus,
    milestones,
    nextStepId,
    progress,
  };

  return <RoadmapClient {...view} />;
}
