"use client";

import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  ACADEMIC_AREAS,
  fieldKeyForMajor,
  majorsForArea,
  specializationsForMajor,
} from "~/lib/academic-interests";
import { GPA_SCALES, gpaScaleLabel, RANK_BANDS } from "~/lib/academics";
import {
  saveSchoolTypeToDb,
  saveStep1ToDb,
  saveStep2ToDb,
  saveStep3ToDb,
} from "~/lib/profile-db";
import type {
  AcademicInfo,
  Activity,
  Award,
  CareerDirection,
  Course,
} from "~/lib/profile-storage";
import { ACTIVITY_CHAR_LIMIT, countChars } from "~/lib/writing/checks";

// ─── Shared styles (match the onboarding form fields exactly) ────────────────

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30";
const SELECT_ERROR_CLASS =
  "h-9 w-full rounded-md border border-destructive bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";
const TEXTAREA_CLASS =
  "min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30 resize-none";

const GRADE_OPTIONS = [
  { value: "", label: "Select grade level" },
  { value: "9", label: "9th grade" },
  { value: "10", label: "10th grade" },
  { value: "11", label: "11th grade" },
  { value: "12", label: "12th grade" },
  { value: "gap", label: "Graduated / gap year" },
];
const SCHOOL_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "public", label: "Public High School" },
  { value: "private", label: "Private High School" },
  { value: "early-college", label: "Early College" },
  { value: "magnet-stem", label: "Magnet / STEM" },
  { value: "homeschool", label: "Homeschool" },
  { value: "other", label: "Other" },
];
const COURSE_TYPES = [
  { value: "", label: "Select course type" },
  { value: "ap", label: "AP" },
  { value: "honors", label: "Honors" },
  { value: "ib", label: "IB" },
  { value: "dual-enrollment", label: "Dual Enrollment / College Course" },
  { value: "other", label: "Other" },
];
const COURSE_STATUSES = [
  { value: "", label: "Select status" },
  { value: "current", label: "Current" },
  { value: "completed", label: "Completed" },
  { value: "planned", label: "Planned" },
];
const COURSE_GRADE_LEVELS = [
  { value: "", label: "Select grade" },
  { value: "9", label: "Grade 9" },
  { value: "10", label: "Grade 10" },
  { value: "11", label: "Grade 11" },
  { value: "12", label: "Grade 12" },
];
const AP_EXAM_SCORES = [
  { value: "", label: "Select score" },
  { value: "not-taken", label: "Not Taken" },
  { value: "not-reporting", label: "Not Reporting" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];
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
const MAX_COURSES = 20;
const MAX_ACTIVITIES = 10;
const MAX_AWARDS = 5;

function clamp(
  value: string,
  min: number,
  max: number,
  integer = false,
): string {
  const n = integer ? parseInt(value, 10) : parseFloat(value);
  if (Number.isNaN(n) || value === "") return value;
  return String(Math.min(max, Math.max(min, integer ? Math.round(n) : n)));
}

// ─── Section + field shells ──────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          {title}
        </p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-5 p-6">{children}</div>
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Course sub-forms (adapted from the onboarding editor) ───────────────────

function SavedCourseCard({
  course,
  onEdit,
  onDelete,
}: {
  course: Course;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeLabel =
    COURSE_TYPES.find((t) => t.value === course.type)?.label ?? course.type;
  const statusLabel =
    COURSE_STATUSES.find((s) => s.value === course.status)?.label ??
    course.status;
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-4">
      <div className="min-w-0 space-y-1">
        <p className="font-medium leading-snug">
          {course.name || "Untitled course"}
        </p>
        <p className="text-sm text-muted-foreground">
          {typeLabel}
          {course.gradeLevel ? ` · Grade ${course.gradeLevel}` : ""}
          {statusLabel ? ` · ${statusLabel}` : ""}
        </p>
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

interface CourseErrors {
  name?: string;
  type?: string;
  status?: string;
  gradeLevel?: string;
}

function CourseForm({
  course,
  isEditing,
  errors,
  onChange,
  onSave,
  onCancel,
}: {
  course: Course;
  isEditing: boolean;
  errors: CourseErrors;
  onChange: (field: keyof Course, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const showApScore = course.type === "ap" && course.status === "completed";
  return (
    <div className="space-y-5 rounded-xl border border-border bg-background p-6">
      <p className="text-sm font-medium text-muted-foreground">
        {isEditing ? "Edit course" : "New course"}
      </p>
      <div className="space-y-2">
        <Label htmlFor={`course-name-${course.id}`}>Course name</Label>
        <Input
          id={`course-name-${course.id}`}
          type="text"
          placeholder="e.g. AP Calculus BC, Honors English"
          value={course.name}
          onChange={(e) => onChange("name", e.target.value)}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`course-type-${course.id}`}>Course type</Label>
          <select
            id={`course-type-${course.id}`}
            value={course.type}
            onChange={(e) => onChange("type", e.target.value)}
            className={errors.type ? SELECT_ERROR_CLASS : SELECT_CLASS}
          >
            {COURSE_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.type && (
            <p className="text-xs text-destructive">{errors.type}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`course-status-${course.id}`}>Status</Label>
          <select
            id={`course-status-${course.id}`}
            value={course.status}
            onChange={(e) => onChange("status", e.target.value)}
            className={errors.status ? SELECT_ERROR_CLASS : SELECT_CLASS}
          >
            {COURSE_STATUSES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.status && (
            <p className="text-xs text-destructive">{errors.status}</p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`course-grade-${course.id}`}>Grade level taken</Label>
          <select
            id={`course-grade-${course.id}`}
            value={course.gradeLevel}
            onChange={(e) => onChange("gradeLevel", e.target.value)}
            className={errors.gradeLevel ? SELECT_ERROR_CLASS : SELECT_CLASS}
          >
            {COURSE_GRADE_LEVELS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.gradeLevel && (
            <p className="text-xs text-destructive">{errors.gradeLevel}</p>
          )}
        </div>
        {showApScore && (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <Label htmlFor={`course-ap-${course.id}`}>AP exam score</Label>
              <span className="text-xs text-muted-foreground">optional</span>
            </div>
            <select
              id={`course-ap-${course.id}`}
              value={course.apExamScore}
              onChange={(e) => onChange("apExamScore", e.target.value)}
              className={SELECT_CLASS}
            >
              {AP_EXAM_SCORES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave}>
          Save course
        </Button>
      </div>
    </div>
  );
}

// ─── Activity sub-forms ──────────────────────────────────────────────────────

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
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background p-4">
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

interface ActivityErrors {
  name?: string;
  category?: string;
}

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
  errors: ActivityErrors;
  onChange: (
    field: keyof Activity,
    value: string | string[] | number | null,
  ) => void;
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
    <div className="space-y-5 rounded-xl border border-border bg-background p-6">
      <p className="text-sm font-medium text-muted-foreground">
        {isEditing ? "Edit activity" : "New activity"}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`act-name-${activity.id}`}>Activity name</Label>
          <Input
            id={`act-name-${activity.id}`}
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
          <Label htmlFor={`act-cat-${activity.id}`}>Category</Label>
          <select
            id={`act-cat-${activity.id}`}
            value={activity.category}
            onChange={(e) => onChange("category", e.target.value)}
            className={errors.category ? SELECT_ERROR_CLASS : SELECT_CLASS}
          >
            {ACTIVITY_CATEGORIES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="text-xs text-destructive">{errors.category}</p>
          )}
        </div>
      </div>
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
      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <Label htmlFor={`act-role-${activity.id}`}>Leadership role</Label>
          <span className="text-xs text-muted-foreground">optional</span>
        </div>
        <Input
          id={`act-role-${activity.id}`}
          type="text"
          placeholder="e.g. Team captain, Club president, Founder"
          value={activity.leadershipRole}
          onChange={(e) => onChange("leadershipRole", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <Label htmlFor={`act-desc-${activity.id}`}>Description</Label>
            <span className="text-xs text-muted-foreground">1–2 sentences</span>
          </div>
          <span
            className={[
              "text-xs tabular-nums",
              countChars(activity.description) > ACTIVITY_CHAR_LIMIT
                ? "text-destructive"
                : "text-muted-foreground",
            ].join(" ")}
          >
            {countChars(activity.description)} / {ACTIVITY_CHAR_LIMIT}{" "}
            characters
          </span>
        </div>
        <textarea
          id={`act-desc-${activity.id}`}
          placeholder="Briefly describe what you did and what you contributed."
          value={activity.description}
          onChange={(e) => onChange("description", e.target.value)}
          className={TEXTAREA_CLASS}
          maxLength={300}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`act-hours-${activity.id}`}>Hours per week</Label>
          <Input
            id={`act-hours-${activity.id}`}
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
          <Label htmlFor={`act-weeks-${activity.id}`}>Weeks per year</Label>
          <Input
            id={`act-weeks-${activity.id}`}
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
      <div className="space-y-3">
        <Label>How meaningful was this activity to you?</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() =>
                onChange(
                  "meaningfulness",
                  activity.meaningfulness === n ? null : n,
                )
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
          {AWARD_LEVELS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
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

// ─── Factory helpers ─────────────────────────────────────────────────────────

function emptyCourse(id: string): Course {
  return {
    id,
    name: "",
    type: "",
    status: "",
    gradeLevel: "",
    apExamScore: "",
  };
}
function emptyActivity(id: string): Activity {
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
function emptyAward(id: string): Award {
  return { id, name: "", level: "", grade: "" };
}

type SavePhase = "idle" | "saving" | "reassessing" | "reassess-error";

// ─── Workspace ───────────────────────────────────────────────────────────────

export function ProfileEditWorkspace({
  initialInfo,
  initialSchoolType,
  initialCourses,
  initialDirection,
  initialActivities,
  initialAwards,
}: {
  initialInfo: AcademicInfo;
  initialSchoolType: string;
  initialCourses: Course[];
  initialDirection: CareerDirection;
  initialActivities: Activity[];
  initialAwards: Award[];
}) {
  const router = useRouter();
  const idCounter = useRef(0);
  const newId = () => `edit-${idCounter.current++}`;

  // ── Section state (local draft — nothing persists until Save) ──
  const [info, setInfo] = useState(initialInfo);
  const [schoolType, setSchoolType] = useState(initialSchoolType);
  const [courses, setCourses] = useState(initialCourses);
  const [direction, setDirection] = useState(initialDirection);
  const [activities, setActivities] = useState(initialActivities);
  const [awards, setAwards] = useState(initialAwards);

  // ── Transient sub-form state ──
  const [courseDraft, setCourseDraft] = useState<Course | null>(null);
  const [courseEditingId, setCourseEditingId] = useState<string | null>(null);
  const [courseErrors, setCourseErrors] = useState<CourseErrors>({});
  const [activityDraft, setActivityDraft] = useState<Activity | null>(null);
  const [activityEditingId, setActivityEditingId] = useState<string | null>(
    null,
  );
  const [activityErrors, setActivityErrors] = useState<ActivityErrors>({});

  // ── Validation + save state ──
  const [errors, setErrors] = useState<{
    gradeLevel?: string;
    gpaValue?: string;
    academicMajor?: string;
  }>({});
  const [phase, setPhase] = useState<SavePhase>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [reassessError, setReassessError] = useState<string | null>(null);

  const busy = phase === "saving" || phase === "reassessing";
  const subFormOpen = courseDraft !== null || activityDraft !== null;

  // ── Academic + career field setters ──
  function setAcademic(field: keyof AcademicInfo, value: string | boolean) {
    setInfo((prev) => ({ ...prev, [field]: value }));
    if (field === "gradeLevel" || field === "gpaValue") {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }
  function selectArea(areaKey: string) {
    setDirection((prev) => ({
      ...prev,
      academicArea: areaKey,
      academicMajor: "",
      academicInterests: [],
      majorCategory: "",
    }));
  }
  function selectMajor(majorKey: string) {
    setDirection((prev) => ({
      ...prev,
      academicMajor: majorKey,
      majorCategory: majorKey ? fieldKeyForMajor(majorKey) : "",
      academicInterests: [],
    }));
    setErrors((prev) => ({ ...prev, academicMajor: undefined }));
  }
  function toggleInterest(specKey: string) {
    setDirection((prev) => {
      const has = prev.academicInterests.includes(specKey);
      return {
        ...prev,
        academicInterests: has
          ? prev.academicInterests.filter((k) => k !== specKey)
          : [...prev.academicInterests, specKey],
      };
    });
  }

  // ── Course handlers ──
  function openNewCourse() {
    if (courseDraft || courses.length >= MAX_COURSES) return;
    setCourseDraft(emptyCourse(newId()));
    setCourseEditingId(null);
    setCourseErrors({});
  }
  function changeCourseDraft(field: keyof Course, value: string) {
    setCourseDraft((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      if (
        (field === "type" && value !== "ap") ||
        (field === "status" && value !== "completed")
      ) {
        updated.apExamScore = "";
      }
      return updated;
    });
    if (["name", "type", "status", "gradeLevel"].includes(field)) {
      setCourseErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }
  function saveCourseDraft() {
    if (!courseDraft) return;
    const errs: CourseErrors = {};
    if (!courseDraft.name.trim()) errs.name = "Course name is required.";
    if (!courseDraft.type) errs.type = "Please select a course type.";
    if (!courseDraft.status) errs.status = "Please select a status.";
    if (!courseDraft.gradeLevel)
      errs.gradeLevel = "Please select a grade level.";
    if (Object.keys(errs).length > 0) {
      setCourseErrors(errs);
      return;
    }
    setCourses((prev) =>
      courseEditingId
        ? prev.map((c) => (c.id === courseEditingId ? courseDraft : c))
        : [...prev, courseDraft],
    );
    setCourseDraft(null);
    setCourseEditingId(null);
    setCourseErrors({});
  }
  function editCourse(id: string) {
    const c = courses.find((x) => x.id === id);
    if (!c) return;
    setCourseDraft({ ...c });
    setCourseEditingId(id);
    setCourseErrors({});
  }
  function deleteCourse(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
    if (courseEditingId === id) {
      setCourseDraft(null);
      setCourseEditingId(null);
    }
  }

  // ── Activity handlers ──
  function openNewActivity() {
    if (activityDraft || activities.length >= MAX_ACTIVITIES) return;
    setActivityDraft(emptyActivity(newId()));
    setActivityEditingId(null);
    setActivityErrors({});
  }
  function changeActivityDraft(
    field: keyof Activity,
    value: string | string[] | number | null,
  ) {
    setActivityDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    if (field === "name" || field === "category") {
      setActivityErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }
  function saveActivityDraft() {
    if (!activityDraft) return;
    const errs: ActivityErrors = {};
    if (!activityDraft.name.trim()) errs.name = "Activity name is required.";
    if (!activityDraft.category) errs.category = "Please select a category.";
    if (Object.keys(errs).length > 0) {
      setActivityErrors(errs);
      return;
    }
    setActivities((prev) =>
      activityEditingId
        ? prev.map((a) => (a.id === activityEditingId ? activityDraft : a))
        : [...prev, activityDraft],
    );
    setActivityDraft(null);
    setActivityEditingId(null);
    setActivityErrors({});
  }
  function editActivity(id: string) {
    const a = activities.find((x) => x.id === id);
    if (!a) return;
    setActivityDraft({ ...a });
    setActivityEditingId(id);
    setActivityErrors({});
  }
  function deleteActivity(id: string) {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    if (activityEditingId === id) {
      setActivityDraft(null);
      setActivityEditingId(null);
    }
  }

  // ── Award handlers ──
  function addAward() {
    if (awards.length >= MAX_AWARDS) return;
    setAwards((prev) => [...prev, emptyAward(newId())]);
  }
  function updateAward(id: string, field: keyof Award, value: string) {
    setAwards((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    );
  }
  function removeAward(id: string) {
    setAwards((prev) => prev.filter((a) => a.id !== id));
  }

  // ── Persist + reassess ──
  function validate(): boolean {
    const next: typeof errors = {};
    if (!info.gradeLevel) next.gradeLevel = "Please select your grade level.";
    if (info.gpaScale !== "none" && !info.gpaValue.trim())
      next.gpaValue = "Please enter your GPA (or choose scale “None”).";
    if (!direction.academicMajor)
      next.academicMajor = "Please choose an area and a major.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function runReassessment() {
    setPhase("reassessing");
    setReassessError(null);
    try {
      const res = await fetch("/api/reassess-profile", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setReassessError(data.error ?? "Couldn't update your score.");
        setPhase("reassess-error");
        return;
      }
      // Success — the Overview's score card detects the new analysis id and plays
      // the reveal once. Refresh so the server component picks up the new row.
      router.push("/dashboard/profile");
      router.refresh();
    } catch {
      setReassessError("Something went wrong updating your score.");
      setPhase("reassess-error");
    }
  }

  async function handleSave() {
    if (busy || subFormOpen) return;
    if (!validate()) return;

    setSaveError(null);
    setPhase("saving");
    try {
      await saveStep1ToDb(info, courses);
      await saveSchoolTypeToDb({ schoolType });
      await saveStep2ToDb(direction);
      await saveStep3ToDb(activities, awards);
    } catch {
      setSaveError(
        "Couldn't save your changes. Please check your connection and try again.",
      );
      setPhase("idle");
      return;
    }
    // Profile is saved; now re-evaluate the diagnostic.
    await runReassessment();
  }

  const visibleCourses = courses.filter((c) => c.id !== courseEditingId);
  const visibleActivities = activities.filter(
    (a) => a.id !== activityEditingId,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold tracking-tight">Edit profile</h2>
        <p className="text-sm text-muted-foreground">
          Update your information, then save to re-evaluate your AppGap
          diagnostic. Your changes aren&apos;t saved until you choose Save
          changes.
        </p>
      </div>

      {/* Academic Profile */}
      <SectionCard title="Academic Profile">
        <Field id="grade-level" label="Grade level" error={errors.gradeLevel}>
          <select
            id="grade-level"
            value={info.gradeLevel}
            onChange={(e) => setAcademic("gradeLevel", e.target.value)}
            className={errors.gradeLevel ? SELECT_ERROR_CLASS : SELECT_CLASS}
          >
            {GRADE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            <Field id="gpa-value" label="GPA" error={errors.gpaValue}>
              <Input
                id="gpa-value"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.01}
                placeholder={info.gpaScale === "100" ? "e.g. 94" : "e.g. 3.7"}
                disabled={info.gpaScale === "none"}
                value={info.gpaValue}
                onChange={(e) => setAcademic("gpaValue", e.target.value)}
                onBlur={(e) => {
                  const max =
                    info.gpaScale === "100"
                      ? 100
                      : parseInt(info.gpaScale, 10) || 4;
                  if (e.target.value)
                    setAcademic("gpaValue", clamp(e.target.value, 0, max));
                }}
                className={errors.gpaValue ? "border-destructive" : ""}
              />
            </Field>
            <Field id="gpa-scale" label="Scale">
              <select
                id="gpa-scale"
                value={info.gpaScale}
                onChange={(e) => setAcademic("gpaScale", e.target.value)}
                className={SELECT_CLASS}
              >
                {GPA_SCALES.map((s) => (
                  <option key={s} value={s}>
                    {gpaScaleLabel(s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {info.gpaScale !== "none" && (
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="gpa-weighted"
                  checked={!info.gpaWeighted}
                  onChange={() => setAcademic("gpaWeighted", false)}
                />
                Unweighted
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="gpa-weighted"
                  checked={info.gpaWeighted}
                  onChange={() => setAcademic("gpaWeighted", true)}
                />
                Weighted
              </label>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="sat-score" label="SAT score" hint="optional · 400–1600">
            <Input
              id="sat-score"
              type="number"
              inputMode="numeric"
              min={400}
              max={1600}
              step={10}
              placeholder="e.g. 1350"
              value={info.satScore}
              onChange={(e) => setAcademic("satScore", e.target.value)}
              onBlur={(e) => {
                if (e.target.value)
                  setAcademic(
                    "satScore",
                    clamp(e.target.value, 400, 1600, true),
                  );
              }}
            />
          </Field>
          <Field id="act-score" label="ACT score" hint="optional · 1–36">
            <Input
              id="act-score"
              type="number"
              inputMode="numeric"
              min={1}
              max={36}
              step={1}
              placeholder="e.g. 30"
              value={info.actScore}
              onChange={(e) => setAcademic("actScore", e.target.value)}
              onBlur={(e) => {
                if (e.target.value)
                  setAcademic("actScore", clamp(e.target.value, 1, 36, true));
              }}
            />
          </Field>
        </div>

        <Field id="school-type" label="School type">
          <select
            id="school-type"
            value={schoolType}
            onChange={(e) => setSchoolType(e.target.value)}
            className={SELECT_CLASS}
          >
            {SCHOOL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="class-rank-type" label="Class rank" hint="optional">
          <select
            id="class-rank-type"
            value={info.classRankType}
            onChange={(e) => setAcademic("classRankType", e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="none">Not reporting / no rank</option>
            <option value="exact">Exact rank</option>
            <option value="decile">Decile (top 10%, 20%…)</option>
            <option value="quintile">Quintile (top 20%, 40%…)</option>
            <option value="quartile">Quartile (top 25%, 50%…)</option>
          </select>
        </Field>

        {info.classRankType === "exact" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="class-rank-value" label="Your rank" hint="1 = top">
              <Input
                id="class-rank-value"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="e.g. 12"
                value={info.classRankValue}
                onChange={(e) => setAcademic("classRankValue", e.target.value)}
              />
            </Field>
            <Field id="class-size" label="Graduating class size" hint="approx.">
              <Input
                id="class-size"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="e.g. 320"
                value={info.classSize}
                onChange={(e) => setAcademic("classSize", e.target.value)}
              />
            </Field>
          </div>
        )}

        {["decile", "quintile", "quartile"].includes(info.classRankType) && (
          <Field id="class-rank-band" label="Which band?">
            <select
              id="class-rank-band"
              value={info.classRankBand}
              onChange={(e) => setAcademic("classRankBand", e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Select band</option>
              {RANK_BANDS[
                info.classRankType as "decile" | "quintile" | "quartile"
              ].map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
        )}
      </SectionCard>

      {/* Career Direction */}
      <SectionCard title="Career Direction">
        <Field id="academic-area" label="Broad academic area">
          <select
            id="academic-area"
            value={direction.academicArea}
            onChange={(e) => selectArea(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Select an area</option>
            {ACADEMIC_AREAS.map((area) => (
              <option key={area.key} value={area.key}>
                {area.label}
              </option>
            ))}
          </select>
        </Field>

        {direction.academicArea && (
          <Field
            id="academic-major"
            label="Specific major"
            error={errors.academicMajor}
          >
            <select
              id="academic-major"
              value={direction.academicMajor}
              onChange={(e) => selectMajor(e.target.value)}
              className={
                errors.academicMajor ? SELECT_ERROR_CLASS : SELECT_CLASS
              }
            >
              <option value="">Select a major</option>
              {majorsForArea(direction.academicArea).map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        {specializationsForMajor(direction.academicMajor).length > 0 && (
          <Field
            id="academic-interests"
            label="Specializations / interests"
            hint="optional — pick any that apply"
          >
            <div className="flex flex-wrap gap-2">
              {specializationsForMajor(direction.academicMajor).map((spec) => {
                const active = direction.academicInterests.includes(spec.key);
                return (
                  <button
                    key={spec.key}
                    type="button"
                    onClick={() => toggleInterest(spec.key)}
                    aria-pressed={active}
                    className={
                      active
                        ? "rounded-full border border-brand-teal bg-brand-teal/10 px-3 py-1 text-sm font-medium text-brand-teal transition"
                        : "rounded-full border border-input px-3 py-1 text-sm text-muted-foreground transition hover:border-brand-teal/50 hover:text-foreground"
                    }
                  >
                    {spec.label}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <Field
          id="specific-major"
          label="Exact program name"
          hint="optional — if it isn't listed above"
        >
          <Input
            id="specific-major"
            type="text"
            placeholder="e.g. Symbolic Systems, PPE, Computational Biology"
            value={direction.specificMajor}
            onChange={(e) =>
              setDirection((prev) => ({
                ...prev,
                specificMajor: e.target.value,
              }))
            }
          />
        </Field>

        <Field
          id="career-interest"
          label="Career goal or industry"
          hint="optional"
        >
          <Input
            id="career-interest"
            type="text"
            placeholder="e.g. Software engineer, physician, policy analyst"
            value={direction.careerInterest}
            onChange={(e) =>
              setDirection((prev) => ({
                ...prev,
                careerInterest: e.target.value,
              }))
            }
          />
        </Field>
      </SectionCard>

      {/* Coursework */}
      <SectionCard title={`Coursework · ${courses.length}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            AP, Honors, IB, or other rigorous courses.
          </p>
          {!courseDraft && courses.length < MAX_COURSES && (
            <Button variant="outline" size="sm" onClick={openNewCourse}>
              <Plus />
              Add course
            </Button>
          )}
        </div>
        {visibleCourses.map((c) => (
          <SavedCourseCard
            key={c.id}
            course={c}
            onEdit={() => editCourse(c.id)}
            onDelete={() => deleteCourse(c.id)}
          />
        ))}
        {courseDraft && (
          <CourseForm
            course={courseDraft}
            isEditing={courseEditingId !== null}
            errors={courseErrors}
            onChange={changeCourseDraft}
            onSave={saveCourseDraft}
            onCancel={() => {
              setCourseDraft(null);
              setCourseEditingId(null);
              setCourseErrors({});
            }}
          />
        )}
        {courses.length === 0 && !courseDraft && (
          <p className="text-sm text-muted-foreground">No courses added.</p>
        )}
      </SectionCard>

      {/* Activities */}
      <SectionCard title={`Activities · ${activities.length}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            What you do outside class — depth matters more than length.
          </p>
          {!activityDraft && activities.length < MAX_ACTIVITIES && (
            <Button variant="outline" size="sm" onClick={openNewActivity}>
              <Plus />
              Add activity
            </Button>
          )}
        </div>
        {visibleActivities.map((a) => (
          <SavedActivityCard
            key={a.id}
            activity={a}
            onEdit={() => editActivity(a.id)}
            onDelete={() => deleteActivity(a.id)}
          />
        ))}
        {activityDraft && (
          <ActivityForm
            activity={activityDraft}
            isEditing={activityEditingId !== null}
            errors={activityErrors}
            onChange={changeActivityDraft}
            onSave={saveActivityDraft}
            onCancel={() => {
              setActivityDraft(null);
              setActivityEditingId(null);
              setActivityErrors({});
            }}
          />
        )}
        {activities.length === 0 && !activityDraft && (
          <p className="text-sm text-muted-foreground">No activities added.</p>
        )}
      </SectionCard>

      {/* Awards */}
      <SectionCard title={`Awards · ${awards.length}`}>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Academic awards, competitions, or recognition.
          </p>
          {awards.length < MAX_AWARDS && (
            <Button variant="outline" size="sm" onClick={addAward}>
              <Plus />
              Add award
            </Button>
          )}
        </div>
        {awards.length === 0 ? (
          <p className="text-sm text-muted-foreground">No awards added.</p>
        ) : (
          <div className="space-y-3">
            {awards.map((award, index) => (
              <AwardRow
                key={award.id}
                award={award}
                index={index}
                onChange={(field, value) => updateAward(award.id, field, value)}
                onRemove={() => removeAward(award.id)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Status messages */}
      {phase === "reassess-error" && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] px-4 py-3 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-amber-700 dark:text-amber-400">
              Profile saved — score not updated yet
            </p>
            <p className="text-muted-foreground">
              {reassessError} Your changes are saved; your score still reflects
              the last successful evaluation.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={runReassessment}
            >
              Retry score update
            </Button>
          </div>
        </div>
      )}
      {saveError && <p className="text-sm text-destructive">{saveError}</p>}

      {/* Action bar */}
      <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 px-5 py-4 shadow-sm backdrop-blur">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/profile")}
          disabled={busy}
        >
          <X />
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          {subFormOpen && (
            <p className="text-xs text-muted-foreground">
              Finish the open item first.
            </p>
          )}
          {phase === "reassessing" && (
            <p className="text-xs text-muted-foreground">
              Re-evaluating your diagnostic…
            </p>
          )}
          <Button onClick={handleSave} disabled={busy || subFormOpen}>
            {busy && <Loader2 className="animate-spin" />}
            {phase === "saving"
              ? "Saving…"
              : phase === "reassessing"
                ? "Updating score…"
                : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
