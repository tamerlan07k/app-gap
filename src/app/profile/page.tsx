"use client";

import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AcademicInfo {
  gradeLevel: string;
  unweightedGpa: string;
  satScore: string;
  actScore: string;
}

interface FormErrors {
  gradeLevel?: string;
  unweightedGpa?: string;
}

interface Course {
  id: string;
  name: string;
  type: string;
  status: string;
  gradeLevel: string;
  apExamScore: string;
}

interface CourseFormErrors {
  name?: string;
  type?: string;
  status?: string;
  gradeLevel?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30";

const SELECT_ERROR_CLASS =
  "h-9 w-full rounded-md border border-destructive bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

const GRADE_OPTIONS = [
  { value: "", label: "Select grade level" },
  { value: "9", label: "9th grade" },
  { value: "10", label: "10th grade" },
  { value: "11", label: "11th grade" },
  { value: "12", label: "12th grade (senior)" },
  { value: "gap", label: "Graduated / gap year" },
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

const MAX_COURSES = 20;

// ─── Validation helpers ──────────────────────────────────────────────────────

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

// ─── Field helper ────────────────────────────────────────────────────────────

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

// ─── Saved course summary card ────────────────────────────────────────────────

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
  const apScoreLabel =
    course.type === "ap" && course.status === "completed" && course.apExamScore
      ? AP_EXAM_SCORES.find((s) => s.value === course.apExamScore)?.label
      : null;

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="min-w-0 space-y-1">
        <p className="font-medium leading-snug">
          {course.name || "Untitled course"}
        </p>
        <p className="text-sm text-muted-foreground">
          {typeLabel}
          {course.gradeLevel ? ` · Grade ${course.gradeLevel}` : ""}
          {` · ${statusLabel}`}
        </p>
        {apScoreLabel && (
          <p className="text-xs text-muted-foreground">
            AP Exam: {apScoreLabel}
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

// ─── Course form ──────────────────────────────────────────────────────────────

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
  errors: CourseFormErrors;
  onChange: (field: keyof Course, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const showApScore = course.type === "ap" && course.status === "completed";

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
      <p className="text-sm font-medium text-muted-foreground">
        {isEditing ? "Edit course" : "New course"}
      </p>

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor={`course-name-${course.id}`}>Course name</Label>
        <Input
          id={`course-name-${course.id}`}
          type="text"
          placeholder="e.g. AP Calculus BC, Honors English, IB Biology"
          value={course.name}
          onChange={(e) => onChange("name", e.target.value)}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Type + Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`course-type-${course.id}`}>Course type</Label>
          <select
            id={`course-type-${course.id}`}
            value={course.type}
            onChange={(e) => onChange("type", e.target.value)}
            className={errors.type ? SELECT_ERROR_CLASS : SELECT_CLASS}
          >
            {COURSE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
            {COURSE_STATUSES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.status && (
            <p className="text-xs text-destructive">{errors.status}</p>
          )}
        </div>
      </div>

      {/* Grade level + AP exam score (conditional) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`course-grade-${course.id}`}>Grade level taken</Label>
          <select
            id={`course-grade-${course.id}`}
            value={course.gradeLevel}
            onChange={(e) => onChange("gradeLevel", e.target.value)}
            className={errors.gradeLevel ? SELECT_ERROR_CLASS : SELECT_CLASS}
          >
            {COURSE_GRADE_LEVELS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
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
              <Label htmlFor={`course-ap-score-${course.id}`}>
                AP exam score
              </Label>
              <span className="text-xs text-muted-foreground">optional</span>
            </div>
            <select
              id={`course-ap-score-${course.id}`}
              value={course.apExamScore}
              onChange={(e) => onChange("apExamScore", e.target.value)}
              className={SELECT_CLASS}
            >
              {AP_EXAM_SCORES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Form actions */}
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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const courseCounter = useRef(1);

  // ── Academic info state ──
  const [info, setInfo] = useState<AcademicInfo>({
    gradeLevel: "",
    unweightedGpa: "",
    satScore: "",
    actScore: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // ── Coursework state ──
  const [savedCourses, setSavedCourses] = useState<Course[]>([]);
  const [courseDraft, setCourseDraft] = useState<Course | null>(null);
  const [courseEditingId, setCourseEditingId] = useState<string | null>(null);
  const [courseFormErrors, setCourseFormErrors] = useState<CourseFormErrors>(
    {},
  );

  function setAcademic(field: keyof AcademicInfo, value: string) {
    setInfo((prev) => ({ ...prev, [field]: value }));
    if (field === "gradeLevel" || field === "unweightedGpa") {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleContinue() {
    const next: FormErrors = {};
    if (!info.gradeLevel) next.gradeLevel = "Please select your grade level.";
    if (!info.unweightedGpa.trim())
      next.unweightedGpa = "Please enter your GPA.";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    router.push("/profile/career-direction");
  }

  // ── Course handlers ──

  function makeCourse(id: string): Course {
    return {
      id,
      name: "",
      type: "",
      status: "",
      gradeLevel: "",
      apExamScore: "",
    };
  }

  function openNewCourseForm() {
    if (courseDraft !== null || savedCourses.length >= MAX_COURSES) return;
    const id = String(courseCounter.current++);
    setCourseDraft(makeCourse(id));
    setCourseEditingId(null);
    setCourseFormErrors({});
  }

  function updateCourseDraft(field: keyof Course, value: string) {
    setCourseDraft((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      // clear AP exam score when it's no longer applicable
      if (
        (field === "type" && value !== "ap") ||
        (field === "status" && value !== "completed")
      ) {
        updated.apExamScore = "";
      }
      return updated;
    });
    if (
      field === "name" ||
      field === "type" ||
      field === "status" ||
      field === "gradeLevel"
    ) {
      setCourseFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function saveCourseDraft() {
    if (!courseDraft) return;
    const errs: CourseFormErrors = {};
    if (!courseDraft.name.trim()) errs.name = "Course name is required.";
    if (!courseDraft.type) errs.type = "Please select a course type.";
    if (!courseDraft.status) errs.status = "Please select a status.";
    if (!courseDraft.gradeLevel)
      errs.gradeLevel = "Please select a grade level.";

    if (Object.keys(errs).length > 0) {
      setCourseFormErrors(errs);
      return;
    }

    if (courseEditingId !== null) {
      setSavedCourses((prev) =>
        prev.map((c) => (c.id === courseEditingId ? courseDraft : c)),
      );
    } else {
      setSavedCourses((prev) => [...prev, courseDraft]);
    }

    setCourseDraft(null);
    setCourseEditingId(null);
    setCourseFormErrors({});
  }

  function cancelCourseDraft() {
    setCourseDraft(null);
    setCourseEditingId(null);
    setCourseFormErrors({});
  }

  function editSavedCourse(id: string) {
    const course = savedCourses.find((c) => c.id === id);
    if (!course) return;
    setCourseDraft({ ...course });
    setCourseEditingId(id);
    setCourseFormErrors({});
  }

  function deleteSavedCourse(id: string) {
    setSavedCourses((prev) => prev.filter((c) => c.id !== id));
    if (courseEditingId === id) {
      setCourseDraft(null);
      setCourseEditingId(null);
      setCourseFormErrors({});
    }
  }

  const visibleCourses = savedCourses.filter((c) => c.id !== courseEditingId);
  const canAddCourse =
    courseDraft === null && savedCourses.length < MAX_COURSES;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Page header */}
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Step 1 of 4
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Your academic profile
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Start with the core details of your academic profile. AppGap uses
            this to evaluate your current position, identify meaningful gaps,
            and build a clear path forward.
          </p>
        </div>

        {/* Section: Basic academic info */}
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1">
            <h2 className="font-semibold">Basic academic info</h2>
            <p className="text-sm text-muted-foreground">
              Fill in what you have. You can estimate GPA if you&apos;re not
              sure of the exact number.
            </p>
          </div>

          <div className="space-y-5">
            <Field
              id="grade-level"
              label="Grade level"
              error={errors.gradeLevel}
            >
              <select
                id="grade-level"
                value={info.gradeLevel}
                onChange={(e) => setAcademic("gradeLevel", e.target.value)}
                className={
                  errors.gradeLevel ? SELECT_ERROR_CLASS : SELECT_CLASS
                }
              >
                {GRADE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="unweighted-gpa"
              label="Unweighted GPA"
              hint="out of 4.0"
              error={errors.unweightedGpa}
            >
              <Input
                id="unweighted-gpa"
                type="number"
                inputMode="decimal"
                min={0}
                max={4}
                step={0.1}
                placeholder="e.g. 3.7"
                value={info.unweightedGpa}
                onChange={(e) => setAcademic("unweightedGpa", e.target.value)}
                onBlur={(e) => {
                  if (e.target.value)
                    setAcademic("unweightedGpa", clamp(e.target.value, 0, 4));
                }}
                className={errors.unweightedGpa ? "border-destructive" : ""}
              />
            </Field>

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
        </div>

        {/* Section: Coursework & Academic Rigor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Coursework &amp; academic rigor</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {savedCourses.length === 0
                  ? "Add AP, Honors, IB, or other rigorous courses you've taken."
                  : `${savedCourses.length} of ${MAX_COURSES} courses saved.`}
              </p>
            </div>
            {canAddCourse && (
              <Button variant="outline" size="sm" onClick={openNewCourseForm}>
                <Plus />
                Add course
              </Button>
            )}
          </div>

          {/* Saved summary cards */}
          {visibleCourses.map((course) => (
            <SavedCourseCard
              key={course.id}
              course={course}
              onEdit={() => editSavedCourse(course.id)}
              onDelete={() => deleteSavedCourse(course.id)}
            />
          ))}

          {/* Open form */}
          {courseDraft !== null && (
            <CourseForm
              course={courseDraft}
              isEditing={courseEditingId !== null}
              errors={courseFormErrors}
              onChange={updateCourseDraft}
              onSave={saveCourseDraft}
              onCancel={cancelCourseDraft}
            />
          )}

          {/* Empty state */}
          {savedCourses.length === 0 && courseDraft === null && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center">
              <p className="text-sm font-medium">No courses added yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add each course one at a time and save it to your list.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={openNewCourseForm}
                className="mt-4"
              >
                <Plus />
                Add course
              </Button>
            </div>
          )}

          {savedCourses.length >= MAX_COURSES && courseDraft === null && (
            <p className="text-center text-xs text-muted-foreground">
              Maximum of {MAX_COURSES} courses reached.
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-end gap-4">
          {hasErrors && (
            <p className="text-sm text-muted-foreground">
              Please fill in the required fields above.
            </p>
          )}
          <Button onClick={handleContinue}>
            Continue
            <ArrowRight />
          </Button>
        </div>
      </div>
    </main>
  );
}
