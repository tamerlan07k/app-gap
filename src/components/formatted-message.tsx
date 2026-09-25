import type { ReactNode } from "react";

// Minimal, dependency-free renderer for the light Markdown an AI coach emits:
// **bold**, *italic*, `code`, hyphen/asterisk bullet lists, and line/paragraph
// breaks. It builds React nodes (never dangerouslySetInnerHTML), so it is
// XSS-safe. Used by the GapCoach chat surfaces so emphasis renders instead of
// showing literal asterisks.

// Order matters: **bold** is tried before *italic* so double asterisks win.
const INLINE = /(\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|`([^`\n]+?)`)/g;

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  INLINE.lastIndex = 0;
  // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop
  while ((match = INLINE.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[2] != null) {
      out.push(<strong key={`${keyBase}-b${i}`}>{match[2]}</strong>);
    } else if (match[3] != null) {
      out.push(<em key={`${keyBase}-i${i}`}>{match[3]}</em>);
    } else if (match[4] != null) {
      out.push(
        <code
          key={`${keyBase}-c${i}`}
          className="rounded bg-black/10 px-1 py-0.5 text-[0.85em] dark:bg-white/10"
        >
          {match[4]}
        </code>,
      );
    }
    last = INLINE.lastIndex;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function FormattedMessage({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const bulleted =
          lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l));
        if (bulleted) {
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: positional, append-only render
            <ul key={bi} className="list-disc space-y-1 pl-5">
              {lines.map((l, li) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: positional, append-only render
                <li key={li}>
                  {renderInline(l.replace(/^\s*[-*•]\s+/, ""), `${bi}-${li}`)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: positional, append-only render
          <p key={bi} className={bi > 0 ? "mt-2" : undefined}>
            {lines.map((l, li) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional, append-only render
              <span key={li}>
                {renderInline(l, `${bi}-${li}`)}
                {li < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}
