"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { AWARD_CATEGORY_OPTIONS } from "~/lib/awards/labels";
import type { AwardRecord } from "~/lib/awards/types";
import { AWARD_LEVEL_LABELS } from "~/lib/profile-labels";
import { type AwardInput, addAward, updateAward } from "./actions";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

const GRADES = ["9", "10", "11", "12"] as const;
const EXPLANATION_LIMIT = 800;

// Add/edit form for a single award (Recognition Map record). When `award` is
// provided it edits that row; otherwise it adds. Native selects match the
// activities/coursework editors (the design system has no select primitive).
export function AwardForm({
  award,
  onSaved,
  onCancel,
}: {
  award?: AwardRecord;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(award?.name ?? "");
  const [organization, setOrganization] = useState(award?.organization ?? "");
  const [level, setLevel] = useState(award?.level ?? "");
  const [category, setCategory] = useState(award?.category ?? "");
  const [placement, setPlacement] = useState(award?.placement ?? "");
  const [year, setYear] = useState(award?.year ?? "");
  const [grade, setGrade] = useState(award?.grade ?? "");
  const [selectivityContext, setSelectivityContext] = useState(
    award?.selectivityContext ?? "",
  );
  const [description, setDescription] = useState(award?.description ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState(award?.evidenceUrl ?? "");
  const [studentExplanation, setStudentExplanation] = useState(
    award?.studentExplanation ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give the award a name.");
      return;
    }

    const input: AwardInput = {
      name: name.trim(),
      organization,
      year,
      level: level as AwardInput["level"],
      category,
      placement,
      grade: grade as AwardInput["grade"],
      selectivityContext,
      description,
      evidenceUrl,
      studentExplanation,
    };

    startTransition(async () => {
      const res = award
        ? await updateAward(award.id, input)
        : await addAward(input);
      if (!res.ok) {
        setError(res.error ?? "Couldn't save the award.");
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="aw-name">Award name</Label>
          <Input
            id="aw-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Congressional App Challenge — District Winner"
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aw-org">Organization</Label>
          <Input
            id="aw-org"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="e.g. U.S. House of Representatives"
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aw-level">Level / scope</Label>
          <select
            id="aw-level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className={selectClass}
          >
            <option value="">Select scope…</option>
            {Object.entries(AWARD_LEVEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aw-category">Category / type</Label>
          <select
            id="aw-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={selectClass}
          >
            <option value="">Select a type…</option>
            {AWARD_CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aw-placement">Result / placement</Label>
          <Input
            id="aw-placement"
            value={placement}
            onChange={(e) => setPlacement(e.target.value)}
            placeholder="e.g. 1st place, Finalist, Honorable mention"
            maxLength={120}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aw-year">Year</Label>
          <Input
            id="aw-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="e.g. 2026"
            maxLength={20}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="aw-grade">Grade earned</Label>
          <select
            id="aw-grade"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className={selectClass}
          >
            <option value="">Not set</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="aw-selectivity">Selectivity / context (optional)</Label>
        <Input
          id="aw-selectivity"
          value={selectivityContext}
          onChange={(e) => setSelectivityContext(e.target.value)}
          placeholder="e.g. ~1 of 400 district entries; top 5%"
          maxLength={300}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="aw-desc">Short description (optional)</Label>
        <Textarea
          id="aw-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="1–2 sentences: what the award recognizes."
          rows={2}
          maxLength={600}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="aw-explain">
            What did you actually do to earn it? (optional)
          </Label>
          <span className="text-xs tabular-nums text-muted-foreground">
            {studentExplanation.length} / {EXPLANATION_LIMIT}
          </span>
        </div>
        <Textarea
          id="aw-explain"
          value={studentExplanation}
          onChange={(e) => setStudentExplanation(e.target.value)}
          placeholder="In your own words — what you built, led, or contributed. This helps AppGap coach, but it never writes your story for you."
          rows={3}
          maxLength={EXPLANATION_LIMIT}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="aw-url">Evidence / source link (optional)</Label>
        <Input
          id="aw-url"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          placeholder="https://… a results page or announcement"
          maxLength={500}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {award ? "Save changes" : "Add award"}
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
