import { createAdminClient } from "~/lib/supabase/admin";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedbackRow {
  id: string;
  email: string | null;
  subject: string;
  message: string;
  created_at: string;
  user: { email: string } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminFeedbackPage() {
  const admin = createAdminClient();

  const { data } = await admin
    .from("feedback")
    .select("id, email, subject, message, created_at")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as FeedbackRow[];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          Feedback submissions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} submission{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No feedback submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {row.subject || "(no subject)"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.email ?? "Unknown user"} · {formatDate(row.created_at)}
                  </p>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {row.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
