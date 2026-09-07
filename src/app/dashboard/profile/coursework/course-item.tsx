"use client";

import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { SUBJECT_AREA_LABELS } from "~/lib/coursework/catalog";
import { resolveLevel, resolveSubject } from "~/lib/coursework/classify";
import { LEVEL_META } from "~/lib/coursework/labels";
import { GRADE_LABELS } from "~/lib/profile-labels";
import { cn } from "~/lib/utils";
import { deleteCourse } from "./actions";
import { CourseForm, type EditableCourse } from "./course-form";

function Badge({ label, badge }: { label: string; badge: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium",
        badge,
      )}
    >
      {label}
    </span>
  );
}

export function CourseItem({ course }: { course: EditableCourse }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Same deterministic classification the engine uses, so the row's badges match
  // the analysis exactly.
  const level = resolveLevel(course.type, course.name);
  const { subjectArea } = resolveSubject(course.name);
  const levelMeta = LEVEL_META[level];

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteCourse(course.id);
      if (!res.ok) {
        setError(res.error ?? "Couldn't delete.");
        setConfirmingDelete(false);
      }
    });
  }

  if (editing) {
    return (
      <div className="p-4">
        <CourseForm
          course={course}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="truncate font-medium leading-snug">
          {course.name || "Untitled course"}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Badge label={levelMeta.label} badge={levelMeta.badge} />
          <span>{SUBJECT_AREA_LABELS[subjectArea]}</span>
          {course.gradeLevel && (
            <span>
              · {GRADE_LABELS[course.gradeLevel] ?? course.gradeLevel}
            </span>
          )}
          {course.status && <span>· {course.status}</span>}
          {(course.type === "ap" || course.type === "ib") &&
            course.apExamScore &&
            /^[1-5]$/.test(course.apExamScore) && (
              <span>· exam {course.apExamScore}</span>
            )}
        </p>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setEditing(true)}
          disabled={pending}
        >
          <Pencil />
          Edit
        </Button>
        {confirmingDelete ? (
          <>
            <Button
              variant="destructive"
              size="xs"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setConfirmingDelete(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setConfirmingDelete(true)}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
          </Button>
        )}
      </div>
    </div>
  );
}
