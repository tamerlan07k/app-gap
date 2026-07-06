import { BookOpen } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";

const GRADE_LABELS: Record<string, string> = {
  "9": "9th grade",
  "10": "10th grade",
  "11": "11th grade",
  "12": "12th grade",
  gap: "Gap year",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function RoadmapsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: roadmaps } = await supabase
    .from("roadmaps")
    .select("id, content, grade_level, timeline_stage, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const list = roadmaps ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Roadmaps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {list.length === 0
              ? "Your generated roadmaps will appear here."
              : `${list.length} roadmap${list.length !== 1 ? "s" : ""} saved.`}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/profile/review">Generate new</Link>
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <BookOpen className="mb-3 size-8 text-muted-foreground/50" />
          <p className="font-medium">No roadmaps yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete your profile and generate your first roadmap.
          </p>
          <Button asChild className="mt-4">
            <Link href="/profile">Build my profile</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {list.map(
            (roadmap: {
              id: string;
              content: string;
              grade_level: string | null;
              timeline_stage: string | null;
              created_at: string;
            }) => (
              <div
                key={roadmap.id}
                className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold">AppGap Roadmap</p>
                    <p className="text-xs text-muted-foreground">
                      Generated {formatDate(roadmap.created_at)}
                      {roadmap.grade_level
                        ? ` · ${GRADE_LABELS[roadmap.grade_level] ?? roadmap.grade_level}`
                        : ""}
                    </p>
                    {roadmap.timeline_stage && (
                      <p className="text-xs text-muted-foreground">
                        {roadmap.timeline_stage}
                      </p>
                    )}
                  </div>
                </div>

                {/* Roadmap content */}
                <div className="rounded-lg border border-border bg-background p-5">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                    {roadmap.content}
                  </pre>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
