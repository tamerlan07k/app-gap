"use client";

import { ArrowLeft, ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Activity {
  id: string;
  name: string;
  category: string;
  grades: string[];
  leadershipRole: string;
  description: string;
  hoursPerWeek: string;
  weeksPerYear: string;
  meaningfulness: number | null;
}

interface Award {
  id: string;
  name: string;
  level: string;
  grade: string;
}

interface FormErrors {
  name?: string;
  category?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30";

const SELECT_ERROR_CLASS =
  "h-9 w-full rounded-md border border-destructive bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

const TEXTAREA_CLASS =
  "min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30 resize-none";

const ACTIVITY_CATEGORIES = [
  { value: "", label: "Select a category" },
  { value: "sports", label: "Sports / Athletics" },
  { value: "clubs", label: "Clubs & Organizations" },
  { value: "volunteering", label: "Community Service / Volunteering" },
  { value: "research", label: "Research" },
  { value: "internship", label: "Internship" },
  { value: "work", label: "Work / Employment" },
  { value: "personal-project", label: "Personal Project" },
  { value: "business", label: "Business / Startup" },
  { value: "arts", label: "Arts & Performance" },
  { value: "competitions", label: "Competitions & Olympiads" },
  { value: "cultural", label: "Cultural / Religious" },
  { value: "student-gov", label: "Student Government" },
  { value: "other", label: "Other" },
];

const AWARD_LEVELS = [
  { value: "", label: "Select level" },
  { value: "school", label: "School level" },
  { value: "regional", label: "Regional / District" },
  { value: "state-national", label: "State / National" },
  { value: "international", label: "International" },
];

const GRADE_YEARS = ["9", "10", "11", "12"];

const MEANINGFULNESS_LABELS: Record<number, string> = {
  1: "Did it to fill space",
  2: "Somewhat meaningful",
  3: "Genuinely enjoyed it",
  4: "Very meaningful to me",
  5: "Shaped who I am",
};

const MAX_ACTIVITIES = 10;
const MAX_AWARDS = 5;

// ─── Saved activity summary card ─────────────────────────────────────────────

function SavedActivityCard({
  activity,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const categoryLabel =
    ACTIVITY_CATEGORIES.find((c) => c.value === activity.category)?.label ??
    activity.category;

  const gradesText =
    activity.grades.length > 0
      ? `Grade${activity.grades.length > 1 ? "s" : ""} ${activity.grades.join(", ")}`
      : null;

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="min-w-0 space-y-1">
        <p className="font-medium leading-snug">
          {activity.name || "Untitled activity"}
        </p>
        <p className="text-sm text-muted-foreground">
          {categoryLabel}
          {gradesText ? ` · ${gradesText}` : ""}
        </p>
        {activity.leadershipRole && (
          <p className="text-xs text-muted-foreground">
            {activity.leadershipRole}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil className="size-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-3" />
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Activity form ────────────────────────────────────────────────────────────

function ActivityForm({
  activity,
  isEditing,
  errors,
  onChange,
  onSave,
  onCancel,
}: {
  activity: Activity;
  isEditing: boolean;
  errors: FormErrors;
  onChange: (field: keyof Activity, value: string | string[] | number | null) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  function toggleGrade(grade: string) {
    const next = activity.grades.includes(grade)
      ? activity.grades.filter((g) => g !== grade)
      : [...activity.grades, grade];
    onChange("grades", next);
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">
        {isEditing ? "Edit activity" : "New activity"}
      </p>

      {/* Name + Category */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`name-${activity.id}`}>Activity name</Label>
          <Input
            id={`name-${activity.id}`}
            type="text"
            placeholder="e.g. Varsity Soccer, Debate Club"
            value={activity.name}
            onChange={(e) => onChange("name", e.target.value)}
            aria-invalid={!!errors.name}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`category-${activity.id}`}>Category</Label>
          <select
            id={`category-${activity.id}`}
            value={activity.category}
            onChange={(e) => onChange("category", e.target.value)}
            className={errors.category ? SELECT_ERROR_CLASS : SELECT_CLASS}
          >
            {ACTIVITY_CATEGORIES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category}</p>
          )}
        </div>
      </div>

      {/* Grades participated */}
      <div className="space-y-2">
        <Label>Grades participated</Label>
        <div className="flex gap-4">
          {GRADE_YEARS.map((grade) => (
            <label
              key={grade}
              className="flex cursor-pointer items-center gap-1.5 text-sm"
            >
              <input
                type="checkbox"
                checked={activity.grades.includes(grade)}
                onChange={() => toggleGrade(grade)}
                className="rounded border-input"
              />
              Grade {grade}
            </label>
          ))}
        </div>
      </div>

      {/* Leadership role */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <Label htmlFor={`role-${activity.id}`}>Leadership role</Label>
          <span className="text-xs text-muted-foreground">optional</span>
        </div>
        <Input
          id={`role-${activity.id}`}
          type="text"
          placeholder="e.g. Team captain, Club president, Founder"
          value={activity.leadershipRole}
          onChange={(e) => onChange("leadershipRole", e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <Label htmlFor={`desc-${activity.id}`}>Description</Label>
          <span className="text-xs text-muted-foreground">1–2 sentences</span>
        </div>
        <textarea
          id={`desc-${activity.id}`}
          placeholder="Briefly describe what you did and what you contributed."
          value={activity.description}
          onChange={(e) => onChange("description", e.target.value)}
          className={TEXTAREA_CLASS}
          maxLength={300}
        />
      </div>

      {/* Hours + Weeks */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`hours-${activity.id}`}>Hours per week</Label>
          <Input
            id={`hours-${activity.id}`}
            type="number"
            inputMode="numeric"
            min={1}
            max={80}
            step={1}
            placeholder="e.g. 10"
            value={activity.hoursPerWeek}
            onChange={(e) => onChange("hoursPerWeek", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`weeks-${activity.id}`}>Weeks per year</Label>
          <Input
            id={`weeks-${activity.id}`}
            type="number"
            inputMode="numeric"
            min={1}
            max={52}
            step={1}
            placeholder="e.g. 36"
            value={activity.weeksPerYear}
            onChange={(e) => onChange("weeksPerYear", e.target.value)}
          />
        </div>
      </div>

      {/* Meaningfulness */}
      <div className="space-y-3">
        <Label>How meaningful was this activity to you?</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() =>
                onChange("meaningfulness", activity.meaningfulness === n ? null : n)
              }
              className={[
                "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
                activity.meaningfulness === n
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              ].join(" ")}
            >
              {n}
            </button>
          ))}
        </div>
        {activity.meaningfulness !== null && (
          <p className="text-xs text-muted-foreground">
            {MEANINGFULNESS_LABELS[activity.meaningfulness]}
          </p>
        )}
      </div>

      {/* Form actions */}
      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave}>
          Save activity
        </Button>
      </div>
    </div>
  );
}

// ─── Award row ────────────────────────────────────────────────────────────────

function AwardRow({
  award,
  index,
  onChange,
  onRemove,
}: {
  award: Award;
  index: number;
  onChange: (field: keyof Award, value: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid items-end gap-3 sm:grid-cols-[1fr_160px_100px_auto]">
      <div className="space-y-2">
        {index === 0 && (
          <Label htmlFor={`award-name-${award.id}`}>Award / honor</Label>
        )}
        <Input
          id={`award-name-${award.id}`}
          type="text"
          placeholder="e.g. National Merit Semifinalist"
          value={award.name}
          onChange={(e) => onChange("name", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        {index === 0 && (
          <Label htmlFor={`award-level-${award.id}`}>Level</Label>
        )}
        <select
          id={`award-level-${award.id}`}
          value={award.level}
          onChange={(e) => onChange("level", e.target.value)}
          className={SELECT_CLASS}
        >
          {AWARD_LEVELS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        {index === 0 && (
          <Label htmlFor={`award-grade-${award.id}`}>Grade</Label>
        )}
        <select
          id={`award-grade-${award.id}`}
          value={award.grade}
          onChange={(e) => onChange("grade", e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">—</option>
          {GRADE_YEARS.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove award"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeActivity(id: string): Activity {
  return {
    id,
    name: "",
    category: "",
    grades: [],
    leadershipRole: "",
    description: "",
    hoursPerWeek: "",
    weeksPerYear: "",
    meaningfulness: null,
  };
}

function makeAward(id: string): Award {
  return { id, name: "", level: "", grade: "" };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ActivitiesPage() {
  const activityCounter = useRef(1);
  const awardCounter = useRef(1);

  // saved: committed entries shown as summary cards
  const [saved, setSaved] = useState<Activity[]>([]);
  // draft: the single open form; null when no form is open
  const [draft, setDraft] = useState<Activity | null>(null);
  // editingId: id of the saved entry currently being edited (null = new entry)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [awards, setAwards] = useState<Award[]>([]);

  function openNewForm() {
    if (draft !== null || saved.length >= MAX_ACTIVITIES) return;
    const id = String(activityCounter.current++);
    setDraft(makeActivity(id));
    setEditingId(null);
    setFormErrors({});
  }

  function updateDraft(
    field: keyof Activity,
    value: string | string[] | number | null,
  ) {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    // clear the error for the field being edited
    if (field === "name" || field === "category") {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function saveDraft() {
    if (!draft) return;

    const errors: FormErrors = {};
    if (!draft.name.trim()) errors.name = "Activity name is required.";
    if (!draft.category) errors.category = "Please select a category.";
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingId !== null) {
      // replace in-place
      setSaved((prev) =>
        prev.map((a) => (a.id === editingId ? draft : a)),
      );
    } else {
      setSaved((prev) => [...prev, draft]);
    }

    setDraft(null);
    setEditingId(null);
    setFormErrors({});
  }

  function cancelDraft() {
    setDraft(null);
    setEditingId(null);
    setFormErrors({});
  }

  function editSaved(id: string) {
    const activity = saved.find((a) => a.id === id);
    if (!activity) return;
    setDraft({ ...activity });
    setEditingId(id);
    setFormErrors({});
  }

  function deleteSaved(id: string) {
    setSaved((prev) => prev.filter((a) => a.id !== id));
    if (editingId === id) {
      setDraft(null);
      setEditingId(null);
      setFormErrors({});
    }
  }

  function addAward() {
    if (awards.length >= MAX_AWARDS) return;
    const id = String(awardCounter.current++);
    setAwards((prev) => [...prev, makeAward(id)]);
  }

  function removeAward(id: string) {
    setAwards((prev) => prev.filter((a) => a.id !== id));
  }

  function updateAward(id: string, field: keyof Award, value: string) {
    setAwards((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );
  }

  const visibleSaved = saved.filter((a) => a.id !== editingId);
  const totalSaved = saved.length;
  const canAddMore = draft === null && totalSaved < MAX_ACTIVITIES;

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Page header */}
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Step 3 of 4
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Activities &amp; impact
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            List the activities you&apos;ve been involved in outside of class.
            Be honest about your commitment and what each one meant to you —
            depth matters more than length.
          </p>
        </div>

        {/* Activities section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Activities</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {totalSaved === 0
                  ? `Up to ${MAX_ACTIVITIES} activities.`
                  : `${totalSaved} of ${MAX_ACTIVITIES} saved.`}
              </p>
            </div>
            {canAddMore && (
              <Button variant="outline" size="sm" onClick={openNewForm}>
                <Plus />
                Add activity
              </Button>
            )}
          </div>

          {/* Saved summary cards */}
          {visibleSaved.map((activity) => (
            <SavedActivityCard
              key={activity.id}
              activity={activity}
              onEdit={() => editSaved(activity.id)}
              onDelete={() => deleteSaved(activity.id)}
            />
          ))}

          {/* Open form */}
          {draft !== null && (
            <ActivityForm
              activity={draft}
              isEditing={editingId !== null}
              errors={formErrors}
              onChange={updateDraft}
              onSave={saveDraft}
              onCancel={cancelDraft}
            />
          )}

          {/* Empty state — no saved entries and no open form */}
          {totalSaved === 0 && draft === null && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center">
              <p className="text-sm font-medium">No activities added yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add each activity one at a time and save it to your list.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={openNewForm}
                className="mt-4"
              >
                <Plus />
                Add activity
              </Button>
            </div>
          )}

          {totalSaved >= MAX_ACTIVITIES && draft === null && (
            <p className="text-center text-xs text-muted-foreground">
              Maximum of {MAX_ACTIVITIES} activities reached.
            </p>
          )}
        </div>

        {/* Awards section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Awards &amp; honors</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Academic awards, competitions, or recognition. Up to{" "}
                {MAX_AWARDS}.
              </p>
            </div>
            {awards.length < MAX_AWARDS && (
              <Button variant="outline" size="sm" onClick={addAward}>
                <Plus />
                Add award
              </Button>
            )}
          </div>

          {awards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-10 text-center">
              <p className="text-sm text-muted-foreground">
                No awards added.{" "}
                <button
                  type="button"
                  onClick={addAward}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Add one
                </button>{" "}
                if you have any.
              </p>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-border bg-card p-6 shadow-sm">
              {awards.map((award, index) => (
                <AwardRow
                  key={award.id}
                  award={award}
                  index={index}
                  onChange={(field, value) =>
                    updateAward(award.id, field, value)
                  }
                  onRemove={() => removeAward(award.id)}
                />
              ))}
              {awards.length < MAX_AWARDS && (
                <button
                  type="button"
                  onClick={addAward}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="size-3.5" />
                  Add another award
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/profile/career-direction">
              <ArrowLeft />
              Back
            </Link>
          </Button>
          <Button asChild>
            <Link href="/profile/review">
              Continue
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
