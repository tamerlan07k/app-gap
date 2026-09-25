"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { cn } from "~/lib/utils";

// A controlled collapsible card. The body stays MOUNTED when collapsed (hidden
// via the `hidden` attribute) so its data/state is preserved. forwardRef exposes
// the outer element so the workspace can smooth-scroll to it after an analysis
// runs. `accessory` shows a compact summary (score, count, badge) in the header
// so key info is visible even while collapsed.
export const CollapsibleSection = forwardRef<
  HTMLElement,
  {
    title: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accessory?: ReactNode;
    icon?: ReactNode;
    children: ReactNode;
  }
>(function CollapsibleSection(
  { title, open, onOpenChange, accessory, icon, children },
  ref,
) {
  return (
    <section
      ref={ref}
      className="scroll-mt-4 overflow-hidden rounded-xl border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex items-center gap-2 font-semibold">
          {icon}
          {title}
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          {accessory}
          <ChevronDown
            className={cn(
              "size-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
            aria-hidden={true}
          />
        </span>
      </button>
      <div hidden={!open} className="border-t border-border px-5 pb-5 pt-4">
        {children}
      </div>
    </section>
  );
});
