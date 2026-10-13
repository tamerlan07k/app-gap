// Calendar — shared types. A CalendarTask is the unit shared between the
// Personalized Application Calendar and the roadmap: when a task maps to a
// roadmap milestone (milestoneId set), completing one keeps the other in sync.

import type { Branch } from "~/lib/roadmap/types";

export type CalendarTaskBranch = Branch | "foundation" | "deadline";

export type CalendarTask = {
  id?: string;
  title: string;
  description: string;
  /** Visual grouping/branch; "deadline" marks a hard application deadline. */
  branch: CalendarTaskBranch | null;
  /** The roadmap milestone this represents, when the same work (sync key). */
  milestoneId: string | null;
  /** Destination workspace route (from the milestone library) or null. */
  href: string | null;
  /** ISO date (YYYY-MM-DD). */
  dueDate: string;
  status: "todo" | "done";
  deadlineSensitive: boolean;
  /** True when scheduled without a real deadline (grade-based guidance). */
  isProvisional: boolean;
  sortOrder: number;
};

export type ScheduleResult = {
  tasks: CalendarTask[];
  horizonStart: string;
  horizonEnd: string;
  /** Human label for the anchoring deadline, or null when none is known. */
  deadlineLabel: string | null;
  /** The whole schedule is grade-based guidance (no real deadline to anchor to). */
  provisional: boolean;
};
