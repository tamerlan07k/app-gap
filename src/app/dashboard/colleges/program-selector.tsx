"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  hasSchoolLayer,
  isSelectorRelevant,
  type SelectorProgram,
  type SelectorSchool,
  visibleProgramsForSchool,
} from "~/lib/colleges/program-selection";
import { createClient } from "~/lib/supabase/client";
import { setCollegeTarget } from "./actions";
import { ProgramCombobox } from "./program-combobox";

// Common undergraduate degree pathways offered as manual choices. The verified
// degree for the selected program (when known) is added on top and pre-selected.
// "Not sure yet" (empty) is always available — we never force a B.A./B.S. choice.
const BASE_DEGREES = [
  "B.A.",
  "B.S.",
  "B.S.E.",
  "B.B.A.",
  "B.F.A.",
  "B.Arch.",
  "B.S.N.",
  "B.M.",
  "B.Eng.",
  "Other",
];

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30";

/**
 * Per-college target selector: undergraduate school → program → degree. Renders
 * in two data-driven modes and NOTHING when a college has neither a school layer
 * nor any verified program:
 *
 *   • School-layer colleges (Cornell, Penn, Michigan, …): School → Program →
 *     Degree with school-scoped native dropdowns — UNCHANGED from before.
 *   • Single-admission colleges (the 531 Tier-A ones): a searchable/typeahead
 *     Program picker → Degree, with no invented school layer.
 *
 * Options come only from verified college_schools / college_programs rows;
 * "Not sure yet" is always available; no structure or degree is fabricated. This
 * never feeds chancing/scoring — it only records the student's application target.
 */
export function ProgramSelector({
  collegeId,
  initialSchoolId,
  initialProgramId,
  initialDegreeType,
}: {
  collegeId: string;
  initialSchoolId: string | null;
  initialProgramId: string | null;
  initialDegreeType: string | null;
}) {
  const [schools, setSchools] = useState<SelectorSchool[]>([]);
  const [programs, setPrograms] = useState<SelectorProgram[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [schoolId, setSchoolId] = useState(initialSchoolId ?? "");
  const [programId, setProgramId] = useState(initialProgramId ?? "");
  const [degreeType, setDegreeType] = useState(initialDegreeType ?? "");
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      // Programs are queried for THIS college only (never the full 20k+ table),
      // so even a 100+-program college loads a small list.
      const [schoolsRes, programsRes] = await Promise.all([
        supabase
          .from("college_schools")
          .select("id, name, admits_separately")
          .eq("college_id", collegeId)
          .order("name"),
        supabase
          .from("college_programs")
          .select("id, name, school_id, degree")
          .eq("college_id", collegeId)
          .eq("offered", true)
          .order("name"),
      ]);
      if (cancelled) return;
      setSchools(
        (schoolsRes.data ?? []).map(
          (s: { id: string; name: string; admits_separately: boolean }) => ({
            id: s.id,
            name: s.name,
            admitsSeparately: s.admits_separately,
          }),
        ),
      );
      setPrograms(
        (programsRes.data ?? []).map(
          (p: {
            id: string;
            name: string;
            school_id: string | null;
            degree: string | null;
          }) => ({
            id: p.id,
            name: p.name,
            schoolId: p.school_id,
            degree: p.degree,
          }),
        ),
      );
      setLoaded(true);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [collegeId]);

  const schoolLayer = hasSchoolLayer(schools);
  const relevant = isSelectorRelevant(schools, programs);

  const visiblePrograms = useMemo(
    () => visibleProgramsForSchool(programs, schoolId),
    [programs, schoolId],
  );

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === programId) ?? null,
    [programs, programId],
  );

  // The verified degree (if any) is pre-selected and listed first.
  const degreeOptions = useMemo(() => {
    const verified = selectedProgram?.degree;
    return verified && !BASE_DEGREES.includes(verified)
      ? [verified, ...BASE_DEGREES]
      : BASE_DEGREES;
  }, [selectedProgram]);

  function persist(next: {
    schoolId: string;
    programId: string;
    degreeType: string;
  }) {
    startTransition(async () => {
      await setCollegeTarget(collegeId, {
        schoolId: next.schoolId || null,
        programId: next.programId || null,
        degreeType: next.degreeType || null,
      });
    });
  }

  function onSchool(value: string) {
    // Changing school clears a program that no longer belongs to it.
    const keepProgram = programs.find(
      (p) => p.id === programId && (p.schoolId === value || p.schoolId == null),
    );
    const nextProgram = keepProgram ? programId : "";
    setSchoolId(value);
    setProgramId(nextProgram);
    persist({ schoolId: value, programId: nextProgram, degreeType });
  }

  function onProgram(value: string) {
    setProgramId(value);
    // Auto-suggest the verified degree this program grants (still overridable,
    // "Not sure yet" always available). Only overwrites when we actually have a
    // verified degree — never blanks out an existing choice.
    const picked = programs.find((p) => p.id === value);
    const nextDegree = picked?.degree ?? degreeType;
    setDegreeType(nextDegree);
    persist({ schoolId, programId: value, degreeType: nextDegree });
  }

  function onDegree(value: string) {
    setDegreeType(value);
    persist({ schoolId, programId, degreeType: value });
  }

  if (!loaded || !relevant) return null;

  return (
    // z-20 (not z-10): the searchable-program dropdown is an absolutely-
    // positioned panel trapped in this wrapper's stacking context. Sibling card
    // elements ("Visit official website", the rounds section) are `relative
    // z-10` and come later in the DOM, so at an equal z-10 they'd paint OVER the
    // panel and show through it. Lifting the wrapper to z-20 keeps the open
    // dropdown above them. (Native <select> dropdowns render in the browser's
    // top layer, so the school-layer mode never had this issue.)
    <div className="relative z-20 mt-3 space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Program at this college{" "}
        <span className="font-normal normal-case tracking-normal">
          (optional)
        </span>
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {schoolLayer ? (
          <>
            {/* School-layer mode — UNCHANGED native School → Program dropdowns. */}
            <label className="block text-xs">
              <span className="mb-1 block text-muted-foreground">School</span>
              <select
                value={schoolId}
                onChange={(e) => onSchool(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Not sure yet</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {visiblePrograms.length > 0 && (
              <label className="block text-xs">
                <span className="mb-1 block text-muted-foreground">
                  Program
                </span>
                <select
                  value={programId}
                  onChange={(e) => onProgram(e.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">Not sure yet</option>
                  {visiblePrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        ) : (
          // Single-admission mode — searchable/typeahead program picker.
          <ProgramCombobox
            programs={programs}
            value={programId}
            onChange={onProgram}
          />
        )}

        {(schoolId || programId) && (
          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">
              Degree
              {selectedProgram?.degree && (
                <span className="ml-1 font-normal normal-case text-muted-foreground/70">
                  (suggested: {selectedProgram.degree})
                </span>
              )}
            </span>
            <select
              value={degreeType}
              onChange={(e) => onDegree(e.target.value)}
              className={SELECT_CLASS}
            >
              <option value="">Not sure yet</option>
              {degreeOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
