"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { addCourse, type CourseInput, updateCourse } from "./actions";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

const TYPE_OPTIONS = [
  { value: "", label: "Regular / standard" },
  { value: "honors", label: "Honors" },
  { value: "ap", label: "AP" },
  { value: "ib", label: "IB" },
  { value: "dual-enrollment", label: "Dual Enrollment / College" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "current", label: "Current" },
  { value: "completed", label: "Completed" },
  { value: "planned", label: "Planned" },
];

const GRADE_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "9", label: "Grade 9" },
  { value: "10", label: "Grade 10" },
  { value: "11", label: "Grade 11" },
  { value: "12", label: "Grade 12" },
  { value: "gap", label: "Graduated / gap year" },
];

const AP_SCORE_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "not-taken", label: "Not taken" },
  { value: "not-reporting", label: "Not reporting" },
  { value: "5", label: "5" },
  { value: "4", label: "4" },
  { value: "3", label: "3" },
  { value: "2", label: "2" },
  { value: "1", label: "1" },
];

export type EditableCourse = {
  id: string;
  name: string;
  type: string;
  status: string;
  gradeLevel: string;
  apExamScore: string;
};

// Add/edit form for a single course. When `course` is provided it edits that
// row; otherwise it adds a new one. Native selects styled to match Input (the
// design system has no select primitive).
export function CourseForm({
  course,
  onSaved,
  onCancel,
}: {
  course?: EditableCourse;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(course?.name ?? "");
  const [type, setType] = useState(course?.type ?? "");
  const [status, setStatus] = useState(course?.status ?? "");
  const [gradeLevel, setGradeLevel] = useState(course?.gradeLevel ?? "");
  const [apExamScore, setApExamScore] = useState(course?.apExamScore ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const showApScore = type === "ap" || type === "ib";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give the course a name.");
      return;
    }

    const input: CourseInput = {
      name: name.trim(),
      type: type as CourseInput["type"],
      status: status as CourseInput["status"],
      gradeLevel: gradeLevel as CourseInput["gradeLevel"],
      apExamScore: (showApScore
        ? apExamScore
        : "") as CourseInput["apExamScore"],
    };

    startTransition(async () => {
      const res = course
        ? await updateCourse(course.id, input)
        : await addCourse(input);
      if (!res.ok) {
        setError(res.error ?? "Couldn't save the course.");
        return;
      }
      onSaved();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-brand-teal/30 bg-brand-teal/[0.03] p-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="course-name">Course name</Label>
        <Input
          id="course-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. AP Calculus BC, Honors Chemistry, Spanish 3"
          maxLength={200}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="course-type">Level</Label>
          <select
            id="course-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={selectClass}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="course-grade">Grade level</Label>
          <select
            id="course-grade"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            className={selectClass}
          >
            {GRADE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="course-status">Status</Label>
          <select
            id="course-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {showApScore && (
          <div className="space-y-1.5">
            <Label htmlFor="course-ap">Exam score (optional)</Label>
            <select
              id="course-ap"
              value={apExamScore}
              onChange={(e) => setApExamScore(e.target.value)}
              className={selectClass}
            >
              {AP_SCORE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {course ? "Save changes" : "Add course"}
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
