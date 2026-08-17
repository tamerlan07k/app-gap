"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { ACTIVITY_CATEGORY_LABELS } from "~/lib/profile-labels";
import { cn } from "~/lib/utils";
import { type ActivityInput, addActivity, updateActivity } from "./actions";

const DESCRIPTION_LIMIT = 300;
const GRADES = ["9", "10", "11", "12"] as const;
const MEANINGFULNESS = [
  { value: 1, label: "Minor" },
  { value: 2, label: "Somewhat" },
  { value: 3, label: "Meaningful" },
  { value: 4, label: "Very meaningful" },
  { value: 5, label: "Shaped who I am" },
];

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

export type EditableActivity = {
  id: string;
  name: string;
  category: string;
  grades: string[];
  leadershipRole: string;
  description: string;
  hoursPerWeek: number | null;
  weeksPerYear: number | null;
  meaningfulness: number | null;
};

// Add/edit form for a single activity. When `activity` is provided it edits that
// row; otherwise it adds a new one. Native selects are used (the design system
// has no select primitive) styled to match Input. On success it calls onSaved so
// the parent can collapse the form and let revalidation refresh the list.
export function ActivityForm({
  activity,
  onSaved,
  onCancel,
}: {
  activity?: EditableActivity;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(activity?.name ?? "");
  const [category, setCategory] = useState(activity?.category ?? "");
  const [grades, setGrades] = useState<string[]>(activity?.grades ?? []);
  const [leadershipRole, setLeadershipRole] = useState(
    activity?.leadershipRole ?? "",
  );
  const [description, setDescription] = useState(activity?.description ?? "");
  const [hoursPerWeek, setHoursPerWeek] = useState(
    activity?.hoursPerWeek != null ? String(activity.hoursPerWeek) : "",
  );
  const [weeksPerYear, setWeeksPerYear] = useState(
    activity?.weeksPerYear != null ? String(activity.weeksPerYear) : "",
  );
  const [meaningfulness, setMeaningfulness] = useState<number | null>(
    activity?.meaningfulness ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleGrade(g: string) {
    setGrades((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].sort(),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give the activity a name.");
      return;
    }

    const input: ActivityInput = {
      name: name.trim(),
      category,
      grades: grades as ActivityInput["grades"],
      leadershipRole,
      description,
      hoursPerWeek: hoursPerWeek ? Number.parseInt(hoursPerWeek, 10) : null,
      weeksPerYear: weeksPerYear ? Number.parseInt(weeksPerYear, 10) : null,
      meaningfulness,
    };

    startTransition(async () => {
      const res = activity
        ? await updateActivity(activity.id, input)
        : await addActivity(input);
      if (!res.ok) {
        setError(res.error ?? "Couldn't save the activity.");
        return;
      }
      onSaved();
    });
  }

  const descOver = description.length > DESCRIPTION_LIMIT;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-brand-teal/30 bg-brand-teal/[0.03] p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="act-name">Activity name</Label>
          <Input
            id="act-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Robotics Club, Hospital Volunteer, Personal App"
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="act-category">Category</Label>
          <select
            id="act-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectClass}
          >
            <option value="">Select a category…</option>
            {Object.entries(ACTIVITY_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="act-role">Leadership role (optional)</Label>
          <Input
            id="act-role"
            value={leadershipRole}
            onChange={(e) => setLeadershipRole(e.target.value)}
            placeholder="e.g. President, Founder, Team Captain"
            maxLength={200}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Grades involved</Label>
        <div className="flex flex-wrap gap-2">
          {GRADES.map((g) => {
            const active = grades.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGrade(g)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                Grade {g}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="act-desc">Description (optional)</Label>
          <span
            className={cn(
              "text-xs tabular-nums",
              descOver ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {description.length} / {DESCRIPTION_LIMIT}
          </span>
        </div>
        <Textarea
          id="act-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="1–2 sentences: what you did and any impact."
          rows={2}
          maxLength={DESCRIPTION_LIMIT}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="act-hpw">Hours / week</Label>
          <Input
            id="act-hpw"
            type="number"
            min={1}
            max={80}
            value={hoursPerWeek}
            onChange={(e) => setHoursPerWeek(e.target.value)}
            placeholder="e.g. 5"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="act-wpy">Weeks / year</Label>
          <Input
            id="act-wpy"
            type="number"
            min={1}
            max={52}
            value={weeksPerYear}
            onChange={(e) => setWeeksPerYear(e.target.value)}
            placeholder="e.g. 30"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="act-mean">Personal significance</Label>
          <select
            id="act-mean"
            value={meaningfulness ?? ""}
            onChange={(e) =>
              setMeaningfulness(
                e.target.value ? Number.parseInt(e.target.value, 10) : null,
              )
            }
            className={selectClass}
          >
            <option value="">Not set</option>
            {MEANINGFULNESS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.value} — {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {activity ? "Save changes" : "Add activity"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
