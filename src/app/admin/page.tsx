import { createAdminClient } from "~/lib/supabase/admin";
import { getFirstName, getLastName } from "~/lib/user";

// ─── Types ───────────────────────────────────────────────────────────────────

type OnboardingStatus = "not_started" | "in_progress" | "complete";

interface ProfileRow {
  id: string;
  grade_level: string | null;
  major_category: string | null;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  lastSignIn: string | null;
  onboarding: OnboardingStatus;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function onboardingStatus(profile: ProfileRow | undefined): OnboardingStatus {
  if (!profile || !profile.grade_level) return "not_started";
  if (!profile.major_category) return "in_progress";
  return "complete";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<OnboardingStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  complete:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const STATUS_LABELS: Record<OnboardingStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminUsersPage() {
  const admin = createAdminClient();

  const [usersRes, profilesRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("profiles").select("id, grade_level, major_category"),
  ]);

  const profileMap = new Map<string, ProfileRow>(
    (profilesRes.data ?? []).map((p) => [p.id, p as ProfileRow]),
  );

  const users: AdminUser[] = (usersRes.data?.users ?? [])
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map((u) => {
      const firstName = getFirstName(u);
      const lastName = getLastName(u);
      const name = [firstName, lastName].filter(Boolean).join(" ");
      return {
        id: u.id,
        name: name || "—",
        email: u.email ?? "—",
        joinedAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        onboarding: onboardingStatus(profileMap.get(u.id)),
      };
    });

  const totalUsers = users.length;
  const completeCount = users.filter((u) => u.onboarding === "complete").length;
  const recentlyActive = users.filter((u) => {
    if (!u.lastSignIn) return false;
    const diff = Date.now() - new Date(u.lastSignIn).getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total users", value: totalUsers },
          { label: "Onboarding complete", value: completeCount },
          { label: "Active (7d)", value: recentlyActive },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold">Registered users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3">Last login</th>
                <th className="px-6 py-3">Onboarding</th>
                <th className="px-6 py-3">Roadmap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-muted-foreground"
                  >
                    No users yet.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-6 py-4 font-medium">{u.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatDate(u.joinedAt)}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatDate(u.lastSignIn)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[u.onboarding]}`}
                    >
                      {STATUS_LABELS[u.onboarding]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      Pending
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
