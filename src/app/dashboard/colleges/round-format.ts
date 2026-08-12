// Pure round-label + deadline formatting shared by the card and plan selector.

const ROUND_LABELS: Record<string, string> = {
  EA: "Early Action",
  REA: "Restrictive Early Action",
  ED: "Early Decision",
  ED_II: "Early Decision II",
  RD: "Regular Decision",
  ROLLING: "Rolling Admission",
  PRIORITY: "Priority Deadline",
};

export function roundLabel(roundType: string, name?: string | null): string {
  const base = ROUND_LABELS[roundType] ?? roundType;
  // Distinguish same-type variants (e.g. Georgia Tech's residency-split EA).
  if (name && name !== base) return name;
  return base;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Format an ISO yyyy-mm-dd without timezone drift (parse the parts directly). */
export function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const month = MONTHS[Number(m[2]) - 1];
  return `${month} ${Number(m[3])}, ${m[1]}`;
}
