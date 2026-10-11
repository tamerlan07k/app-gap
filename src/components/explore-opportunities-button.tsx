import type { VariantProps } from "class-variance-authority";
import { Compass } from "lucide-react";
import { Button, type buttonVariants } from "~/components/ui/button";
import { buildAtlasLink } from "~/lib/atlas/link";
import { cn } from "~/lib/utils";

// "Explore Opportunities" — opens Atlas of Opportunity's PUBLIC Finder in a new
// tab, pre-filtered to the student's grade/state/interests. Atlas needs no sign-in
// or account, so a plain link is all it takes. The link is built with the
// validated, pure buildAtlasLink() so only known-good values are ever sent and
// `ref=appgap` is always attached. We pass ONLY grade, state, and interests —
// never names, emails, essays, activity text, or any other profile data.
export function ExploreOpportunitiesButton({
  grade,
  state,
  interests,
  variant = "outline",
  size,
  className,
  label = "Explore Opportunities",
}: {
  grade?: number | null;
  state?: string | null;
  interests?: readonly string[] | null;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  className?: string;
  label?: string;
}) {
  const href = buildAtlasLink({ grade, state, interests });

  return (
    <Button
      asChild
      variant={variant}
      size={size}
      className={cn("shrink-0", className)}
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Compass />
        {label}
      </a>
    </Button>
  );
}
