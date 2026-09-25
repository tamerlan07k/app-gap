// Small text helpers for Supplemental Essays. Client-safe (no imports).

/** Count words the same way everywhere (display + persisted word_count). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Best-effort deterministic extraction of a word limit stated inside a prompt,
 * used as a CROSS-CHECK against the model's parse (never the sole source). Matches
 * phrasings like "250 words", "250-word", "in 150 words or fewer", "maximum of
 * 500 words". Returns the number, or null when none is stated. Prefers the
 * smallest plausible match when several appear (prompts often say "between 250
 * and 650 words" — the ceiling is what matters, so we take the largest of a
 * range; a lone number is returned as-is).
 */
export function extractWordLimit(prompt: string): number | null {
  if (!prompt) return null;
  const matches = [...prompt.matchAll(/(\d{2,4})\s*[-\s]?\s*words?\b/gi)]
    .map((m) => Number.parseInt(m[1], 10))
    .filter((n) => Number.isFinite(n) && n >= 10 && n <= 2000);
  if (matches.length === 0) return null;
  // A range like "250–650 words" → the ceiling is the limit.
  return Math.max(...matches);
}
