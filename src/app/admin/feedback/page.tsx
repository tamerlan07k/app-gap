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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Feedback submissions</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {rows.length} submission{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground shadow-sm">
          No feedback submitted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {row.subject || "(no subject)"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.email ?? "Unknown user"} · {formatDate(row.created_at)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                {row.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
