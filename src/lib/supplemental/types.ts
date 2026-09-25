// Client-safe DTO shapes shared between the server (actions / loaders) and the
// client workspace components for Supplemental Essays. No server imports.

import type { ChatMessage } from "./chat";
import type {
  LineByLineAnalysis,
  PromptParse,
  RawEvaluation,
  RedundancyAnalysis,
} from "./schemas";
import type { EssayStatus } from "./status";

export type SupplementalEssayDTO = {
  id: string;
  collegeId: string;
  promptText: string;
  wordLimit: number | null;
  promptSource: "manual" | "catalog";
  /** Set when this essay was started from an official catalog prompt. */
  catalogPromptId: string | null;
  content: string;
  wordCount: number;
  status: EssayStatus;
  finalizedContent: string | null;
  finalizedWordCount: number | null;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// An official, verified supplemental prompt for a college (current cycle).
export type VerifiedPromptDTO = {
  id: string;
  promptText: string;
  wordLimit: number | null;
  isRequired: boolean;
  /** Optional school name when the prompt is school-specific. */
  schoolName: string | null;
  /**
   * college_schools.id when this prompt applies only to a specific undergraduate
   * school/college; null means it applies to all applicants (university-wide).
   * Used to filter prompts by the student's selected school in My Colleges.
   */
  schoolId: string | null;
};

// Per-college supplemental coverage state for the current cycle:
//   has_supplements — official prompts exist (and are surfaced).
//   none_required   — verified to require NO supplemental essays.
//   pending         — not yet checked (prompts unknown); paste-your-own fallback.
export type SupplementStatus = "has_supplements" | "none_required" | "pending";

// Lightweight per-college catalog summary for the college LIST (landing page):
// the verified coverage status and how many official prompts exist. Distinct from
// the full prompt payload the workspace loads.
export type CollegeCatalogInfo = {
  status: SupplementStatus;
  promptCount: number;
};

// A college the student is applying to, with its supplements grouped under it.
// Used by the section landing page (the college list) and the college workspace.
export type CollegeEssayGroupDTO = {
  collegeId: string;
  collegeName: string;
  /** College detail slug for cross-links into My Colleges, when known. */
  slug: string | null;
  /** Self-hosted logo asset path, or null (CollegeLogo renders a monogram). */
  logoAssetPath: string | null;
  essays: SupplementalEssayDTO[];
};

// Everything the prompt workspace needs: the essay, its college, all cached
// analyses (null when not yet run), and the chat thread.
export type EssayWorkspaceData = {
  essay: SupplementalEssayDTO;
  collegeName: string;
  collegeSlug: string | null;
  logoAssetPath: string | null;
  parse: PromptParse | null;
  evaluation: RawEvaluation | null;
  lineByLine: LineByLineAnalysis | null;
  redundancy: RedundancyAnalysis | null;
  chat: ChatMessage[];
};
