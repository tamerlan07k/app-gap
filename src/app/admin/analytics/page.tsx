import { TrendingDown, TrendingUp } from "lucide-react";
import { createAdminClient } from "~/lib/supabase/admin";
import { type ChartPoint, LineChart } from "./line-chart";

export const metadata = { title: "Analytics — AppGap Admin" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, month0: number): string {
  return new Date(year, month0, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

/** Build a gap-free month series from the earliest signup through this month. */
function buildGrowthSeries(createdDates: Date[]): ChartPoint[] {
  if (createdDates.length === 0) return [];

  const counts = new Map<string, number>();
  let earliest = createdDates[0];
  for (const d of createdDates) {
    const key = monthKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (d < earliest) earliest = d;
  }

  const points: ChartPoint[] = [];
  const cursor = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 1);

  while (cursor <= end) {
    const key = monthKey(cursor);
    points.push({
      label: monthLabel(cursor.getFullYear(), cursor.getMonth()),
      value: counts.get(key) ?? 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return points;
}

/** Daily active users for the trailing `days` days (UTC), gap-free. */
function buildActivitySeries(
  sessionDates: string[],
  days: number,
): ChartPoint[] {
  const counts = new Map<string, number>();
  for (const d of sessionDates) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }

  const points: ChartPoint[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    points.push({
      label: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      value: counts.get(key) ?? 0,
    });
  }
  return points;
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {trend && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
              trend.positive
                ? "text-brand-teal"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {trend.positive ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function AdminAnalyticsPage() {
  const admin = createAdminClient();

  const [usersRes, sessionsRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("user_sessions").select("user_id, session_date"),
  ]);

  const createdDates = (usersRes.data?.users ?? []).map(
    (u) => new Date(u.created_at),
  );

  // ── User growth ──
  const growthSeries = buildGrowthSeries(createdDates);
  const totalUsers = createdDates.length;

  const now = new Date();
  const thisKey = monthKey(now);
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = monthKey(lastDate);

  const newThisMonth = createdDates.filter(
    (d) => monthKey(d) === thisKey,
  ).length;
  const newLastMonth = createdDates.filter(
    (d) => monthKey(d) === lastKey,
  ).length;

  const growthPct =
    newLastMonth === 0
      ? newThisMonth > 0
        ? 100
        : 0
      : Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100);

  // ── User activity ──
  const sessions = (sessionsRes.data ?? []) as {
    user_id: string;
    session_date: string;
  }[];
  const activitySeries = buildActivitySeries(
    sessions.map((s) => s.session_date),
    30,
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayActive = sessions.filter(
    (s) => s.session_date === todayKey,
  ).length;

  const daysByUser = new Map<string, Set<string>>();
  for (const s of sessions) {
    const set = daysByUser.get(s.user_id) ?? new Set<string>();
    set.add(s.session_date);
    daysByUser.set(s.user_id, set);
  }
  const distinctUsers = daysByUser.size;
  const returningUsers = [...daysByUser.values()].filter(
    (set) => set.size >= 2,
  ).length;
  const returningPct =
    distinctUsers === 0
      ? 0
      : Math.round((returningUsers / distinctUsers) * 100);
  const avgSessions =
    distinctUsers === 0 ? "0" : (sessions.length / distinctUsers).toFixed(1);

  return (
    <div className="space-y-10">
      {/* User Growth */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">User Growth</h2>
          <p className="text-sm text-muted-foreground">
            New signups per month, from real account timestamps.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total users" value={String(totalUsers)} />
          <StatCard label="New users this month" value={String(newThisMonth)} />
          <StatCard
            label="Growth vs last month"
            value={`${growthPct >= 0 ? "+" : ""}${growthPct}%`}
            trend={{ value: growthPct, positive: growthPct >= 0 }}
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <LineChart points={growthSeries} valueSuffix=" users" />
        </div>
      </section>

      {/* User Activity */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            User Activity
          </h2>
          <p className="text-sm text-muted-foreground">
            Daily active authenticated users over the last 30 days.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Returning users" value={`${returningPct}%`} />
          <StatCard label="Avg. sessions per user" value={avgSessions} />
          <StatCard label="Active today" value={String(todayActive)} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <LineChart
            points={activitySeries}
            color="oklch(0.6 0.13 255)"
            valueSuffix=" active"
          />
        </div>
      </section>
    </div>
  );
}
