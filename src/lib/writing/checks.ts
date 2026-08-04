// Application Writing — pure, dependency-free text utilities.
//
// Everything in this module runs client-side with zero AI cost. It powers the
// live character/word counters, the objective issue flags, and the formatting
// consistency (style) hints used across the Application Writing feature. Keep
// these checks conservative: objective issues must be things a reader would
// unambiguously agree are wrong, so we never present a style preference as an
// error (see the Application Preview's objective-vs-style split).

// ─── Limits (single source of truth) ─────────────────────────────────────────

/** Common App first-year Activities description limit. */
export const ACTIVITY_CHAR_LIMIT = 150;

/**
 * Additional Information word limit for the 2026–27 first-year Common App.
 * Soft limit: the app warns past this but never blocks generation.
 */
export const ADDITIONAL_INFO_WORD_LIMIT = 300;

// ─── Counting ─────────────────────────────────────────────────────────────────

/**
 * Count characters the way a length-limited application field does — one unit
 * per Unicode code point, so an emoji or accented character counts once rather
 * than as its UTF-16 surrogate pair.
 */
export function countChars(text: string): number {
  return Array.from(text).length;
}

/** Count whitespace-delimited words, ignoring empty runs. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// ─── Objective issues ─────────────────────────────────────────────────────────
// An objective issue is something a reader would unambiguously call a mistake:
// exceeding a hard limit, doubled spaces, an accidentally repeated word, or
// stray leading/trailing whitespace. Style-level judgments live elsewhere.

export type ObjectiveIssue = {
  /** Stable identifier for the kind of issue. */
  kind:
    | "over-char-limit"
    | "over-word-limit"
    | "double-space"
    | "repeated-word"
    | "edge-whitespace";
  /** Human-readable, reader-facing description of the problem. */
  message: string;
};

const DOUBLE_SPACE = /\s{2,}/;
// A word immediately repeated (case-insensitive), e.g. "the the".
const REPEATED_WORD = /\b(\w+)\s+\1\b/i;

/** Objective issues for a single activity description (against the 150-char limit). */
export function activityObjectiveIssues(description: string): ObjectiveIssue[] {
  const issues: ObjectiveIssue[] = [];
  const chars = countChars(description);

  if (chars > ACTIVITY_CHAR_LIMIT) {
    issues.push({
      kind: "over-char-limit",
      message: `Over the ${ACTIVITY_CHAR_LIMIT}-character limit (${chars} / ${ACTIVITY_CHAR_LIMIT}).`,
    });
  }
  if (description !== description.trim()) {
    issues.push({
      kind: "edge-whitespace",
      message: "Has leading or trailing spaces.",
    });
  }
  if (DOUBLE_SPACE.test(description.trim())) {
    issues.push({
      kind: "double-space",
      message: "Contains a double space.",
    });
  }
  const repeated = REPEATED_WORD.exec(description);
  if (repeated) {
    issues.push({
      kind: "repeated-word",
      message: `Repeats the word "${repeated[1]}".`,
    });
  }
  return issues;
}

/** Objective issues for the Additional Information response (against the 300-word limit). */
export function additionalInfoObjectiveIssues(text: string): ObjectiveIssue[] {
  const issues: ObjectiveIssue[] = [];
  const words = countWords(text);

  if (words > ADDITIONAL_INFO_WORD_LIMIT) {
    issues.push({
      kind: "over-word-limit",
      message: `Over the ${ADDITIONAL_INFO_WORD_LIMIT}-word limit (${words} / ${ADDITIONAL_INFO_WORD_LIMIT}).`,
    });
  }
  if (DOUBLE_SPACE.test(text.trim())) {
    issues.push({
      kind: "double-space",
      message: "Contains a double space.",
    });
  }
  const repeated = REPEATED_WORD.exec(text);
  if (repeated) {
    issues.push({
      kind: "repeated-word",
      message: `Repeats the word "${repeated[1]}".`,
    });
  }
  return issues;
}

// ─── Formatting style (a suggestion, never an error) ──────────────────────────
// None of these delimiter styles is wrong. We only detect the dominant one per
// description so the UI can note when a student mixes styles across activities —
// framed as a polish suggestion, not a mistake.

export type FormatStyle = "semicolon" | "comma" | "pipe" | "dash" | "none";

const FORMAT_STYLE_LABELS: Record<FormatStyle, string> = {
  semicolon: "semicolons",
  comma: "commas",
  pipe: "pipes",
  dash: "dashes",
  none: "no separators",
};

export function formatStyleLabel(style: FormatStyle): string {
  return FORMAT_STYLE_LABELS[style];
}

/** The dominant separator a description uses to join clauses. */
export function detectFormatStyle(description: string): FormatStyle {
  const counts: Record<Exclude<FormatStyle, "none">, number> = {
    semicolon: (description.match(/;/g) ?? []).length,
    pipe: (description.match(/\|/g) ?? []).length,
    // Dashes used as separators — surrounded by spaces, or an en/em dash.
    dash: (description.match(/\s[-–—]\s|[–—]/g) ?? []).length,
    comma: (description.match(/,/g) ?? []).length,
  };

  let best: Exclude<FormatStyle, "none"> | null = null;
  let bestCount = 0;
  for (const key of Object.keys(counts) as Array<
    Exclude<FormatStyle, "none">
  >) {
    if (counts[key] > bestCount) {
      best = key;
      bestCount = counts[key];
    }
  }
  return best ?? "none";
}

/**
 * Given every activity description, report whether the formatting styles are
 * mixed. Returns the set of distinct styles actually in use (ignoring "none"),
 * so the UI can suggest — never require — a consistent structure.
 */
export function formatConsistency(descriptions: string[]): {
  mixed: boolean;
  styles: FormatStyle[];
} {
  const styles = new Set<FormatStyle>();
  for (const d of descriptions) {
    if (!d.trim()) continue;
    const style = detectFormatStyle(d);
    if (style !== "none") styles.add(style);
  }
  const list = Array.from(styles);
  return { mixed: list.length > 1, styles: list };
}
