import { formatChance } from "~/lib/colleges/assessment";
import { cn } from "~/lib/utils";

/**
 * The user-facing AppGap estimate: a single percentage revealed with a subtle
 * circular "bubble" that expands and fades behind the number. Pure CSS, so it
 * works in server components; both the pop and the bubble respect
 * prefers-reduced-motion (see globals.css). Deliberately understated — an
 * estimate, not a slot-machine.
 */
export function ChanceReveal({
  chance,
  size = "md",
  className,
}: {
  chance: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const label = formatChance(chance);
  const textSize =
    size === "lg" ? "text-4xl" : size === "sm" ? "text-base" : "text-2xl";

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      {chance != null && (
        <span
          aria-hidden="true"
          className="animate-chance-bubble pointer-events-none absolute -z-10 aspect-square w-[150%] rounded-full bg-brand-teal/20"
        />
      )}
      <span
        className={cn(
          "animate-chance-pop font-bold leading-none text-brand-teal",
          textSize,
        )}
      >
        {label}
      </span>
    </span>
  );
}
